'use strict';

const { cellKey } = require('../topology/cube-sphere');

const VEG = {
  DESERT: 'desert',
  GRASSLAND: 'grassland',
  SHRUBLAND: 'shrubland',
  FOREST: 'forest',
  RAINFOREST: 'rainforest',
  TUNDRA: 'tundra',
  WETLAND: 'wetland',
  SPARSE: 'sparseland'
};

function labelLandmasses(cells, neighborTable) {
  const landmasses = [];
  const visited = new Set();

  for (const cell of cells.values()) {
    if (!cell.isLand || cell.isLake) continue;
    const start = cellKey(cell.face, cell.u, cell.v);
    if (visited.has(start)) continue;

    const id = landmasses.length;
    const queue = [start];
    visited.add(start);
    cell.landmassId = id;
    let count = 0;
    let touchesOcean = false;

    while (queue.length) {
      const key = queue.pop();
      const cur = cells.get(key);
      if (!cur) continue;
      count++;

      for (const nk of neighborTable.get(key) || []) {
        const nb = cells.get(nk);
        if (!nb?.isLand || nb.isLake) {
          if (nb && !nb.isLand && !nb.isLake) touchesOcean = true;
          continue;
        }
        const nkKey = cellKey(nb.face, nb.u, nb.v);
        if (visited.has(nkKey)) continue;
        visited.add(nkKey);
        nb.landmassId = id;
        queue.push(nkKey);
      }
    }

    landmasses.push({
      id,
      cellCount: count,
      touchesOcean,
      isMainland: false,
      isIsland: false
    });
  }

  const oceanLinked = landmasses.filter((m) => m.touchesOcean).sort((a, b) => b.cellCount - a.cellCount);
  if (oceanLinked.length) {
    oceanLinked[0].isMainland = true;
    for (let i = 1; i < oceanLinked.length; i++) oceanLinked[i].isIsland = true;
  }

  return {
    landmasses,
    islands: landmasses.filter((m) => m.isIsland)
  };
}

function nearWetCell(cell, cells, neighborTable) {
  if (cell.river) return true;
  const key = cellKey(cell.face, cell.u, cell.v);
  for (const nk of neighborTable.get(key) || []) {
    const nb = cells.get(nk);
    if (nb?.isLake || nb?.river) return true;
  }
  return false;
}

function assignVegetationToCell(cell, planet, geography, neighborTable, cells) {
  if (!cell.isLand || cell.isLake) {
    cell.vegetation = null;
    return;
  }

  const moist = Math.min(1.2, (cell.soilMoisture || 0) / 180);
  const zone = cell.climateZone || 'temperate';
  const aridScore = cell.aridScore || 0;
  const riverWet = nearWetCell(cell, cells, neighborTable)
    && cell.elevation < planet.seaLevelM + 500;

  if (zone === 'snow') cell.vegetation = VEG.SPARSE;
  else if (zone === 'polar') cell.vegetation = VEG.TUNDRA;
  else if (zone === 'cold') cell.vegetation = moist > 0.4 ? VEG.FOREST : VEG.TUNDRA;
  else if (riverWet && moist > 0.35) cell.vegetation = VEG.WETLAND;
  else if (zone === 'arid' || aridScore > 0.58) {
    cell.vegetation = geography === 'forest' && moist > 0.28 ? VEG.SHRUBLAND : VEG.DESERT;
  } else if (zone === 'tropical') {
    if (moist > 0.7) cell.vegetation = VEG.RAINFOREST;
    else if (moist > 0.42) cell.vegetation = geography === 'desert' ? VEG.GRASSLAND : VEG.FOREST;
    else cell.vegetation = VEG.GRASSLAND;
  } else if (zone === 'subtropical') {
    if (moist > 0.55) cell.vegetation = geography === 'desert' ? VEG.SHRUBLAND : VEG.FOREST;
    else cell.vegetation = moist > 0.3 ? VEG.GRASSLAND : VEG.SHRUBLAND;
  } else if (zone === 'temperate') {
    if (moist > 0.58) cell.vegetation = VEG.FOREST;
    else if (moist > 0.34) cell.vegetation = VEG.GRASSLAND;
    else cell.vegetation = geography === 'forest' ? VEG.SHRUBLAND : VEG.GRASSLAND;
  } else {
    cell.vegetation = VEG.GRASSLAND;
  }
}

function runSurfaceFeatures(cells, neighborTable, planet, options) {
  const geography = options?.geography || 'mixed';
  const lakes = options?.lakes || [];
  const { landmasses, islands } = labelLandmasses(cells, neighborTable);

  const vegetationCounts = {};
  for (const cell of cells.values()) {
    assignVegetationToCell(cell, planet, geography, neighborTable, cells);
    if (cell.vegetation) {
      vegetationCounts[cell.vegetation] = (vegetationCounts[cell.vegetation] || 0) + 1;
    }
  }

  return { lakes, landmasses, islands, vegetationCounts };
}

module.exports = { VEG, runSurfaceFeatures, labelLandmasses };
