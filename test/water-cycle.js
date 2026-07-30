'use strict';

const assert = require('node:assert/strict');
const { simulateWaterCycle, WATER_CYCLE_RULES } = require('../src/generate/water-cycle');
const { normalizePlanet } = require('../src/planet/params');

console.log('water-cycle test...');

const planet = normalizePlanet({ obliquity: 23.44, rotationDirection: 1 });
const n = 4;
const grid = {
  n,
  neighbors: [[1, 2], [0, 3], [0, 3], [1, 2]],
  elevation: [0, 800, 200, 50],
  isLand: [false, true, true, true],
  lat: [0, 15, 18, 12],
  lon: [0, 10, 20, 5],
  tempC: [28, 26, 24, 27]
};

const result = simulateWaterCycle(grid, planet, { weeks: 52 });
assert.equal(result.weeks, 52);
assert.ok(result.annualPrecip[0] >= 0);
assert.ok(result.annualEvap[0] > 0);
assert.ok(result.annualPrecip[1] >= result.annualPrecip[3], 'uplift cell wetter');
assert.ok(WATER_CYCLE_RULES.steps.length >= 5);
console.log('  ocean precip mm/a:', result.annualPrecip[0]);
console.log('  mountain precip mm/a:', result.annualPrecip[1]);
console.log('water-cycle test passed');
