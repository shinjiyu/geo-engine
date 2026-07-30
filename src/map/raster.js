'use strict';

const {
  vectorToFaceUV,
  vectorToCell,
  cellKey,
  faceUVToVector
} = require('../topology/cube-sphere');
const { latLonToVector } = require('./lat-lon');
const { pixelToLatLonEquirect, pixelToLatLonMercator } = require('./projections');
const { sampleTerrainAtUnitVector } = require('../generate/terrain');
const { makeNoise3D, fbm } = require('../generate/noise');
const {
  TERRAIN_COLORS,
  realmColor,
  elevationColor,
  magicColor,
  riverOverlay
} = require('./palette');

const VALID_LAYERS = ['terrain', 'realms', 'elevation', 'magic'];

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

function colorForCell(cell, layer, world, realmMap) {
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
  }

  return riverOverlay(rgba, cell.river && cell.isLand && !cell.isLake);
}

function writePixel(buf, width, px, py, rgba) {
  const i = (py * width + px) * 4;
  buf[i] = rgba[0];
  buf[i + 1] = rgba[1];
  buf[i + 2] = rgba[2];
  buf[i + 3] = rgba[3];
}

function buildLatLonRaster(world, options, pixelToLatLonFn, projection) {
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
        rgba = colorForCell(cell, layer, world, realmMap);
      }

      writePixel(buf, width, px, py, rgba);
    }
  }

  return { width, height, layer, projection, rgba: buf.toString('base64') };
}

function buildEquirectRaster(world, options) {
  return buildLatLonRaster(world, options, pixelToLatLonEquirect, 'equirectangular');
}

function buildMercatorRaster(world, options) {
  const opts = { width: 2048, height: 2048, ...options };
  return buildLatLonRaster(world, opts, pixelToLatLonMercator, 'web-mercator');
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

function drawLocalHydrology(buf, elevation, drawableMask, width, height) {
  const count = width * height;
  const downslope = new Int32Array(count).fill(-1);
  const filled = new Float32Array(elevation);
  const visited = new Uint8Array(count);
  const flow = new Float32Array(count);
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
      flow[index] = 1;
      let outlet = -1;
      let isOutlet = x === 0 || y === 0 || x === width - 1 || y === height - 1;
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
    if (target >= 0) flow[target] += flow[index];
  }

  const minFlow = Math.max(800, landIndices.length * 0.04);
  const color = [41, 126, 190, 255];
  let invalidInlandTermini = 0;
  let visibleOutletCount = 0;
  for (const index of landIndices) {
    const target = downslope[index];
    const x = index % width;
    const y = Math.floor(index / width);
    if (flow[index] < minFlow) continue;
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
    const radius = Math.min(0.78, 0.38 + Math.log2(flow[index] / minFlow + 1) * 0.1);
    drawLine(
      buf,
      width,
      height,
      { x, y },
      { x: tx, y: ty },
      radius,
      color,
      drawableMask
    );
    if (!drawableMask[target]) {
      visibleOutletCount++;
    } else if (flow[target] < minFlow) {
      invalidInlandTermini++;
    }
  }
  return {
    riverPixelCount: landIndices.filter((index) => flow[index] >= minFlow).length,
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
  for (const [u, v, weight] of corners) {
    const corner = faceUVToVector(face, u, v, n);
    const cell = lookupCell(world.cells, n, corner.x, corner.y, corner.z);
    elevation += (cell?.elevation || 0) * weight;
    magicFlux += (cell?.magicFlux || 0) * weight;
  }
  return {
    elevation,
    magicFlux,
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
      lake[index] = fields.nearest?.isLake ? 1 : 0;
      riverLand[index] = !fields.nearest?.isLake && elevation[index] > seaLevelM ? 1 : 0;
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
      const shade = Math.max(0.62, Math.min(1.22, 0.92 + (left - right + down - up) / 900));
      rgba = [
        Math.round(rgba[0] * shade),
        Math.round(rgba[1] * shade),
        Math.round(rgba[2] * shade),
        255
      ];

      const relative = here - seaLevelM;
      const rightRelative = right - seaLevelM;
      const downRelative = down - seaLevelM;
      const water = relative <= 0 || lake[index];
      const rightWater = rightRelative <= 0 || lake[py * width + Math.min(width - 1, px + 1)];
      const downWater = downRelative <= 0 || lake[Math.min(height - 1, py + 1) * width + px];
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
  const hydrology = drawLocalHydrology(buf, elevation, riverLand, width, height);

  return {
    width,
    height,
    layer,
    projection: 'azimuthal-equidistant-cartographic',
    centerLat,
    centerLon,
    span,
    riverPixelCount: hydrology.riverPixelCount,
    invalidRiverTermini: hydrology.invalidInlandTermini,
    visibleRiverOutlets: hydrology.visibleOutletCount,
    scaleKmPerPixel: Math.round(
      (world.meta.radiusKm * span * Math.PI / 180 / width) * 100
    ) / 100,
    rgba: buf.toString('base64')
  };
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
