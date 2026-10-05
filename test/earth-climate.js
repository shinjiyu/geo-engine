'use strict';

/**
 * Earth regression: real relief through the climate and drainage stages, scored against
 * observed climatologies (GPCC precipitation, NCEP temperature) and known geography.
 */

const assert = require('node:assert/strict');
const { buildNeighborTable, cellKey } = require('../src/topology/cube-sphere');
const { runClimateStage } = require('../src/generate/climate-stage');
const { runHydrology } = require('../src/generate/hydrology');
const { scourGlacialBasins } = require('../src/generate/glacial-scour');
const { normalizePlanet } = require('../src/planet/params');
const { loadEarthClimatology } = require('./support/earth-reference');
const { buildEarthCells, cellAt, score } = require('./support/earth-climate-score');

console.log('earth climate test...');

const LIMITS = { rLog: 0.6, zonalRmse: 280, regionHits: 9, holdoutHits: 24 };
const n = 48;
const planet = normalizePlanet({});
const cells = buildEarthCells(n, planet);
const neighborTable = buildNeighborTable(n);

for (const [name, lat, lon] of [['Hudson Bay', 60, -85], ['Baltic', 58, 19], ['Black Sea', 43, 34], ['Red Sea', 21, 38], ['Persian Gulf', 27, 51]]) {
  assert.equal(cellAt(cells, n, lat, lon).isLand, false, `${name} stays connected to the ocean`);
}
assert.equal(cellAt(cells, n, 42, 50).isLand, true, 'the Caspian is not part of the world ocean');

runClimateStage(cells, neighborTable, planet, 'earth', { resolutionDeg: 2 });
const s = score(cells, n, planet, loadEarthClimatology());
console.log(`  budget ${JSON.stringify(s.budget)}`);
console.log(`  precip ${JSON.stringify(s.precip)} regions ${s.regionHits} holdout ${s.holdoutHits}`);
console.log(`  temp ${JSON.stringify(s.temp)}`);

assert.ok(s.budget.landPrecipMm > 550 && s.budget.landPrecipMm < 950, `land precipitation ${s.budget.landPrecipMm} mm/yr (obs ~720)`);
assert.ok(s.budget.oceanEvapMm > 950 && s.budget.oceanEvapMm < 1500, `ocean evaporation ${s.budget.oceanEvapMm} mm/yr (obs ~1200)`);
assert.ok(s.budget.landRunoffMm > 150 && s.budget.landRunoffMm < 450, `land runoff ${s.budget.landRunoffMm} mm/yr (obs ~300)`);
assert.ok(s.precip.rLog >= LIMITS.rLog, `log precipitation correlation ${s.precip.rLog}`);
assert.ok(s.precip.zonalRmse <= LIMITS.zonalRmse, `zonal precipitation RMSE ${s.precip.zonalRmse} mm`);
assert.ok(Math.abs(s.precip.aridPct.model - s.precip.aridPct.obs) <= 6, `arid land ${s.precip.aridPct.model}% vs ${s.precip.aridPct.obs}%`);
assert.ok(s.temp.oceanRmse <= 2.8, `ocean temperature RMSE ${s.temp.oceanRmse} C`);
assert.ok(s.temp.landRmse <= 4, `land temperature RMSE ${s.temp.landRmse} C`);
assert.ok(Number(s.regionHits.split('/')[0]) >= LIMITS.regionHits, `regions within x1.6: ${s.regionHits}`);
assert.ok(Number(s.holdoutHits.split('/')[0]) >= LIMITS.holdoutHits, `held-out regions within x1.6: ${s.holdoutHits}`);

const KOPPEN_OBS = { A: 19, B: 30, C: 13, D: 25, E: 13 };
const koppen = {};
let koppenArea = 0;
for (const c of cells.values()) {
  if (!c.isLand || c.isLake || !c.koppen) continue;
  koppen[c.koppen[0]] = (koppen[c.koppen[0]] || 0) + c.areaWeight;
  koppenArea += c.areaWeight;
}
for (const [group, obs] of Object.entries(KOPPEN_OBS)) {
  const pct = Math.round((koppen[group] || 0) / koppenArea * 100);
  assert.ok(Math.abs(pct - obs) <= 8, `Koppen ${group} covers ${pct}% of land (obs ~${obs}%)`);
}

scourGlacialBasins(cells, neighborTable, planet, 'earth');
const { rivers, lakes } = runHydrology(cells, n, { planet, neighborTable });
const mains = rivers.filter((r) => r.kind === 'main').sort((a, b) => b.dischargeKm3 - a.dischargeKm3);
const mouthOf = (r) => cells.get(r.cells[r.cells.length - 1]);
const amazon = mouthOf(mains[0]);
assert.ok(Math.abs(amazon.lat) < 6 && Math.abs(amazon.lon + 50) < 6, `largest river reaches the sea near the Amazon mouth (${amazon.lat}, ${amazon.lon})`);
const arctic = mains.filter((r) => mouthOf(r).lat > 60 && r.dischargeKm3 > 100);
assert.ok(arctic.length >= 2, 'large rivers drain into the Arctic');
for (const r of arctic) assert.ok(r.floodMonth >= 5 && r.floodMonth <= 7, `Arctic river floods with snowmelt (month ${r.floodMonth})`);

const nileCell = cellAt(cells, n, 23, 31);
const nileKey = cellKey(nileCell.face, nileCell.u, nileCell.v);
let nile = rivers.find((r) => r.cells.includes(nileKey));
assert.ok(nile, 'a river follows the Nile through Egypt');
while (nile.parentId) nile = rivers.find((r) => r.id === nile.parentId);
const nileMouth = mouthOf(nile);
assert.ok(nileMouth.lat > 28 && nileMouth.lon > 25 && nileMouth.lon < 34,
  `the Nile reaches the Mediterranean (${nileMouth.lat}, ${nileMouth.lon})`);
assert.ok(lakes.some((l) => {
  const c = cells.get(l.cells[0]);
  return !l.freshwater && Math.abs(c.lat - 42) < 6 && Math.abs(c.lon - 50) < 8;
}), 'the Caspian remains a closed lake');

console.log(`  hydrology rivers=${rivers.length} lakes=${lakes.length} nileMouth=${nileMouth.lat.toFixed(1)},${nileMouth.lon.toFixed(1)}`);
console.log('earth climate test passed');
