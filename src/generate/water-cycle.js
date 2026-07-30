'use strict';

/**
 * Surface-column cellular water cycle — weekly CA steps (~52 = 1 year).
 * Each cell: atmospheric vapor H (mm) + soil moisture S (mm).
 * Keep in sync with public/water-cycle.js
 */

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

function advectionWeight(lat1, lon1, lat2, lon2, wind) {
  let dLon = lon2 - lon1;
  if (dLon > 180) dLon -= 360;
  if (dLon < -180) dLon += 360;
  const dLat = lat2 - lat1;
  const dot = wind.u * dLon + wind.v * dLat;
  return Math.max(0, dot);
}

function vaporCapacityMm(elevationM) {
  return 16 + Math.max(0, elevationM / 520);
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
  const latRad = (latDeg * Math.PI) / 180;
  return baseTempC + season * obliquity * 0.32 * Math.cos(latRad);
}

/**
 * @param {object} grid
 * @param {number} grid.n
 * @param {number[][]} grid.neighbors
 * @param {number[]} grid.elevation
 * @param {boolean[]} grid.isLand
 * @param {number[]} grid.lat
 * @param {number[]} grid.lon
 * @param {number[]} grid.tempC
 * @param {object} planet normalized planet params
 * @param {object} [options]
 */
function simulateWaterCycle(grid, planet, options) {
  const weeks = options?.weeks ?? DEFAULT_WEEKS;
  const n = grid.n;
  const H = new Float64Array(n);
  const S = new Float64Array(n);
  const annualPrecip = new Float64Array(n);
  const annualEvap = new Float64Array(n);
  const annualRunoff = new Float64Array(n);

  const winds = grid.lat.map((lat) => windVector(lat, planet.rotationDirection));
  const downslope = buildDownslope(grid.neighbors, grid.elevation, grid.isLand);

  for (let i = 0; i < n; i++) {
    H[i] = grid.isLand[i] ? 10 : 38;
    S[i] = grid.isLand[i] ? 45 : 0;
  }

  for (let w = 0; w < weeks; w++) {
    const dH = new Float64Array(n);
    const dS = new Float64Array(n);

    for (let i = 0; i < n; i++) {
      const temp = seasonTemp(grid.tempC[i], grid.lat[i], w, weeks, planet.obliquity);
      const tempF = Math.max(0.12, (temp + 8) / 38);
      const cap = vaporCapacityMm(grid.elevation[i]);

      let evap = 0;
      if (!grid.isLand[i]) {
        evap = 5.5 * tempF * (1 - Math.min(H[i], cap) / (cap + 25));
        H[i] += evap;
      } else {
        evap = Math.min(S[i] * 0.35, 3.2 * tempF);
        S[i] -= evap;
        H[i] += evap;
      }
      annualEvap[i] += evap;

      if (H[i] > cap) {
        const rain = (H[i] - cap) * 0.62;
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
      const out = H[i] * 0.18;
      if (out <= 0.001) continue;
      let wsum = 0;
      const outs = [];
      for (const j of grid.neighbors[i]) {
        const wt = advectionWeight(grid.lat[i], grid.lon[i], grid.lat[j], grid.lon[j], winds[i]);
        if (wt > 0) {
          outs.push({ j, wt });
          wsum += wt;
        }
      }
      if (wsum <= 0) continue;
      for (const { j, wt } of outs) {
        const flux = out * (wt / wsum);
        dH[i] -= flux;
        dH[j] += flux;
        const uplift = grid.elevation[j] - grid.elevation[i];
        if (uplift > 60 && flux > 0.15) {
          const oro = flux * Math.min(0.75, uplift / 900);
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

  return {
    weeks,
    annualPrecip,
    annualEvap,
    annualRunoff,
    soilMoisture: S,
    vapor: H,
    rules: WATER_CYCLE_RULES
  };
}

const WATER_CYCLE_RULES = {
  model: 'surface-column-ca',
  timestep: '1 week',
  yearSteps: DEFAULT_WEEKS,
  state: ['vapor_mm', 'soil_mm'],
  steps: [
    'seasonal_temp from obliquity',
    'evaporation: ocean unlimited source; land from soil',
    'condensation when vapor > orographic capacity',
    'advection to downwind neighbors (lat-band wind)',
    'orographic rain on uplift during advection',
    'soil overflow -> runoff + downslope transfer'
  ]
};

function applyWaterCycleToCells(cells, neighborTable, planet, options) {
  const keys = [...cells.keys()];
  const idx = new Map(keys.map((k, i) => [k, i]));
  const n = keys.length;
  const neighbors = keys.map((k) =>
    (neighborTable.get(k) || [])
      .map((nk) => idx.get(nk))
      .filter((j) => j !== undefined)
  );

  const grid = {
    n,
    neighbors,
    elevation: keys.map((k) => cells.get(k).elevation),
    isLand: keys.map((k) => cells.get(k).isLand),
    lat: keys.map((k) => cells.get(k).lat),
    lon: keys.map((k) => cells.get(k).lon),
    tempC: keys.map((k) => cells.get(k).tempC ?? 15)
  };

  const result = simulateWaterCycle(grid, planet, options);

  for (let i = 0; i < n; i++) {
    const cell = cells.get(keys[i]);
    cell.precip = result.annualPrecip[i];
    cell.evaporation = result.annualEvap[i];
    cell.runoff = result.annualRunoff[i];
    cell.soilMoisture = Math.round(result.soilMoisture[i] * 10) / 10;
    cell.waterModel = 'ca-weekly';
  }

  return result;
}

module.exports = {
  DEFAULT_WEEKS,
  WATER_CYCLE_RULES,
  simulateWaterCycle,
  applyWaterCycleToCells,
  windVector,
  advectionWeight
};
