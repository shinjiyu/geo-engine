'use strict';

const { cellKey } = require('../topology/cube-sphere');
const { buildNeighborTable } = require('../topology/cube-sphere');
const { createRng } = require('../core/seed-rng');
const { haversineKm } = require('../topology/cube-sphere');
const { SPECIES_PROFILES, filterSupportedSpecies } = require('./species-capacity');

const RACE_LABELS = {
  human: '人类', elf: '精灵', dwarf: '矮人', orc: '兽人',
  halfling: '半身人', dragonborn: '龙裔', gnome: '侏儒', beastfolk: '兽族',
  freshwater_fishfolk: '淡水鱼人'
};

const VEG_TO_RACE = {
  forest: 'elf',
  rainforest: 'elf',
  desert: 'human',
  grassland: 'human',
  shrubland: 'orc',
  tundra: 'human',
  wetland: 'halfling',
  sparseland: 'dwarf'
};

function inferRacesFromCells(cells, seed, magic, carryingCapacity) {
  const rng = createRng(seed + ':infer-races');
  const vegCounts = {};
  let landCount = 0;
  for (const cell of cells.values()) {
    if (!cell.isLand || cell.isLake) continue;
    landCount++;
    if (cell.vegetation) {
      vegCounts[cell.vegetation] = (vegCounts[cell.vegetation] || 0) + 1;
    }
  }

  let target = 1;
  if (landCount > 4000) target = rng.int(2, 4);
  else if (landCount > 1200) target = rng.int(1, 3);
  else if (landCount > 400) target = rng.int(1, 2);

  const races = ['human'];
  const ranked = Object.entries(vegCounts).sort((a, b) => b[1] - a[1]);
  for (const [veg] of ranked) {
    const race = VEG_TO_RACE[veg];
    if (race && !races.includes(race)) races.push(race);
    if (races.length >= target) break;
  }

  if (magic === 'high' && !races.includes('dragonborn') && races.length < target) {
    races.push('dragonborn');
  }
  if (carryingCapacity?.species?.freshwater_fishfolk?.supported
    && !races.includes('freshwater_fishfolk')
    && races.length < target) {
    races.push('freshwater_fishfolk');
  }
  if (races.length < target && magic !== 'none') {
    for (const fallback of ['elf', 'dwarf', 'orc', 'halfling']) {
      if (races.length >= target) break;
      if (!races.includes(fallback)) races.push(fallback);
    }
  }
  return races.slice(0, Math.max(1, target));
}

function resolveSpeciesForWorld(cells, seed, config, carryingCapacity) {
  const magic = config.magic || 'low';
  const requested = config.autoRaces || !config.races?.length
    ? inferRacesFromCells(cells, seed, magic, carryingCapacity)
    : [...config.races];
  const selection = filterSupportedSpecies(requested, carryingCapacity);
  return { requested, ...selection };
}

function generateRealms(seed, cells, n, config) {
  const magic = config.magic || 'low';
  let races = Array.isArray(config.races) ? config.races : null;
  if (config.autoRaces || races === null) {
    races = inferRacesFromCells(cells, seed, magic, config.carryingCapacity);
  }
  const rng = createRng(seed + ':realms');
  const neighborTable = buildNeighborTable(n);
  const landCells = [...cells.values()].filter((c) => c.isLand && c.terrain !== 'ice');
  if (landCells.length === 0) return [];

  const realms = [];
  const claimed = new Set();

  for (let i = 0; i < races.length; i++) {
    const race = races[i];
    const assessment = config.carryingCapacity?.species?.[race];
    if (assessment && !assessment.supported) continue;
    const profile = SPECIES_PROFILES[race];
    const habitatKeys = new Set(assessment?.habitatCells || []);
    const startCandidates = habitatKeys.size
      ? [...habitatKeys].map((key) => cells.get(key)).filter(Boolean)
      : landCells;
    if (startCandidates.length === 0) continue;
    let start = null;
    for (let attempt = 0; attempt < 50; attempt++) {
      const cand = rng.pick(startCandidates);
      const k = cellKey(cand.face, cand.u, cand.v);
      if (!claimed.has(k)) {
        start = cand;
        break;
      }
    }
    if (!start) continue;

    const realmId = `realm-${race}`;
    const availableCount = profile?.aquatic ? startCandidates.length : landCells.length;
    const targetCells = Math.max(1, Math.floor(
      availableCount / races.length * (0.6 + rng.next() * 0.5)
    ));
    const realmCells = growRealm(
      start,
      cells,
      neighborTable,
      claimed,
      targetCells,
      rng,
      profile?.aquatic ? habitatKeys : null
    );

    let popSum = 0;
    let latSum = 0;
    let lonSum = 0;
    for (const k of realmCells) {
      const c = cells.get(k);
      c.realmId = realmId;
      const pop = Math.floor((c.elevation > 0 ? 1 : 0.5) * 800 * (c.areaWeight || 1));
      c.population = pop;
      popSum += pop;
      latSum += c.lat;
      lonSum += c.lon;
    }
    const populationCap = assessment?.capacity || popSum;
    if (popSum > populationCap && popSum > 0) {
      const scale = populationCap / popSum;
      popSum = 0;
      for (const key of realmCells) {
        const cell = cells.get(key);
        cell.population = Math.max(1, Math.floor(cell.population * scale));
        popSum += cell.population;
      }
    }

    realms.push({
      id: realmId,
      race,
      raceLabel: RACE_LABELS[race] || race,
      name: `${RACE_LABELS[race] || race}王国`,
      cellCount: realmCells.size,
      population: popSum,
      populationCap,
      habitatCellCount: assessment?.habitatCellCount || realmCells.size,
      anchorFeatureId: assessment?.anchorFeatureId || null,
      center: {
        lat: Math.round((latSum / realmCells.size) * 100) / 100,
        lon: Math.round((lonSum / realmCells.size) * 100) / 100
      },
      centerCell: [...realmCells][0]
    });
  }

  return realms;
}

