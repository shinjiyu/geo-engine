'use strict';

const crypto = require('node:crypto');
const { queryEventContext } = require('./spatial-fact-pack');

const CONTRACT_VERSION = 'geo-chronicle/v1';

function cellRecord(world, key) {
  const cell = world.cells?.[key];
  return cell ? { key, cell } : null;
}

function representativeCell(world, keys, mode) {
  const records = (keys || []).map((key) => cellRecord(world, key)).filter(Boolean);
  if (!records.length) return null;
  if (mode === 'highest') {
    records.sort((a, b) =>
      (b.cell.elevation || 0) - (a.cell.elevation || 0) || a.key.localeCompare(b.key)
    );
    return records[0];
  }
  return records[Math.floor(records.length / 2)];
}

function spatialRef(kind, id, record) {
  if (!record) return null;
  return {
    kind,
    id,
    cell: record.key,
    lat: record.cell.lat,
    lon: record.cell.lon
  };
}

function listFeatures(world) {
  const out = [];
  for (const realm of world.realms || []) {
    const record = cellRecord(world, realm.centerCell)
      || representativeCell(world, Object.keys(world.cells || {}).filter(
        (key) => world.cells[key]?.realmId === realm.id
      ));
    const ref = spatialRef('realm', realm.id, record);
    if (ref) out.push({ ref, name: realm.name, race: realm.race, population: realm.population });
  }
  for (const river of world.rivers || []) {
    const ref = spatialRef('river', river.id, representativeCell(world, river.cells));
    if (ref) out.push({ ref, kind: river.kind || 'main', lengthKm: river.lengthKm });
  }
  for (const lake of world.lakes || []) {
    const ref = spatialRef('lake', lake.id, representativeCell(world, lake.cells));
    if (ref) {
      out.push({
        ref,
        areaKm2: lake.areaKm2,
        freshwater: lake.freshwater,
        waterLevelM: lake.waterLevelM
      });
    }
  }
  for (const mountain of world.mountains || []) {
    const ref = spatialRef(
      'mountain',
      mountain.id,
      representativeCell(world, mountain.cells, 'highest')
    );
    if (ref) out.push({ ref, name: mountain.name, maxElevation: mountain.maxElevation });
  }
  for (const node of world.magicNodes || []) {
    const ref = spatialRef('magic_node', node.id, cellRecord(world, node.cell));
    if (ref) out.push({ ref, name: node.name, nodeKind: node.kind, strength: node.strength });
  }
  for (const line of world.leyLines || []) {
    const ref = spatialRef('ley_line', line.id, representativeCell(world, line.cells));
    if (ref) {
      out.push({
        ref,
        from: line.from,
        to: line.to,
        lengthKm: line.lengthKm,
        strength: line.strength
      });
    }
  }
  return out;
}

function resolveSpatialRef(world, input) {
  if (!input) return null;
  if (typeof input === 'string' && world.cells?.[input]) {
    return spatialRef('cell', input, cellRecord(world, input));
  }
  if (input.cell && world.cells?.[input.cell]) {
    return {
      kind: input.kind || 'cell',
      id: input.id || input.cell,
      cell: input.cell,
      lat: world.cells[input.cell].lat,
      lon: world.cells[input.cell].lon
    };
  }
  const id = input.id || input.featureId;
  if (!id) return null;
  return listFeatures(world).find((feature) =>
    feature.ref.id === id && (!input.kind || feature.ref.kind === input.kind)
  )?.ref || null;
}

