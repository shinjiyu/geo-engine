'use strict';

const {
  faceUVToVector,
  vectorToLatLon,
  cellKey,
  buildNeighborTable
} = require('../topology/cube-sphere');
const { normalizePlanet, snowLineElevationM } = require('../planet/params');
const { createElevationField } = require('./elevation-field');
const { generateOrogenTerrain } = require('./orogen-terrain');
const { resolveOceanMaskOnCells } = require('./ocean-connectivity');

function unitNormal(x, y, z) {
  const length = Math.hypot(x, y, z) || 1;
  return { x: x / length, y: y / length, z: z / length };
}

function sphereTangentNeighbors(x, y, z, eps = 0.022) {
  let tx;
  let ty;
  let tz;
  if (Math.abs(y) < 0.85) {
    tx = z;
    ty = 0;
    tz = -x;
  } else {
    tx = 0;
    ty = -z;
    tz = y;
  }
  const tangentLength = Math.hypot(tx, ty, tz) || 1;
  tx /= tangentLength;
  ty /= tangentLength;
  tz /= tangentLength;
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

const TERRAIN = {
  DEEP_OCEAN: 'deep_ocean',
  OCEAN: 'ocean',
  LAKE: 'lake',
  COAST: 'coast',
  PLAIN: 'plain',
  HILL: 'hill',
  MOUNTAIN: 'mountain',
  SNOW: 'snow',
  ICE: 'ice'
};

const elevationCache = new Map();

function getElevationSampler(seed) {
  if (!elevationCache.has(seed)) elevationCache.set(seed, createElevationField(seed));
  return elevationCache.get(seed);
}

function assignCellTerrain(cell, planet, seaLevelM) {
  const absLat = Math.abs(cell.lat);
  if (!cell.isLand) {
    if (cell.isLake) {
      cell.terrain = TERRAIN.LAKE;
      return;
    }
    cell.terrain = absLat >= planet.polarCircleLat ? TERRAIN.ICE : TERRAIN.DEEP_OCEAN;
    return;
  }

  const snowLine = snowLineElevationM(planet, absLat);
  if (cell.elevation >= snowLine - 150) cell.terrain = TERRAIN.SNOW;
  else if (cell.elevation > 2600) cell.terrain = TERRAIN.MOUNTAIN;
  else if (cell.elevation > 1200) cell.terrain = TERRAIN.HILL;
  else cell.terrain = TERRAIN.PLAIN;

  if (cell.inlandBasinFilled && cell.elevation <= seaLevelM) {
    cell.terrain = TERRAIN.PLAIN;
  }
}

function generateTerrain(seed, n, options = {}) {
  const planet = normalizePlanet(options.planet || options);
  const seaLevelM = options.seaLevelM ?? planet.seaLevelM;
  const backend = options.backend || 'orogen';
  const orogen = backend === 'orogen'
    ? generateOrogenTerrain(seed, n, options.orogen)
    : null;
  const sampleElev = backend === 'noise' ? getElevationSampler(seed) : null;
  const cells = new Map();
  const neighborTable = buildNeighborTable(n);
  let regionIndex = 0;

  for (let face = 0; face < 6; face++) {
    for (let u = 0; u < n; u++) {
      for (let v = 0; v < n; v++) {
        const vector = faceUVToVector(face, u, v, n);
        const { lat, lon } = vectorToLatLon(vector.x, vector.y, vector.z);
        const elevation = orogen
          ? seaLevelM + orogen.elevationM[regionIndex]
          : sampleElev(vector.x, vector.y, vector.z);

        cells.set(cellKey(face, u, v), {
          face,
          u,
          v,
          lat: Math.round(lat * 100) / 100,
          lon: Math.round(lon * 100) / 100,
          elevation,
          isLand: elevation > seaLevelM,
          isLake: false,
          terrain: null,
          magicFlux: 0,
          population: 0,
          realmId: null,
          flow: 0,
          downslope: null,
          river: false,
          tempC: 0,
          precip: 0,
          evaporation: 0,
          runoff: 0,
          climateZone: null,
          plateId: orogen ? orogen.plateIds[regionIndex] : null,
          plateBoundary: orogen ? orogen.plateBoundary[regionIndex] : false
        });
        regionIndex++;
      }
    }
  }

  const oceanStats = resolveOceanMaskOnCells(cells, neighborTable);
  for (const cell of cells.values()) assignCellTerrain(cell, planet, seaLevelM);
  cells.oceanStats = oceanStats;
  cells.terrainBackend = backend === 'orogen' ? 'world-orogen' : 'noise';
  return cells;
}

function sampleTerrainAtUnitVector(seed, x, y, z, options = {}) {
  const planet = normalizePlanet(options.planet || {});
  const seaLevelM = options.seaLevelM ?? planet.seaLevelM;
  const withCoast = options.withCoast !== false;
  const sampleElev = options.sampleElev || getElevationSampler(seed);
  const elevation = sampleElev(x, y, z);
  const isLand = elevation > seaLevelM;
  const { lat, lon } = vectorToLatLon(x, y, z);
  const absLat = Math.abs(lat);
  const snowLine = snowLineElevationM(planet, absLat);

  let terrain = TERRAIN.DEEP_OCEAN;
  if (isLand) {
    if (elevation >= snowLine - 150) terrain = TERRAIN.SNOW;
    else if (elevation > 2600) terrain = TERRAIN.MOUNTAIN;
    else if (elevation > 1200) terrain = TERRAIN.HILL;
    else terrain = TERRAIN.PLAIN;
  } else if (elevation > seaLevelM - 400) {
    terrain = TERRAIN.OCEAN;
  }

  if (!isLand && absLat >= planet.polarCircleLat) terrain = TERRAIN.ICE;

  if (withCoast && isLand && (terrain === TERRAIN.PLAIN || terrain === TERRAIN.HILL)) {
    for (const neighbor of sphereTangentNeighbors(x, y, z)) {
      const sample = sampleTerrainAtUnitVector(seed, neighbor.x, neighbor.y, neighbor.z, {
        seaLevelM,
        planet,
        withCoast: false,
        sampleElev
      });
      if (!sample.isLand) {
        terrain = TERRAIN.COAST;
        break;
      }
    }
  }

  return { elevation, isLand, terrain, lat, lon };
}

function applyMagicLevel(cells, magic) {
  const fluxMap = { none: 0, low: 0.15, mid: 0.4, high: 0.75 };
  const base = fluxMap[magic] ?? 0.15;
  if (base === 0) return;
  for (const cell of cells.values()) {
    if (!cell.isLand) continue;
    cell.magicFlux = Math.round(
      base * (0.5 + (cell.elevation % 500) / 1000) * 1000
    ) / 1000;
  }
}

module.exports = {
  TERRAIN,
  generateTerrain,
  applyMagicLevel,
  sampleTerrainAtUnitVector
};
