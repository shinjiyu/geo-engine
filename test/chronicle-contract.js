'use strict';

const assert = require('node:assert/strict');
const { createWorld } = require('../src/world-builder');
const contract = require('../src/facts/chronicle-contract');
const { executeGeoTool, LLM_TOOL_DEFINITIONS } = require('../src/tools/geo-llm-tools');

console.log('geo chronicle contract test...');

const world = createWorld({
  seed: 'geo-chronicle-contract-v1',
  grid: { cellsPerFaceEdge: 16 },
  seedWorld: { magic: 'mid', races: ['human'] }
});

assert.equal(world.schemaVersion, 1);
assert.equal(world.engineVersion, require('../package.json').version);
assert.match(world.configFingerprint, /^sha256:/);

const features = contract.searchFeatures(world, {
  kinds: ['lake', 'magic_node', 'river'],
  limit: 20
});
assert.ok(features.length > 0);
assert.ok(features.every((feature) => feature.ref.cell && feature.ref.id));

const draft = { id: 'e1-1', type: 'magic', year: 12, title: '灵脉观测' };
const first = contract.suggestEventAnchors(world, draft, { limit: 5 });
const second = contract.suggestEventAnchors(world, draft, { limit: 5 });
assert.deepEqual(second, first, 'event anchor suggestions must be deterministic');
assert.ok(first.length > 0);

const validation = contract.validateEventSpatial(world, {
  type: draft.type,
  anchor: first[0].anchor
});
assert.equal(validation.valid, true);

const context = contract.queryContextByRef(world, first[0].anchor, 240);
assert.equal(context.schemaVersion, contract.CONTRACT_VERSION);
assert.equal(context.anchor.cell, first[0].anchor.cell);

const toolNames = new Set(LLM_TOOL_DEFINITIONS.map((tool) => tool.name));
for (const name of [
  'geo_search_features',
  'geo_get_context',
  'geo_suggest_event_anchors',
  'geo_validate_event',
  'geo_species_capacity'
]) {
  assert.ok(toolNames.has(name), `${name} tool missing`);
}
const toolResult = executeGeoTool(world.id, 'geo_suggest_event_anchors', {
  eventId: draft.id,
  eventType: draft.type,
  year: draft.year,
  title: draft.title
});
assert.ok(toolResult.candidates.length > 0);

console.log('geo chronicle contract test passed');
