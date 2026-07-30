'use strict';

const { makeNoise3D, fbm } = require('./noise');

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function ridgedFbm(noise3D, x, y, z, octaves, persistence, lacunarity) {
  octaves = octaves ?? 4;
  persistence = persistence ?? 0.45;
  lacunarity = lacunarity ?? 2.1;
  let amp = 1;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    let n = 1 - Math.abs(noise3D(x * freq, y * freq, z * freq));
    n *= n;
    sum += n * amp;
    norm += amp;
    amp *= persistence;
    freq *= lacunarity;
  }
  return sum / norm;
}

/** Earth-like elevation on S² — keep in sync with public/terrain-sampler.js */
function createElevationField(seed) {
  const macro = makeNoise3D(seed);
  const basinN = makeNoise3D(`${seed}:basin`);
  const hillN = makeNoise3D(`${seed}:hill`);
  const ridge = makeNoise3D(`${seed}:ridge`);
  const warpX = makeNoise3D(`${seed}:wx`);
  const warpY = makeNoise3D(`${seed}:wy`);
  const warpZ = makeNoise3D(`${seed}:wz`);

  return function sampleHeight(x, y, z) {
    const len = Math.hypot(x, y, z) || 1;
    x /= len;
    y /= len;
    z /= len;

    const ws = 0.38;
    const wx = fbm(warpX, x * ws, y * ws, z * ws, 3);
    const wy = fbm(warpY, x * ws, y * ws, z * ws, 3);
    const wz = fbm(warpZ, x * ws, y * ws, z * ws, 3);
    const wl = Math.hypot(wx, wy, wz) || 1;
    const k = 0.28 / wl;
    const dx = x + wx * k;
    const dy = y + wy * k;
    const dz = z + wz * k;
    const dl = Math.hypot(dx, dy, dz) || 1;
    const px = dx / dl;
    const py = dy / dl;
    const pz = dz / dl;

    const continent = fbm(macro, px * 0.55, py * 0.55, pz * 0.55, 4);
    const basin = fbm(basinN, px * 0.42, py * 0.42, pz * 0.42, 3);
    const hills = fbm(hillN, px * 1.05, py * 1.05, pz * 1.05, 2);
    const mountains = ridgedFbm(ridge, px * 0.9, py * 0.9, pz * 0.9, 3);

    const uplift = smoothstep(0, 0.35, continent * 0.55 + 0.15);
    let h = continent * 0.5 + basin * 0.28 + hills * 0.12;
      h += mountains * uplift * 0.42;

      return Math.round((h * 3400 + 850) * 10) / 10;
  };
}

module.exports = { createElevationField, ridgedFbm, smoothstep };
