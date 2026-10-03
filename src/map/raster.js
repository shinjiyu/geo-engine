'use strict';

const {
  vectorToFaceUV,
  vectorToCell,
  cellKey,
  faceUVToVector
} = require('../topology/cube-sphere');
const { latLonToVector } = require('./lat-lon');
const {
  pixelToLatLonEquirect,
  pixelToLatLonMercator,
  latLonToEquirectPixel,
  latLonToMercatorPixel
} = require('./projections');
const { sampleTerrainAtUnitVector } = require('../generate/terrain');
const { makeNoise3D, fbm } = require('../generate/noise');
const {
  TERRAIN_COLORS,
  realmColor,
  elevationColor,
  magicColor,
  climateTint,
  tundraShare,
  riverOverlay
} = require('./palette');

const VALID_LAYERS = ['terrain', 'realms', 'elevation', 'magic'];
const TINTED_TERRAIN = { plain: 1, hill: 1, mountain: 0.55 };

function planetOptions(world) {
  return {
    seaLevel: world.config?.planet?.seaLevel ?? 0.02,
    iceLat: 75
  };
}

function realmById(world) {
  const map = new Map();
  for (const r of world.realms || []) map.set(r.id, r);
  return map;
}

function lookupCell(cells, n, x, y, z) {
  const { face, u, v } = vectorToCell(x, y, z, n);
  return cells[cellKey(face, u, v)] || null;
}

function colorFromContinuousTerrain(seed, x, y, z, layer, options) {
  const opts = { ...options, withCoast: layer === 'terrain' };
  const sample = sampleTerrainAtUnitVector(seed, x, y, z, opts);
  if (layer === 'elevation') {
    return elevationColor(sample.elevation, sample.isLand);
  }
  return TERRAIN_COLORS[sample.terrain] || TERRAIN_COLORS.plain;
}

function colorForCell(cell, layer, world, realmMap, paintRivers = true) {
  if (!cell) return [0, 0, 0, 255];

  let rgba;
  switch (layer) {
    case 'realms':
      if (cell.realmId) {
        const realm = realmMap.get(cell.realmId);
        rgba = realmColor(cell.realmId, realm?.race);
      } else {
        rgba = cell.isLand ? [48, 48, 48, 255] : TERRAIN_COLORS.deep_ocean;
      }
      break;
    case 'elevation':
      rgba = elevationColor(cell.elevation, cell.isLand);
      break;
    case 'magic':
      rgba = magicColor(cell.magicFlux, cell.isLand);
      break;
    default:
      rgba = TERRAIN_COLORS[cell.terrain] || TERRAIN_COLORS.plain;
      if (TINTED_TERRAIN[cell.terrain] && cell.isLand && !cell.isLake) {
        const weight = TINTED_TERRAIN[cell.terrain];
        rgba = climateTint(rgba, (cell.aridScore || 0) * weight, tundraShare(cell) * weight);
      }
  }

  return riverOverlay(rgba, paintRivers && cell.river && cell.isLand && !cell.isLake);
}

function writePixel(buf, width, px, py, rgba) {
  const i = (py * width + px) * 4;
  buf[i] = rgba[0];
  buf[i + 1] = rgba[1];
  buf[i + 2] = rgba[2];
  buf[i + 3] = rgba[3];
}

function buildLatLonRaster(world, options, pixelToLatLonFn, projection, latLonToPixelFn) {
  const width = Math.min(2048, Math.max(64, Number(options.width) || 1024));
  const defaultHeight = projection === 'web-mercator' ? width : Math.floor(width / 2);
  const height = Math.min(2048, Math.max(32, Number(options.height) || defaultHeight));
  const layer = VALID_LAYERS.includes(options.layer) ? options.layer : 'terrain';
  const n = world.meta.cellsPerFaceEdge;
  const cells = world.cells;
  const realmMap = realmById(world);
  const buf = Buffer.alloc(width * height * 4);
  const pOpts = planetOptions(world);
  const useContinuous = (layer === 'terrain' || layer === 'elevation')
    && world.meta?.terrainBackend !== 'world-orogen';

  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const { lat, lon } = pixelToLatLonFn(px, py, width, height);
      const vec = latLonToVector(lat, lon);
      let rgba;

      if (useContinuous) {
        rgba = colorFromContinuousTerrain(world.seed, vec.x, vec.y, vec.z, layer, pOpts);
      } else {
        const cell = lookupCell(cells, n, vec.x, vec.y, vec.z);
        rgba = colorForCell(cell, layer, world, realmMap, false);
      }

      writePixel(buf, width, px, py, rgba);
    }
  }
  drawWorldWaterways(buf, world, width, height, latLonToPixelFn);

  return { width, height, layer, projection, rgba: buf.toString('base64') };
}

