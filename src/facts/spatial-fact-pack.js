'use strict';

const { cellKey, haversineKm, buildNeighborTable } = require('../topology/cube-sphere');

function findRealm(world, realmIdOrRace) {
  if (!world.realms) return null;
  return world.realms.find((r) => r.id === realmIdOrRace || r.race === realmIdOrRace) || null;
}

function queryRealmDistance(world, realmA, realmB) {
  const a = findRealm(world, realmA);
  const b = findRealm(world, realmB);
  if (!a || !b) return { error: 'Realm not found' };

  const relation = (world.realmRelations || []).find(
    (r) => (r.a === a.id && r.b === b.id) || (r.a === b.id && r.b === a.id)
  );

  return {
    a: { id: a.id, name: a.name, race: a.race, center: a.center },
    b: { id: b.id, name: b.name, race: b.race, center: b.center },
    geodesicKm: relation?.geodesicKm ?? Math.round(haversineKm(
      a.center.lat, a.center.lon, b.center.lat, b.center.lon
    )),
    separatingFeatures: relation?.separatingFeatures ?? [],
    borderKm: relation?.borderKm ?? 0
  };
}

function queryEventContext(world, anchor, radiusCells) {
  radiusCells = radiusCells ?? 8;
  const key = typeof anchor === 'string' ? anchor : cellKey(anchor.face, anchor.u, anchor.v);
  const cell = world.cells[key];
  if (!cell) return { error: 'Cell not found' };

  const n = world.meta.cellsPerFaceEdge;
  const neighborTable = buildNeighborTable(n);
  const visited = new Set([key]);
  const queue = [{ key, d: 0 }];
  const regionCells = [key];

  while (queue.length) {
    const { key: ck, d } = queue.shift();
    if (d >= radiusCells) continue;
    for (const nk of neighborTable.get(ck) || []) {
      if (visited.has(nk)) continue;
      visited.add(nk);
      regionCells.push(nk);
      queue.push({ key: nk, d: d + 1 });
    }
  }

  let popSum = 0;
  const terrains = {};
  const realms = new Set();
  const nearbyFeatures = [];

  for (const ck of regionCells) {
    const c = world.cells[ck];
    if (!c) continue;
    popSum += c.population || 0;
    terrains[c.terrain] = (terrains[c.terrain] || 0) + 1;
    if (c.realmId) realms.add(c.realmId);
    if (c.river) {
      nearbyFeatures.push({ kind: 'river', cell: ck });
    }
  }

  for (const m of world.mountains || []) {
    const overlap = m.cells.some((ck) => visited.has(ck));
    if (overlap) {
      nearbyFeatures.push({ kind: 'mountain', id: m.id, name: m.name, maxElevation: m.maxElevation });
    }
  }

  for (const lake of world.lakes || []) {
    const overlap = (lake.cells || []).some((ck) => visited.has(ck));
    if (overlap) {
      nearbyFeatures.push({
        kind: 'lake',
        id: lake.id,
        waterLevelM: lake.waterLevelM,
        cellCount: lake.cellCount,
        areaKm2: lake.areaKm2,
        freshwater: lake.freshwater
      });
    }
  }

  for (const node of world.magicNodes || []) {
    if (visited.has(node.cell)) {
      nearbyFeatures.push({
        kind: 'magic_node',
        id: node.id,
        name: node.name,
        nodeKind: node.kind,
        strength: node.strength
      });
    }
  }
  for (const line of world.leyLines || []) {
    if ((line.cells || []).some((ck) => visited.has(ck))) {
      nearbyFeatures.push({
        kind: 'ley_line',
        id: line.id,
        strength: line.strength,
        lengthKm: line.lengthKm
      });
    }
  }

  if (cell.landmassId != null) {
    const island = (world.islands || []).find((i) => i.id === cell.landmassId);
    if (island) {
      nearbyFeatures.push({
        kind: 'island',
        id: island.id,
        cellCount: island.cellCount
      });
    }
  }

  if (cell.vegetation) {
    nearbyFeatures.push({ kind: 'vegetation', biome: cell.vegetation });
  }

  const realmInfo = [...realms].map((id) => {
    const r = world.realms.find((x) => x.id === id);
    return r ? { id: r.id, name: r.name, race: r.race } : { id };
  });

  return {
    anchor: {
      cell: key,
      lat: cell.lat,
      lon: cell.lon,
      elevation: cell.elevation,
      terrain: cell.terrain,
      realmId: cell.realmId,
      magicFlux: cell.magicFlux
    },
    regionRadiusCells: radiusCells,
    regionCellCount: regionCells.length,
    populationSum: popSum,
    terrainBreakdown: terrains,
    realms: realmInfo,
    nearbyFeatures: nearbyFeatures.slice(0, 20)
  };
}

