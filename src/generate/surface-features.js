'use strict';

const { cellKey } = require('../topology/cube-sphere');
const { TERRAIN } = require('./terrain');

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

function strictLandDownslope(cells, neighborTable) {
  const downslope = new Map();
  for (const cell of cells.values()) {
    if (!cell.isLand) continue;
    const key = cellKey(cell.face, cell.u, cell.v);
    let best = null;
    let bestElev = cell.elevation;
    for (const nk of neighborTable.get(key) || []) {
      const nb = cells.get(nk);
      if (!nb?.isLand || nb.elevation >= bestElev) continue;
      bestElev = nb.elevation;
      best = nk;
    }
    downslope.set(key, best);
  }
  return downslope;
}

function buildUpslope(downslope) {
  const upslope = new Map();
  for (const [key, down] of downslope) {
    if (!down) continue;
    if (!upslope.has(down)) upslope.set(down, []);
    upslope.get(down).push(key);
  }
  return upslope;
}

function collectBasin(sinkKey, upslope, cells) {
  const basin = [sinkKey];
  const seen = new Set([sinkKey]);
  const stack = [sinkKey];
  while (stack.length) {
    const cur = stack.pop();
    for (const j of upslope.get(cur) || []) {
      const c = cells.get(j);
      if (!c?.isLand || seen.has(j)) continue;
      seen.add(j);
      basin.push(j);
      stack.push(j);
    }
  }
  return basin;
}

function computeSpillLevel(basin, cells, neighborTable) {
  const inBasin = new Set(basin);
  let spill = Infinity;
  for (const key of basin) {
    for (const nk of neighborTable.get(key) || []) {
      if (inBasin.has(nk)) continue;
      const nb = cells.get(nk);
      if (nb?.isLand) spill = Math.min(spill, nb.elevation);
    }
  }
  if (spill === Infinity) {
    spill = Math.max(...basin.map((k) => cells.get(k).elevation)) + 30;
  }
  return spill - 0.5;
}

function lakeAreaKm2(keys, cells, planet) {
  const meanCellArea = 4 * Math.PI * planet.radiusKm * planet.radiusKm / cells.size;
  return Math.round(keys.reduce(
    (sum, key) => sum + meanCellArea * (cells.get(key)?.areaWeight || 1),
    0
  ));
}

function lakeWaterSupply(keys, cells) {
  if (!keys.length) return false;
  return keys.reduce((sum, key) => {
    const cell = cells.get(key);
    return sum + (cell?.runoff || 0) + (cell?.precip || 0) * 0.02;
  }, 0) / keys.length;
}

function classifyFreshwater(keys, cells) {
  return lakeWaterSupply(keys, cells) >= 8;
}

function markLake(cells, keys, waterLevelM) {
  for (const key of keys) {
    const cell = cells.get(key);
    if (!cell) continue;
    cell.isLake = true;
    cell.isLand = false;
    cell.terrain = TERRAIN.LAKE;
    cell.waterLevelM = Math.round(waterLevelM);
    cell.vegetation = null;
  }
}

function collectFilledBasins(cells, neighborTable) {
  const components = [];
  const seen = new Set();
  for (const [key, cell] of cells) {
    if (!cell.inlandBasinFilled || seen.has(key)) continue;
    const component = [];
    const queue = [key];
    seen.add(key);
    while (queue.length) {
      const current = queue.pop();
      component.push(current);
      for (const neighbor of neighborTable.get(current) || []) {
        if (seen.has(neighbor) || !cells.get(neighbor)?.inlandBasinFilled) continue;
        seen.add(neighbor);
        queue.push(neighbor);
      }
    }
    components.push(component);
  }
  return components;
}

function lakeTouchesOcean(keys, cells, neighborTable) {
  const lakeSet = new Set(keys);
  return keys.some((key) => (neighborTable.get(key) || []).some((neighbor) => {
    if (lakeSet.has(neighbor)) return false;
    const cell = cells.get(neighbor);
    return cell && !cell.isLand && !cell.isLake;
  }));
}

