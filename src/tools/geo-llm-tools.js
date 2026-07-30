'use strict';

/**
 * LLM function-calling tools over saved geo-engine worlds.
 * worldId is injected by the host (chronicle-engine); the model never passes it.
 */
const {
  loadWorld,
  buildFactPack,
  queryRealmDistance,
  queryEventContext,
  getCell,
  formatFactPackForLlm
} = require('../world-builder');
const {
  CONTRACT_VERSION,
  searchFeatures,
  queryContextByRef,
  suggestEventAnchors,
  validateEventSpatial
} = require('../facts/chronicle-contract');

const LLM_TOOL_DEFINITIONS = [
  {
    name: 'geo_world_summary',
    description: '世界概览：海陆比、势力、河湖、魔法地理、物种承载力与植被统计。',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'geo_realm_distance',
    description: '两势力球面距离(km)与之间分隔要素（race 名或 realm id）。',
    parameters: {
      type: 'object',
      properties: {
        realmA: { type: 'string' },
        realmB: { type: 'string' }
      },
      required: ['realmA', 'realmB']
    }
  },
  {
    name: 'geo_event_context',
    description: '事件锚点周边：地形、人口、河流、湖泊、势力（cell 格式 face:u:v）。',
    parameters: {
      type: 'object',
      properties: {
        cell: { type: 'string', description: 'face:u:v' },
        radiusCells: { type: 'number', description: 'BFS 半径，默认 8' }
      },
      required: ['cell']
    }
  },
  {
    name: 'geo_cell_lookup',
    description: '单格：海拔、地形、气候、植被、魔法通量、势力与水文。',
    parameters: {
      type: 'object',
      properties: {
        face: { type: 'integer' },
        u: { type: 'integer' },
        v: { type: 'integer' }
      },
      required: ['face', 'u', 'v']
    }
  },
  {
    name: 'geo_list_rivers',
    description: '河流列表，可按干流/支流过滤。',
    parameters: {
      type: 'object',
      properties: {
        kind: { type: 'string', enum: ['main', 'tributary', 'all'] },
        limit: { type: 'integer' }
      }
    }
  },
  {
    name: 'geo_fact_pack',
    description: '组合事实包；可选两势力距离或锚点上下文。',
    parameters: {
      type: 'object',
      properties: {
        realmA: { type: 'string' },
        realmB: { type: 'string' },
        anchorCell: { type: 'string' },
        format: { type: 'string', enum: ['json', 'llm'] }
      }
    }
  },
  {
    name: 'geo_search_features',
    description: '按类型和属性搜索地图要素，返回可用于编年事件的稳定空间引用。',
    parameters: {
      type: 'object',
      properties: {
        kinds: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['realm', 'river', 'lake', 'mountain', 'magic_node', 'ley_line']
          }
        },
        query: { type: 'string' },
        freshwater: { type: 'boolean' },
        minAreaKm2: { type: 'number' },
        limit: { type: 'integer' }
      }
    }
  },
  {
    name: 'geo_get_context',
    description: '按 feature/cell 空间引用查询事件周边，半径使用公里。',
    parameters: {
      type: 'object',
      properties: {
        anchor: {
          type: 'object',
          properties: {
            kind: { type: 'string' },
            id: { type: 'string' },
            cell: { type: 'string' }
          }
        },
        radiusKm: { type: 'number' }
      },
      required: ['anchor']
    }
  },
  {
    name: 'geo_suggest_event_anchors',
    description: '根据事件类型和参与势力，确定性推荐可验证的地图锚点。',
    parameters: {
      type: 'object',
      properties: {
        eventId: { type: 'string' },
        eventType: { type: 'string' },
        year: { type: 'number' },
        title: { type: 'string' },
        participants: { type: 'array', items: { type: 'string' } },
        limit: { type: 'integer' }
      },
      required: ['eventType']
    }
  },
  {
    name: 'geo_validate_event',
    description: '只读校验编年事件的空间锚点与魔法、淡水或湖泊面积约束。',
    parameters: {
      type: 'object',
      properties: {
        type: { type: 'string' },
        anchor: { type: 'object' },
        requirements: { type: 'object' }
      },
      required: ['anchor']
    }
  },
  {
    name: 'geo_species_capacity',
    description: '查询世界或指定物种的环境承载力、适生格数量和锚定要素。',
    parameters: {
      type: 'object',
      properties: {
        speciesId: { type: 'string' }
      }
    }
  }
];

function requireWorld(worldId) {
  if (!worldId) throw new Error('geo worldId not set');
  const world = loadWorld(worldId);
  if (!world) throw new Error(`World not found: ${worldId}`);
  return world;
}

