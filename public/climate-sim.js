/**
 * Mesh climate + hydrology — keep logic aligned with src/generate/climate.js
 */
(function (global) {
  const ZONE_COLORS = {
    ocean: [0.12, 0.32, 0.58],
    ice: [0.72, 0.82, 0.92],
    coast: [0.72, 0.68, 0.42],
    tropical: [0.18, 0.62, 0.28],
    subtropical: [0.42, 0.68, 0.32],
    arid: [0.78, 0.62, 0.38],
    temperate: [0.32, 0.58, 0.34],
    cold: [0.48, 0.58, 0.52],
    polar: [0.82, 0.86, 0.9],
    snow: [0.92, 0.94, 0.98]
  };

  function smoothstep(e0, e1, x) {
    const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
    return t * t * (3 - 2 * t);
  }

  function mixRgb(a, b, t) {
    return [
      a[0] * (1 - t) + b[0] * t,
      a[1] * (1 - t) + b[1] * t,
      a[2] * (1 - t) + b[2] * t
    ];
  }

  function computeClimateAt(lat, lon, elevation, isLand, planet, seed, noiseFns, unit) {
    const absLat = Math.abs(lat);
    const rot = planet.rotationDirection;
    const snowLine = global.PlanetParams.snowLineElevationM(planet, absLat);
    const x = unit?.x ?? 0;
    const y = unit?.y ?? 0;
    const z = unit?.z ?? 0;

    const insolation = Math.max(0.08, Math.cos((absLat * Math.PI) / 180));
    let tempC = 30 * insolation - (elevation / 1000) * planet.lapseRateC;
    if (absLat > planet.polarCircleLat) tempC -= 14;
    else if (absLat > planet.tropicLat) {
      tempC -= 6 * ((absLat - planet.tropicLat) / (planet.polarCircleLat - planet.tropicLat));
    }

    const itcz = Math.exp(-((absLat / 10) ** 2));
    const midStorm = Math.exp(-(((absLat - 50) / 18) ** 2));
    const latDry = Math.exp(-(((absLat - planet.tropicLat) / 16) ** 2)) * 0.32;

    let continentMoist = 0;
    let dryPatch = 0.5;
    let windward = 0;
    if (noiseFns && noiseFns.moist) {
      continentMoist = noiseFns.fbm(noiseFns.moist, x * 1.4, y * 1.4, z * 1.4, 3);
      dryPatch = noiseFns.fbm(noiseFns.dry, x * 2.1 + 5, y * 2.1, z * 2.1, 2) * 0.5 + 0.5;
      windward = noiseFns.fbm(noiseFns.moist, lon * 0.028, lat * 0.028, rot * 0.4, 2);
    }

    let precip = 0;
    let evaporation = 0;
    if (isLand) {
      precip = (itcz * 1.15 + midStorm * 0.65) * (0.42 + insolation * 0.58);
      precip *= 0.78 + Math.max(0, continentMoist) * 0.55 + Math.max(0, windward) * 0.22;
      precip -= latDry * dryPatch * 0.38;
      precip = Math.max(0.04, precip);
      evaporation = Math.max(0.05, tempC * 0.016 + insolation * 0.11 + Math.max(0, dryPatch - 0.5) * 0.08);
    } else {
      evaporation = Math.max(0.25, insolation * 0.95 + (absLat < planet.tropicLat ? 0.2 : 0));
    }

    const runoff = isLand ? Math.max(0, precip - evaporation * 0.36) : 0;
    const isSnow = isLand && global.PlanetParams.isAlpineSnow(elevation, absLat, tempC, planet);
    const isPolarIce = !isLand && absLat >= planet.polarCircleLat;

    const aridScore = isLand
      ? smoothstep(0.38, 0.78, (1 - precip / 0.95) * (0.25 + latDry * 0.75) * (0.55 + dryPatch * 0.65))
      : 0;

    let zone = 'ocean';
    if (isLand) {
      if (isSnow) zone = 'snow';
      else if (absLat >= planet.polarCircleLat) zone = 'polar';
      else if (aridScore > 0.62) zone = 'arid';
      else if (absLat <= planet.tropicLat) zone = tempC > 22 ? 'tropical' : 'subtropical';
      else if (tempC < 4) zone = 'cold';
      else zone = 'temperate';
    } else if (isPolarIce) {
      zone = 'ice';
    }

    return {
      tempC,
      precip,
      evaporation,
      runoff,
      zone,
      aridScore,
      isSnow,
      isPolarIce,
      snowLineM: snowLine
    };
  }

  function vertexColor(c, land, elev, planet, aridScore) {
    if (!land) return ZONE_COLORS[c.isPolarIce ? 'ice' : 'ocean'];

    let rgb = ZONE_COLORS[c.zone] || ZONE_COLORS.temperate;

    if (c.zone !== 'arid' && c.zone !== 'snow' && c.zone !== 'polar' && aridScore > 0.12) {
      rgb = mixRgb(rgb, ZONE_COLORS.arid, aridScore * 0.55);
    }
    if (land && elev <= planet.seaLevelM + 220 && c.zone !== 'snow' && c.zone !== 'polar') {
      rgb = mixRgb(rgb, ZONE_COLORS.coast, 0.35);
    }
    return rgb;
  }

  function zoneColor(zone) {
    return ZONE_COLORS[zone] || ZONE_COLORS.temperate;
  }

  function smoothVertexColors(colors, neighbors, vertexCount, passes, regions) {
    let buf = colors.slice();
    for (let p = 0; p < passes; p++) {
      const next = new Float32Array(buf.length);
      for (let i = 0; i < vertexCount; i++) {
        let r = buf[i * 3] * 0.38;
        let g = buf[i * 3 + 1] * 0.38;
        let b = buf[i * 3 + 2] * 0.38;
        let w = 0.38;
        for (const j of neighbors[i]) {
          if (regions && regions[j] !== regions[i]) continue;
          r += buf[j * 3];
          g += buf[j * 3 + 1];
          b += buf[j * 3 + 2];
          w += 1;
        }
        next[i * 3] = r / w;
        next[i * 3 + 1] = g / w;
        next[i * 3 + 2] = b / w;
      }
      buf = next;
    }
    colors.set(buf);
  }

  function classifyZoneFromWater(land, elev, lat, tempC, precip, planet, isPolarIce, snowLine, dryPatch) {
    const absLat = Math.abs(lat);
    dryPatch = dryPatch ?? 0.5;
    if (!land) return isPolarIce ? 'ice' : 'ocean';
    if (global.PlanetParams.isAlpineSnow(elev, absLat, tempC, planet)) return 'snow';
    if (absLat >= planet.polarCircleLat && elev < snowLine - 350 && tempC < 2) return 'polar';
    const aridTh = 160 + dryPatch * 220;
    if (precip < aridTh && dryPatch > 0.38 && precip < 400) return 'arid';
    if (absLat <= planet.tropicLat) return precip > 1200 ? 'tropical' : 'subtropical';
    if (tempC < 4) return 'cold';
    return 'temperate';
  }

  function runMeshSimulation(mesh, heights, planet, seed) {
    const n = mesh.vertexCount;
    const noiseFns = seed && global.TerrainSampler.makeNoise3D
      ? {
        moist: global.TerrainSampler.makeNoise3D(seed + ':moist'),
        dry: global.TerrainSampler.makeNoise3D(seed + ':dry'),
        fbm: global.TerrainSampler.fbm
      }
      : null;

    const climates = new Array(n);
    const isLand = new Uint8Array(n);
    const tempC = new Float64Array(n);
    const lats = new Float64Array(n);
    const lons = new Float64Array(n);
    const colors = new Float32Array(n * 3);

    for (let i = 0; i < n; i++) {
      const x = mesh.base[i * 3];
      const y = mesh.base[i * 3 + 1];
      const z = mesh.base[i * 3 + 2];
      const elev = heights[i];
      const { lat, lon } = global.TerrainSampler.vectorToLatLon(x, y, z);
      const land = elev > planet.seaLevelM;
      isLand[i] = land ? 1 : 0;
      lats[i] = lat;
      lons[i] = lon;

      lats[i] = lat;
      lons[i] = lon;

      const c = computeClimateAt(lat, lon, elev, land, planet, seed, noiseFns, { x, y, z });
      tempC[i] = c.tempC;
      climates[i] = c;
    }

    const ocean = global.OceanConnectivity.resolveOceanMask(
      Array.from(isLand, (v) => v === 1),
      mesh.neighbors
    );
    for (let i = 0; i < n; i++) isLand[i] = ocean.isLand[i];

    const wc = global.WaterCycle.runOnMesh(
      mesh, heights, isLand, tempC, lats, lons, planet, { weeks: 52, seed }
    );

    const runoff = wc.annualRunoff;

    for (let i = 0; i < n; i++) {
      const x = mesh.base[i * 3];
      const y = mesh.base[i * 3 + 1];
      const z = mesh.base[i * 3 + 2];
      const land = isLand[i] === 1;
      const elev = heights[i];
      const c = climates[i];
      c.precip = wc.annualPrecip[i];
      c.evaporation = wc.annualEvap[i];
      c.runoff = wc.annualRunoff[i];
      c.soilMoisture = wc.soilMoisture[i];
      c.waterModel = 'ca-weekly-52';

      let dryPatch = 0.5;
      if (noiseFns && noiseFns.dry) {
        dryPatch = noiseFns.fbm(noiseFns.dry, x * 2.1, y * 2.1, z * 2.1, 2) * 0.5 + 0.5;
      }

      const snowLine = global.PlanetParams.snowLineElevationM(planet, Math.abs(lats[i]));
      c.zone = classifyZoneFromWater(
        land, elev, lats[i], tempC[i], wc.annualPrecip[i], planet, c.isPolarIce, snowLine, dryPatch
      );
      const aridScore = land
        ? smoothstep(0.3, 0.75, (1 - wc.annualPrecip[i] / 900) * dryPatch)
        : 0;
      c.aridScore = aridScore;

      const rgb = vertexColor(c, land, elev, planet, aridScore);
      colors[i * 3] = rgb[0];
      colors[i * 3 + 1] = rgb[1];
      colors[i * 3 + 2] = rgb[2];
    }

    smoothVertexColors(colors, mesh.neighbors, n, 2, isLand);

    const hydrology = runMeshHydrology(mesh, heights, runoff, isLand, planet);

    const baseLandColors = colors.slice();
    const surface = global.SurfaceFeatures
      ? global.SurfaceFeatures.runOnMesh(mesh, heights, isLand, climates, hydrology, wc, planet, {
        geography: 'mixed'
      })
      : null;

    if (surface) {
      global.SurfaceFeatures.applySurfaceColors(
        colors, n, baseLandColors, isLand, surface.isLake, surface.vegetation, 0.62
      );
      const surfaceRegions = new Uint8Array(n);
      for (let i = 0; i < n; i++) {
        surfaceRegions[i] = !isLand[i] ? 0 : surface.isLake[i] ? 2 : 1;
      }
      smoothVertexColors(colors, mesh.neighbors, n, 1, surfaceRegions);
    }

    return { climates, colors, isLand, hydrology, waterCycle: wc, ocean, surfaceFeatures: surface };
  }

  /** Priority-flood from ocean — fills pits and assigns D8-like flow toward the sea. */
  function priorityFloodRoute(heights, isLand, neighbors, n) {
    const filled = Float64Array.from(heights);
    const downslope = new Int32Array(n).fill(-1);
    const done = new Uint8Array(n);
    const eps = 0.001;
    const pq = [];

    for (let i = 0; i < n; i++) {
      if (!isLand[i]) {
        done[i] = 1;
        pq.push(i);
      }
    }

    while (pq.length > 0) {
      pq.sort((a, b) => filled[a] - filled[b]);
      const c = pq.shift();
      for (const j of neighbors[c]) {
        if (done[j]) continue;
        if (filled[j] <= filled[c]) filled[j] = filled[c] + eps;
        downslope[j] = c;
        done[j] = 1;
        pq.push(j);
      }
    }
    return downslope;
  }

  function isCoastalLand(i, downslope, isLand) {
    const d = downslope[i];
    return d < 0 || !isLand[d];
  }

  function runMeshHydrology(mesh, heights, runoff, isLand, planet) {
    const n = mesh.vertexCount;
    const downslope = priorityFloodRoute(heights, isLand, mesh.neighbors, n);
    const upslope = Array.from({ length: n }, () => []);
    const flow = new Float64Array(n);

    for (let i = 0; i < n; i++) {
      const d = downslope[i];
      if (d >= 0) upslope[d].push(i);
    }

    const order = [...Array(n).keys()]
      .filter((i) => isLand[i])
      .sort((a, b) => heights[b] - heights[a]);

    for (const i of order) {
      flow[i] = Math.max(0.05, runoff[i]);
      const d = downslope[i];
      if (d >= 0) flow[d] += flow[i];
    }

    let maxLandFlow = 0;
    for (let i = 0; i < n; i++) {
      if (isLand[i]) maxLandFlow = Math.max(maxLandFlow, flow[i]);
    }
    const minFlow = Math.max(1.5, maxLandFlow * 0.06);

    const sources = [];
    for (let i = 0; i < n; i++) {
      if (!isLand[i] || flow[i] < minFlow) continue;
      let hasRiverUp = false;
      for (const j of upslope[i]) {
        if (isLand[j] && flow[j] >= minFlow) {
          hasRiverUp = true;
          break;
        }
      }
      if (!hasRiverUp) sources.push(i);
    }
    sources.sort((a, b) => flow[b] - flow[a]);

    const candidates = [];
    for (const src of sources) {
      const path = traceSourceToMouth(src, downslope, isLand);
      if (path.length < 5) continue;

      const mouth = path[path.length - 1];
      if (!isCoastalLand(mouth, downslope, isLand)) continue;

      candidates.push({
        path,
        source: src,
        mouth,
        mouthFlow: flow[mouth],
        sourceFlow: flow[src],
        length: path.length
      });
    }

    const byMouth = new Map();
    for (const c of candidates) {
      if (!byMouth.has(c.mouth)) byMouth.set(c.mouth, []);
      byMouth.get(c.mouth).push(c);
    }

    const rivers = [];
    for (const group of byMouth.values()) {
      group.sort((a, b) => b.length - a.length || b.sourceFlow - a.sourceFlow);
      group[0].kind = 'main';
      for (let i = 1; i < group.length; i++) group[i].kind = 'tributary';
      rivers.push(...group);
    }

    rivers.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'main' ? -1 : 1;
      return b.length - a.length;
    });

    const riverEdges = [];
    const edgeKinds = [];
    const seen = new Map();
    for (const { path, kind } of rivers) {
      for (let k = 0; k < path.length - 1; k++) {
        const a = path[k];
        const b = path[k + 1];
        const lo = Math.min(a, b);
        const hi = Math.max(a, b);
        const key = lo + ',' + hi;
        const trib = kind === 'tributary' ? 1 : 0;
        if (!seen.has(key)) {
          seen.set(key, edgeKinds.length);
          riverEdges.push(lo, hi);
          edgeKinds.push(trib);
        } else if (trib === 0) {
          edgeKinds[seen.get(key)] = 0;
        }
      }
    }

    let longestPath = 0;
    let mainCount = 0;
    let tributaryCount = 0;
    for (const r of rivers) {
      longestPath = Math.max(longestPath, r.length);
      if (r.kind === 'main') mainCount++;
      else tributaryCount++;
    }

    return {
      flow,
      minFlowThreshold: minFlow,
      maxLandFlow,
      rivers,
      riverEdgeIndices: new Uint16Array(riverEdges),
      riverEdgeKinds: new Uint8Array(edgeKinds),
      riverCount: rivers.length,
      mainRiverCount: mainCount,
      tributaryCount,
      riverEdgeCount: riverEdges.length / 2,
      longestRiverSegments: longestPath
    };
  }

  /** From estuary / basin sink, follow the largest upstream inflow branch to the headwater. */
  function traceMainStemUpstream(mouth, upslope, flow, isLand, heights, minFlow) {
    const path = [mouth];
    let cur = mouth;
    const seen = new Set([mouth]);

    while (true) {
      let best = -1;
      let bestFlow = 0;
      let bestElev = -Infinity;
      for (const j of upslope[cur]) {
        if (!isLand[j] || seen.has(j) || flow[j] < minFlow) continue;
        if (flow[j] > bestFlow || (flow[j] === bestFlow && heights[j] > bestElev)) {
          bestFlow = flow[j];
          bestElev = heights[j];
          best = j;
        }
      }
      if (best < 0) break;
      path.push(best);
      seen.add(best);
      cur = best;
      if (path.length > 3000) break;
    }
    return path;
  }

  /** Source → ocean: full D8 descent without flow cutoff (for tests / alternate use). */
  function traceSourceToMouth(source, downslope, isLand) {
    const path = [source];
    let cur = source;
    const seen = new Set([source]);
    while (true) {
      const next = downslope[cur];
      if (next < 0) break;
      if (!isLand[next]) break;
      if (seen.has(next)) break;
      path.push(next);
      seen.add(next);
      cur = next;
      if (path.length > 3000) break;
    }
    return path;
  }

  global.ClimateSim = {
    ZONE_COLORS,
    zoneColor,
    computeClimateAt,
    runMeshSimulation,
    runMeshHydrology,
    traceSourceToMouth,
    traceMainStemUpstream
  };
})(window);
