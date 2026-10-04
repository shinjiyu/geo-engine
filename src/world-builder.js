'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const {
  cellKey,
  buildNeighborTable,
  computeAreaWeights,
  EARTH_RADIUS_KM
} = require('./topology/cube-sphere');
const { generateTerrain, TERRAIN } = require('./generate/terrain');
const { runHydrology, extractMountainRanges } = require('./generate/hydrology');
const { runSurfaceFeatures } = require('./generate/surface-features');
const { runClimateStage } = require('./generate/climate-stage');
const { scourGlacialBasins } = require('./generate/glacial-scour');
const { normalizePlanet } = require('./planet/params');
const {
  generateRealms,
  computeRealmRelations,
  resolveSpeciesForWorld
} = require('./generate/realms');
const { generateMagicGeography } = require('./generate/magic-geography');
const {
  evaluateWorldCarryingCapacity,
  summarizeCarryingCapacity
} = require('./generate/species-capacity');
const { buildFactPack, queryRealmDistance, queryEventContext } = require('./facts/spatial-fact-pack');
const { deriveWorldProfile } = require('./facts/derive-world-profile');

const WORLDS_DIR = path.join(__dirname, '../worlds');
const GEO_SCHEMA_VERSION = 1;
const GEO_ENGINE_VERSION = '0.15.0';
const GEO_PIPELINE_ID = 'orogen-llj-bl-climate-scour-drainage-v9';

function configFingerprint(config) {
  return `sha256:${crypto.createHash('sha256').update(JSON.stringify(config)).digest('hex')}`;
}

function normalizeConfig(input) {
  const cfg = input || {};
  return {
    seed: cfg.seed || crypto.randomBytes(8).toString('hex'),
    grid: {
      cellsPerFaceEdge: Math.min(256, Math.max(16, Number(cfg.grid?.cellsPerFaceEdge) || 128))
    },
    planet: normalizePlanet({
      radiusKm: Number(cfg.planet?.radiusKm) || EARTH_RADIUS_KM,
      seaLevelM: cfg.planet?.seaLevelM,
      seaLevel: cfg.planet?.seaLevel,
      obliquity: cfg.planet?.obliquity,
      rotationDirection: cfg.planet?.rotationDirection,
      snowLineEquatorM: cfg.planet?.snowLineEquatorM,
      snowLineLatSlopeM: cfg.planet?.snowLineLatSlopeM,
      lapseRateC: cfg.planet?.lapseRateC
    }),
    terrain: {
      backend: cfg.terrain?.backend === 'noise' ? 'noise' : 'orogen',
      orogen: {
        plateCount: Math.min(32, Math.max(8, Number(cfg.terrain?.orogen?.plateCount) || 16)),
        continentCount: Math.min(8, Math.max(1, Number(cfg.terrain?.orogen?.continentCount) || 4)),
        landCoverage: Math.min(0.6, Math.max(0.15, Number(cfg.terrain?.orogen?.landCoverage) || 0.3))
      }
    },
    seedWorld: {
      magic: cfg.seedWorld?.magic || cfg.magic || 'low',
      races: cfg.seedWorld?.races || cfg.races,
      autoRaces: cfg.seedWorld?.autoRaces !== false
        && !(cfg.seedWorld?.races || cfg.races)?.length,
      geography: 'mixed'
    }
  };
}

function markCoasts(cells, neighborTable) {
  for (const cell of cells.values()) {
    if (!cell.isLand) continue;
    const neighbors = (neighborTable.get(cellKey(cell.face, cell.u, cell.v)) || [])
      .map((k) => cells.get(k));
    const nearWater = neighbors.some((nc) => nc && !nc.isLand);
    if (nearWater && cell.terrain === TERRAIN.PLAIN) {
      cell.terrain = TERRAIN.COAST;
    }
  }
}

