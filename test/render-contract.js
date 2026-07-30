'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

console.log('geo-engine render contract test...');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'public', 'mesh-view.js'),
  'utf8'
);
const globeSource = fs.readFileSync(
  path.join(__dirname, '..', 'public', 'globe-gl.js'),
  'utf8'
);

const displacement = source.match(/const DISP_SCALE = ([0-9.]+);/);
assert.ok(displacement, 'mesh viewer must declare DISP_SCALE');
assert.ok(Number(displacement[1]) <= 0.04, 'terrain displacement must stay under 4%');
assert.match(
  source,
  /float depth = clamp\(-p\.z \/ uMaxRadius, -1\.0, 1\.0\);/,
  'front hemisphere must map closer than the back hemisphere'
);
assert.match(
  globeSource,
  /gl_Position = vec4\(ndc, -p\.z, 1\.0\);/,
  'persisted globe must map the front hemisphere closer than the back hemisphere'
);
assert.match(
  globeSource,
  /new Uint8Array\(\[18, 42, 62, 255\]\)/,
  'persisted globe must render a placeholder while its raster loads'
);

const browser = { window: {} };
vm.runInNewContext(globeSource, browser);
const { rotMat3, invRotMat3, mulMat3Vec } = browser.window.GlobeGlViewer._test;
const rotation = rotMat3(0.73, -1.17);
const inverse = invRotMat3(0.73, -1.17);
const sourceVector = { x: 0.31, y: -0.47, z: 0.826438 };
const rotated = mulMat3Vec(rotation, sourceVector.x, sourceVector.y, sourceVector.z);
const restored = mulMat3Vec(inverse, rotated.x, rotated.y, rotated.z);
const sourceLength = Math.hypot(sourceVector.x, sourceVector.y, sourceVector.z);
const rotatedLength = Math.hypot(rotated.x, rotated.y, rotated.z);
assert.ok(Math.abs(rotatedLength - sourceLength) < 1e-6, 'rotation must not deform the sphere');
assert.ok(Math.abs(restored.x - sourceVector.x) < 1e-6);
assert.ok(Math.abs(restored.y - sourceVector.y) < 1e-6);
assert.ok(Math.abs(restored.z - sourceVector.z) < 1e-6);

console.log('render contract test passed');
