#!/usr/bin/env node
'use strict';

/**
 * Coordinate-descent calibration of atmosphere parameters against Earth observations.
 *
 *   node scripts/calibrate-climate.js temperature [rounds]   # EBM / marine-influence parameters vs NCEP
 *   CAL_RES=2 node scripts/calibrate-climate.js precip [rounds]  # moisture parameters vs GPCC (land)
 *
 * Prints the best parameter set; copy it into DEFAULT_PARAMS in src/generate/atmosphere.js.
 * CAL_START='{"key":value}' overrides the starting point; IDEAL_WEIGHT scales the
 * hypothetical-continent term (0 = Earth only).
 */

const { LatLonGrid, simulateAtmosphere, DEFAULT_PARAMS } = require('../src/generate/atmosphere');
const { normalizePlanet } = require('../src/planet/params');
const { loadEarthHeightSampler, loadEarthClimatology, isIceSheet } = require('../test/support/earth-reference');
const { idealSurface, scoreContinent, scoreContinentTemp } = require('../test/support/ideal-worlds');
const { koppenClass } = require('../src/generate/climate-stage');

const planet = normalizePlanet({});
const grid = new LatLonGrid(Number(process.env.CAL_RES || 1));
const sampleHeight = loadEarthHeightSampler();
const obs = loadEarthClimatology();

const surface = { landFraction: new Float64Array(grid.size), heightM: new Float64Array(grid.size) };
for (let i = 0; i < grid.nLat; i++) {
  for (let j = 0; j < grid.nLon; j++) {
    const hgt = sampleHeight(grid.rowLat[i], grid.colLon[j]);
    surface.landFraction[i * grid.nLon + j] = hgt > 0 ? 1 : 0;
    surface.heightM[i * grid.nLon + j] = Math.max(0, hgt);
  }
}
const obsT = new Float64Array(12 * grid.size);
const scored = new Uint8Array(grid.size);
for (let i = 0; i < grid.nLat; i++) {
  for (let j = 0; j < grid.nLon; j++) {
    const c = i * grid.nLon + j;
    scored[c] = isIceSheet(grid.rowLat[i], grid.colLon[j]) ? 0 : 1;
    for (let m = 0; m < 12; m++) obsT[m * grid.size + c] = obs.tempAt(m, grid.rowLat[i], grid.colLon[j], surface.heightM[c]);
  }
}

function temperatureScore(params) {
  // Full water cycle: dry-surface warming depends on evaporation.
  const r = simulateAtmosphere(grid, surface, planet, { spinupDays: 60, ...params });
  const lapse = planet.lapseRateC / 1000;
  const acc = { land: [0, 0, 0], ocean: [0, 0, 0], amp: [0, 0] };
  for (let c = 0; c < grid.size; c++) {
    if (!scored[c]) continue;
    const w = Math.cos(grid.rowLat[Math.floor(c / grid.nLon)] * Math.PI / 180);
    const land = surface.landFraction[c] > 0;
    const key = land ? 'land' : 'ocean';
    const hgt = land ? surface.heightM[c] : 0;
    for (let m = 0; m < 12; m++) {
      const e = r.monthTempSeaLevel[m * grid.size + c] - lapse * hgt - obsT[m * grid.size + c];
      acc[key][0] += w * e * e;
      acc[key][1] += w * e;
      acc[key][2] += w;
    }
    if (land) {
      const amp = r.monthTempSeaLevel[6 * grid.size + c] - r.monthTempSeaLevel[c];
      const ampObs = obsT[6 * grid.size + c] - obsT[c];
      acc.amp[0] += w * (amp - ampObs) ** 2;
      acc.amp[1] += w;
    }
  }
  const out = {
    landRmse: Math.sqrt(acc.land[0] / acc.land[2]),
    landBias: acc.land[1] / acc.land[2],
    oceanRmse: Math.sqrt(acc.ocean[0] / acc.ocean[2]),
    oceanBias: acc.ocean[1] / acc.ocean[2],
    ampRmse: Math.sqrt(acc.amp[0] / acc.amp[1])
  };
  out.loss = 0.5 * out.landRmse + 0.5 * out.oceanRmse + 0.3 * out.ampRmse + 0.3 * Math.abs(out.landBias);
  if (IDEAL_WEIGHT > 0) {
    const ri = simulateAtmosphere(idealGrid, idealLand, planet, { spinupDays: 60, ...params });
    const ideal = scoreContinentTemp((lat, lon) => {
      const c = idealGrid.index(lat, lon);
      let tmin = Infinity;
      for (let m = 0; m < 12; m++) tmin = Math.min(tmin, ri.monthTempSeaLevel[m * idealGrid.size + c] - lapse * idealLand.heightM[c]);
      return tmin;
    });
    out.idealHits = ideal.hits;
    out.idealLoss = ideal.loss;
    out.loss += 0.1 * IDEAL_WEIGHT * ideal.loss;
  }
  return out;
}

