'use strict';

const { runDrainage } = require('./drainage');
const { normalizePlanet } = require('../planet/params');
const { TERRAIN } = require('./terrain');

/** Lakes and rivers from one drainage model: depression filling, lake water balance, river tree. */
function runHydrology(cells, n, options = {}) {
  const { buildNeighborTable } = require('../topology/cube-sphere');
  const neighborTable = options.neighborTable || buildNeighborTable(n);
  return runDrainage(cells, neighborTable, normalizePlanet(options.planet), options.drainage);
}

function extractMountainRanges(cells, n) {
  const { cellKey, buildNeighborTable } = require('../topology/cube-sphere');
  const neighborTable = buildNeighborTable(n);
  const ranges = [];
  const visited = new Set();

  for (const cell of cells.values()) {
    if (cell.terrain !== TERRAIN.MOUNTAIN && cell.terrain !== TERRAIN.SNOW) continue;
    const k = cellKey(cell.face, cell.u, cell.v);
    if (visited.has(k)) continue;
    const cluster = floodMountain(k, cells, neighborTable, visited);
    if (cluster.length >= 8) {
      ranges.push({
        id: `mountain-${ranges.length + 1}`,
        cells: cluster,
        maxElevation: Math.max(...cluster.map((ck) => cells.get(ck).elevation)),
        name: `山脉-${ranges.length + 1}`
      });
    }
  }
  return ranges;
}

function floodMountain(startKey, cells, neighborTable, visited) {
  const stack = [startKey];
  const cluster = [];
  while (stack.length) {
    const k = stack.pop();
    if (visited.has(k)) continue;
    visited.add(k);
    const c = cells.get(k);
    if (!c || (c.terrain !== TERRAIN.MOUNTAIN && c.terrain !== TERRAIN.SNOW)) continue;
    cluster.push(k);
    for (const nk of neighborTable.get(k) || []) {
      if (!visited.has(nk)) stack.push(nk);
    }
  }
  return cluster;
}

module.exports = { runHydrology, extractMountainRanges };
