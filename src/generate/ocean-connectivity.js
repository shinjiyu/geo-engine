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

/**
 * Reopens sub-sea basins cut off from the main ocean by straits narrower than a cell.
 * A basin rejoins when a path of at most maxLength land cells links it to the ocean and
 * every cell on the path has some part of its footprint at or below passableBelowM.
 * Path cells are turned into water (elevation lowered to their footprint minimum).
 *
 * @param {Map<string, object>} cells
 * @param {Map<string, string[]>} neighborTable
 * @param {Map<string, number>} footprintMinElevation - lowest sampled elevation per cell
 * @returns {number} cells opened as straits
 */
function openNarrowStraits(cells, neighborTable, footprintMinElevation, passableBelowM, maxLength = 3) {
  const keys = [...cells.keys()];
  const idx = new Map(keys.map((k, i) => [k, i]));
  const neighbors = keys.map((k) => (neighborTable.get(k) || []).map((nk) => idx.get(nk)).filter((j) => j !== undefined));
  const water = keys.map((k) => !cells.get(k).isLand);
  const components = findOceanComponents(water, neighbors, keys.length);
  if (components.length < 2) return 0;
  components.sort((a, b) => b.length - a.length);
  const inMain = new Uint8Array(keys.length);
  for (const i of components[0]) inMain[i] = 1;
  const passable = keys.map((k) => (footprintMinElevation.get(k) ?? Infinity) <= passableBelowM);

  let opened = 0;
  let merged = true;
  const pending = components.slice(1);
  while (merged) {
    merged = false;
    for (let c = pending.length - 1; c >= 0; c--) {
      const comp = pending[c];
      const parent = new Map();
      const depth = new Map();
      let frontier = [];
      for (const i of comp) { parent.set(i, -1); depth.set(i, 0); frontier.push(i); }
      let hit = -1;
      while (frontier.length && hit < 0) {
        const next = [];
        for (const u of frontier) {
          for (const v of neighbors[u]) {
            if (parent.has(v)) continue;
            if (inMain[v]) { parent.set(v, u); hit = v; break; }
            if (water[v] || !passable[v] || depth.get(u) >= maxLength) continue;
            parent.set(v, u);
            depth.set(v, depth.get(u) + 1);
            next.push(v);
          }
          if (hit >= 0) break;
        }
        frontier = next;
      }
      if (hit < 0) continue;
      for (let u = parent.get(hit); u >= 0 && !water[u]; u = parent.get(u)) {
        const cell = cells.get(keys[u]);
        cell.elevation = Math.min(cell.elevation, footprintMinElevation.get(keys[u]), passableBelowM);
        cell.drainageElevation = Math.min(cell.drainageElevation ?? cell.elevation, cell.elevation);
        cell.isLand = false;
        water[u] = true;
        inMain[u] = 1;
        opened++;
      }
      for (const i of comp) inMain[i] = 1;
      pending.splice(c, 1);
      merged = true;
    }
  }
  return opened;
}

module.exports = { resolveOceanMask, resolveOceanMaskOnCells, findOceanComponents, openNarrowStraits };