const RIVER_COLOR = [41, 126, 190, 255];
const WADI_COLOR = [92, 122, 150, 255];

/** Rivers as centre-lines widening with discharge; intermittent channels as faint dashes. */
function drawWorldWaterways(buf, world, width, height, latLonToPixelFn) {
  const cells = world.cells;
  const scale = Math.sqrt(width / 1024);
  const toPixel = (key) => {
    const c = cells[key];
    if (!c) return null;
    const { px, py } = latLonToPixelFn(c.lat, c.lon, width, height);
    return { x: px, y: py };
  };
  const strokePath = (path, style) => {
    let phase = 0;
    let prev = toPixel(path[0]);
    for (let m = 1; m < path.length; m++) {
      const next = toPixel(path[m]);
      if (!prev || !next) {
        prev = next;
        continue;
      }
      if (Math.abs(next.x - prev.x) > width / 2) {
        prev = next;
        continue;
      }
      if (style === 'wadi') {
        phase = drawDashedLine(buf, width, height, prev, next, 0.45, WADI_COLOR, phase, 3 * scale, 3 * scale);
      } else {
        const flow = Math.max(cells[path[m - 1]]?.flow || 0, 1);
        const radius = Math.min(1.7, 0.45 + 0.3 * Math.log10(flow)) * scale;
        drawLine(buf, width, height, prev, next, radius, RIVER_COLOR);
      }
      prev = next;
    }
  };
  for (const wadi of world.wadis || []) strokePath(wadi.cells, 'wadi');
  for (const river of world.rivers || []) strokePath(river.cells, 'river');
}

function buildEquirectRaster(world, options) {
  return buildLatLonRaster(world, options, pixelToLatLonEquirect, 'equirectangular', latLonToEquirectPixel);
}

function buildMercatorRaster(world, options) {
  const opts = { width: 2048, height: 2048, ...options };
  return buildLatLonRaster(world, opts, pixelToLatLonMercator, 'web-mercator', latLonToMercatorPixel);
}

/** Flat regional map (linear lat/lon), north-up — easier to read than full globe. */
function buildLegacyRegionRaster(world, options) {
  const centerLat = Number(options.centerLat);
  const centerLon = Number(options.centerLon);
  if (Number.isNaN(centerLat) || Number.isNaN(centerLon)) {
    throw new Error('buildRegionRaster requires centerLat/centerLon');
  }

  const spanLat = Math.min(40, Math.max(3, Number(options.spanLat) || Number(options.span) || 10));
  const spanLon = Math.min(40, Math.max(3, Number(options.spanLon) || Number(options.span) || 10));
  const width = Math.min(1024, Math.max(160, Number(options.width) || 520));
  const height = Math.min(1024, Math.max(120, Number(options.height) || Math.round(width * 0.72)));
  const layer = VALID_LAYERS.includes(options.layer) ? options.layer : 'terrain';

  const latMin = centerLat - spanLat / 2;
  const latMax = centerLat + spanLat / 2;
  const lonMin = centerLon - spanLon / 2;
  const lonMax = centerLon + spanLon / 2;

  const n = world.meta.cellsPerFaceEdge;
  const cells = world.cells;
  const realmMap = realmById(world);
  const buf = Buffer.alloc(width * height * 4);
  const pOpts = planetOptions(world);
  const useContinuous = (layer === 'terrain' || layer === 'elevation')
    && world.meta?.terrainBackend !== 'world-orogen';

  for (let py = 0; py < height; py++) {
    const lat = latMax - (py / Math.max(1, height - 1)) * (latMax - latMin);
    for (let px = 0; px < width; px++) {
      const lon = lonMin + (px / Math.max(1, width - 1)) * (lonMax - lonMin);
      const vec = latLonToVector(lat, lon);
      let rgba;

      if (useContinuous) {
        rgba = colorFromContinuousTerrain(world.seed, vec.x, vec.y, vec.z, layer, pOpts);
      } else {
        const cell = lookupCell(cells, n, vec.x, vec.y, vec.z);
        rgba = colorForCell(cell, layer, world, realmMap);
      }

      writePixel(buf, width, px, py, rgba);
    }
  }

  const markerX = Math.round(((centerLon - lonMin) / Math.max(0.001, lonMax - lonMin)) * (width - 1));
  const markerY = Math.round(((latMax - centerLat) / Math.max(0.001, latMax - latMin)) * (height - 1));
  const mark = [255, 220, 80, 255];
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const x = markerX + dx;
      const y = markerY + dy;
      if (x >= 0 && x < width && y >= 0 && y < height) {
        if (Math.abs(dx) <= 1 || Math.abs(dy) <= 1) writePixel(buf, width, x, y, mark);
      }
    }
  }

  return {
    width,
    height,
    layer,
    projection: 'regional-linear',
    centerLat,
    centerLon,
    spanLat,
    spanLon,
    rgba: buf.toString('base64')
  };
}