function buildFactPack(world, options) {
  options = options || {};
  const pack = {
    worldId: world.id,
    meta: world.meta,
    realms: (world.realms || []).map((r) => ({
      id: r.id,
      name: r.name,
      race: r.race,
      raceLabel: r.raceLabel,
      population: r.population,
      populationCap: r.populationCap,
      anchorFeatureId: r.anchorFeatureId,
      cellCount: r.cellCount,
      center: r.center
    })),
    realmRelations: world.realmRelations || [],
    features: {
      mountains: (world.mountains || []).map((m) => ({
        id: m.id,
        name: m.name,
        maxElevation: m.maxElevation,
        cellCount: m.cells.length
      })),
      rivers: (world.rivers || []).map((r) => ({
        id: r.id,
        kind: r.kind || 'main',
        lengthKm: r.lengthKm,
        cellCount: r.cells.length
      })),
      lakes: (world.lakes || []).map((l) => ({
        id: l.id,
        waterLevelM: l.waterLevelM,
        cellCount: l.cellCount || l.cells?.length || 0,
        areaKm2: l.areaKm2,
        freshwater: l.freshwater
      })),
      magicNodes: (world.magicNodes || []).map((node) => ({
        id: node.id,
        name: node.name,
        kind: node.kind,
        strength: node.strength,
        lat: node.lat,
        lon: node.lon
      })),
      leyLines: (world.leyLines || []).map((line) => ({
        id: line.id,
        from: line.from,
        to: line.to,
        strength: line.strength,
        lengthKm: line.lengthKm
      })),
      islands: (world.islands || []).map((i) => ({
        id: i.id,
        cellCount: i.cellCount
      }))
    },
    vegetationSummary: world.vegetationSummary || {},
    carryingCapacity: world.carryingCapacity || null,
    speciesSelection: world.speciesSelection || null
  };

  if (options.realmA && options.realmB) {
    pack.distanceQuery = queryRealmDistance(world, options.realmA, options.realmB);
  }
  if (options.anchor) {
    pack.eventContext = queryEventContext(world, options.anchor, options.radiusCells);
  }

  return pack;
}

function formatFactPackForLlm(pack) {
  const lines = [
    `世界网格：${pack.meta.cellsPerFaceEdge}×${pack.meta.cellsPerFaceEdge}×6 面，半径 ${pack.meta.radiusKm} km`,
    `海陆比：海洋约 ${pack.meta.oceanPercent}%`,
    `魔法：${pack.meta.magic}`,
    `种族势力：${pack.realms.map((r) => `${r.name}(${r.raceLabel}, 人口约${r.population})`).join('；')}`
  ];

  const mainRivers = (pack.features.rivers || []).filter((r) => r.kind === 'main').length;
  const tribRivers = (pack.features.rivers || []).filter((r) => r.kind === 'tributary').length;
  if (pack.features.rivers?.length) {
    lines.push(`水文：干流 ${mainRivers} 条，支流 ${tribRivers} 条；湖泊 ${pack.features.lakes?.length || 0} 个；岛屿 ${pack.features.islands?.length || 0} 个`);
  }
  if (pack.features.magicNodes?.length) {
    lines.push(
      `魔法地理：灵脉节点 ${pack.features.magicNodes.length} 个，灵脉 ${pack.features.leyLines?.length || 0} 条`
    );
  }
  if (pack.speciesSelection?.unsupported?.length) {
    lines.push(`环境无法承载：${pack.speciesSelection.unsupported.join('、')}`);
  }

  if (pack.vegetationSummary && Object.keys(pack.vegetationSummary).length) {
    const veg = Object.entries(pack.vegetationSummary)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([k, v]) => `${k} ${v}格`)
      .join('、');
    lines.push(`植被：${veg}`);
  }

  if (pack.distanceQuery && !pack.distanceQuery.error) {
    const d = pack.distanceQuery;
    lines.push(
      `${d.a.name} 与 ${d.b.name}：球面距离约 ${d.geodesicKm} km` +
      (d.separatingFeatures.length
        ? `，之间：${d.separatingFeatures.map((f) => f.name || f.id).join('、')}`
        : '')
    );
  }

  if (pack.eventContext && !pack.eventContext.error) {
    const e = pack.eventContext;
    lines.push(
      `事件锚点：${e.anchor.terrain}，海拔 ${e.anchor.elevation}m，` +
      `(${e.anchor.lat}°, ${e.anchor.lon}°)，属 ${e.realms.map((r) => r.name).join('/') || '无势力'}`
    );
    if (e.nearbyFeatures.length) {
      lines.push(`附近要素：${e.nearbyFeatures.map((f) => f.name || f.kind).join('、')}`);
    }
  }

  return lines.join('\n');
}

module.exports = {
  queryRealmDistance,
  queryEventContext,
  buildFactPack,
  formatFactPackForLlm
};
