#!/usr/bin/env node
'use strict';

/**
 * Runs climate + drainage on real Earth relief and lists the largest rivers and lakes,
 * for comparison with real-world discharge, seasonality and endorheic basins.
 *
 * Usage: node scripts/earth-hydrology-report.js [--n 64] [--res 2]
 */

const { buildNeighborTable } = require('../src/topology/cube-sphere');
const { runClimateStage } = require('../src/generate/climate-stage');
const { runHydrology } = require('../src/generate/hydrology');
const { normalizePlanet } = require('../src/planet/params');
const { buildEarthCells } = require('../test/support/earth-climate-score');

const MONTHS = 'JFMAMJJASOND';

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : fallback;
}

function main() {
  const n = Number(arg('--n', 64));
  const planet = normalizePlanet({});
  const cells = buildEarthCells(n, planet);
  const neighborTable = buildNeighborTable(n);
  const res = arg('--res', null);
  runClimateStage(cells, neighborTable, planet, 'earth', res ? { resolutionDeg: Number(res) } : {});
  const { rivers, lakes, stats } = runHydrology(cells, n, { planet, neighborTable });

  const at = (key) => cells.get(key);
  console.log(`n=${n} rivers=${rivers.length} lakes=${lakes.length}`, JSON.stringify(stats));
  console.log('largest main rivers (mouth lat/lon, km3/yr, length, flood month, regime):');
  for (const r of rivers.filter((x) => x.kind === 'main').sort((a, b) => b.dischargeKm3 - a.dischargeKm3).slice(0, 15)) {
    const mouth = at(r.cells[r.cells.length - 1]);
    const src = at(r.cells[0]);
    const regime = r.monthlyFlowKm3
      ? r.monthlyFlowKm3.map((v) => {
        const mean = r.dischargeKm3 / 12;
        return v > 1.5 * mean ? MONTHS[r.monthlyFlowKm3.indexOf(v)] : v < 0.5 * mean ? '.' : '-';
      }).join('')
      : '';
    console.log(`  ${String(Math.round(r.dischargeKm3)).padStart(6)} km3  mouth ${mouth.lat.toFixed(0).padStart(4)},${mouth.lon.toFixed(0).padStart(5)}  src ${src.lat.toFixed(0)},${src.lon.toFixed(0)}  ${String(r.lengthKm).padStart(5)} km  flood ${r.floodMonth ?? '-'}  ${regime}  -> ${r.mouth.type}`);
  }
  console.log('lakes (centre, area km2, open/closed, inflow km3):');
  for (const l of [...lakes].sort((a, b) => b.areaKm2 - a.areaKm2).slice(0, 12)) {
    const cs = l.cells.map(at);
    const lat = cs.reduce((s, c) => s + c.lat, 0) / cs.length;
    const lon = cs.reduce((s, c) => s + c.lon, 0) / cs.length;
    console.log(`  ${lat.toFixed(0).padStart(4)},${lon.toFixed(0).padStart(5)}  ${String(Math.round(l.areaKm2)).padStart(8)} km2  ${l.outflow.padEnd(6)} ${l.freshwater ? 'fresh ' : 'saline'} inflow ${l.inflowKm3}`);
  }
}

main();