const obsP = new Float64Array(grid.size).fill(NaN);
for (let i = 0; i < grid.nLat; i++) {
  for (let j = 0; j < grid.nLon; j++) {
    let total = 0;
    for (let m = 0; m < 12; m++) total += obs.precip(m, grid.rowLat[i], grid.colLon[j]);
    obsP[i * grid.nLon + j] = total;
  }
}

const { REGIONS } = require('../test/support/earth-climate-score');
const regionCells = REGIONS.map(([, lat, lon]) => grid.index(lat, lon)).filter((c) => Number.isFinite(obsP[c]));

// The hypothetical continent keeps the parameters general rather than fitted to Earth's map.
const IDEAL_WEIGHT = Number(process.env.IDEAL_WEIGHT ?? 2);
const idealGrid = new LatLonGrid(2);
const idealLand = idealSurface('continent', idealGrid);

function idealScore(params) {
  const r = simulateAtmosphere(idealGrid, idealLand, planet, { spinupDays: 60, ...params });
  const lapse = planet.lapseRateC / 1000;
  const S = idealGrid.size;
  return scoreContinent((lat, lon) => {
    const c = idealGrid.index(lat, lon);
    const t = []; const p = [];
    for (let m = 0; m < 12; m++) {
      t.push(r.monthTempSeaLevel[m * S + c] - lapse * idealLand.heightM[c]);
      p.push(r.monthPrecip[m * S + c]);
    }
    return { precip: p.reduce((a, b) => a + b, 0), koppen: koppenClass(t, p, lat) };
  });
}

function precipScore(params) {
  const ideal = IDEAL_WEIGHT > 0 ? idealScore(params) : { loss: 0, hits: 0 };
  const r = simulateAtmosphere(grid, surface, planet, { spinupDays: 60, ...params });
  let sw = 0; let mSum = 0; let oSum = 0; let aridM = 0; let aridO = 0;
  let oceanE = 0; let oceanW = 0;
  for (let c = 0; c < grid.size; c++) {
    if (r.isLand[c]) continue;
    const w = Math.cos(grid.rowLat[Math.floor(c / grid.nLon)] * Math.PI / 180);
    let e = 0;
    for (let m = 0; m < 12; m++) e += r.monthEvap[m * grid.size + c];
    oceanE += w * e; oceanW += w;
  }
  const xs = []; const ys = []; const ws = [];
  const bands = new Map();
  for (let c = 0; c < grid.size; c++) {
    const lat = grid.rowLat[Math.floor(c / grid.nLon)];
    if (!r.isLand[c] || lat < -60 || !Number.isFinite(obsP[c])) continue;
    let pm = 0;
    for (let m = 0; m < 12; m++) pm += r.monthPrecip[m * grid.size + c];
    const w = Math.cos(lat * Math.PI / 180);
    sw += w; mSum += w * pm; oSum += w * obsP[c];
    if (pm < 250) aridM += w;
    if (obsP[c] < 250) aridO += w;
    xs.push(Math.log(pm + 30)); ys.push(Math.log(obsP[c] + 30)); ws.push(w);
    const b = Math.floor(lat / 10);
    const z = bands.get(b) || [0, 0, 0];
    z[0] += w * pm; z[1] += w * obsP[c]; z[2] += w;
    bands.set(b, z);
  }
  let mx = 0; let my = 0;
  for (let k = 0; k < xs.length; k++) { mx += ws[k] * xs[k]; my += ws[k] * ys[k]; }
  mx /= sw; my /= sw;
  let sxy = 0; let sxx = 0; let syy = 0;
  for (let k = 0; k < xs.length; k++) {
    sxy += ws[k] * (xs[k] - mx) * (ys[k] - my); sxx += ws[k] * (xs[k] - mx) ** 2; syy += ws[k] * (ys[k] - my) ** 2;
  }
  let regionErr = 0;
  for (const c of regionCells) {
    let pm = 0;
    for (let m = 0; m < 12; m++) pm += r.monthPrecip[m * grid.size + c];
    regionErr += Math.abs(Math.log((pm + 30) / (obsP[c] + 30))) / regionCells.length;
  }
  const zonal = [...bands.values()];
  const out = {
    rLog: sxy / Math.sqrt(sxx * syy),
    zonalRmse: Math.sqrt(zonal.reduce((s, z) => s + ((z[0] - z[1]) / z[2]) ** 2, 0) / zonal.length),
    meanRatio: mSum / oSum,
    aridModel: aridM / sw * 100,
    aridObs: aridO / sw * 100,
    oceanEvap: oceanE / oceanW,
    regionErr,
    idealHits: ideal.hits,
    idealLoss: ideal.loss
  };
  out.loss = 2 * (1 - out.rLog) + out.zonalRmse / 400 + Math.abs(out.aridModel - out.aridObs) / 15 + Math.abs(Math.log(out.meanRatio)) * 2
    + Math.abs(Math.log(out.oceanEvap / 1200)) * 2 + regionErr + IDEAL_WEIGHT * ideal.loss;
  return out;
}