function createWorld(rawConfig) {
  const config = normalizeConfig(rawConfig);
  const n = config.grid.cellsPerFaceEdge;
  const seed = config.seed;

  const neighborTable = buildNeighborTable(n);
  const areaWeights = computeAreaWeights(n);

  let cells = generateTerrain(seed, n, {
    planet: config.planet,
    backend: config.terrain.backend,
    orogen: config.terrain.orogen
  });
  for (const [k, w] of areaWeights) {
    const c = cells.get(k);
    if (c) c.areaWeight = Math.round(w * 1000) / 1000;
  }

  const climate = runClimateStage(cells, neighborTable, config.planet, seed);
  markCoasts(cells, neighborTable);
  scourGlacialBasins(cells, neighborTable, config.planet, seed);

  const hydrology = runHydrology(cells, n, { planet: config.planet, neighborTable });
  const rivers = hydrology.rivers;
  const surface = runSurfaceFeatures(cells, neighborTable, config.planet, {
    geography: config.seedWorld.geography,
    lakes: hydrology.lakes
  });
  const mountains = extractMountainRanges(cells, n);
  const magicGeography = generateMagicGeography(seed, cells, neighborTable, {
    magic: config.seedWorld.magic,
    lakes: surface.lakes,
    mountains,
    rivers
  });
  const carryingCapacity = evaluateWorldCarryingCapacity(
    cells,
    surface.lakes,
    config.planet,
    neighborTable
  );
  const speciesSelection = resolveSpeciesForWorld(
    cells,
    seed,
    config.seedWorld,
    carryingCapacity
  );
  const realms = generateRealms(seed, cells, n, {
    ...config.seedWorld,
    races: speciesSelection.supported,
    autoRaces: false,
    carryingCapacity
  });
  const realmRelations = computeRealmRelations(realms, mountains, rivers, Object.fromEntries(
    [...cells.entries()].map(([k, v]) => [k, v])
  ));

  const landCount = [...cells.values()].filter((c) => c.isLand).length;
  const oceanPct = Math.round((1 - landCount / cells.size) * 100);

  const profile = deriveWorldProfile({
    meta: {
      cellsPerFaceEdge: n,
      oceanPercent: oceanPct,
      mainRiverCount: rivers.filter((r) => r.kind === 'main').length,
      tributaryCount: rivers.filter((r) => r.kind === 'tributary').length,
      lakeCount: surface.lakes.length,
      islandCount: surface.islands.length,
      mountainRangeCount: mountains.length,
      realmCount: realms.length,
      magicNodeCount: magicGeography.magicNodes.length,
      leyLineCount: magicGeography.leyLines.length,
      supportedSpecies: speciesSelection.supported,
      unsupportedSpecies: speciesSelection.unsupported
    },
    vegetationSummary: surface.vegetationCounts,
    realms
  });

  const world = {
    schemaVersion: GEO_SCHEMA_VERSION,
    engineVersion: GEO_ENGINE_VERSION,
    pipelineId: GEO_PIPELINE_ID,
    configFingerprint: configFingerprint(config),
    id: crypto.randomBytes(6).toString('hex'),
    seed,
    config,
    profile,
    meta: {
      cellsPerFaceEdge: n,
      totalCells: cells.size,
      terrainBackend: cells.terrainBackend,
      climateModel: climate.model,
      climateResolutionDeg: climate.resolutionDeg,
      landCells: landCount,
      oceanPercent: oceanPct,
      radiusKm: config.planet.radiusKm,
      magic: config.seedWorld.magic,
      races: profile.races,
      geographyLabel: profile.geographyLabel,
      geographyDescription: profile.geographyDescription,
      riverCount: rivers.length,
      mainRiverCount: rivers.filter((r) => r.kind === 'main').length,
      tributaryCount: rivers.filter((r) => r.kind === 'tributary').length,
      wadiCount: hydrology.wadis.length,
      lakeCount: surface.lakes.length,
      islandCount: surface.islands.length,
      landmassCount: surface.landmasses.length,
      mountainRangeCount: mountains.length,
      realmCount: realms.length,
      magicNodeCount: magicGeography.magicNodes.length,
      leyLineCount: magicGeography.leyLines.length,
      supportedSpecies: speciesSelection.supported,
      unsupportedSpecies: speciesSelection.unsupported
    },
    cells: Object.fromEntries(cells),
    rivers,
    wadis: hydrology.wadis,
    lakes: surface.lakes,
    landmasses: surface.landmasses,
    islands: surface.islands,
    vegetationSummary: surface.vegetationCounts,
    mountains,
    magicNodes: magicGeography.magicNodes,
    leyLines: magicGeography.leyLines,
    carryingCapacity: summarizeCarryingCapacity(carryingCapacity),
    speciesSelection,
    realms,
    realmRelations,
    createdAt: new Date().toISOString()
  };

  saveWorld(world);
  return world;
}

function saveWorld(world) {
  if (!fs.existsSync(WORLDS_DIR)) fs.mkdirSync(WORLDS_DIR, { recursive: true });
  world.updatedAt = new Date().toISOString();
  fs.writeFileSync(
    path.join(WORLDS_DIR, `${world.id}.json`),
    JSON.stringify(world),
    'utf8'
  );
}

function loadWorld(worldId) {
  const fp = path.join(WORLDS_DIR, `${worldId}.json`);
  if (!fs.existsSync(fp)) return null;
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}

function listWorlds() {
  if (!fs.existsSync(WORLDS_DIR)) return [];
  return fs.readdirSync(WORLDS_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      try {
        const w = JSON.parse(fs.readFileSync(path.join(WORLDS_DIR, f), 'utf8'));
        return {
          worldId: w.id,
          seed: w.seed,
          meta: w.meta,
          updatedAt: w.updatedAt,
          createdAt: w.createdAt
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function getCell(world, face, u, v) {
  return world.cells[cellKey(face, u, v)] || null;
}

module.exports = {
  normalizeConfig,
  createWorld,
  loadWorld,
  listWorlds,
  saveWorld,
  getCell,
  buildFactPack,
  queryRealmDistance,
  queryEventContext,
  deriveWorldProfile,
  WORLDS_DIR
};
