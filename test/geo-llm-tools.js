'use strict';

const { createWorld, loadWorld, geoLlmTools } = require('../src/index');

console.log('geo-llm-tools test...');

const world = createWorld({
  seed: 'geo-tools-smoke',
  grid: { cellsPerFaceEdge: 32 },
  planet: { seaLevelM: 900 },
  seedWorld: { magic: 'low', races: ['human', 'elf'], geography: 'mixed' }
});

const summary = geoLlmTools.executeGeoTool(world.id, 'geo_world_summary', {});
if (!summary.realms || summary.realms.length < 2) throw new Error('summary missing realms');
if (summary.mainRivers == null) throw new Error('summary missing mainRivers');

const dist = geoLlmTools.executeGeoTool(world.id, 'geo_realm_distance', {
  realmA: 'human',
  realmB: 'elf'
});
if (dist.error) throw new Error(dist.error);
if (!dist.geodesicKm) throw new Error('distance missing');

const rivers = geoLlmTools.executeGeoTool(world.id, 'geo_list_rivers', { kind: 'main', limit: 5 });
if (!Array.isArray(rivers)) throw new Error('rivers not array');

const reloaded = loadWorld(world.id);
const cellKey = Object.keys(reloaded.cells).find((k) => reloaded.cells[k].isLand);
if (cellKey) {
  const [face, u, v] = cellKey.split(':').map(Number);
  const cell = geoLlmTools.executeGeoTool(world.id, 'geo_cell_lookup', { face, u, v });
  if (cell.error) throw new Error(cell.error);
}

console.log(`  summary: ${summary.mainRivers} main, ${summary.tributaries} trib`);
console.log(`  distance human-elf: ${dist.geodesicKm} km`);
console.log(`  tool defs: ${geoLlmTools.LLM_TOOL_DEFINITIONS.length}`);
console.log('geo-llm-tools test passed');