function growRealm(start, cells, neighborTable, claimed, target, rng, allowedKeys = null) {
  const startKey = cellKey(start.face, start.u, start.v);
  const queue = [startKey];
  const realmCells = new Set();
  claimed.add(startKey);

  while (queue.length && realmCells.size < target) {
    const k = queue.shift();
    realmCells.add(k);
    const neighbors = neighborTable.get(k) || [];
    const shuffled = rng.shuffle(neighbors);
    for (const nk of shuffled) {
      if (realmCells.size >= target) break;
      if (claimed.has(nk)) continue;
      const nc = cells.get(nk);
      if (!nc || nc.terrain === 'ice') continue;
      if (allowedKeys ? !allowedKeys.has(nk) : !nc.isLand) continue;
      claimed.add(nk);
      queue.push(nk);
    }
  }
  return realmCells;
}

function computeRealmRelations(realms, mountains, rivers, cells) {
  const relations = [];
  for (let i = 0; i < realms.length; i++) {
    for (let j = i + 1; j < realms.length; j++) {
      const a = realms[i];
      const b = realms[j];
      const geodesicKm = Math.round(haversineKm(a.center.lat, a.center.lon, b.center.lat, b.center.lon));
      const separating = findSeparatingFeatures(a, b, mountains, rivers, cells);
      relations.push({
        a: a.id,
        b: b.id,
        aLabel: a.name,
        bLabel: b.name,
        geodesicKm,
        borderKm: 0,
        separatingFeatures: separating
      });
    }
  }
  return relations;
}

function isBetween(a, b, p) {
  const ab = haversineKm(a.lat, a.lon, b.lat, b.lon);
  if (ab < 50) return false;
  const ap = haversineKm(a.lat, a.lon, p.lat, p.lon);
  const bp = haversineKm(b.lat, b.lon, p.lat, p.lon);
  return Math.abs((ap + bp) - ab) < ab * 0.4;
}

function findSeparatingFeatures(a, b, mountains, rivers, cells) {
  const features = [];

  for (const m of mountains) {
    let latSum = 0; let lonSum = 0; let n = 0;
    for (const ck of m.cells) {
      const c = cells[ck];
      if (c) { latSum += c.lat; lonSum += c.lon; n++; }
    }
    if (!n) continue;
    const centroid = { lat: latSum / n, lon: lonSum / n };
    if (isBetween(a.center, b.center, centroid)) {
      features.push({
        kind: 'mountain',
        id: m.id,
        name: m.name,
        maxElevation: m.maxElevation
      });
    }
  }

  for (const r of rivers) {
    if (r.lengthKm > 150 && features.length < 4) {
      features.push({ kind: 'river', id: r.id, name: r.id, lengthKm: r.lengthKm });
    }
  }

  return features.slice(0, 4);
}

module.exports = {
  generateRealms,
  computeRealmRelations,
  RACE_LABELS,
  inferRacesFromCells,
  resolveSpeciesForWorld
};
