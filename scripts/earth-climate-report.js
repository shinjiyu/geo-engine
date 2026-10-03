#!/usr/bin/env node
'use strict';

/**
 * Runs the climate stage on real Earth relief and scores it against observed
 * climatologies (GPCC precipitation, NCEP near-surface temperature).
 *
 * Usage: node scripts/earth-climate-report.js [--n 64] [--res 1] [--params '{"years":1}'] [--png out/dir] [--json]
 */

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { buildNeighborTable } = require('../src/topology/cube-sphere');
const { runClimateStage } = require('../src/generate/climate-stage');
const { normalizePlanet } = require('../src/planet/params');
const { loadEarthClimatology } = require('../test/support/earth-reference');
const { buildEarthCells, cellAt, annualObs, score } = require('../test/support/earth-climate-score');

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : fallback;
}

function encodePng(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) Buffer.from(rgba.buffer, y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  const crcT = new Int32Array(256).map((_, k) => { let c = k; for (let i = 0; i < 8; i++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
  const crc = (b) => { let c = -1; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
  const chunk = (t, d) => {
    const l = Buffer.alloc(4); l.writeUInt32BE(d.length);
    const td = Buffer.concat([Buffer.from(t), d]);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
    return Buffer.concat([l, td, c]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

function precipColor(p) {
  if (!Number.isFinite(p)) return [40, 40, 48];
  const stops = [[0, [150, 90, 40]], [150, [215, 175, 95]], [400, [235, 225, 140]], [800, [120, 190, 90]], [1500, [40, 140, 70]], [2500, [30, 90, 150]], [4000, [70, 40, 140]]];
  for (let i = 1; i < stops.length; i++) {
    if (p <= stops[i][0]) {
      const t = (p - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]);
      return stops[i][1].map((v, k) => Math.round(stops[i - 1][1][k] + (v - stops[i - 1][1][k]) * t));
    }
  }
  return stops[stops.length - 1][1];
}

function writeMaps(cells, n, obs, dir, label) {
  const W = 360; const H = 180;
  const rgba = new Uint8Array(W * 3 * H * 4);
  for (let y = 0; y < H; y++) {
    const lat = 89.5 - y;
    for (let x = 0; x < W; x++) {
      const lon = -179.5 + x;
      const c = cellAt(cells, n, lat, lon);
      const land = c.isLand || c.isLake;
      const model = land ? precipColor(c.precip) : [20, 30, 60];
      const o = annualObs(obs, lat, lon).p;
      const ref = land ? precipColor(o) : [20, 30, 60];
      let ratio = [20, 30, 60];
      if (land && Number.isFinite(o)) {
        const r = Math.max(-1, Math.min(1, Math.log((c.precip + 50) / (o + 50)) / Math.log(4)));
        ratio = r < 0 ? [255, Math.round(255 * (1 + r)), Math.round(255 * (1 + r))] : [Math.round(255 * (1 - r)), Math.round(255 * (1 - r)), 255];
      } else if (land) ratio = [40, 40, 48];
      rgba.set([...model, 255], (y * W * 3 + x) * 4);
      rgba.set([...ref, 255], (y * W * 3 + W + x) * 4);
      rgba.set([...ratio, 255], (y * W * 3 + 2 * W + x) * 4);
    }
  }
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `earth-precip-${label}.png`);
  fs.writeFileSync(file, encodePng(W * 3, H, rgba));
  return file;
}

function main() {
  const n = Number(arg('--n', 64));
  const planet = normalizePlanet({});
  const obs = loadEarthClimatology();
  const t0 = Date.now();
  const cells = buildEarthCells(n, planet);
  const neighborTable = buildNeighborTable(n);
  const t1 = Date.now();
  runClimateStage(cells, neighborTable, planet, 'earth', {
    resolutionDeg: Number(arg('--res', 1)),
    atmosphere: JSON.parse(arg('--params', '{}'))
  });
  const t2 = Date.now();
  const report = score(cells, n, planet, obs);
  report.timing = { terrainMs: t1 - t0, climateMs: t2 - t1 };
  const pngDir = arg('--png', null);
  if (pngDir) report.png = writeMaps(cells, n, obs, pngDir, arg('--label', `n${n}`));
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  const r = report;
  console.log(`n=${n}  climate ${r.timing.climateMs} ms`);
  console.log('budget', JSON.stringify(r.budget));
  console.log('precip', JSON.stringify(r.precip));
  console.log('temp  ', JSON.stringify(r.temp));
  console.log('zonal land precip (model/obs):', r.zonal.map((z) => `${z.band}:${z.model}/${z.obs}`).join('  '));
  console.log(`regions within x1.6 of obs: ${r.regionHits}`);
  for (const g of r.regions) console.log(`  ${g.name.padEnd(20)} P ${String(g.model).padStart(5)} / ${String(g.obs).padStart(5)}   T ${String(g.tModel).padStart(5)} / ${String(g.tObs).padStart(5)}${g.land ? '' : '  (ocean cell)'}`);
  if (r.png) console.log('map:', r.png);
}

main();
