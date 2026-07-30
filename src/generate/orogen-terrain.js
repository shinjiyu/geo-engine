'use strict';

const { faceUVToVector } = require('../topology/cube-sphere');
const { generateFromPositions } = require('./orogen-runtime.cjs');

const cache = new Map();

function seedToUint32(seed) {
  const text = String(seed);
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function buildCubeSpherePositions(n) {
  const out = new Float32Array(6 * n * n * 3);
  let index = 0;
  for (let face = 0; face < 6; face++) {
    for (let u = 0; u < n; u++) {
      for (let v = 0; v < n; v++) {
        const { x, y, z } = faceUVToVector(face, u, v, n);
        // World Orogen's source mesh treats z as latitude; rotate geo-engine's
        // y-up convention into that frame without changing cell ordering.
        out[index++] = x;
        out[index++] = z;
        out[index++] = y;
      }
    }
  }
  return out;
}

function generateOrogenTerrain(seed, n, options = {}) {
  const numericSeed = seedToUint32(seed);
  const cacheKey = `${numericSeed}:${n}:${JSON.stringify(options)}`;
  if (!cache.has(cacheKey)) {
    const positions = buildCubeSpherePositions(n);
    cache.set(cacheKey, generateFromPositions(positions, numericSeed, options));
  }
  return cache.get(cacheKey);
}

module.exports = {
  buildCubeSpherePositions,
  generateOrogenTerrain,
  seedToUint32
};
