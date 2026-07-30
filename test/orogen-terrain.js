'use strict';

const assert = require('node:assert/strict');
const {
  buildCubeSpherePositions,
  generateOrogenTerrain
} = require('../src/generate/orogen-terrain');
const { generateTerrain } = require('../src/generate/terrain');

console.log('World Orogen terrain test...');

const n = 16;
const positions = buildCubeSpherePositions(n);
assert.equal(positions.length, 6 * n * n * 3, 'one xyz position per Cube-sphere cell');

const options = { plateCount: 16, continentCount: 4, landCoverage: 0.3 };
const first = generateOrogenTerrain('orogen-contract-v1', n, options);
const second = generateOrogenTerrain('orogen-contract-v1', n, options);

assert.equal(first.elevationM.length, 6 * n * n);
assert.deepEqual(first.elevationM, second.elevationM, 'same seed must reproduce exact elevations');
assert.deepEqual(first.plateIds, second.plateIds, 'same seed must reproduce exact plates');

const land = first.elevationM.filter((elevation) => elevation > 0);
const landFraction = land.length / first.elevationM.length;
assert.ok(landFraction >= 0.2 && landFraction <= 0.4,
  `land coverage should remain near target, got ${landFraction.toFixed(3)}`);

const sorted = [...first.elevationM].sort((a, b) => a - b);
const p05 = sorted[Math.floor(sorted.length * 0.05)];
const p95 = sorted[Math.floor(sorted.length * 0.95)];
assert.ok(p95 - p05 > 1500, `expected meaningful relief, got ${p95 - p05}m`);
assert.ok(Math.max(...land) > 2500, 'plate model should create mountain-scale elevations');

const boundaryCount = first.plateBoundary.filter(Boolean).length;
assert.ok(boundaryCount > first.elevationM.length * 0.05, 'plate boundaries should be represented');
assert.ok(new Set(first.plateIds).size >= 10, 'most configured plates should reach the mesh');

const fallback = generateTerrain('noise-fallback-contract', 16, { backend: 'noise' });
assert.equal(fallback.terrainBackend, 'noise');
assert.equal(fallback.values().next().value.plateId, null);

console.log(`World Orogen terrain test passed (${(landFraction * 100).toFixed(1)}% land, ${boundaryCount} boundary cells)`);