function searchFeatures(world, options = {}) {
  const kinds = new Set(options.kinds || []);
  const query = String(options.query || '').trim().toLowerCase();
  const minAreaKm2 = Number(options.minAreaKm2) || 0;
  const limit = Math.min(50, Math.max(1, Number(options.limit) || 12));
  return listFeatures(world).filter((feature) => {
    if (kinds.size && !kinds.has(feature.ref.kind)) return false;
    if (options.freshwater != null && feature.freshwater !== Boolean(options.freshwater)) return false;
    if (minAreaKm2 && (feature.areaKm2 || 0) < minAreaKm2) return false;
    if (query) {
      const haystack = [
        feature.ref.id,
        feature.name,
        feature.race,
        feature.kind,
        feature.nodeKind
      ].filter(Boolean).join(' ').toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  }).slice(0, limit);
}

const EVENT_KINDS = {
  war: ['realm', 'river', 'mountain'],
  diplomacy: ['realm', 'river'],
  political: ['realm'],
  culture: ['realm', 'river', 'lake'],
  religion: ['magic_node', 'mountain', 'lake', 'realm'],
  discovery: ['mountain', 'lake', 'magic_node', 'ley_line'],
  craft: ['river', 'mountain', 'realm'],
  economy: ['river', 'lake', 'realm'],
  migration: ['river', 'lake', 'realm'],
  disaster: ['river', 'lake', 'mountain'],
  intrigue: ['realm'],
  festival: ['river', 'lake', 'realm'],
  scholarship: ['realm', 'magic_node', 'mountain'],
  magic: ['magic_node', 'ley_line', 'lake']
};

function stableRank(seed, eventKey, feature) {
  const hex = crypto.createHash('sha256')
    .update(`${seed}:${eventKey}:${feature.ref.kind}:${feature.ref.id}`)
    .digest('hex')
    .slice(0, 12);
  return Number.parseInt(hex, 16);
}

function suggestEventAnchors(world, eventDraft, options = {}) {
  const eventType = String(eventDraft?.type || 'culture');
  const kinds = EVENT_KINDS[eventType] || EVENT_KINDS.culture;
  let candidates = searchFeatures(world, { kinds, limit: 50 });
  const participantIds = new Set(
    (eventDraft?.participants || eventDraft?.participantRefs || []).map(
      (ref) => typeof ref === 'string' ? ref : ref.id
    )
  );
  if (participantIds.size) {
    const participantRealms = candidates.filter(
      (candidate) => candidate.ref.kind === 'realm' && participantIds.has(candidate.ref.id)
    );
    candidates = [
      ...participantRealms,
      ...candidates.filter((candidate) => !participantIds.has(candidate.ref.id))
    ];
  }
  const eventKey =
    eventDraft?.id || `${eventType}:${eventDraft?.year || 0}:${eventDraft?.title || ''}`;
  candidates.sort((a, b) => {
    const kindDelta = kinds.indexOf(a.ref.kind) - kinds.indexOf(b.ref.kind);
    if (kindDelta) return kindDelta;
    return stableRank(world.seed, eventKey, a) - stableRank(world.seed, eventKey, b);
  });
  return candidates.slice(0, Math.min(12, Math.max(1, Number(options.limit) || 5))).map(
    (candidate, index) => ({
      rank: index + 1,
      anchor: candidate.ref,
      feature: candidate,
      reason: `${eventType} prefers ${candidate.ref.kind}`
    })
  );
}

function validateEventSpatial(world, eventDraft) {
  const anchor = resolveSpatialRef(world, eventDraft?.spatial?.anchor || eventDraft?.anchor);
  const violations = [];
  const warnings = [];
  if (!anchor) violations.push('missing_or_invalid_anchor');
  if (eventDraft?.type === 'magic' && world.meta?.magic === 'none') {
    violations.push('magic_event_in_nonmagical_world');
  }
  if (anchor && eventDraft?.requirements?.freshwater) {
    const lake = (world.lakes || []).find((item) => item.id === anchor.id);
    if (anchor.kind !== 'lake' || !lake?.freshwater) violations.push('freshwater_anchor_required');
  }
  if (anchor && eventDraft?.requirements?.minLakeAreaKm2) {
    const lake = (world.lakes || []).find((item) => item.id === anchor.id);
    if (!lake || (lake.areaKm2 || 0) < Number(eventDraft.requirements.minLakeAreaKm2)) {
      violations.push('lake_area_requirement_not_met');
    }
  }
  if (anchor && eventDraft?.type === 'magic') {
    const cell = world.cells?.[anchor.cell];
    if ((cell?.magicFlux || 0) < 0.08 && !['magic_node', 'ley_line'].includes(anchor.kind)) {
      warnings.push('anchor_has_low_magic_flux');
    }
  }
  return {
    valid: violations.length === 0,
    anchor,
    violations,
    warnings
  };
}

function queryContextByRef(world, anchorInput, radiusKm = 250) {
  const anchor = resolveSpatialRef(world, anchorInput);
  if (!anchor) return { error: 'Spatial anchor not found' };
  const meanArea = 4 * Math.PI * Math.pow(world.meta?.radiusKm || 6371, 2)
    / Math.max(1, world.meta?.totalCells || Object.keys(world.cells || {}).length);
  const radiusCells = Math.min(
    24,
    Math.max(1, Math.round(Number(radiusKm) / Math.sqrt(meanArea)))
  );
  return {
    schemaVersion: CONTRACT_VERSION,
    radiusKm: Number(radiusKm),
    ...queryEventContext(world, anchor.cell, radiusCells)
  };
}

module.exports = {
  CONTRACT_VERSION,
  listFeatures,
  resolveSpatialRef,
  searchFeatures,
  suggestEventAnchors,
  validateEventSpatial,
  queryContextByRef
};
