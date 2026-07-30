'use strict';

const assert = require('node:assert/strict');

global.window = {};
require('../public/mesh-view');

const mesh = {
  positions: new Float32Array([
    1, 0, 0,
    0.98, 0.2, 0,
    0.92, 0.38, 0,
    0.82, 0.56, 0
  ])
};
const edges = new Uint16Array([0, 1, 1, 2, 2, 3]);
const flow = new Float64Array([3, 4, 5, 6]);
const kinds = new Uint8Array([0, 0, 0]);
const isLand = new Uint8Array([1, 1, 1, 0]);
const isLake = new Uint8Array([0, 0, 1, 0]);

const geometry = window.MeshViewer.buildRiverGeometry(
  mesh,
  edges,
  flow,
  6,
  kinds,
  isLand,
  isLake
);

assert.equal(geometry.edgeCount, 1, 'only dry-land river edge should be rendered');
assert.equal(geometry.vertexCount, 6, 'one river edge renders one quad');

delete global.window;
console.log('surface render contract test passed');