function inverseAzimuthalPoint(px, py, width, height, centerLat, centerLon, spanDeg) {
  const lat0 = centerLat * Math.PI / 180;
  const lon0 = centerLon * Math.PI / 180;
  const spanRad = spanDeg * Math.PI / 180;
  const x = ((px + 0.5) / width - 0.5) * spanRad;
  const y = (0.5 - (py + 0.5) / height) * spanRad * (height / width);
  const rho = Math.hypot(x, y);
  if (rho < 1e-12) return { lat: centerLat, lon: centerLon };
  const sinC = Math.sin(rho);
  const cosC = Math.cos(rho);
  const lat = Math.asin(
    cosC * Math.sin(lat0) + (y * sinC * Math.cos(lat0)) / rho
  );
  const lon = lon0 + Math.atan2(
    x * sinC,
    rho * Math.cos(lat0) * cosC - y * Math.sin(lat0) * sinC
  );
  return { lat: lat * 180 / Math.PI, lon: lon * 180 / Math.PI };
}

function drawDisc(buf, width, height, x, y, radius, rgba, drawableMask) {
  const r = Math.max(1, Math.ceil(radius));
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > radius * radius + 0.5) continue;
      const px = Math.round(x + dx);
      const py = Math.round(y + dy);
      if (px >= 0 && px < width && py >= 0 && py < height) {
        if (drawableMask && !drawableMask[py * width + px]) continue;
        writePixel(buf, width, px, py, rgba);
      }
    }
  }
}

function drawLine(buf, width, height, from, to, radius, rgba, drawableMask) {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const steps = Math.min(2000, Math.max(1, Math.ceil(distance * 1.4)));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    drawDisc(
      buf,
      width,
      height,
      from.x + (to.x - from.x) * t,
      from.y + (to.y - from.y) * t,
      radius,
      rgba,
      drawableMask
    );
  }
}

/** Returns the dash phase at `to`, so consecutive segments continue one pattern. */
function drawDashedLine(buf, width, height, from, to, radius, rgba, phase, on, off, drawableMask) {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const steps = Math.min(2000, Math.max(1, Math.ceil(distance * 1.4)));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    if ((phase + t * distance) % (on + off) >= on) continue;
    drawDisc(
      buf,
      width,
      height,
      from.x + (to.x - from.x) * t,
      from.y + (to.y - from.y) * t,
      radius,
      rgba,
      drawableMask
    );
  }
  return (phase + distance) % (on + off);
}

class ElevationHeap {
  constructor(priority) {
    this.priority = priority;
    this.items = [];
  }

  get size() {
    return this.items.length;
  }

  push(index) {
    const items = this.items;
    items.push(index);
    let child = items.length - 1;
    while (child > 0) {
      const parent = (child - 1) >> 1;
      if (this.priority[items[parent]] <= this.priority[index]) break;
      items[child] = items[parent];
      child = parent;
    }
    items[child] = index;
  }

