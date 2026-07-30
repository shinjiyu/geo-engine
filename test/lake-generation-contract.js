'use strict';

const assert = require('node:assert/strict');
const { detectLakes } = require('../src/generate/surface-features');
const { colorForCell } = require('../src/map/raster');

console.log('lake generation contract test...');

const cells = new Map([
  ['0:0:0', {
    face: 0, u: 0, v: 0, elevation: 700, isLand: true, isLake: false,
    runoff: 80, precip: 600, areaWeight: 1, terrain: 'plain'
  }],
  ['0:1:0', {
    face: 0, u: 1, v: 0, elevation: 980, isLand: true, isLake: false,
    runoff: 40, precip: 500, areaWeight: 1, terrain: 'plain'
  }],
  ['0:0:1', {
    face: 0, u: 0, v: 1, elevation: 1020, isLand: true, isLake: false,
    runoff: 35, precip: 500, areaWeight: 1, terrain: 'plain'
  }]
]);
const neighbors = new Map([
  ['0:0:0', ['0:1:0', '0:0:1']],
  ['0:1:0', ['0:0:0']],
  ['0:0:1', ['0:0:0']]
]);
const lakes = detectLakes(cells, neighbors, {
  radiusKm: 6371,
  seaLevelM: 900
}, {
  minLakeAreaKm2: 1000
});

assert.equal(lakes.length, 1, 'a wet enclosed depression should become a lake');
assert.ok(lakes[0].areaKm2 >= 1000, 'lake must expose physical area');
assert.equal(lakes[0].freshwater, true);
assert.equal(cells.get('0:0:0').isLake, true);

const lakeColor = colorForCell(
  { terrain: 'lake', isLand: false, isLake: true, river: false },
  'terrain',
  {},
  new Map()
);
assert.ok(lakeColor[2] > lakeColor[1], 'lake terrain must render blue');

console.log('lake generation contract test passed');
