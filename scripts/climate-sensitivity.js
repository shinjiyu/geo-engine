#!/usr/bin/env node
'use strict';

/**
 * One-at-a-time sensitivity of the Earth climate score to atmosphere parameters.
 *
 *   node scripts/climate-sensitivity.js [key ...]
 *
 * Each parameter is nudged down and up (15 %, or 0.05 for shares); for every nudge the
 * script prints the change in tuned / held-out region hits and log correlation, plus the
 * check point whose annual precipitation moves most. A small nudge that moves a point by
 * more than x1.5 is flagged as a cliff: the fit there hangs on a knife edge. CLIFF_RATIO
 * overrides the flag threshold, SENS_N the cube-sphere resolution.
 */

const { DEFAULT_PARAMS } = require('../src/generate/atmosphere');
const { buildNeighborTable } = require('../src/topology/cube-sphere');
const { runClimateStage } = require('../src/generate/climate-stage');
const { normalizePlanet } = require('../src/planet/params');
const { buildEarthCells, score } = require('../test/support/earth-climate-score');
const { loadEarthClimatology } = require('../test/support/earth-reference');

const SHARES = new Set(['rainBeltLandMin', 'rainBeltLandFull', 'rhBase', 'rhAscent']);
const DEFAULT_KEYS = [
  'rainBeltLag', 'rainBeltEdgeDeg', 'rainBeltRhRaise', 'rainBeltLandMin', 'rainBeltLandFull',
  'rainBeltMinShiftDeg', 'rainBeltMonsoonDesertGain', 'rainBeltPlateauCancel', 'rainBeltEastWindowDeg',
  'monsoonLandGain', 'itczShiftFactor', 'plateauItczGain', 'rhBase', 'rhAscent', 'convergenceFactor'
];
const keys = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_KEYS;
const n = Number(process.env.SENS_N || 48);
const cliff = Math.log(Number(process.env.CLIFF_RATIO || 1.5));

const planet = normalizePlanet({});
const obs = loadEarthClimatology();
const template = buildEarthCells(n, planet);
const neighborTable = buildNeighborTable(n);
const log = console.log;

function run(overrides) {
  const cells = new Map([...template].map(([k, c]) => [k, { ...c }]));
  console.log = () => {};
  try {
    runClimateStage(cells, neighborTable, planet, 'earth', { resolutionDeg: 2, atmosphere: overrides });
  } finally {
    console.log = log;
  }
  const s = score(cells, n, planet, obs);
  const points = new Map([...s.regions, ...s.holdout].map((r) => [r.name, r.model]));
  return { s, points, hits: parseInt(s.regionHits, 10), holdout: parseInt(s.holdoutHits, 10) };
}

const base = run({});
log(`base n=${n}: regions ${base.s.regionHits} holdout ${base.s.holdoutHits} rLog ${base.s.precip.rLog}`);
const cliffs = [];
for (const key of keys) {
  const v = DEFAULT_PARAMS[key];
  if (!Number.isFinite(v)) {
    log(`${key}: not a numeric parameter`);
    continue;
  }
  for (const sign of [-1, 1]) {
    const value = SHARES.has(key) ? v + sign * 0.05 : v * (1 + sign * 0.15);
    const r = run({ [key]: value });
    let worst = null;
    for (const [name, m] of r.points) {
      const d = Math.log((m + 50) / (base.points.get(name) + 50));
      if (!worst || Math.abs(d) > Math.abs(worst.d)) worst = { name, d, from: base.points.get(name), to: m };
    }
    const flag = Math.abs(worst.d) > cliff ? '  CLIFF' : '';
    if (flag) cliffs.push(`${key}=${+value.toFixed(3)} ${worst.name}`);
    log(`${key.padEnd(26)} ${String(+value.toFixed(3)).padStart(7)}  regions ${r.hits - base.hits >= 0 ? '+' : ''}${r.hits - base.hits}`
      + `  holdout ${r.holdout - base.holdout >= 0 ? '+' : ''}${r.holdout - base.holdout}`
      + `  rLog ${(r.s.precip.rLog - base.s.precip.rLog).toFixed(3)}`
      + `  worst ${worst.name} ${worst.from}->${worst.to}${flag}`);
  }
}
log(cliffs.length ? `cliffs: ${cliffs.join('; ')}` : 'no cliffs');
