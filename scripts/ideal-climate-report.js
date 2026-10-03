#!/usr/bin/env node
'use strict';

/**
 * Climate of the idealized worlds (hypothetical continent, aquaplanet) against the textbook pattern.
 *
 *   node scripts/ideal-climate-report.js [--n 48] [--params JSON | --params-file path]
 */

const fs = require('node:fs');
const { buildNeighborTable } = require('../src/topology/cube-sphere');
const { runClimateStage } = require('../src/generate/climate-stage');
const { normalizePlanet } = require('../src/planet/params');
const { scoreContinent, buildIdealCells, cellAt } = require('../test/support/ideal-worlds');

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
}

const n = Number(arg('n', 48));
const params = arg('params-file') ? JSON.parse(fs.readFileSync(arg('params-file'), 'utf8')) : JSON.parse(arg('params', '{}'));
const planet = normalizePlanet({});
const neighborTable = buildNeighborTable(n);

const continent = buildIdealCells('continent', n, planet);
runClimateStage(continent, neighborTable, planet, 'continent', { resolutionDeg: 2, atmosphere: params });
const s = scoreContinent((lat, lon) => cellAt(continent, n, lat, lon));
console.log(`hypothetical continent: ${s.hits}/${s.total} targets, loss ${s.loss.toFixed(3)}`);
for (const r of s.results) {
  console.log(`  ${r.hit ? 'ok  ' : 'MISS'} ${String(r.lat).padStart(4)} ${r.side}  ${r.koppen.padEnd(4)} ${String(r.precip).padStart(5)} mm   want ${r.expected} ${r.range[0]}-${r.range[1]}`);
}
const groups = {};
let area = 0;
for (const c of continent.values()) {
  if (!c.isLand || !c.koppen) continue;
  groups[c.koppen[0]] = (groups[c.koppen[0]] || 0) + c.areaWeight;
  area += c.areaWeight;
}
console.log('  koppen', Object.keys(groups).sort().map((g) => `${g} ${Math.round(groups[g] / area * 100)}%`).join('  '));

const aqua = buildIdealCells('aquaplanet', n, planet);
runClimateStage(aqua, neighborTable, planet, 'aquaplanet', { resolutionDeg: 2, atmosphere: params });
const bands = {};
for (const c of aqua.values()) {
  const b = Math.round(c.lat / 10) * 10;
  bands[b] = bands[b] || [0, 0];
  bands[b][0] += c.precip;
  bands[b][1]++;
}
console.log('aquaplanet zonal P:', Object.keys(bands).sort((a, b) => a - b).map((b) => `${b}:${Math.round(bands[b][0] / bands[b][1])}`).join(' '));