function executeGeoTool(worldId, name, args) {
  args = args || {};

  switch (name) {
    case 'geo_world_summary': {
      const world = requireWorld(worldId);
      return {
        schemaVersion: CONTRACT_VERSION,
        worldId: world.id,
        engineVersion: world.engineVersion,
        pipelineId: world.pipelineId,
        configFingerprint: world.configFingerprint,
        seed: world.seed,
        meta: world.meta,
        realms: (world.realms || []).map((r) => ({
          id: r.id,
          name: r.name,
          race: r.race,
          population: r.population,
          populationCap: r.populationCap,
          anchorFeatureId: r.anchorFeatureId,
          center: r.center
        })),
        riverCount: world.rivers?.length || 0,
        mainRivers: (world.rivers || []).filter((r) => r.kind === 'main').length,
        tributaries: (world.rivers || []).filter((r) => r.kind === 'tributary').length,
        lakeCount: world.lakes?.length || 0,
        freshwaterLakeCount: (world.lakes || []).filter((lake) => lake.freshwater).length,
        islandCount: world.islands?.length || 0,
        magicNodeCount: world.magicNodes?.length || 0,
        leyLineCount: world.leyLines?.length || 0,
        speciesSelection: world.speciesSelection || null,
        carryingCapacity: world.carryingCapacity || null,
        vegetationSummary: world.vegetationSummary || {}
      };
    }
    case 'geo_realm_distance':
      return queryRealmDistance(requireWorld(worldId), args.realmA, args.realmB);
    case 'geo_event_context':
      return queryEventContext(requireWorld(worldId), args.cell, args.radiusCells ?? 8);
    case 'geo_cell_lookup': {
      const cell = getCell(requireWorld(worldId), args.face, args.u, args.v);
      if (!cell) return { error: 'Cell not found' };
      return {
        elevation: cell.elevation,
        terrain: cell.terrain,
        climateZone: cell.climateZone,
        vegetation: cell.vegetation,
        isLand: cell.isLand,
        isLake: cell.isLake,
        landmassId: cell.landmassId,
        realmId: cell.realmId,
        river: Boolean(cell.river),
        magicFlux: cell.magicFlux,
        magicNodeId: cell.magicNodeId || null,
        leyLineIds: cell.leyLineIds || [],
        lat: cell.lat,
        lon: cell.lon
      };
    }
    case 'geo_fact_pack': {
      const world = requireWorld(worldId);
      const pack = buildFactPack(world, {
        realmA: args.realmA,
        realmB: args.realmB,
        anchor: args.anchorCell
      });
      if (args.format === 'json') return pack;
      return { text: formatFactPackForLlm(pack) };
    }
    case 'geo_list_rivers': {
      const world = requireWorld(worldId);
      let list = world.rivers || [];
      const kind = args.kind || 'all';
      if (kind !== 'all') list = list.filter((r) => r.kind === kind);
      const limit = args.limit ?? 20;
      return list.slice(0, limit).map((r) => ({
        id: r.id,
        kind: r.kind || 'main',
        lengthKm: r.lengthKm,
        cellCount: r.cells?.length || 0
      }));
    }
    case 'geo_search_features':
      return {
        schemaVersion: CONTRACT_VERSION,
        features: searchFeatures(requireWorld(worldId), args)
      };
    case 'geo_get_context':
      return queryContextByRef(requireWorld(worldId), args.anchor, args.radiusKm ?? 250);
    case 'geo_suggest_event_anchors':
      return {
        schemaVersion: CONTRACT_VERSION,
        candidates: suggestEventAnchors(requireWorld(worldId), {
          id: args.eventId,
          type: args.eventType,
          year: args.year,
          title: args.title,
          participants: args.participants
        }, { limit: args.limit })
      };
    case 'geo_validate_event':
      return {
        schemaVersion: CONTRACT_VERSION,
        ...validateEventSpatial(requireWorld(worldId), {
          type: args.type,
          anchor: args.anchor,
          requirements: args.requirements
        })
      };
    case 'geo_species_capacity': {
      const world = requireWorld(worldId);
      if (!args.speciesId) {
        return {
          schemaVersion: CONTRACT_VERSION,
          carryingCapacity: world.carryingCapacity,
          speciesSelection: world.speciesSelection
        };
      }
      return {
        schemaVersion: CONTRACT_VERSION,
        speciesId: args.speciesId,
        assessment: world.carryingCapacity?.species?.[args.speciesId] || null,
        selected: world.speciesSelection?.supported?.includes(args.speciesId) || false
      };
    }
    default:
      throw new Error(`Unknown geo tool: ${name}`);
  }
}

module.exports = {
  LLM_TOOL_DEFINITIONS,
  executeGeoTool
};
