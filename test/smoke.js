'use strict';

const assert = require('node:assert/strict');
const {
  createWorld,
  queryRealmDistance,
  buildFactPack,
  formatFactPackForLlm,
  queryEventContext
} = require('../src/index');

console.log('geo-engine smoke test...');

const t0 = Date.now();
const world = createWorld({
  seed: 'smoke-test-v1',
  grid: { cellsPerFaceEdge: 32 },
  seedWorld: { magic: 'low', races: ['human', 'elf'], geography: 'forest' }
});
const elapsed = Date.now() - t0;
console.log(`createWorld: ${elapsed}ms, worldId=${world.id}`);

assert.equal(world.meta.cellsPerFaceEdge, 32);
assert.equal(world.meta.totalCells, 32 * 32 * 6);
assert.equal(world.meta.terrainBackend, 'world-orogen');
assert.ok(world.meta.landCells > 0);
assert.ok(world.meta.riverCount >= 0);
assert.ok(world.meta.magicNodeCount > 0, 'magical world should contain magic nodes');
assert.equal(world.meta.leyLineCount, world.meta.magicNodeCount - 1);
assert.ok(world.carryingCapacity?.metrics);
assert.deepEqual(world.speciesSelection.unsupported, []);

const sampleCell = Object.values(world.cells).find((c) => c.isLand);
assert.ok(sampleCell.climateZone, 'land cell should have climateZone');
assert.ok(Number.isFinite(sampleCell.runoff), 'land cell should have runoff');
assert.ok(Number.isInteger(sampleCell.plateId), 'cell should retain its tectonic plate');
assert.equal(typeof sampleCell.plateBoundary, 'boolean');
assert.ok(world.realms.length >= 2, 'expected at least 2 realms');

const human = world.realms.find((r) => r.race === 'human');
const elf = world.realms.find((r) => r.race === 'elf');
assert.ok(human, 'human realm');
assert.ok(elf, 'elf realm');

const dist = queryRealmDistance(world, 'human', 'elf');
assert.ok(!dist.error, dist.error);
assert.ok(dist.geodesicKm > 0, 'geodesicKm > 0');
console.log(`distance human↔elf: ${dist.geodesicKm} km`);

const pack = buildFactPack(world, { realmA: 'human', realmB: 'elf' });
assert.ok(pack.distanceQuery);
const llmText = formatFactPackForLlm(pack);
assert.ok(llmText.includes('km'));
console.log('LLM fact pack preview:\n' + llmText.split('\n').slice(0, 4).join('\n'));

const anchorKey = human.centerCell;
const ctx = queryEventContext(world, anchorKey, 4);
assert.ok(!ctx.error);
assert.ok(ctx.regionCellCount > 1);
console.log(`event context at ${anchorKey}: ${ctx.regionCellCount} cells`);

console.log('smoke test passed');
