'use strict';

const assert = require('node:assert/strict');
const { createWorld } = require('../src/world-builder');
const {
  buildEquirectRaster,
  buildMercatorRaster,
  buildFaceRaster,
  pickCellAtLatLon,
  VALID_LAYERS,
  colorForCell
} = require('../src/map/raster');

console.log('geo-engine map smoke test...');

const world = createWorld({
  seed: 'map-smoke',
  grid: { cellsPerFaceEdge: 32 },
  seedWorld: { magic: 'low', races: ['human', 'elf'], geography: 'forest' }
});

for (const layer of VALID_LAYERS) {
  const t0 = Date.now();
  const raster = buildEquirectRaster(world, { width: 256, height: 128, layer });
  assert.equal(raster.width, 256);
  assert.ok(raster.rgba.length > 1000);
  console.log(`  equirect ${layer}: ${Date.now() - t0}ms`);
}

const merc = buildMercatorRaster(world, { width: 256, height: 256, layer: 'terrain' });
assert.equal(merc.projection, 'web-mercator');
assert.equal(merc.width, 256);
console.log('  mercator terrain ok');

const face = buildFaceRaster(world, 0, { layer: 'terrain', scale: 2 });
assert.equal(face.width, 64);
assert.equal(face.height, 64);
assert.ok(face.rgba.length > 100, 'face rgba should not be empty');

const pick = pickCellAtLatLon(world, 10, 45);
assert.ok(pick);
assert.ok(pick.terrain);
console.log(`  pick @ 10°,45°: ${pick.terrain} ${pick.elevation}m`);

const lakeCell = { terrain: 'lake', isLand: false, isLake: true, river: true };
assert.deepEqual(
  colorForCell(lakeCell, 'terrain', {}, new Map()),
  colorForCell({ ...lakeCell, river: false }, 'terrain', {}, new Map()),
  'river overlay must not paint over lake or ocean cells'
);

console.log('map smoke test passed');