function detectLakes(cells, neighborTable, planet, options = {}) {
  const strictDown = strictLandDownslope(cells, neighborTable);
  const upslope = buildUpslope(strictDown);
  const lakes = [];
  const claimed = new Set();
  const minLakeAreaKm2 = options.minLakeAreaKm2 ?? 3000;

  for (const component of collectFilledBasins(cells, neighborTable)) {
    const areaKm2 = lakeAreaKm2(component, cells, planet);
    if (areaKm2 < minLakeAreaKm2) continue;
    if (lakeWaterSupply(component, cells) < 3) continue;
    markLake(cells, component, planet.seaLevelM);
    component.forEach((key) => claimed.add(key));
    lakes.push({
      id: `lake-${lakes.length + 1}`,
      cells: component,
      waterLevelM: Math.round(planet.seaLevelM),
      cellCount: component.length,
      areaKm2,
      freshwater: classifyFreshwater(component, cells),
      origin: 'enclosed_below_sea_basin'
    });
  }

  for (const [sinkKey, down] of strictDown) {
    if (down || claimed.has(sinkKey)) continue;
    const sink = cells.get(sinkKey);
    if (!sink?.isLand) continue;

    const basin = collectBasin(sinkKey, upslope, cells);
    const spill = computeSpillLevel(basin, cells, neighborTable);
    if (spill <= sink.elevation + 0.01) continue;
    if (sink.elevation > planet.seaLevelM + 2800) continue;

    const lakeCells = basin.filter((key) => cells.get(key)?.elevation <= spill);
    const areaKm2 = lakeAreaKm2(lakeCells, cells, planet);
    if (!lakeCells.length || areaKm2 < minLakeAreaKm2) continue;
    if (lakeWaterSupply(lakeCells, cells) < 3) continue;
    if (lakeTouchesOcean(lakeCells, cells, neighborTable)) continue;

    markLake(cells, lakeCells, spill);
    lakeCells.forEach((key) => claimed.add(key));
    lakes.push({
      id: `lake-${lakes.length + 1}`,
      cells: lakeCells,
      waterLevelM: Math.round(spill),
      cellCount: lakeCells.length,
      areaKm2,
      freshwater: classifyFreshwater(lakeCells, cells),
      origin: 'closed_drainage_basin'
    });
  }

  return lakes;
}

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

function nearWetCell(cell, cells, neighborTable, minRiverFlow) {
  if ((cell.flow || 0) >= minRiverFlow * 0.25) return true;
  const key = cellKey(cell.face, cell.u, cell.v);
  for (const nk of neighborTable.get(key) || []) {
    const nb = cells.get(nk);
    if (nb?.isLake) return true;
  }
  return false;
}

function assignVegetationToCell(cell, planet, geography, minRiverFlow, neighborTable, cells) {
  if (!cell.isLand || cell.isLake) {
    cell.vegetation = null;
    return;
  }

  const moist = Math.min(1.2, (cell.soilMoisture || 0) / 180);
  const zone = cell.climateZone || 'temperate';
  const aridScore = cell.aridScore || 0;
  const riverWet = nearWetCell(cell, cells, neighborTable, minRiverFlow)
    && cell.elevation < planet.seaLevelM + 500;

  if (zone === 'snow') cell.vegetation = VEG.SPARSE;
  else if (zone === 'polar') cell.vegetation = VEG.TUNDRA;
  else if (zone === 'cold') cell.vegetation = moist > 0.45 ? VEG.TUNDRA : VEG.SPARSE;
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
  const minRiverFlow = options?.minRiverFlow ?? 28;

  const lakes = detectLakes(cells, neighborTable, planet);
  const { landmasses, islands } = labelLandmasses(cells, neighborTable);

  const vegetationCounts = {};
  for (const cell of cells.values()) {
    assignVegetationToCell(cell, planet, geography, minRiverFlow, neighborTable, cells);
    if (cell.vegetation) {
      vegetationCounts[cell.vegetation] = (vegetationCounts[cell.vegetation] || 0) + 1;
    }
  }

  return { lakes, landmasses, islands, vegetationCounts };
}

module.exports = { VEG, runSurfaceFeatures, detectLakes, labelLandmasses };
