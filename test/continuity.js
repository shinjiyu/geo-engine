'use strict';

const assert = require('node:assert/strict');
const { createWorld } = require('../src/world-builder');
const { sampleTerrainAtUnitVector } = require('../src/generate/terrain');
const { faceUVToVector } = require('../src/topology/cube-sphere');
const { buildMercatorRaster } = require('../src/map/raster');

console.log('continuity test...');

const world = createWorld({
  seed: 'continuity-test',
  grid: { cellsPerFaceEdge: 64 },
  seedWorld: { magic: 'low', races: ['human'], geography: 'forest' }
});

const n = 64;
const opts = { planet: world.config.planet, withCoast: false };

for (let face = 0; face < 6; face++) {
  const edgeU = faceUVToVector(face, n - 1, Math.floor(n / 2), n);
  const innerU = faceUVToVector(face, n - 2, Math.floor(n / 2), n);
  const a = sampleTerrainAtUnitVector(world.seed, edgeU.x, edgeU.y, edgeU.z, opts);
  const b = sampleTerrainAtUnitVector(world.seed, innerU.x, innerU.y, innerU.z, opts);
  assert.ok(Math.abs(a.elevation - b.elevation) < 450, `face ${face} edge elevation jump too large`);
}

const raster = buildMercatorRaster(world, { width: 64, height: 64, layer: 'elevation' });
assert.equal(raster.projection, 'web-mercator');
console.log('  mercator elevation raster ok');
console.log('continuity test passed');
