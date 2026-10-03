'use strict';

/**
 * Scores the climate stage on real Earth relief against observed climatologies
 * (GPCC land precipitation, NCEP near-surface temperature).
 */

const { computeAreaWeights, vectorToCell, cellKey } = require('../../src/topology/cube-sphere');
const { generateTerrain } = require('../../src/generate/terrain');
const { loadEarthHeightSampler, isIceSheet, wasGlaciatedLGM } = require('./earth-reference');

const REGIONS = [
  ['Sahara', 23, 10], ['Arabia', 22, 47], ['Tarim', 39, 83], ['Gobi', 43, 105],
  ['Australia interior', -25, 133], ['Atacama', -23, -69], ['Namib', -23, 15], ['US Southwest', 35, -112],
  ['Amazon', -3, -60], ['Congo', 0, 22], ['Borneo', 1, 114], ['Bangladesh', 24, 90],
  ['West Europe', 48, 2], ['Moscow', 56, 38], ['Central Siberia', 60, 100], ['US Southeast', 34, -85],
  ['India center', 22, 78], ['Tibet', 33, 88], ['Sahel', 13, 5], ['South China', 25, 113],
  ['Chile south', -45, -73], ['Patagonia east', -45, -68], ['Norway coast', 61, 6], ['East Africa', 0, 37],
  ['Volga', 53, 48], ['Kazakh steppe', 48, 70], ['Yakutia', 62, 130], ['US Midwest', 42, -93]
];

// Held-out check points: never inspected while tuning parameters, so their hit rate shows
// whether fixes made for REGIONS generalise rather than overfit.
const HOLDOUT_REGIONS = [
  ['Ethiopia highlands', 9, 39], ['Madagascar east', -18, 48.5], ['Kalahari', -23, 22], ['Zambia', -14, 28],
  ['Angola plateau', -12, 17], ['Gran Chaco', -23, -61], ['Sao Paulo', -22, -48], ['Sertao', -8, -40],
  ['Llanos', 7, -68], ['Mexico plateau', 24, -103], ['Great Plains', 40, -101], ['Pacific Northwest', 46, -122],
  ['Alaska interior', 64, -148], ['Quebec', 50, -72], ['Ireland', 53, -8], ['Spain interior', 40, -4],
  ['Anatolia', 39, 33], ['Iran plateau', 32, 54], ['Thar', 27, 71], ['Mongolia', 47, 103],
  ['Japan', 36, 138], ['Indochina', 15, 104], ['Sumatra', 0, 102], ['New Zealand west', -43, 171],
  ['SE Australia', -36, 147], ['SW Australia', -32, 117], ['Top End', -13, 132], ['Baikal', 52, 105],
  ['Morocco', 32, -6], ['Ukraine', 49, 32], ['Florida', 28, -81.5], ['Ghana', 7, -1.5],
  ['Northeast China', 45, 126], ['Finland', 63, 26], ['Southern Africa east', -26, 31]
];

function pearson(xs, ys, ws) {
  let sw = 0; let mx = 0; let my = 0;
  for (let i = 0; i < xs.length; i++) { sw += ws[i]; mx += ws[i] * xs[i]; my += ws[i] * ys[i]; }
  mx /= sw; my /= sw;
  let sxy = 0; let sxx = 0; let syy = 0;
  for (let i = 0; i < xs.length; i++) {
    const dx = xs[i] - mx; const dy = ys[i] - my;
    sxy += ws[i] * dx * dy; sxx += ws[i] * dx * dx; syy += ws[i] * dy * dy;
  }
  return sxy / Math.sqrt(sxx * syy);
}

function buildEarthCells(n, planet) {
  const sampleHeightM = loadEarthHeightSampler();
  const cells = generateTerrain('earth', n, { planet, backend: 'heightmap', sampleHeightM, heightmapSpacingDeg: 1 });
  for (const [k, w] of computeAreaWeights(n)) {
    const c = cells.get(k);
    if (c) c.areaWeight = w;
  }
  for (const c of cells.values()) c.glaciatedLGM = wasGlaciatedLGM(c.lat, c.lon);
  return cells;
}

function cellAt(cells, n, lat, lon) {
  const la = lat * Math.PI / 180; const lo = lon * Math.PI / 180;
  const { face, u, v } = vectorToCell(Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo), n);
  return cells.get(cellKey(face, u, v));
}

function annualObs(obs, lat, lon) {
  let p = 0; let t = 0;
  for (let m = 0; m < 12; m++) { p += obs.precip(m, lat, lon); t += obs.temp(m, lat, lon) / 12; }
  return { p, t, tJan: obs.temp(0, lat, lon), tJul: obs.temp(6, lat, lon) };
}

/** Observed annual mean temperature moved to the cell's own surface height. */
function annualTempAt(obs, cell, planet) {
  const h = cell.isLand ? cell.elevation - planet.seaLevelM : 0;
  let t = 0;
  for (let m = 0; m < 12; m++) t += obs.tempAt(m, cell.lat, cell.lon, h) / 12;
  return t;
}

