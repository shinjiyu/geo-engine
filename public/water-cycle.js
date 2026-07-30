/**
 * Surface-column CA water cycle — keep in sync with src/generate/water-cycle.js
 */
(function (global) {
  const DEFAULT_WEEKS = 52;
  const SOIL_CAPACITY_MM = 110;

  function windVector(latDeg, rotationDirection) {
    const absLat = Math.abs(latDeg);
    const rot = rotationDirection;
    let u;
    if (absLat < 24) u = 0.45 * rot;
    else if (absLat < 58) u = -0.5 * rot;
    else u = 0.22 * rot;
    return { u, v: -0.06 * Math.sign(latDeg || 1) };
  }

  function windAtCell(i, baseWind, grid, week) {
    const w = { u: baseWind.u, v: baseWind.v };
    if (grid.noiseSample && grid.unit) {
      const t = week * 0.07;
      const turb = grid.noiseSample(
        grid.unit.x[i] * 2.4 + t,
        grid.unit.y[i] * 2.4,
        grid.unit.z[i] * 2.4
      );
      w.u += turb * 0.38;
      w.v += turb * 0.16;
    }
    return w;
  }

  function advectionWeight(lat1, lon1, lat2, lon2, wind) {
    let dLon = lon2 - lon1;
    if (dLon > 180) dLon -= 360;
    if (dLon < -180) dLon += 360;
    const dLat = lat2 - lat1;
    return Math.max(0, wind.u * dLon + wind.v * dLat);
  }

  function vaporCapacityMm(elevationM, noiseMul) {
    return (16 + Math.max(0, elevationM / 520)) * (noiseMul || 1);
  }

  function buildDownslope(neighbors, elevation, isLand) {
    const n = elevation.length;
    const downslope = new Int32Array(n).fill(-1);
    for (let i = 0; i < n; i++) {
      if (!isLand[i]) continue;
      let best = -1;
      let bestElev = elevation[i];
      for (const j of neighbors[i]) {
        if (elevation[j] < bestElev) {
          bestElev = elevation[j];
          best = j;
        }
      }
      downslope[i] = best;
    }
    return downslope;
  }

  function seasonTemp(baseTempC, latDeg, week, weeks, obliquity) {
    const season = Math.sin((2 * Math.PI * week) / weeks);
    return baseTempC + season * obliquity * 0.32 * Math.cos((latDeg * Math.PI) / 180);
  }

  function simulateWaterCycle(grid, planet, options) {
    const weeks = (options && options.weeks) || DEFAULT_WEEKS;
    const n = grid.n;
    const H = new Float64Array(n);
    const S = new Float64Array(n);
    const annualPrecip = new Float64Array(n);
    const annualEvap = new Float64Array(n);
    const annualRunoff = new Float64Array(n);

    const baseWinds = grid.lat.map((lat) => windVector(lat, planet.rotationDirection));
    const downslope = buildDownslope(grid.neighbors, grid.elevation, grid.isLand);
    const capNoise = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      if (grid.noiseSample && grid.unit) {
        const nv = grid.noiseSample(grid.unit.x[i] * 1.6, grid.unit.y[i] * 1.6, grid.unit.z[i] * 1.6);
        capNoise[i] = 0.78 + (nv * 0.5 + 0.5) * 0.44;
      } else {
        capNoise[i] = 1;
      }
      H[i] = grid.isLand[i] ? 12 + capNoise[i] * 6 : 36;
      S[i] = grid.isLand[i] ? 48 : 0;
    }

    for (let w = 0; w < weeks; w++) {
      const dH = new Float64Array(n);
      const dS = new Float64Array(n);
      const stepWind = baseWinds.map((bw, i) => windAtCell(i, bw, grid, w));

      for (let i = 0; i < n; i++) {
        const temp = seasonTemp(grid.tempC[i], grid.lat[i], w, weeks, planet.obliquity);
        const tempF = Math.max(0.12, (temp + 8) / 38);
        const cap = vaporCapacityMm(grid.elevation[i], capNoise[i]);

        let evap = 0;
        if (!grid.isLand[i]) {
          evap = 5.5 * tempF * (1 - Math.min(H[i], cap) / (cap + 25));
          H[i] += evap;
        } else {
          evap = Math.min(S[i] * 0.32, 3.0 * tempF * capNoise[i]);
          S[i] -= evap;
          H[i] += evap;
        }
        annualEvap[i] += evap;

        if (H[i] > cap) {
          const rain = (H[i] - cap) * 0.58;
          H[i] -= rain;
          annualPrecip[i] += rain;
          if (grid.isLand[i]) S[i] += rain;
        }

        if (grid.isLand[i] && S[i] > SOIL_CAPACITY_MM) {
          const excess = S[i] - SOIL_CAPACITY_MM;
          S[i] = SOIL_CAPACITY_MM;
          annualRunoff[i] += excess * 0.55;
          const ds = downslope[i];
          if (ds >= 0) dS[ds] += excess * 0.45;
        }
      }

      for (let i = 0; i < n; i++) {
        const out = H[i] * 0.16;
        if (out <= 0.001) continue;
        const wind = stepWind[i];
        let wsum = 0;
        const outs = [];
        for (const j of grid.neighbors[i]) {
          const wt = advectionWeight(grid.lat[i], grid.lon[i], grid.lat[j], grid.lon[j], wind);
          if (wt > 0) {
            outs.push({ j, wt });
            wsum += wt;
          }
        }
        if (wsum <= 0) continue;
        for (let k = 0; k < outs.length; k++) {
          const j = outs[k].j;
          const flux = out * (outs[k].wt / wsum);
          dH[i] -= flux;
          dH[j] += flux;
          const uplift = grid.elevation[j] - grid.elevation[i];
          if (uplift > 60 && flux > 0.12) {
            const oro = flux * Math.min(0.72, uplift / 850);
            dH[j] -= oro;
            annualPrecip[j] += oro;
            if (grid.isLand[j]) dS[j] += oro;
          }
        }
      }

      for (let i = 0; i < n; i++) {
        H[i] = Math.max(0, H[i] + dH[i]);
        S[i] = Math.max(0, S[i] + dS[i]);
      }
    }

    for (let i = 0; i < n; i++) {
      annualPrecip[i] = Math.round(annualPrecip[i] * 10) / 10;
      annualEvap[i] = Math.round(annualEvap[i] * 10) / 10;
      annualRunoff[i] = Math.round(annualRunoff[i] * 10) / 10;
    }

    return { weeks, annualPrecip, annualEvap, annualRunoff, soilMoisture: S, vapor: H };
  }

  function runOnMesh(mesh, heights, isLand, tempC, lat, lon, planet, options) {
    options = options || {};
    const n = mesh.vertexCount;
    const ux = new Array(n);
    const uy = new Array(n);
    const uz = new Array(n);
    for (let i = 0; i < n; i++) {
      ux[i] = mesh.base[i * 3];
      uy[i] = mesh.base[i * 3 + 1];
      uz[i] = mesh.base[i * 3 + 2];
    }
    let noiseSample = null;
    if (options.seed && global.TerrainSampler && global.TerrainSampler.makeNoise3D) {
      const n3 = global.TerrainSampler.makeNoise3D(options.seed + ':wc');
      noiseSample = (x, y, z) => global.TerrainSampler.fbm(n3, x, y, z, 2);
    }
    const grid = {
      n,
      neighbors: mesh.neighbors,
      elevation: Array.from(heights),
      isLand: Array.from(isLand).map(Boolean),
      lat: Array.from(lat),
      lon: Array.from(lon),
      tempC: Array.from(tempC),
      unit: { x: ux, y: uy, z: uz },
      noiseSample
    };
    return simulateWaterCycle(grid, planet, options);
  }

  global.WaterCycle = {
    DEFAULT_WEEKS,
    simulateWaterCycle,
    runOnMesh
  };
})(window);
