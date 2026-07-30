'use strict';

/**
 * Keep only the largest sub-sea-level connected component as ocean.
 * Inland basins (pseudo-Mediterranean) are filled → land.
 * Sync with public/ocean-connectivity.js
 */

function findOceanComponents(isOcean, neighbors, n) {
  const compId = new Int32Array(n).fill(-1);
  const components = [];

  for (let i = 0; i < n; i++) {
    if (!isOcean[i] || compId[i] >= 0) continue;
    const comp = [];
    const stack = [i];
    compId[i] = components.length;
    while (stack.length) {
      const u = stack.pop();
      comp.push(u);
      for (const v of neighbors[u]) {
        if (isOcean[v] && compId[v] < 0) {
          compId[v] = components.length;
          stack.push(v);
        }
      }
    }
    components.push(comp);
  }
  return components;
}

/**
 * @param {boolean[]|Uint8Array} isLand - length n
 * @param {number[][]} neighbors
 * @returns {{ isLand: Uint8Array, mainOceanCells: number, basinsFilled: number, oceanComponents: number }}
 */
function resolveOceanMask(isLand, neighbors) {
  const n = isLand.length;
  const land = Uint8Array.from(isLand, (v) => (v ? 1 : 0));
  const isOcean = new Array(n);
  for (let i = 0; i < n; i++) isOcean[i] = !land[i];

  const components = findOceanComponents(isOcean, neighbors, n);
  if (components.length === 0) {
    return { isLand: land, mainOceanCells: 0, basinsFilled: 0, oceanComponents: 0 };
  }

  let mainIdx = 0;
  for (let c = 1; c < components.length; c++) {
    if (components[c].length > components[mainIdx].length) mainIdx = c;
  }

  const mainSet = new Set(components[mainIdx]);
  let basinsFilled = 0;
  for (let c = 0; c < components.length; c++) {
    if (c === mainIdx) continue;
    for (const i of components[c]) {
      land[i] = 1;
      basinsFilled++;
    }
  }

  return {
    isLand: land,
    mainOceanCells: components[mainIdx].length,
    basinsFilled,
    oceanComponents: components.length
  };
}

function resolveOceanMaskOnCells(cells, neighborTable) {
  const keys = [...cells.keys()];
  const idx = new Map(keys.map((k, i) => [k, i]));
  const n = keys.length;
  const neighbors = keys.map((k) =>
    (neighborTable.get(k) || [])
      .map((nk) => idx.get(nk))
      .filter((j) => j !== undefined)
  );
  const isLand = keys.map((k) => cells.get(k).isLand);
  const result = resolveOceanMask(isLand, neighbors);

  for (let i = 0; i < n; i++) {
    const cell = cells.get(keys[i]);
    const wasOcean = !isLand[i];
    cell.isLand = result.isLand[i] === 1;
    if (wasOcean && cell.isLand) cell.inlandBasinFilled = true;
  }

  return result;
}

module.exports = { resolveOceanMask, resolveOceanMaskOnCells, findOceanComponents };
