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
const { resolveOceanMaskOnCells, openNarrowStraits } = require('./ocean-connectivity');

// Heightmap cells sample their footprint (at least one source-data spacing wide) so straits
// narrower than a cell keep seas connected.
const FOOTPRINT_SAMPLES = 7;
const MAX_STRAIT_KM = 400;

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

// Heights above sea level; equal to the former absolute thresholds at the default 900 m sea level.
const MOUNTAIN_HEIGHT_M = 1700;
const HILL_HEIGHT_M = 300;

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
  const heightM = cell.elevation - seaLevelM;
  if (heightM >= snowLine - 150) cell.terrain = TERRAIN.SNOW;
  else if (heightM > MOUNTAIN_HEIGHT_M) cell.terrain = TERRAIN.MOUNTAIN;
  else if (heightM > HILL_HEIGHT_M) cell.terrain = TERRAIN.HILL;
  else cell.terrain = TERRAIN.PLAIN;

  if (cell.inlandBasinFilled && cell.elevation <= seaLevelM) {
    cell.terrain = TERRAIN.PLAIN;
  }
}

function generateTerrain(seed, n, options = {}) {
  const planet = normalizePlanet(options.planet || options);
  const seaLevelM = options.seaLevelM ?? planet.seaLevelM;
  const backend = options.backend || 'orogen';
  if (backend === 'heightmap' && typeof options.sampleHeightM !== 'function') {
    throw new Error('heightmap backend requires options.sampleHeightM(latDeg, lonDeg) -> metres above sea level');
  }
  const orogen = backend === 'orogen'
    ? generateOrogenTerrain(seed, n, options.orogen)
    : null;
  const sampleElev = backend === 'noise' ? getElevationSampler(seed) : null;
  const cells = new Map();
  const neighborTable = buildNeighborTable(n);
  const footprintMin = backend === 'heightmap' ? new Map() : null;
  const footprintHalf = Math.max(0.5, 0.6 * (options.heightmapSpacingDeg || 0) / (90 / n));
  const footprintOffsets = Array.from({ length: FOOTPRINT_SAMPLES }, (_, i) => footprintHalf * (2 * i / (FOOTPRINT_SAMPLES - 1) - 1));
  let regionIndex = 0;

  for (let face = 0; face < 6; face++) {
    for (let u = 0; u < n; u++) {
      for (let v = 0; v < n; v++) {
        const vector = faceUVToVector(face, u, v, n);
        const { lat, lon } = vectorToLatLon(vector.x, vector.y, vector.z);
        const key = cellKey(face, u, v);
        let elevation;
        if (orogen) elevation = seaLevelM + orogen.elevationM[regionIndex];
        else if (backend === 'heightmap') elevation = seaLevelM + options.sampleHeightM(lat, lon);
        else elevation = sampleElev(vector.x, vector.y, vector.z);
        let drainageElevation = elevation;
        if (footprintMin) {
          // Climate uses the cell-centre height; drainage follows the lowest pass in the
          // footprint so a canyon narrower than a cell (Nile, Indus) is not blocked by the
          // plateau sampled at the centre.
          for (const du of footprintOffsets) {
            for (const dv of footprintOffsets) {
              const s = faceUVToVector(face, u + du, v + dv, n);
              const ll = vectorToLatLon(s.x, s.y, s.z);
              drainageElevation = Math.min(drainageElevation, seaLevelM + options.sampleHeightM(ll.lat, ll.lon));
            }
          }
          footprintMin.set(key, drainageElevation);
        }

        cells.set(key, {
          face,
          u,
          v,
          lat: Math.round(lat * 100) / 100,
          lon: Math.round(lon * 100) / 100,
          elevation,
          drainageElevation,
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

  const cellKm = (Math.PI / 2) * planet.radiusKm / n;
  const straitsOpened = footprintMin
    ? openNarrowStraits(cells, neighborTable, footprintMin, seaLevelM, Math.max(2, Math.round(MAX_STRAIT_KM / cellKm)))
    : 0;
  const oceanStats = { ...resolveOceanMaskOnCells(cells, neighborTable), straitsOpened };
  for (const cell of cells.values()) assignCellTerrain(cell, planet, seaLevelM);
  cells.oceanStats = oceanStats;
  cells.terrainBackend = { orogen: 'world-orogen', heightmap: 'heightmap' }[backend] || 'noise';
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
    const heightM = elevation - seaLevelM;
    if (heightM >= snowLine - 150) terrain = TERRAIN.SNOW;
    else if (heightM > MOUNTAIN_HEIGHT_M) terrain = TERRAIN.MOUNTAIN;
    else if (heightM > HILL_HEIGHT_M) terrain = TERRAIN.HILL;
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
  MOUNTAIN_HEIGHT_M,
  HILL_HEIGHT_M,
  generateTerrain,
  applyMagicLevel,
  sampleTerrainAtUnitVector
};
