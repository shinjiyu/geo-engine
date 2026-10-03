'use strict';

const assert = require('node:assert/strict');
const { createWorld } = require('../src/world-builder');

console.log('species realm integration test...');

function fishfolkWorld(seed) {
  return createWorld({
    seed,
    grid: { cellsPerFaceEdge: 32 },
    seedWorld: { magic: 'mid', races: ['freshwater_fishfolk'] }
  });
}

const supported = fishfolkWorld('lake-integration-v1');
assert.deepEqual(supported.speciesSelection.unsupported, []);
const fishfolkRealm = supported.realms.find((realm) => realm.race === 'freshwater_fishfolk');
assert.ok(fishfolkRealm, 'qualifying freshwater lake should support a fishfolk realm');
assert.ok(fishfolkRealm.anchorFeatureId, 'fishfolk realm should anchor to a freshwater lake');
assert.ok(fishfolkRealm.population <= fishfolkRealm.populationCap);
const occupied = Object.values(supported.cells).filter(
  (cell) => cell.realmId === fishfolkRealm.id
);
assert.ok(occupied.length > 0);
assert.ok(occupied.every(
  (cell) => cell.isLake || cell.vegetation === 'wetland' || cell.terrain === 'coast'
), 'aquatic realm may only occupy lake or shoreline habitat');

const unsupported = fishfolkWorld('ecology-survey-8');
assert.deepEqual(unsupported.speciesSelection.supported, []);
assert.deepEqual(unsupported.speciesSelection.unsupported, ['freshwater_fishfolk']);
assert.equal(
  unsupported.realms.some((realm) => realm.race === 'freshwater_fishfolk'),
  false,
  'unsupported species must not be randomly placed'
);
assert.equal(
  unsupported.realms.length,
  0,
  'an explicit request with no supported species must not fall back to unrelated realms'
);

console.log('species realm integration test passed');
