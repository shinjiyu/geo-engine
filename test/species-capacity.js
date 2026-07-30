'use strict';

const assert = require('node:assert/strict');
const {
  evaluateWorldCarryingCapacity,
  filterSupportedSpecies
} = require('../src/generate/species-capacity');

console.log('species capacity test...');

function makeCells(withLake) {
  return new Map([
    ['0:0:0', {
      face: 0, u: 0, v: 0, isLand: !withLake, isLake: withLake,
      terrain: withLake ? 'lake' : 'plain', vegetation: null,
      tempC: 14, soilMoisture: 120, magicFlux: 0.2, areaWeight: 1
    }],
    ['0:1:0', {
      face: 0, u: 1, v: 0, isLand: true, isLake: false,
      terrain: 'coast', vegetation: 'wetland',
      tempC: 16, soilMoisture: 150, magicFlux: 0.25, areaWeight: 1
    }],
    ['0:2:0', {
      face: 0, u: 2, v: 0, isLand: true, isLake: false,
      terrain: 'plain', vegetation: 'forest',
      tempC: 15, soilMoisture: 100, magicFlux: 0.15, areaWeight: 1
    }]
  ]);
}

const noLake = evaluateWorldCarryingCapacity(makeCells(false), [], { radiusKm: 6371 });
assert.equal(noLake.species.freshwater_fishfolk.supported, false);
assert.match(noLake.species.freshwater_fishfolk.reasons.join(' '), /lake/i);
assert.deepEqual(
  filterSupportedSpecies(['human', 'freshwater_fishfolk'], noLake),
  { supported: ['human'], unsupported: ['freshwater_fishfolk'] }
);

const withLake = evaluateWorldCarryingCapacity(
  makeCells(true),
  [{ id: 'lake-1', cells: ['0:0:0'], areaKm2: 60000, freshwater: true }],
  { radiusKm: 6371 }
);
assert.equal(withLake.species.freshwater_fishfolk.supported, true);
assert.ok(withLake.species.freshwater_fishfolk.capacity > 0);
assert.equal(withLake.species.freshwater_fishfolk.anchorFeatureId, 'lake-1');
assert.ok(withLake.species.freshwater_fishfolk.habitatCells.includes('0:0:0'));

console.log('species capacity test passed');