  pop() {
    const items = this.items;
    const root = items[0];
    const last = items.pop();
    if (items.length === 0) return root;
    let parent = 0;
    while (true) {
      const left = parent * 2 + 1;
      if (left >= items.length) break;
      const right = left + 1;
      const child = right < items.length
        && this.priority[items[right]] < this.priority[items[left]]
        ? right
        : left;
      if (this.priority[last] <= this.priority[items[child]]) break;
      items[parent] = items[child];
      parent = child;
    }
    items[parent] = last;
    return root;
  }
}

/**
 * Local drainage on the sheet's relief. Discharge accumulates the runoff of each pixel plus the
 * world rivers' inflow at the sheet edge, so dry country grows wadis rather than rivers.
 */
function drawLocalHydrology(buf, elevation, drawableMask, width, height, water) {
  const count = width * height;
  const downslope = new Int32Array(count).fill(-1);
  const filled = new Float32Array(elevation);
  const visited = new Uint8Array(count);
  const flow = new Float32Array(count);
  const area = new Float32Array(count);
  const landIndices = [];
  const neighborOffsets = [
    [-1, -1], [0, -1], [1, -1],
    [-1, 0], [1, 0],
    [-1, 1], [0, 1], [1, 1]
  ];

  const heap = new ElevationHeap(filled);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      if (!drawableMask[index]) continue;
      landIndices.push(index);
      flow[index] = water.ownKm3[index] + water.injectKm3[index];
      area[index] = water.pixelKm2 + water.injectAreaKm2[index];
      let outlet = -1;
      let isOutlet = (x === 0 || y === 0 || x === width - 1 || y === height - 1) && !water.inflowEdge[index];
      for (const [dx, dy] of neighborOffsets) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        const neighbor = ny * width + nx;
        if (!drawableMask[neighbor]) {
          outlet = neighbor;
          isOutlet = true;
          break;
        }
      }
      if (isOutlet) {
        visited[index] = 1;
        downslope[index] = outlet;
        heap.push(index);
      }
    }
  }

  while (heap.size > 0) {
    const index = heap.pop();
    const x = index % width;
    const y = Math.floor(index / width);
    for (const [dx, dy] of neighborOffsets) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      const neighbor = ny * width + nx;
      if (!drawableMask[neighbor] || visited[neighbor]) continue;
      visited[neighbor] = 1;
      downslope[neighbor] = index;
      const epsilon = 0.002 + ((neighbor * 2654435761) >>> 24) * 0.000002;
      filled[neighbor] = Math.max(elevation[neighbor], filled[index] + epsilon);
      heap.push(neighbor);
    }
  }

  landIndices.sort((a, b) => filled[b] - filled[a]);
  for (const index of landIndices) {
    const target = downslope[index];
    if (target >= 0) {
      flow[target] += flow[index];
      area[target] += area[index];
    }
  }

  // Coarser sheets show only the larger channels.
  const channelAreaKm2 = Math.max(20000, 2500 * water.pixelKm2);
  const perennialKm3 = 0.5;
  // Only detailed sheets widen the great rivers beyond a one-pixel line.
  const maxRadius = water.pixelKm2 < 4 ? 0.85 : 0.7;
  const drawn = (index) => area[index] >= channelAreaKm2;
  const perennial = (index) => drawn(index) && flow[index] >= perennialKm3;
  let invalidInlandTermini = 0;
  let visibleOutletCount = 0;
  let riverPixelCount = 0;
  let wadiPixelCount = 0;
  const wadiPhase = new Float32Array(count);
  for (let k = 0; k < landIndices.length; k++) {
    const index = landIndices[k];
    if (!drawn(index)) continue;
    const target = downslope[index];
    const x = index % width;
    const y = Math.floor(index / width);
    if (perennial(index)) riverPixelCount++;
    else wadiPixelCount++;
    if (target < 0) {
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
        visibleOutletCount++;
      } else {
        invalidInlandTermini++;
      }
      continue;
    }
    const tx = target % width;
    const ty = Math.floor(target / width);
    if (perennial(index)) {
      const radius = Math.min(maxRadius, 0.38 + 0.15 * Math.log10(1 + flow[index] / perennialKm3));
      drawLine(buf, width, height, { x, y }, { x: tx, y: ty }, radius, RIVER_COLOR, drawableMask);
    } else {
      const step = Math.hypot(tx - x, ty - y);
      if (wadiPhase[index] % 7 < 4) {
        drawLine(buf, width, height, { x, y }, { x: tx, y: ty }, 0.38, WADI_COLOR, drawableMask);
      }
      wadiPhase[target] = Math.max(wadiPhase[target], wadiPhase[index] + step);
    }
    if (!drawableMask[target]) {
      visibleOutletCount++;
    } else if (!drawn(target)) {
      invalidInlandTermini++;
    }
  }
  return {
    riverPixelCount,
    wadiPixelCount,
    invalidInlandTermini,
    visibleOutletCount
  };
}

