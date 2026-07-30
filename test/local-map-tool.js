'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createWorld } = require('../src/world-builder');
const { buildRegionRaster } = require('../src/map/raster');

console.log('local map tool test...');

const world = createWorld({
  seed: 'local-map-contract',
  grid: { cellsPerFaceEdge: 16 },
  seedWorld: { magic: 'mid', races: ['human'] }
});
const raster = buildRegionRaster(world, {
  centerLat: 24.5,
  centerLon: 112.2,
  span: 12,
  width: 320,
  height: 220,
  layer: 'magic'
});
assert.equal(raster.projection, 'azimuthal-equidistant-cartographic');
assert.equal(raster.centerLat, 24.5);
assert.equal(raster.centerLon, 112.2);
assert.equal(raster.width, 320);
assert.equal(raster.height, 220);
assert.ok(raster.scaleKmPerPixel > 0);
assert.equal(raster.invalidRiverTermini, 0, 'rendered rivers must not terminate inside visible land');
assert.ok(raster.rgba.length > 1000);

const firstRiver = world.rivers[0];
assert.ok(firstRiver?.cells?.length, 'test world should contain a river path');
const riverCell = world.cells[firstRiver.cells[Math.floor(firstRiver.cells.length / 2)]];
const riverRaster = buildRegionRaster(world, {
  centerLat: riverCell.lat,
  centerLon: riverCell.lon,
  span: 10,
  width: 320,
  height: 220,
  layer: 'terrain'
});
const riverPixels = Buffer.from(riverRaster.rgba, 'base64');
assert.equal(riverRaster.invalidRiverTermini, 0);
assert.ok(riverRaster.visibleRiverOutlets > 0, 'visible river network must drain to coast or map edge');
let exactRiverBlue = 0;
for (let i = 0; i < riverPixels.length; i += 4) {
  if (riverPixels[i] === 41 && riverPixels[i + 1] === 126 && riverPixels[i + 2] === 190) {
    exactRiverBlue++;
  }
}
assert.ok(exactRiverBlue > 0, 'cartographic sheet should draw river centre-lines');
assert.ok(
  exactRiverBlue < riverRaster.width * riverRaster.height * 0.03,
  `river centre-lines must stay sparse, got ${(exactRiverBlue / (riverRaster.width * riverRaster.height) * 100).toFixed(1)}%`
);
for (let by = 0; by < riverRaster.height - 8; by += 8) {
  for (let bx = 0; bx < riverRaster.width - 8; bx += 8) {
    let blueInBlock = 0;
    for (let y = by; y < by + 8; y++) {
      for (let x = bx; x < bx + 8; x++) {
        const i = (y * riverRaster.width + x) * 4;
        if (riverPixels[i] === 41 && riverPixels[i + 1] === 126 && riverPixels[i + 2] === 190) {
          blueInBlock++;
        }
      }
    }
    assert.ok(blueInBlock < 48, 'river rendering must not create solid 8×8 water blocks');
  }
}

const indexSource = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
const serverSource = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
assert.doesNotMatch(indexSource, /<option value="realms">/, 'realm layer should not appear in geography UI');
assert.match(indexSource, /<option value="magic">魔法浓度<\/option>/);
assert.match(indexSource, /id="btnOpenRegion"/);
assert.match(indexSource, /id="regionMapCanvas"/);
assert.match(serverSource, /parts\[3\] === 'region'/, 'server must expose the regional raster endpoint');

console.log('local map tool test passed');
