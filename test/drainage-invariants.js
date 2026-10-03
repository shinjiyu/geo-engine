'use strict';

const assert = require('node:assert/strict');
const { createWorld } = require('../src/world-builder');

console.log('drainage invariants test...');

const world = createWorld({
  seed: 'drainage-invariants-v1',
  grid: { cellsPerFaceEdge: 48 },
  seedWorld: { magic: 'low', races: ['human'] }
});
const cells = world.cells;
const rivers = world.rivers;
const lakes = world.lakes;
const riverById = new Map(rivers.map((r) => [r.id, r]));
const lakeById = new Map(lakes.map((l) => [l.id, l]));

assert.ok(rivers.length > 0, 'test world should contain rivers');

const owner = new Map();
for (const river of rivers) {
  assert.ok(river.order >= 1, `${river.id} must have a Strahler order`);
  const own = river.parentId ? river.cells.slice(0, -1) : river.cells;
  for (const key of own) {
    assert.ok(!owner.has(key), `${key} is claimed by ${owner.get(key)} and ${river.id}`);
    owner.set(key, river.id);
    assert.equal(cells[key].isLake, false, `${river.id} must not run through a lake`);
    assert.equal(cells[key].river, true);
  }
  for (let i = 1; i < own.length; i++) {
    assert.equal(cells[own[i - 1]].downslope, own[i], `${river.id} must follow the drainage tree`);
    assert.ok(cells[own[i]].flow >= cells[own[i - 1]].flow - 1e-9, `${river.id} discharge must not shrink downstream`);
  }

  if (river.kind === 'tributary') {
    const parent = riverById.get(river.parentId);
    assert.ok(parent, `${river.id} parent must exist`);
    assert.equal(river.mouth.type, 'confluence');
    assert.ok(parent.cells.includes(river.cells.at(-1)), `${river.id} must end on its parent`);
  } else {
    assert.ok(['ocean', 'lake', 'sink'].includes(river.mouth.type));
    const mouthCell = cells[river.cells.at(-1)];
    const next = mouthCell.downslope ? cells[mouthCell.downslope] : null;
    if (river.mouth.type === 'ocean') assert.ok(next && !next.isLand && !next.isLake);
    if (river.mouth.type === 'lake') {
      assert.ok(next?.isLake, `${river.id} must flow into a lake cell`);
      assert.ok(lakeById.get(river.mouth.lakeId).cells.includes(mouthCell.downslope));
    }
  }
}

for (const lake of lakes) {
  assert.ok(lake.cells.every((key) => cells[key].isLake && !cells[key].isLand));
  assert.equal(lake.freshwater, lake.outflow === 'open', 'only overflowing lakes are fresh');
  if (lake.outflow === 'closed') assert.equal(lake.outflowKm3, 0);
  for (const id of lake.inflowRiverIds) assert.equal(riverById.get(id).mouth.lakeId, lake.id);
}

console.log(`  rivers=${rivers.length} lakes=${lakes.length}`);
console.log('drainage invariants test passed');
