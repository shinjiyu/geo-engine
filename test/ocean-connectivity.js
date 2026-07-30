'use strict';

const assert = require('node:assert/strict');
const { resolveOceanMask } = require('../src/generate/ocean-connectivity');

console.log('ocean-connectivity test...');

const neighbors = [[1], [0], [3], [2]];
const isLand = [true, false, true, false];
const result = resolveOceanMask(isLand, neighbors);

assert.equal(result.oceanComponents, 2);
assert.equal(result.basinsFilled, 1);
assert.equal(result.isLand[1], 0);
assert.equal(result.isLand[3], 1);

const neighbors2 = [[], [0, 2], []];
const isLand2 = [false, true, false];
const r2 = resolveOceanMask(isLand2, neighbors2);
assert.equal(r2.oceanComponents, 2);
assert.equal(r2.basinsFilled, 1);
assert.equal(r2.isLand[0] + r2.isLand[2], 1);

console.log('ocean-connectivity test passed');