function score(cells, n, planet, obs) {
  const area = 4 * Math.PI * planet.radiusKm ** 2 / cells.size;
  const budget = { landKm2: 0, landP: 0, landE: 0, landR: 0, oceanKm2: 0, oceanE: 0, oceanP: 0 };
  const xs = []; const ys = []; const ws = []; const lxs = []; const lys = [];
  const bands = new Map();
  let aridModel = 0; let aridObs = 0; let wetModel = 0; let wetObs = 0; let wSum = 0;
  let tLandErr = 0; let tLandBias = 0; let tLandW = 0; let tOceanErr = 0; let tOceanBias = 0; let tOceanW = 0;
  let ampErr = 0; let ampBias = 0; let ampW = 0;

  for (const c of cells.values()) {
    const a = area * (c.areaWeight || 1);
    const o = annualObs(obs, c.lat, c.lon);
    const land = c.isLand || c.isLake;
    if (land) {
      budget.landKm2 += a; budget.landP += c.precip * a; budget.landE += c.evaporation * a; budget.landR += c.runoff * a;
    } else {
      budget.oceanKm2 += a; budget.oceanE += c.evaporation * a; budget.oceanP += c.precip * a;
    }
    const iceSheet = isIceSheet(c.lat, c.lon);
    const tErr = c.tempC - annualTempAt(obs, c, planet);
    if (!iceSheet && land) { tLandErr += a * tErr * tErr; tLandBias += a * tErr; tLandW += a; }
    if (!iceSheet && !land) { tOceanErr += a * tErr * tErr; tOceanBias += a * tErr; tOceanW += a; }
    if (land && !iceSheet && Array.isArray(c.tempMonthlyC)) {
      const amp = Math.abs(c.tempMonthlyC[6] - c.tempMonthlyC[0]);
      const ampObs = Math.abs(o.tJul - o.tJan);
      ampErr += a * (amp - ampObs) ** 2; ampBias += a * (amp - ampObs); ampW += a;
    }
    if (!land || !Number.isFinite(o.p) || c.lat < -60) continue;
    xs.push(c.precip); ys.push(o.p); ws.push(a);
    lxs.push(Math.log(c.precip + 30)); lys.push(Math.log(o.p + 30));
    const b = Math.floor(c.lat / 10) * 10;
    const band = bands.get(b) || { w: 0, m: 0, o: 0 };
    band.w += a; band.m += a * c.precip; band.o += a * o.p;
    bands.set(b, band);
    wSum += a;
    if (c.precip < 250) aridModel += a;
    if (o.p < 250) aridObs += a;
    if (c.precip > 1500) wetModel += a;
    if (o.p > 1500) wetObs += a;
  }

  let mSum = 0; let oSum = 0; let sq = 0;
  for (let i = 0; i < xs.length; i++) { mSum += ws[i] * xs[i]; oSum += ws[i] * ys[i]; sq += ws[i] * (xs[i] - ys[i]) ** 2; }

  const zonal = [...bands.entries()].sort((a, b) => b[0] - a[0]).map(([b, v]) => ({
    band: `${b}..${b + 10}`, model: Math.round(v.m / v.w), obs: Math.round(v.o / v.w)
  }));
  const zonalRmse = Math.sqrt(zonal.reduce((s, z) => s + (z.model - z.obs) ** 2, 0) / zonal.length);

  const sample = (list) => list.map(([name, lat, lon]) => {
    const c = cellAt(cells, n, lat, lon);
    const o = annualObs(obs, lat, lon);
    return {
      name,
      model: Math.round(c.precip),
      obs: Math.round(o.p),
      tModel: Math.round(c.tempC * 10) / 10,
      tObs: Math.round(annualTempAt(obs, c, planet) * 10) / 10,
      land: c.isLand
    };
  });
  const hits = (list) => list.filter((r) => Number.isFinite(r.obs)
    && Math.abs(Math.log((r.model + 50) / (r.obs + 50))) < Math.log(1.6)).length;
  const regions = sample(REGIONS);
  const holdout = sample(HOLDOUT_REGIONS);

  return {
    budget: {
      landPrecipMm: Math.round(budget.landP / budget.landKm2),
      landEvapMm: Math.round(budget.landE / budget.landKm2),
      landRunoffMm: Math.round(budget.landR / budget.landKm2),
      landRunoffKm3: Math.round(budget.landR * 1e-6),
      oceanEvapMm: Math.round(budget.oceanE / budget.oceanKm2),
      oceanPrecipMm: Math.round(budget.oceanP / budget.oceanKm2)
    },
    precip: {
      modelMean: Math.round(mSum / wSum),
      obsMean: Math.round(oSum / wSum),
      rmse: Math.round(Math.sqrt(sq / wSum)),
      r: Math.round(pearson(xs, ys, ws) * 1000) / 1000,
      rLog: Math.round(pearson(lxs, lys, ws) * 1000) / 1000,
      zonalRmse: Math.round(zonalRmse),
      aridPct: { model: Math.round(aridModel / wSum * 100), obs: Math.round(aridObs / wSum * 100) },
      wetPct: { model: Math.round(wetModel / wSum * 100), obs: Math.round(wetObs / wSum * 100) }
    },
    temp: {
      landBias: Math.round(tLandBias / tLandW * 10) / 10,
      landRmse: Math.round(Math.sqrt(tLandErr / tLandW) * 10) / 10,
      oceanBias: Math.round(tOceanBias / tOceanW * 10) / 10,
      oceanRmse: Math.round(Math.sqrt(tOceanErr / tOceanW) * 10) / 10,
      seasonalAmpBias: ampW ? Math.round(ampBias / ampW * 10) / 10 : null,
      seasonalAmpRmse: ampW ? Math.round(Math.sqrt(ampErr / ampW) * 10) / 10 : null
    },
    zonal,
    regions,
    regionHits: `${hits(regions)}/${regions.length}`,
    holdout,
    holdoutHits: `${hits(holdout)}/${holdout.length}`
  };
}

module.exports = { REGIONS, HOLDOUT_REGIONS, buildEarthCells, cellAt, annualObs, score };
