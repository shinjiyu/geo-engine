'use strict';

const { LatLonGrid, simulateAtmosphere } = require('./atmosphere');
const { CLIMATE_ZONES } = require('./climate');
const { TERRAIN, MOUNTAIN_HEIGHT_M, HILL_HEIGHT_M } = require('./terrain');
const { vectorToCell, cellKey } = require('../topology/cube-sphere');
const { normalizePlanet } = require('../planet/params');

const DAYS_IN_MONTH = Array.from({ length: 12 }, (_, m) => Math.floor((m + 1) * 365 / 12) - Math.floor(m * 365 / 12));
const SEA_ICE_TEMP_C = -1.8;
const SEA_ICE_MONTHS = 6;
const GLACIER_MELT_MM_PER_DEGREE_DAY = 4;
const DAILY_TEMP_SIGMA_C = 4;

function smoothstep(e0, e1, x) {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

/** Expected positive degree-days per day for a monthly mean with daily scatter. */
function positiveDegreeDays(tempC) {
  const s = 0.58 * DAILY_TEMP_SIGMA_C;
  const x = tempC / s;
  return x > 20 ? tempC : s * Math.log1p(Math.exp(x));
}

/** Annual snow accumulation minus melt potential (mm water) for monthly temperature/precipitation. */
function snowBalanceMm(tempMonthly, precipMonthly, offsetC = 0) {
  let balance = 0;
  for (let m = 0; m < 12; m++) {
    const t = tempMonthly[m] + offsetC;
    balance += precipMonthly[m] * smoothstep(2, -2, t);
    balance -= GLACIER_MELT_MM_PER_DEGREE_DAY * positiveDegreeDays(t) * DAYS_IN_MONTH[m];
  }
  return balance;
}

/** Height above sea level where the annual snow balance turns positive. */
function climaticSnowLineM(heightM, tempMonthly, precipMonthly, lapseC) {
  let lo = -6000;
  let hi = 12000;
  if (snowBalanceMm(tempMonthly, precipMonthly, -lapseC * (lo - heightM)) > 0) return lo;
  if (snowBalanceMm(tempMonthly, precipMonthly, -lapseC * (hi - heightM)) <= 0) return hi;
  for (let k = 0; k < 18; k++) {
    const mid = (lo + hi) / 2;
    if (snowBalanceMm(tempMonthly, precipMonthly, -lapseC * (mid - heightM)) > 0) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

/** Koppen-Geiger class following Peel et al. (2007). */
function koppenClass(tempMonthly, precipMonthly, lat) {
  const tMax = Math.max(...tempMonthly);
  const tMin = Math.min(...tempMonthly);
  const mat = tempMonthly.reduce((s, t) => s + t, 0) / 12;
  const pAnn = precipMonthly.reduce((s, p) => s + p, 0);
  const summer = lat >= 0 ? [3, 4, 5, 6, 7, 8] : [9, 10, 11, 0, 1, 2];
  const winter = lat >= 0 ? [9, 10, 11, 0, 1, 2] : [3, 4, 5, 6, 7, 8];
  const pSummer = summer.reduce((s, m) => s + precipMonthly[m], 0);
  const pWinter = pAnn - pSummer;
  const pSdry = Math.min(...summer.map((m) => precipMonthly[m]));
  const pSwet = Math.max(...summer.map((m) => precipMonthly[m]));
  const pWdry = Math.min(...winter.map((m) => precipMonthly[m]));
  const pWwet = Math.max(...winter.map((m) => precipMonthly[m]));
  const pMin = Math.min(...precipMonthly);

  if (tMax < 10) return tMax > 0 ? 'ET' : 'EF';
  let pTh = 20 * mat;
  if (pWinter >= 0.7 * pAnn) pTh += 0;
  else if (pSummer >= 0.7 * pAnn) pTh += 280;
  else pTh += 140;
  if (pAnn < pTh) return (pAnn < pTh / 2 ? 'BW' : 'BS') + (mat >= 18 ? 'h' : 'k');
  if (tMin >= 18) {
    if (pMin >= 60) return 'Af';
    if (pMin >= 100 - pAnn / 25) return 'Am';
    return 'Aw';
  }
  let second = 'f';
  if (pSdry < 40 && pSdry < pWwet / 3) second = 's';
  else if (pWdry < pSwet / 10) second = 'w';
  const warmMonths = tempMonthly.filter((t) => t >= 10).length;
  let third = 'c';
  if (tMax >= 22) third = 'a';
  else if (warmMonths >= 4) third = 'b';
  else if (tMin < -38) third = 'd';
  return (tMin > 0 ? 'C' : 'D') + second + third;
}

function zoneFromKoppen(code) {
  if (code === 'EF') return CLIMATE_ZONES.SNOW;
  if (code === 'ET') return CLIMATE_ZONES.POLAR;
  if (code[0] === 'B') return CLIMATE_ZONES.ARID;
  if (code === 'Af' || code === 'Am') return CLIMATE_ZONES.TROPICAL;
  if (code[0] === 'A') return CLIMATE_ZONES.SUBTROPICAL;
  if (code[0] === 'C') return CLIMATE_ZONES.TEMPERATE;
  return code[2] === 'c' || code[2] === 'd' ? CLIMATE_ZONES.COLD : CLIMATE_ZONES.TEMPERATE;
}

function buildSurface(cells, grid, planet) {
  const landSum = new Float64Array(grid.size);
  const heightSum = new Float64Array(grid.size);
  const count = new Float64Array(grid.size);
  for (const cell of cells.values()) {
    const c = grid.index(cell.lat, cell.lon);
    const w = cell.areaWeight || 1;
    count[c] += w;
    if (cell.isLand) {
      landSum[c] += w;
      heightSum[c] += w * Math.max(0, cell.elevation - planet.seaLevelM);
    }
  }
  const n = Math.round(Math.sqrt(cells.size / 6));
  const landFraction = new Float64Array(grid.size);
  const heightM = new Float64Array(grid.size);
  for (let i = 0; i < grid.nLat; i++) {
    for (let j = 0; j < grid.nLon; j++) {
      const c = i * grid.nLon + j;
      if (count[c] > 0) {
        landFraction[c] = landSum[c] / count[c];
        heightM[c] = landSum[c] > 0 ? heightSum[c] / landSum[c] : 0;
        continue;
      }
      const la = grid.rowLat[i] * Math.PI / 180;
      const lo = grid.colLon[j] * Math.PI / 180;
      const { face, u, v } = vectorToCell(Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo), n);
      const cell = cells.get(cellKey(face, u, v));
      landFraction[c] = cell?.isLand ? 1 : 0;
      heightM[c] = cell?.isLand ? Math.max(0, cell.elevation - planet.seaLevelM) : 0;
    }
  }
  return { landFraction, heightM };
}

/**
 * Bilinear interpolation restricted to columns of the same surface type as the cell,
 * so coastal land cells do not inherit ocean evaporation and vice versa.
 */
function makeSampler(grid, atmosphere) {
  const idx = new Int32Array(4);
  const w = new Float64Array(4);
  return function sample(lat, lon, wantLand) {
    grid.bilinear(lat, lon, idx, w, 0);
    let total = 0;
    for (let k = 0; k < 4; k++) {
      if ((atmosphere.isLand[idx[k]] === 1) !== wantLand) w[k] = 0;
      total += w[k];
    }
    if (total === 0) {
      grid.bilinear(lat, lon, idx, w, 0);
      return { idx, w };
    }
    for (let k = 0; k < 4; k++) w[k] /= total;
    return { idx, w };
  };
}

/** Temperature, water cycle, climate classes and climate-driven snow/ice for every cell. */
function runClimateStage(cells, neighborTable, planetInput, seed, options = {}) {
  const planet = normalizePlanet(planetInput);
  const n = Math.round(Math.sqrt(cells.size / 6));
  const grid = new LatLonGrid(options.resolutionDeg || (n >= 192 ? 1 : 2));
  const surface = buildSurface(cells, grid, planet);
  const atmosphere = simulateAtmosphere(grid, surface, planet, options.atmosphere);
  const sample = makeSampler(grid, atmosphere);
  const lapse = planet.lapseRateC / 1000;
  const size = grid.size;
  const pick = (arr, m, s) => {
    let v = 0;
    for (let k = 0; k < 4; k++) v += s.w[k] * arr[m * size + s.idx[k]];
    return v;
  };

  const zoneCounts = {};
  for (const cell of cells.values()) {
    const land = cell.isLand;
    const s = sample(cell.lat, cell.lon, land);
    const heightM = land ? Math.max(0, cell.elevation - planet.seaLevelM) : 0;
    const tempMonthly = new Array(12);
    const precipMonthly = new Array(12);
    const runoffMonthly = new Array(12);
    let precip = 0;
    let evap = 0;
    let runoff = 0;
    let pet = 0;
    for (let m = 0; m < 12; m++) {
      tempMonthly[m] = pick(atmosphere.monthTempSeaLevel, m, s) - lapse * heightM;
      precipMonthly[m] = pick(atmosphere.monthPrecip, m, s);
      runoffMonthly[m] = pick(atmosphere.monthRunoff, m, s);
      precip += precipMonthly[m];
      evap += pick(atmosphere.monthEvap, m, s);
      runoff += runoffMonthly[m];
      pet += pick(atmosphere.monthPet, m, s);
    }
    let soil = 0;
    for (let k = 0; k < 4; k++) soil += s.w[k] * atmosphere.soilMean[s.idx[k]];
    const tempC = tempMonthly.reduce((a, b) => a + b, 0) / 12;

    cell.tempC = Math.round(tempC * 10) / 10;
    cell.precip = Math.round(precip);
    cell.evaporation = Math.round(evap);
    cell.runoff = Math.round(runoff * 10) / 10;
    cell.pet = Math.round(pet);
    cell.soilMoisture = land ? Math.round(soil * 10) / 10 : 0;
    cell.waterModel = 'latlon-seasonal-v1';

    if (land) {
      cell.tempMonthlyC = tempMonthly.map((t) => Math.round(t * 10) / 10);
      cell.precipMonthlyMm = precipMonthly.map((p) => Math.round(p));
      cell.runoffMonthlyMm = runoffMonthly.map((r) => Math.round(r * 10) / 10);
      cell.koppen = koppenClass(tempMonthly, precipMonthly, cell.lat);
      cell.snowLineM = Math.round(climaticSnowLineM(heightM, tempMonthly, precipMonthly, lapse));
      const glacier = heightM >= cell.snowLineM;
      cell.climateZone = glacier ? CLIMATE_ZONES.SNOW : zoneFromKoppen(cell.koppen);
      const aridity = pet > 0 ? precip / pet : 10;
      cell.aridityIndex = Math.round(aridity * 100) / 100;
      cell.aridScore = Math.round(smoothstep(0.5, 0.03, aridity) * 1000) / 1000;
      if (glacier) cell.terrain = TERRAIN.SNOW;
      else if (cell.terrain === TERRAIN.SNOW) {
        cell.terrain = heightM > MOUNTAIN_HEIGHT_M ? TERRAIN.MOUNTAIN
          : heightM > HILL_HEIGHT_M ? TERRAIN.HILL : TERRAIN.PLAIN;
      }
    } else {
      delete cell.tempMonthlyC;
      delete cell.precipMonthlyMm;
      delete cell.runoffMonthlyMm;
      cell.koppen = null;
      cell.aridScore = 0;
      const iceMonths = tempMonthly.filter((t) => t < SEA_ICE_TEMP_C).length;
      cell.seaIceMonths = iceMonths;
      const ice = iceMonths >= SEA_ICE_MONTHS;
      cell.climateZone = ice ? CLIMATE_ZONES.ICE : CLIMATE_ZONES.OCEAN;
      if (!cell.isLake) cell.terrain = ice ? TERRAIN.ICE : TERRAIN.DEEP_OCEAN;
    }
    zoneCounts[cell.climateZone] = (zoneCounts[cell.climateZone] || 0) + 1;
  }

  return { model: 'latlon-seasonal-v1', resolutionDeg: grid.res, zoneCounts, params: atmosphere.params };
}

module.exports = {
  runClimateStage,
  koppenClass,
  zoneFromKoppen,
  climaticSnowLineM,
  snowBalanceMm
};