function interpolatedCellFields(world, vec) {
  const n = world.meta.cellsPerFaceEdge;
  const { face, a, b } = vectorToFaceUV(vec.x, vec.y, vec.z);
  const fu = ((a + 1) * 0.5 * n) - 0.5;
  const fv = ((b + 1) * 0.5 * n) - 0.5;
  const u0 = Math.floor(fu);
  const v0 = Math.floor(fv);
  const tu = fu - u0;
  const tv = fv - v0;
  const corners = [
    [u0, v0, (1 - tu) * (1 - tv)],
    [u0 + 1, v0, tu * (1 - tv)],
    [u0, v0 + 1, (1 - tu) * tv],
    [u0 + 1, v0 + 1, tu * tv]
  ];
  let elevation = 0;
  let magicFlux = 0;
  let runoff = 0;
  let aridScore = 0;
  let tundra = 0;
  let lakeLevelM = -Infinity;
  for (const [u, v, weight] of corners) {
    const corner = faceUVToVector(face, u, v, n);
    const cell = lookupCell(world.cells, n, corner.x, corner.y, corner.z);
    elevation += (cell?.elevation || 0) * weight;
    magicFlux += (cell?.magicFlux || 0) * weight;
    runoff += Math.max(0, cell?.runoff || 0) * weight;
    aridScore += (cell?.aridScore || 0) * weight;
    tundra += tundraShare(cell) * weight;
    if (cell?.isLake && Number.isFinite(cell.waterLevelM)) lakeLevelM = Math.max(lakeLevelM, cell.waterLevelM);
  }
  return {
    elevation,
    magicFlux,
    runoff,
    aridScore,
    tundra,
    lakeLevelM,
    nearest: lookupCell(world.cells, n, vec.x, vec.y, vec.z)
  };
}

function cartographicColor(elevation, seaLevelM) {
  const relative = elevation - seaLevelM;
  if (relative <= 0) {
    const t = Math.max(0, Math.min(1, 1 + relative / 5000));
    return [
      Math.round(18 + 38 * t),
      Math.round(48 + 72 * t),
      Math.round(88 + 92 * t),
      255
    ];
  }
  if (relative < 250) return [176, 190, 118, 255];
  if (relative < 800) return [139, 164, 92, 255];
  if (relative < 1600) return [184, 154, 99, 255];
  if (relative < 2800) return [148, 116, 82, 255];
  if (relative < 4200) return [126, 112, 102, 255];
  return [224, 226, 220, 255];
}

