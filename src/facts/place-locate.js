'use strict';

function cellsCentroid(cellKeys, cells) {
  let latSum = 0;
  let lonSum = 0;
  let n = 0;
  let minLat = 90;
  let maxLat = -90;
  let minLon = 180;
  let maxLon = -180;

  for (const k of cellKeys) {
    const c = cells[k];
    if (!c) continue;
    latSum += c.lat;
    lonSum += c.lon;
    n++;
    minLat = Math.min(minLat, c.lat);
    maxLat = Math.max(maxLat, c.lat);
    minLon = Math.min(minLon, c.lon);
    maxLon = Math.max(maxLon, c.lon);
  }
  if (!n) return null;
  return {
    lat: Math.round((latSum / n) * 100) / 100,
    lon: Math.round((lonSum / n) * 100) / 100,
    spanLat: Math.max(4, (maxLat - minLat) * 1.6 + 2),
    spanLon: Math.max(4, (maxLon - minLon) * 1.6 + 2)
  };
}

function findFeatureId(featureNames, placeName) {
  if (!featureNames || !placeName) return null;
  const target = String(placeName).trim();
  for (const [id, label] of Object.entries(featureNames)) {
    if (label === target) return { id, label };
  }
  for (const [id, label] of Object.entries(featureNames)) {
    if (label.includes(target) || target.includes(label)) return { id, label };
  }
  return null;
}

function locatePlaceByName(world, featureNames, placeName) {
  const name = String(placeName || '').trim();
  if (!name) return { error: 'Missing place name' };

  const cells = world.cells || {};
  const match = findFeatureId(featureNames || {}, name);

  if (match) {
    const { id } = match;
    if (id.startsWith('river-')) {
      const river = (world.rivers || []).find((r) => r.id === id);
      if (river?.cells?.length) {
        const c = cellsCentroid(river.cells, cells);
        if (c) {
          return {
            name: match.label,
            kind: 'river',
            featureId: id,
            lengthKm: river.lengthKm,
            ...c
          };
        }
      }
    }
    if (id.startsWith('mountain-')) {
      const mountain = (world.mountains || []).find((m) => m.id === id);
      if (mountain?.cells?.length) {
        const c = cellsCentroid(mountain.cells, cells);
        if (c) {
          return {
            name: match.label,
            kind: 'mountain',
            featureId: id,
            maxElevation: mountain.maxElevation,
            ...c
          };
        }
      }
    }
  }

  for (const realm of world.realms || []) {
    if (realm.name === name || name.includes(realm.raceLabel || '') || realm.name.includes(name)) {
      return {
        name: match?.label || realm.name,
        kind: 'realm',
        featureId: realm.id,
        lat: realm.center.lat,
        lon: realm.center.lon,
        spanLat: 14,
        spanLon: 14,
        realm: realm.name
      };
    }
  }

  for (const lake of world.lakes || []) {
    if (lake.name === name || lake.id === match?.id) {
      const c = lake.cells?.length ? cellsCentroid(lake.cells, cells) : null;
      if (c) {
        return { name: match?.label || lake.name || name, kind: 'lake', featureId: lake.id, ...c };
      }
    }
  }

  for (const node of world.magicNodes || []) {
    if (node.name === name || node.id === match?.id) {
      const cell = cells[node.cell];
      if (cell) {
        return {
          name: match?.label || node.name || name,
          kind: 'magic_node',
          featureId: node.id,
          lat: cell.lat,
          lon: cell.lon,
          spanLat: 8,
          spanLon: 8,
          strength: node.strength
        };
      }
    }
  }

  for (const line of world.leyLines || []) {
    if (line.id === match?.id) {
      const c = line.cells?.length ? cellsCentroid(line.cells, cells) : null;
      if (c) {
        return {
          name: match?.label || name,
          kind: 'ley_line',
          featureId: line.id,
          strength: line.strength,
          lengthKm: line.lengthKm,
          ...c
        };
      }
    }
  }

  return { error: `未在地图上找到「${name}」`, name };
}

module.exports = { locatePlaceByName, cellsCentroid };
