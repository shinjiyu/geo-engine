'use strict';

const { createRng } = require('../core/seed-rng');

function fade(t) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function grad3(hash, x, y, z) {
  const h = hash & 15;
  const u = h < 8 ? x : y;
  const v = h < 4 ? y : (h === 12 || h === 14 ? x : z);
  return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
}

/** Deterministic 3D value noise in [-1, 1] from seed string + integer coords */
function makeNoise3D(seed) {
  const rng = createRng(seed + ':noise');
  const perm = new Uint8Array(512);
  const base = new Uint8Array(256);
  for (let i = 0; i < 256; i++) base[i] = i;
  const shuffled = rng.shuffle([...base]);
  for (let i = 0; i < 256; i++) {
    perm[i] = shuffled[i];
    perm[i + 256] = shuffled[i];
  }

  return function noise3D(x, y, z) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);
    const u = fade(x);
    const v = fade(y);
    const w = fade(z);
    const A = perm[X] + Y;
    const AA = perm[A] + Z;
    const B = perm[X + 1] + Y;
    const BA = perm[B] + Z;
    return lerp(
      lerp(
        lerp(grad3(perm[AA], x, y, z), grad3(perm[BA], x - 1, y, z), u),
        lerp(grad3(perm[AA + 1], x, y - 1, z), grad3(perm[BA + 1], x - 1, y - 1, z), u),
        v
      ),
      lerp(
        lerp(grad3(perm[AA + 256], x, y, z - 1), grad3(perm[BA + 256], x - 1, y, z - 1), u),
        lerp(grad3(perm[AA + 257], x, y - 1, z - 1), grad3(perm[BA + 257], x - 1, y - 1, z - 1), u),
        v
      ),
      w
    );
  };
}

function fbm(noise3D, x, y, z, octaves = 5) {
  let amp = 1;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += noise3D(x * freq, y * freq, z * freq) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

module.exports = { makeNoise3D, fbm };