/** North-up azimuthal-equidistant cartographic sheet centred on a selected point. */
function buildRegionRaster(world, options) {
  const centerLat = Number(options.centerLat);
  const centerLon = Number(options.centerLon);
  if (Number.isNaN(centerLat) || Number.isNaN(centerLon)) {
    throw new Error('buildRegionRaster requires centerLat/centerLon');
  }
  const span = Math.min(40, Math.max(3, Number(options.span) || 10));
  const width = Math.min(1024, Math.max(160, Number(options.width) || 720));
  const height = Math.min(1024, Math.max(120, Number(options.height) || Math.round(width * 0.67)));
  const layer = ['terrain', 'elevation', 'magic'].includes(options.layer)
    ? options.layer
    : 'terrain';
  const seaLevelM = world.config?.planet?.seaLevelM ?? 900;
  const detailNoise = makeNoise3D(`${world.seed}:cartographic-detail`);
  const elevation = new Float32Array(width * height);
  const magic = new Float32Array(width * height);
  const lake = new Uint8Array(width * height);
  const riverLand = new Uint8Array(width * height);
  const runoffMm = new Float32Array(width * height);
  const aridScore = new Float32Array(width * height);
  const tundra = new Float32Array(width * height);

  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const { lat, lon } = inverseAzimuthalPoint(
        px, py, width, height, centerLat, centerLon, span
      );
      const vec = latLonToVector(lat, lon);
      const fields = interpolatedCellFields(world, vec);
      const relative = fields.elevation - seaLevelM;
      const amplitude = Math.min(180, Math.abs(relative) * 0.22);
      const detail = fbm(
        detailNoise,
        vec.x * 48,
        vec.y * 48,
        vec.z * 48,
        4,
        0.48,
        2.05
      );
      const index = py * width + px;
      elevation[index] = fields.elevation + detail * amplitude;
      magic[index] = fields.magicFlux;
      runoffMm[index] = fields.runoff;
      aridScore[index] = fields.aridScore;
      tundra[index] = fields.tundra;
      // A lake fills its basin up to the water level, so the shore follows the relief, not the grid.
      lake[index] = elevation[index] <= fields.lakeLevelM ? 1 : 0;
      riverLand[index] = !lake[index] && elevation[index] > seaLevelM ? 1 : 0;
    }
  }

  const buf = Buffer.alloc(width * height * 4);
  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const index = py * width + px;
      const here = elevation[index];
      const left = elevation[py * width + Math.max(0, px - 1)];
      const right = elevation[py * width + Math.min(width - 1, px + 1)];
      const up = elevation[Math.max(0, py - 1) * width + px];
      const down = elevation[Math.min(height - 1, py + 1) * width + px];
      let rgba = lake[index]
        ? [66, 132, 176, 255]
        : cartographicColor(here, seaLevelM);
      const reliefM = here - seaLevelM;
      if (!lake[index] && reliefM > 0 && reliefM < 4200) {
        const weight = reliefM < 1600 ? 1 : 0.55;
        rgba = climateTint(rgba, aridScore[index] * weight, tundra[index] * weight);
      }
      const shade = lake[index] ? 1 : Math.max(0.62, Math.min(1.22, 0.92 + (left - right + down - up) / 900));
      rgba = [
        Math.round(rgba[0] * shade),
        Math.round(rgba[1] * shade),
        Math.round(rgba[2] * shade),
        255
      ];

      const relative = here - seaLevelM;
      const rightRelative = right - seaLevelM;
      const downRelative = down - seaLevelM;
      const water = relative <= 0 || lake[index] === 1;
      const rightWater = rightRelative <= 0 || lake[py * width + Math.min(width - 1, px + 1)] === 1;
      const downWater = downRelative <= 0 || lake[Math.min(height - 1, py + 1) * width + px] === 1;
      const coast = water !== rightWater || water !== downWater;
      const contourStep = Math.abs(relative) >= 2000 ? 500 : 250;
      const contour = relative > 0 && !lake[index] && (
        Math.floor(relative / contourStep) !== Math.floor(rightRelative / contourStep)
        || Math.floor(relative / contourStep) !== Math.floor(downRelative / contourStep)
      );
      if (coast) rgba = [46, 51, 47, 255];
      else if (contour) {
        rgba = [Math.round(rgba[0] * 0.72), Math.round(rgba[1] * 0.72), Math.round(rgba[2] * 0.72), 255];
      }
      if (layer === 'magic') {
        const strength = Math.max(0, Math.min(0.72, magic[index] * 1.8));
        rgba = [
          Math.round(rgba[0] * (1 - strength) + 194 * strength),
          Math.round(rgba[1] * (1 - strength) + 72 * strength),
          Math.round(rgba[2] * (1 - strength) + 222 * strength),
          255
        ];
      }
      writePixel(buf, width, px, py, rgba);
    }
  }
  const kmPerPixel = world.meta.radiusKm * span * Math.PI / 180 / width;
  const pixelKm2 = kmPerPixel * kmPerPixel;
  const ownKm3 = Float32Array.from(runoffMm, (mm) => mm * 1e-6 * pixelKm2);
  const inflow = worldChannelInflow(world, elevation, riverLand, width, height, centerLat, centerLon, span);
  const hydrology = drawLocalHydrology(buf, elevation, riverLand, width, height, {
    ownKm3, pixelKm2, ...inflow
  });

  return {
    width,
    height,
    layer,
    projection: 'azimuthal-equidistant-cartographic',
    centerLat,
    centerLon,
    span,
    riverPixelCount: hydrology.riverPixelCount,
    wadiPixelCount: hydrology.wadiPixelCount,
    invalidRiverTermini: hydrology.invalidInlandTermini,
    visibleRiverOutlets: hydrology.visibleOutletCount,
    scaleKmPerPixel: Math.round(kmPerPixel * 100) / 100,
    rgba: buf.toString('base64')
  };
}

