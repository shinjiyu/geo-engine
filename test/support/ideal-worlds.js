'use strict';

/**
 * Idealized worlds with no observations of their own, scored against the textbook
 * climate pattern of Koppen's hypothetical continent. They keep calibration honest:
 * parameters must reproduce the general zonal / coastal pattern, not just Earth's map.
 */

const { generateTerrain } = require('../../src/generate/terrain');
const { computeAreaWeights, vectorToCell, cellKey } = require('../../src/topology/cube-sphere');

/** Half-width (degrees of longitude) of the continent, centred on lon 0; < 0 means ocean. */
function continentHalfWidth(lat) {
  if (lat > 70 || lat < -55) return -1;
  return lat >= 0 ? 45 - 15 * Math.max(0, (lat - 50) / 20) : 25 * Math.cos((lat / 55) * Math.PI / 2) + 5;
}

const WORLDS = {
  continent: (lat, lon) => (Math.abs(lon) <= continentHalfWidth(lat) ? 200 : -3000),
  aquaplanet: () => -3000
};

// [lat, side (W coast / C interior / E coast), allowed Koppen classes (prefix match), P range mm/yr]
// Ranges follow analogue stations (Miami, Shanghai, Lisbon, Bordeaux, Kyiv, Harbin, Sydney, Santiago...).
const CONTINENT_TARGETS = [
  [2, 'W', ['A'], [1200, 4000]], [2, 'C', ['A'], [1200, 4000]], [2, 'E', ['A'], [1200, 4000]],
  [12, 'C', ['Aw', 'Am', 'BS'], [500, 1600]],
  [22, 'W', ['BW'], [0, 250]], [22, 'C', ['BW'], [0, 250]],
  [28, 'E', ['C', 'A'], [900, 2000]],
  [36, 'W', ['Cs', 'BS'], [250, 900]], [36, 'C', ['B'], [0, 500]], [36, 'E', ['C'], [900, 2000]],
  [48, 'W', ['Cf', 'Cs'], [600, 2500]], [48, 'C', ['D', 'BS', 'C'], [250, 750]], [48, 'E', ['D', 'C'], [500, 1500]],
  [58, 'W', ['C', 'D'], [600, 3000]], [58, 'C', ['D'], [300, 800]],
  [67, 'C', ['D', 'ET'], [150, 700]],
  [-22, 'W', ['BW'], [0, 250]], [-26, 'E', ['C', 'A'], [800, 2000]],
  [-35, 'W', ['Cs', 'BS'], [250, 900]], [-35, 'E', ['C'], [700, 1800]],
  [-45, 'W', ['C'], [800, 3500]]
];

function targetLon(lat, side) {
  const hw = continentHalfWidth(lat);
  return side === 'W' ? -hw + 3 : side === 'E' ? hw - 3 : 0;
}

/**
 * Score samples of the continent world. `sample(lat, lon)` -> { precip, koppen }.
 * Returns per-target results, hit count and a smooth loss for calibration.
 */
function scoreContinent(sample) {
  const results = [];
  let loss = 0;
  let hits = 0;
  for (const [lat, side, classes, [lo, hi]] of CONTINENT_TARGETS) {
    const lon = targetLon(lat, side);
    const { precip, koppen } = sample(lat, lon);
    const classOk = classes.some((k) => koppen.startsWith(k));
    const pErr = Math.max(0, Math.log((lo + 30) / (precip + 30)), Math.log((precip + 30) / (hi + 30)));
    loss += pErr + (classOk ? 0 : 0.5);
    const hit = classOk && pErr === 0;
    if (hit) hits++;
    results.push({ lat, side, lon, precip: Math.round(precip), koppen, expected: classes.join('|'), range: [lo, hi], hit });
  }
  return { results, hits, total: CONTINENT_TARGETS.length, loss: loss / CONTINENT_TARGETS.length };
}

/** Cube-sphere cells for an idealized world (same path as the Earth heightmap cells). */
function buildIdealCells(name, n, planet) {
  const cells = generateTerrain(name, n, { planet, backend: 'heightmap', sampleHeightM: WORLDS[name] });
  for (const [k, w] of computeAreaWeights(n)) {
    const c = cells.get(k);
    if (c) c.areaWeight = w;
  }
  return cells;
}

function cellAt(cells, n, lat, lon) {
  const la = lat * Math.PI / 180; const lo = lon * Math.PI / 180;
  const { face, u, v } = vectorToCell(Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo), n);
  return cells.get(cellKey(face, u, v));
}

/** Lat-lon surface for driving simulateAtmosphere directly (calibration). */
function idealSurface(name, grid) {
  const landFraction = new Float64Array(grid.size);
  const heightM = new Float64Array(grid.size);
  for (let i = 0; i < grid.nLat; i++) {
    for (let j = 0; j < grid.nLon; j++) {
      const h = WORLDS[name](grid.rowLat[i], grid.colLon[j]);
      landFraction[i * grid.nLon + j] = h > 0 ? 1 : 0;
      heightM[i * grid.nLon + j] = Math.max(0, h);
    }
  }
  return { landFraction, heightM };
}

module.exports = { WORLDS, CONTINENT_TARGETS, continentHalfWidth, scoreContinent, buildIdealCells, cellAt, idealSurface };