const SPACES = {
  precip: {
    score: precipScore,
    keys: {
      oceanEvapCoef: [0.005, 0.05],
      rhBase: [0.6, 0.95],
      rhAscent: [0, 0.35],
      rhSubsidence: [0, 0.1],
      gyreWind: [0, 8],
      gyreAscent: [0, 10],
      gyreDescent: [0, 8],
      gyreInlandKm: [300, 3000],
      thermalWind: [0, 3],
      coldLandHighGain: [0.2, 1],
      itczShiftFactor: [0.2, 1.5],
      monsoonLandGain: [0, 5],
      plateauItczGain: [0, 6],
      wtgLandOffsetC: [0, 10],
      ascentBlurDeg: [1.5, 8],
      frontalRate: [0.05, 4],
      polarFrontalShare: [0, 1],
      convergenceFactor: [0, 1.5],
      extratropLandConv: [0, 1],
      convTropicsDeg: [10, 35],
      ascentZonalTerm: [0, 1],
      frontalContinentality: [0, 1],
      leeFrontalScaleM: [100, 3000],
      leeFrontalThresholdM: [0, 800],
      wtgLatDeg: [25, 90],
      orographicEfficiency: [0.05, 0.8],
      orographicScaleM: [500, 5000],
      leeDryingThresholdM: [0, 1000],
      tradeV: [0.5, 5]
    }
  },
  temperature: {
    score: temperatureScore,
    keys: {
      diffusion: [0.2, 2],
      oceanDiffusion: [0, 1.5],
      heatCapLand: [50, 1500],
      heatCapOcean: [600, 4000],
      heatCapIce: [30, 600],
      marineRecoverDays: [0.3, 10],
      sstAirRecoverDays: [0.2, 5],
      sstWinterGain: [0, 3],
      landOceanExchange: [0, 20],
      albedo0: [0.2, 0.4],
      albedo2: [0, 0.3],
      marineDecayDays: [0.5, 15],
      sstGyreSubtropical: [0, 8],
      sstGyreSubpolar: [0, 12],
      dryWarmingC: [0, 8],
      olrA: [190, 215]
    }
  }
};

function fmt(s) {
  return Object.entries(s).map(([k, v]) => `${k}=${v.toFixed(2)}`).join(' ');
}

function main() {
  const space = SPACES[process.argv[2] || 'temperature'];
  let best = Object.fromEntries(Object.keys(space.keys).map((k) => [k, DEFAULT_PARAMS[k]]));
  Object.assign(best, JSON.parse(process.env.CAL_START || '{}'));
  let bestScore = space.score(best);
  console.log('start', fmt(bestScore), JSON.stringify(best));
  const step = Object.fromEntries(Object.entries(space.keys).map(([k, [lo, hi]]) => [k, (hi - lo) / 4]));
  for (let round = 0; round < Number(process.argv[3] || 6); round++) {
    for (const [k, [lo, hi]] of Object.entries(space.keys)) {
      for (const dir of [1, -1]) {
        const trial = { ...best, [k]: Math.min(hi, Math.max(lo, best[k] + dir * step[k])) };
        if (trial[k] === best[k]) continue;
        const s = space.score(trial);
        if (s.loss < bestScore.loss) {
          best = trial;
          bestScore = s;
          console.log(`  r${round} ${k}=${trial[k].toFixed(3)}`, fmt(s));
          break;
        }
      }
    }
    for (const k of Object.keys(step)) step[k] /= 2;
  }
  console.log('best', fmt(bestScore));
  console.log(JSON.stringify(best, null, 2));
}

main();
