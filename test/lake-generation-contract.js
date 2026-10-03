'use strict';

const assert = require('node:assert/strict');
const { runDrainage } = require('../src/generate/drainage');
const { normalizePlanet } = require('../src/planet/params');
const { colorForCell } = require('../src/map/raster');

console.log('lake generation contract test...');

// ocean — A — B (rim) — C (closed depression) — D — E (source)
function profile(runoffMm) {
  const elev = { O: 0, A: 1000, B: 1200, C: 700, D: 1250, E: 1300 };
  const order = ['O', 'A', 'B', 'C', 'D', 'E'];
  const cells = new Map(order.map((id, i) => [id, {
    face: 0, u: i, v: 0, lat: 0, lon: i * 2,
    elevation: elev[id], isLand: id !== 'O', isLake: false,
    runoff: id === 'O' ? 0 : runoffMm, precip: 0, tempC: 15, areaWeight: 1, terrain: 'plain'
  }]));
  const neighbors = new Map(order.map((id, i) => [id, [order[i - 1], order[i + 1]].filter(Boolean)]));
  return { cells, neighbors };
}
const planet = normalizePlanet({ seaLevelM: 900 });
const options = { minRiverAreaKm2: 1, minRiverLengthKm: 0, minLakeAreaKm2: 1000 };

const wet = profile(500);
const wetResult = runDrainage(wet.cells, wet.neighbors, planet, options);
assert.equal(wetResult.lakes.length, 1, 'a wet enclosed depression should become a lake');
const lake = wetResult.lakes[0];
assert.deepEqual(lake.cells, ['C']);
assert.ok(lake.areaKm2 >= 1000, 'lake must expose physical area');
assert.equal(lake.outflow, 'open', 'inflow above evaporation must overflow the rim');
assert.equal(lake.freshwater, true, 'an overflowing lake is fresh');
assert.equal(lake.waterLevelM, 1200, 'an open lake stands at its spill level');
assert.equal(wet.cells.get('C').isLake, true);
assert.equal(wet.cells.get('C').isLand, false);
assert.equal(lake.inflowRiverIds.length, 1, 'the upland river must end in the lake');
assert.ok(lake.outflowRiverId, 'the overflow must continue as a river');
const outflow = wetResult.rivers.find((r) => r.id === lake.outflowRiverId);
assert.equal(outflow.mouth.type, 'ocean');
assert.deepEqual(outflow.cells, ['B', 'A']);
assert.ok(wetResult.rivers.every((r) => r.cells.every((k) => !wet.cells.get(k).isLake)),
  'river paths must not run through lake cells');

const dry = profile(10);
const dryResult = runDrainage(dry.cells, dry.neighbors, planet, options);
assert.equal(dryResult.lakes.length, 0, 'evaporation above inflow leaves a dry terminal basin');
assert.equal(dry.cells.get('C').isLand, true);
assert.equal(dry.cells.get('C').endorheic, true, 'the basin drains nowhere');
assert.ok(dry.cells.get('B').flow < dry.cells.get('C').flow, 'nothing spills over the rim of a dry basin');

const lakeColor = colorForCell(
  { terrain: 'lake', isLand: false, isLake: true, river: false },
  'terrain',
  {},
  new Map()
);
assert.ok(lakeColor[2] > lakeColor[1], 'lake terrain must render blue');

console.log('lake generation contract test passed');
