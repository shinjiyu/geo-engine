/**
 * Browser terrain sampler — keep in sync with src/generate/noise.js + terrain.js
 */
(function (global) {
  const TERRAIN_COLORS = {
    deep_ocean: [12, 28, 58],
    ocean: [28, 72, 120],
    coast: [196, 178, 128],
    plain: [96, 148, 72],
    hill: [72, 108, 56],
    mountain: [120, 108, 96],
    snow: [232, 236, 244],
    ice: [200, 220, 236]
  };

  const MERCATOR_MAX_LAT = 85.05112877980659;

  function hashString(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return (h >>> 0) || 1;
  }

  function createRng(seedStr) {
    let state = hashString(String(seedStr));
    return {
      next() {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      },
      int(min, max) {
        return Math.floor(this.next() * (max - min + 1)) + min;
      }
    };
  }

  function makeNoise3D(seed) {
    const rng = createRng(seed + ':noise');
    const perm = new Uint8Array(512);
    const base = new Uint8Array(256);
    for (let i = 0; i < 256; i++) base[i] = i;
    const shuffled = base.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = rng.int(0, i);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
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
      const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
      const u = fade(x); const v = fade(y); const w = fade(z);
      const grad3 = (hash, gx, gy, gz) => {
        const h = hash & 15;
        const uu = h < 8 ? gx : gy;
        const vv = h < 4 ? gy : (h === 12 || h === 14 ? gx : gz);
        return ((h & 1) ? -uu : uu) + ((h & 2) ? -vv : vv);
      };
      const A = perm[X] + Y;
      const AA = perm[A] + Z;
      const B = perm[X + 1] + Y;
      const BA = perm[B] + Z;
      const lerp = (a, b, t) => a + (b - a) * t;
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

  function fbm(noise3D, x, y, z, octaves, persistence, lacunarity) {
    octaves = octaves ?? 5;
    persistence = persistence ?? 0.5;
    lacunarity = lacunarity ?? 2;
    let amp = 1; let freq = 1; let sum = 0; let norm = 0;
    for (let i = 0; i < octaves; i++) {
      sum += noise3D(x * freq, y * freq, z * freq) * amp;
      norm += amp;
      amp *= persistence;
      freq *= lacunarity;
    }
    return sum / norm;
  }

  /** Ridged multifractal — sharp mountain chains. */
  function ridgedFbm(noise3D, x, y, z, octaves, persistence, lacunarity) {
    octaves = octaves ?? 4;
    persistence = persistence ?? 0.45;
    lacunarity = lacunarity ?? 2.1;
    let amp = 1; let freq = 1; let sum = 0; let norm = 0;
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

  function latLonToVector(lat, lon) {
    const latR = (lat * Math.PI) / 180;
    const lonR = (lon * Math.PI) / 180;
    const cosLat = Math.cos(latR);
    return { x: cosLat * Math.sin(lonR), y: Math.sin(latR), z: cosLat * Math.cos(lonR) };
  }

  function vectorToLatLon(x, y, z) {
    return {
      lat: (Math.asin(Math.max(-1, Math.min(1, y))) * 180) / Math.PI,
      lon: (Math.atan2(x, z) * 180) / Math.PI
    };
  }

  function unitNormal(x, y, z) {
    const l = Math.hypot(x, y, z) || 1;
    return { x: x / l, y: y / l, z: z / l };
  }

  function sphereTangentNeighbors(x, y, z, eps) {
    eps = eps ?? 0.022;
    let tx; let ty; let tz;
    if (Math.abs(y) < 0.85) {
      tx = z; ty = 0; tz = -x;
    } else {
      tx = 0; ty = -z; tz = y;
    }
    const tl = Math.hypot(tx, ty, tz) || 1;
    tx /= tl; ty /= tl; tz /= tl;
    const bx = y * tz - z * ty;
    const by = z * tx - x * tz;
    const bz = x * ty - y * tx;
    return [
      unitNormal(x + tx * eps, y + ty * eps, z + tz * eps),
      unitNormal(x - tx * eps, y - ty * eps, z - tz * eps),
      unitNormal(x + bx * eps, y + by * eps, z + bz * eps),
      unitNormal(x - bx * eps, y - by * eps, z - bz * eps)
    ];
  }

  function mercatorYFromLat(latDeg) {
    const latRad = (Math.max(-MERCATOR_MAX_LAT, Math.min(MERCATOR_MAX_LAT, latDeg)) * Math.PI) / 180;
    return Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  }

  function latFromMercatorY(yMerc) {
    return ((2 * Math.atan(Math.exp(yMerc)) - Math.PI / 2) * 180) / Math.PI;
  }

  function mercatorPixelToLatLon(px, py, width, height) {
    const lon = -180 + ((px + 0.5) / width) * 360;
    const yMax = mercatorYFromLat(MERCATOR_MAX_LAT);
    const t = 1 - (py + 0.5) / height;
    const yMerc = -yMax + t * (2 * yMax);
    return { lat: latFromMercatorY(yMerc), lon };
  }

  function equirectPixelToLatLon(px, py, width, height) {
    return {
      lat: 90 - (py + 0.5) * (180 / height),
      lon: -180 + (px + 0.5) * (360 / width)
    };
  }

  function elevationColor(elevation, isLand) {
    if (!isLand) {
      const depth = Math.max(0, Math.min(1, (-elevation + 500) / 4500));
      return [
        Math.round(20 + depth * 30),
        Math.round(50 + depth * 80),
        Math.round(100 + depth * 100)
      ];
    }
    const t = Math.max(0, Math.min(1, elevation / 4000));
    return [Math.round(40 + t * 180), Math.round(90 + t * 80), Math.round(50 + t * 40)];
  }

  function createSampler(seed, planetOptions) {
    const seaLevel = planetOptions?.seaLevel ?? 0.02;
    const iceLat = 75;
    const noise3D = makeNoise3D(seed);

    function sampleRaw(x, y, z, withCoast) {
      const h = fbm(noise3D, x * 2.5 + 10, y * 2.5 + 20, z * 2.5 + 30, 6);
      const elevation = Math.round((h * 4000 + 500) * 10) / 10;
      const isLand = h > seaLevel;
      const { lat } = vectorToLatLon(x, y, z);

      let terrain = 'deep_ocean';
      if (isLand) {
        if (elevation > 3200) terrain = 'snow';
        else if (elevation > 2200) terrain = 'mountain';
        else if (elevation > 900) terrain = 'hill';
        else terrain = 'plain';
      } else if (h > seaLevel - 0.08) {
        terrain = 'ocean';
      }
      if (Math.abs(lat) > iceLat) terrain = isLand ? 'snow' : 'ice';

      if (withCoast && isLand && (terrain === 'plain' || terrain === 'hill')) {
        for (const nb of sphereTangentNeighbors(x, y, z)) {
          const n = sampleRaw(nb.x, nb.y, nb.z, false);
          if (!n.isLand) { terrain = 'coast'; break; }
        }
      }

      return { elevation, isLand, terrain };
    }

    function colorAtUnit(x, y, z, layer, withCoast) {
      const useCoast = withCoast !== undefined ? withCoast : (layer === 'terrain');
      const s = sampleRaw(x, y, z, useCoast);
      if (layer === 'elevation') return elevationColor(s.elevation, s.isLand);
      return TERRAIN_COLORS[s.terrain] || TERRAIN_COLORS.plain;
    }

    async function renderToCanvas(canvas, layer, pixelToLatLonFn, width, height, onProgress) {
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      const img = ctx.createImageData(width, height);
      const d = img.data;

      for (let py = 0; py < height; py++) {
        if (py % 8 === 0) {
          if (onProgress) onProgress(py / height);
          await new Promise((r) => requestAnimationFrame(r));
        }
        for (let px = 0; px < width; px++) {
          const { lat, lon } = pixelToLatLonFn(px, py, width, height);
          const v = latLonToVector(lat, lon);
          const c = colorAtUnit(v.x, v.y, v.z, layer);
          const i = (py * width + px) * 4;
          d[i] = c[0];
          d[i + 1] = c[1];
          d[i + 2] = c[2];
          d[i + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
      if (onProgress) onProgress(1);
    }

    return {
      sampleElevation(x, y, z) {
        const s = sampleRaw(x, y, z, false);
        return { elevation: s.elevation, isLand: s.isLand };
      },
      colorForElevation(x, y, z) {
        return colorAtUnit(x, y, z, 'elevation', false);
      },
      colorAtUnit,
      renderMercator: (c, l, w, h, p) => renderToCanvas(c, l, mercatorPixelToLatLon, w, h, p),
      renderEquirect: (c, l, w, h, p) => renderToCanvas(c, l, equirectPixelToLatLon, w, h, p)
    };
  }

  function smoothstep(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  /**
   * Earth-like elevation on S² — isotropic 3D noise, no axis-aligned seams.
   */
  function createElevationField(seed) {
    const macro = makeNoise3D(seed);
    const basinN = makeNoise3D(seed + ':basin');
    const hillN = makeNoise3D(seed + ':hill');
    const ridge = makeNoise3D(seed + ':ridge');
    const warpX = makeNoise3D(seed + ':wx');
    const warpY = makeNoise3D(seed + ':wy');
    const warpZ = makeNoise3D(seed + ':wz');

    return function sampleHeight(x, y, z) {
      const len = Math.hypot(x, y, z) || 1;
      x /= len;
      y /= len;
      z /= len;

      const ws = 0.38;
      const wx = fbm(warpX, x * ws, y * ws, z * ws, 3, 0.5, 2);
      const wy = fbm(warpY, x * ws, y * ws, z * ws, 3, 0.5, 2);
      const wz = fbm(warpZ, x * ws, y * ws, z * ws, 3, 0.5, 2);
      const wl = Math.hypot(wx, wy, wz) || 1;
      const k = 0.28 / wl;
      const dx = x + wx * k;
      const dy = y + wy * k;
      const dz = z + wz * k;
      const dl = Math.hypot(dx, dy, dz) || 1;
      const px = dx / dl;
      const py = dy / dl;
      const pz = dz / dl;

      const continent = fbm(macro, px * 0.55, py * 0.55, pz * 0.55, 4, 0.52, 2);
      const basin = fbm(basinN, px * 0.42, py * 0.42, pz * 0.42, 3, 0.48, 2);
      const hills = fbm(hillN, px * 1.05, py * 1.05, pz * 1.05, 2, 0.35, 2.2);
      const mountains = ridgedFbm(ridge, px * 0.9, py * 0.9, pz * 0.9, 3, 0.42, 2.15);

      const uplift = smoothstep(0, 0.35, continent * 0.55 + 0.15);
      let h = continent * 0.5 + basin * 0.28 + hills * 0.12;
      h += mountains * uplift * 0.42;

      return Math.round((h * 3400 + 850) * 10) / 10;
    };
  }

  function buildPerm(seed) {
    const rng = createRng(seed + ':noise');
    const shuffled = new Uint8Array(256);
    for (let i = 0; i < 256; i++) shuffled[i] = i;
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = rng.int(0, i);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const perm = new Uint8Array(512);
    for (let i = 0; i < 256; i++) {
      perm[i] = shuffled[i];
      perm[i + 256] = shuffled[i];
    }
    return perm;
  }

  function buildPermSet(seed) {
    return {
      macro: buildPerm(seed),
      ridge: buildPerm(seed + ':ridge'),
      warp: buildPerm(seed + ':warp')
    };
  }

  global.TerrainSampler = {
    createSampler,
    createElevationField,
    buildPermSet,
    makeNoise3D,
    fbm,
    latLonToVector,
    vectorToLatLon,
    mercatorPixelToLatLon,
    equirectPixelToLatLon
  };
})(window);