function azimuthalPixel(lat, lon, width, height, centerLat, centerLon, spanDeg) {
  const phi = lat * Math.PI / 180;
  const phi0 = centerLat * Math.PI / 180;
  const dLon = (lon - centerLon) * Math.PI / 180;
  const cosC = Math.sin(phi0) * Math.sin(phi) + Math.cos(phi0) * Math.cos(phi) * Math.cos(dLon);
  const c = Math.acos(Math.max(-1, Math.min(1, cosC)));
  if (c > Math.PI / 2) return null;
  const k = c < 1e-9 ? 1 : c / Math.sin(c);
  const x = k * Math.cos(phi) * Math.sin(dLon);
  const y = k * (Math.cos(phi0) * Math.sin(phi) - Math.sin(phi0) * Math.cos(phi) * Math.cos(dLon));
  const spanRad = spanDeg * Math.PI / 180;
  return {
    x: (x / spanRad + 0.5) * width - 0.5,
    y: (0.5 - y / (spanRad * height / width)) * height - 0.5
  };
}

function hash01(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return ((h >>> 0) % 100000) / 100000;
}

/** Meandering course through `points`: recursive midpoint displacement, deterministic per tag. */
function meanderPath(points, tag) {
  let pts = points;
  for (let level = 0; level < 4; level++) {
    const next = [pts[0]];
    for (let m = 1; m < pts.length; m++) {
      const a = pts[m - 1];
      const b = pts[m];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const offset = (hash01(`${tag}:${level}:${m}`) - 0.5) * 0.5;
      next.push({ x: (a.x + b.x) / 2 - dy * offset, y: (a.y + b.y) / 2 + dx * offset }, b);
    }
    pts = next;
  }
  return pts;
}

/**
 * Lowers a meandering trench along a world channel downstream of where it enters the sheet, so
 * the inflow follows the world course instead of the nearest map edge; colours are already set.
 */
function carveChannel(elevation, mask, width, height, points, tag) {
  const carveM = 250;
  let level = Infinity;
  let last = -1;
  const path = meanderPath(points, tag);
  for (let m = 1; m < path.length; m++) {
    const a = path[m - 1];
    const b = path[m];
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y))));
    for (let s = 0; s <= steps; s++) {
      const x = Math.round(a.x + (b.x - a.x) * s / steps);
      const y = Math.round(a.y + (b.y - a.y) * s / steps);
      if (x < 0 || y < 0 || x >= width || y >= height) continue;
      const index = y * width + x;
      if (!mask[index] || index === last) continue;
      last = index;
      level = Math.min(level, elevation[index]) - 0.01;
      elevation[index] = level - carveM;
    }
  }
}

/**
 * Upstream inflow of the world rivers and wadis that enter the sheet from outside, placed on the
 * first visible land pixel of each entry and guided along the world course inside the sheet.
 */
