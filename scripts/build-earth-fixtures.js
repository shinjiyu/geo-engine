#!/usr/bin/env node
'use strict';

/**
 * Builds the compact Earth reference fixtures used by the climate calibration
 * report and regression test (test/fixtures/earth/*.bin.gz).
 *
 * Sources (all public, fetched through NOAA ERDDAP):
 *   - ETOPO1 relief, 20-arcmin samples block-averaged to 1 degree (NOAA NCEI, public domain)
 *   - GPCC Full V7 monthly precipitation climatology 1981-2010, 2.5 degree (DWD / NOAA PSL)
 *   - NCEP/NCAR Reanalysis sigma-0.995 air temperature monthly climatology, 2.5 degree (NOAA PSL)
 *
 * Usage: node scripts/build-earth-fixtures.js [--cache /tmp]
 */

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const OUT_DIR = path.join(__dirname, '../test/fixtures/earth');
const SOURCES = {
  etopo: {
    file: 'etopo20m.csv',
    url: 'https://coastwatch.pfeg.noaa.gov/erddap/griddap/etopo180.csv?altitude%5B(-90):20:(90)%5D%5B(-180):20:(180)%5D'
  },
  gpcc: {
    file: 'gpcc_ltm.csv',
    url: 'https://upwell.pfeg.noaa.gov/erddap/griddap/noaa_psl_819f_50af_c036.csv?precip%5B0:1:11%5D%5B(88.75):1:(-88.75)%5D%5B(1.25):1:(358.75)%5D'
  },
  ncep: {
    file: 'ncep_air_ltm.csv',
    url: 'https://upwell.pfeg.noaa.gov/erddap/griddap/noaa_psl_b9f0_05ba_d6b5.csv?air%5B0:1:11%5D%5B(90):1:(-90)%5D%5B(0):1:(357.5)%5D'
  }
};

// Narrow sea connections that vanish when averaging to 1 degree.
const STRAITS = [
  [36, -6], [36, -5], // Gibraltar
  [41, 29], [41, 28], [40, 26], [40, 27], // Bosporus / Marmara / Dardanelles
  [13, 43], [12, 43], // Bab-el-Mandeb
  [26, 56], // Hormuz
  [1, 104], [2, 102], // Singapore / Malacca
  [-10, 142] // Torres
];

async function loadCsv(key, cacheDir) {
  const src = SOURCES[key];
  const cached = cacheDir && path.join(cacheDir, src.file);
  let text;
  if (cached && fs.existsSync(cached)) {
    text = fs.readFileSync(cached, 'utf8');
  } else {
    const res = await fetch(src.url);
    if (!res.ok) throw new Error(`${key}: HTTP ${res.status}`);
    text = await res.text();
    if (cached) fs.writeFileSync(cached, text);
  }
  return text.split('\n').slice(2).filter(Boolean).map((line) => line.split(','));
}

function buildEtopo(rows) {
  // 20' grid: lat -90..90 (541), lon -180..180 (1081)
  const grid = new Float64Array(541 * 1081);
  for (const [lat, lon, alt] of rows) {
    const i = Math.round((Number(lat) + 90) * 3);
    const j = Math.round((Number(lon) + 180) * 3);
    grid[i * 1081 + j] = Number(alt);
  }
  const strait = new Set(STRAITS.map(([la, lo]) => `${la}:${lo}`));
  const out = new Int16Array(181 * 361);
  for (let la = -90; la <= 90; la++) {
    for (let lo = -180; lo <= 180; lo++) {
      const ci = (la + 90) * 3;
      const cj = (lo + 180) * 3;
      let sum = 0;
      let count = 0;
      let min = Infinity;
      for (let di = -1; di <= 1; di++) {
        const i = ci + di;
        if (i < 0 || i > 540) continue;
        for (let dj = -1; dj <= 1; dj++) {
          const j = (cj + dj + 1080) % 1080;
          const v = grid[i * 1081 + j];
          sum += v;
          count++;
          if (v < min) min = v;
        }
      }
      const value = strait.has(`${la}:${lo}`) ? Math.min(min, -50) : sum / count;
      out[(la + 90) * 361 + (lo + 180)] = Math.round(value);
    }
  }
  return out;
}

function buildMonthly(rows, nLat, nLon, latStart, latStep, lonStart, valueOf, ArrayType, missing) {
  const out = new ArrayType(12 * nLat * nLon).fill(missing);
  const times = [...new Set(rows.map((r) => r[0]))];
  for (const [time, lat, lon, value] of rows) {
    const m = times.indexOf(time);
    const i = Math.round((Number(lat) - latStart) / latStep);
    const j = Math.round((Number(lon) - lonStart) / 2.5);
    const v = Number(value);
    if (!Number.isFinite(v)) continue;
    out[(m * nLat + i) * nLon + j] = valueOf(v);
  }
  return out;
}

function writeGz(name, typed) {
  const buf = Buffer.from(typed.buffer, typed.byteOffset, typed.byteLength);
  const gz = zlib.gzipSync(buf, { level: 9 });
  fs.writeFileSync(path.join(OUT_DIR, name), gz);
  console.log(`${name}: ${buf.length} B raw, ${gz.length} B gz`);
}

async function main() {
  const cacheArg = process.argv.indexOf('--cache');
  const cacheDir = cacheArg > 0 ? process.argv[cacheArg + 1] : null;
  fs.mkdirSync(OUT_DIR, { recursive: true });

  writeGz('etopo-1deg.i16.gz', buildEtopo(await loadCsv('etopo', cacheDir)));
  writeGz('gpcc-precip-ltm.u16.gz', buildMonthly(
    await loadCsv('gpcc', cacheDir), 72, 144, 88.75, -2.5, 1.25,
    (v) => Math.round(v * 10), Uint16Array, 65535
  ));
  writeGz('ncep-t2m-ltm.i16.gz', buildMonthly(
    await loadCsv('ncep', cacheDir), 73, 144, 90, -2.5, 0,
    (v) => Math.round(v * 10), Int16Array, -32768
  ));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
