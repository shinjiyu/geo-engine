'use strict';

/**
 * Loaders for the Earth reference fixtures built by scripts/build-earth-fixtures.js.
 */

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const DIR = path.join(__dirname, '../fixtures/earth');

function readTyped(name, ArrayType) {
  const buf = zlib.gunzipSync(fs.readFileSync(path.join(DIR, name)));
  const copy = new Uint8Array(buf.length);
  copy.set(buf);
  return new ArrayType(copy.buffer);
}

function wrapLon(lon) {
  return ((lon % 360) + 540) % 360 - 180;
}

/** Bilinear ETOPO height (m, relative to sea level) at lat/lon degrees. */
function loadEarthHeightSampler() {
  const grid = readTyped('etopo-1deg.i16.gz', Int16Array);
  return function sampleHeightM(lat, lon) {
    const y = Math.max(0, Math.min(180, lat + 90));
    const x = wrapLon(lon) + 180;
    const i0 = Math.min(179, Math.floor(y));
    const j0 = Math.min(359, Math.floor(x));
    const fy = y - i0;
    const fx = x - j0;
    const g = (i, j) => grid[i * 361 + j];
    return (g(i0, j0) * (1 - fx) + g(i0, j0 + 1) * fx) * (1 - fy)
      + (g(i0 + 1, j0) * (1 - fx) + g(i0 + 1, j0 + 1) * fx) * fy;
  };
}

/** Antarctic and Greenland ice sheets, whose physics the climate model does not represent. */
function isIceSheet(lat, lon) {
  return lat < -60 || (lat > 60 && lon > -75 && lon < -10 && !(lat < 67 && lon > -25));
}

/**
 * Coarse outline of the last-glacial-maximum ice sheets (~21 ka). The 1 degree relief cannot
 * resolve outlet gorges, so drainage needs to know which basins were scoured too recently to
 * have been cut through or silted up.
 */
function wasGlaciatedLGM(lat, lon) {
  if (isIceSheet(lat, lon)) return true;
  const beringia = lon < -130 && lat < 70;
  if (lon >= -141 && lon <= -52 && !beringia) return lat >= (lon > -100 ? 40 : 47);
  if (lon >= -25 && lon <= -12) return lat >= 63 && lat <= 67;
  if (lon >= 5 && lon <= 16 && lat >= 45.5 && lat <= 48) return true;
  if (lon >= -11 && lon <= 30) return lat >= 52;
  if (lon > 30 && lon <= 60) return lat >= 57;
  if (lon > 60 && lon <= 100) return lat >= 68;
  return lat <= -40 && lon >= -76 && lon <= -68;
}

/**
 * Monthly observed climatologies on their native 2.5 degree grids.
 * precip(m, lat, lon) -> mm/month or NaN (ocean / no data); temp(m, lat, lon) -> degC.
 * tempAt(m, lat, lon, heightM) moves the reanalysis temperature from its own smoothed
 * terrain (2.5 degree box mean) to heightM with a standard lapse rate.
 */
function loadEarthClimatology(lapseRateC = 6.5) {
  const p = readTyped('gpcc-precip-ltm.u16.gz', Uint16Array);
  const t = readTyped('ncep-t2m-ltm.i16.gz', Int16Array);
  const relief = readTyped('etopo-1deg.i16.gz', Int16Array);
  const terrain = new Float64Array(73 * 144);
  for (let i = 0; i < 73; i++) {
    for (let j = 0; j < 144; j++) {
      let sum = 0;
      let count = 0;
      for (let dla = -1; dla <= 1; dla++) {
        for (let dlo = -1; dlo <= 1; dlo++) {
          const la = Math.round(90 - 2.5 * i + dla);
          if (la < -90 || la > 90) continue;
          const lo = Math.round(wrapLon(2.5 * j + dlo));
          sum += Math.max(0, relief[(la + 90) * 361 + (lo + 180)]);
          count++;
        }
      }
      terrain[i * 144 + j] = sum / count;
    }
  }
  const tempIndex = (lat, lon) => [
    Math.max(0, Math.min(72, Math.round((90 - lat) / 2.5))),
    ((Math.round((wrapLon(lon) + 360) / 2.5) % 144) + 144) % 144
  ];
  const precipCell = (m, i, j) => {
    const v = p[(m * 72 + i) * 144 + j];
    return v === 65535 ? NaN : v / 10;
  };
  return {
    precipGrid: { nLat: 72, nLon: 144, lat: (i) => 88.75 - 2.5 * i, lon: (j) => wrapLon(1.25 + 2.5 * j), value: precipCell },
    precip(m, lat, lon) {
      const i = Math.max(0, Math.min(71, Math.round((88.75 - lat) / 2.5)));
      const j = ((Math.round((wrapLon(lon) + 360 - 1.25) / 2.5) % 144) + 144) % 144;
      return precipCell(m, i, j);
    },
    temp(m, lat, lon) {
      const [i, j] = tempIndex(lat, lon);
      return t[(m * 73 + i) * 144 + j] / 10;
    },
    tempAt(m, lat, lon, heightM) {
      const [i, j] = tempIndex(lat, lon);
      return t[(m * 73 + i) * 144 + j] / 10 + lapseRateC * (terrain[i * 144 + j] - Math.max(0, heightM)) / 1000;
    }
  };
}

module.exports = { loadEarthHeightSampler, loadEarthClimatology, isIceSheet, wasGlaciatedLGM };