function worldChannelInflow(world, elevation, mask, width, height, centerLat, centerLon, span) {
  const injectKm3 = new Float32Array(width * height);
  const injectAreaKm2 = new Float32Array(width * height);
  // Edge pixels around an entry are not outlets, so the inflow runs into the sheet.
  const inflowEdge = new Uint8Array(width * height);
  const closeEdge = (x0, y0) => {
    const r = 8;
    for (let y = Math.max(0, y0 - r); y <= Math.min(height - 1, y0 + r); y++) {
      for (let x = Math.max(0, x0 - r); x <= Math.min(width - 1, x0 + r); x++) {
        if (x === 0 || y === 0 || x === width - 1 || y === height - 1) inflowEdge[y * width + x] = 1;
      }
    }
  };
  const inside = (p) => p && p.x >= 0 && p.y >= 0 && p.x <= width - 1 && p.y <= height - 1;
  for (const channel of [...(world.wadis || []), ...(world.rivers || [])]) {
    const pts = channel.cells.map((key) => {
      const c = world.cells[key];
      return c ? { p: azimuthalPixel(c.lat, c.lon, width, height, centerLat, centerLon, span), cell: c } : null;
    });
    for (let m = 1; m < pts.length; m++) {
      const a = pts[m - 1];
      const b = pts[m];
      if (!a || !b || !a.p || !b.p || inside(a.p) || !inside(b.p)) continue;
      const steps = Math.max(1, Math.ceil(Math.max(Math.abs(b.p.x - a.p.x), Math.abs(b.p.y - a.p.y))));
      for (let s = 0; s <= steps; s++) {
        const x = Math.round(a.p.x + (b.p.x - a.p.x) * s / steps);
        const y = Math.round(a.p.y + (b.p.y - a.p.y) * s / steps);
        if (x < 0 || y < 0 || x >= width || y >= height || !mask[y * width + x]) continue;
        injectKm3[y * width + x] += a.cell.flow || 0;
        injectAreaKm2[y * width + x] += a.cell.drainageAreaKm2 || 0;
        closeEdge(x, y);
        const course = [{ x, y }];
        for (let k = m; k < pts.length && pts[k]?.p; k++) {
          course.push(pts[k].p);
          if (!inside(pts[k].p)) break;
        }
        carveChannel(elevation, mask, width, height, course, `${channel.id}:${m}`);
        break;
      }
    }
  }
  return { injectKm3, injectAreaKm2, inflowEdge };
}

function buildFaceRaster(world, face, options) {
  const layer = VALID_LAYERS.includes(options.layer) ? options.layer : 'terrain';
  const scale = Math.min(8, Math.max(1, Number(options.scale) || 2));
  const n = world.meta.cellsPerFaceEdge;
  const cells = world.cells;
  const realmMap = realmById(world);
  const width = n * scale;
  const height = n * scale;
  const buf = Buffer.alloc(width * height * 4);
  const f = Number(face);
  const pOpts = planetOptions(world);
  const useContinuous = (layer === 'terrain' || layer === 'elevation')
    && world.meta?.terrainBackend !== 'world-orogen';

  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const u = Math.min(n - 0.001, px / scale);
      const v = Math.min(n - 0.001, py / scale);
      let rgba;

      if (useContinuous) {
        const vec = faceUVToVector(f, u, v, n);
        rgba = colorFromContinuousTerrain(world.seed, vec.x, vec.y, vec.z, layer, pOpts);
      } else {
        const cell = cells[cellKey(f, Math.floor(u), Math.floor(v))];
        rgba = colorForCell(cell, layer, world, realmMap);
      }

      writePixel(buf, width, px, py, rgba);
    }
  }

  const labels = ['+X', '-X', '+Y', '-Y', '+Z', '-Z'];
  return {
    face: f,
    faceLabel: labels[f] || String(f),
    width,
    height,
    cellsPerFaceEdge: n,
    scale,
    layer,
    projection: 'cube-face',
    rgba: buf.toString('base64')
  };
}

function pickCellAtLatLon(world, lat, lon) {
  const n = world.meta.cellsPerFaceEdge;
  const vec = latLonToVector(lat, lon);
  const { face, u, v } = vectorToCell(vec.x, vec.y, vec.z, n);
  const key = cellKey(face, u, v);
  const cell = world.cells[key];
  if (!cell) return null;

  const realm = (world.realms || []).find((r) => r.id === cell.realmId) || null;
  return {
    key,
    face,
    u,
    v,
    lat: cell.lat,
    lon: cell.lon,
    elevation: cell.elevation,
    terrain: cell.terrain,
    isLand: cell.isLand,
    magicFlux: cell.magicFlux,
    population: cell.population,
    river: cell.river,
    realm: realm ? { id: realm.id, name: realm.name, race: realm.race } : null
  };
}

function pickCellAtFaceUV(world, face, u, v) {
  const n = world.meta.cellsPerFaceEdge;
  const fu = Math.min(n - 1, Math.max(0, Math.floor(u)));
  const fv = Math.min(n - 1, Math.max(0, Math.floor(v)));
  const cell = world.cells[cellKey(face, fu, fv)];
  if (!cell) return null;
  return pickCellAtLatLon(world, cell.lat, cell.lon);
}

module.exports = {
  VALID_LAYERS,
  buildEquirectRaster,
  buildMercatorRaster,
  buildRegionRaster,
  buildFaceRaster,
  colorForCell,
  pickCellAtLatLon,
  pickCellAtFaceUV
};
