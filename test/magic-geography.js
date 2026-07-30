'use strict';

const assert = require('node:assert/strict');
const { generateMagicGeography } = require('../src/generate/magic-geography');

console.log('magic geography test...');

function fixture() {
  const cells = new Map();
  const neighbors = new Map();
  for (let i = 0; i < 18; i++) {
    const key = `0:${i}:0`;
    cells.set(key, {
      face: 0,
      u: i,
      v: 0,
      lat: -40 + i * 5,
      lon: i * 8,
      elevation: 900 + (i % 6) * 700,
      isLand: true,
      isLake: false,
      terrain: i % 6 === 5 ? 'mountain' : 'plain',
      plateBoundary: i % 4 === 0,
      river: i % 5 === 0,
      flow: i * 10,
      magicFlux: 0
    });
    const links = [];
    if (i > 0) links.push(`0:${i - 1}:0`);
    if (i < 17) links.push(`0:${i + 1}:0`);
    neighbors.set(key, links);
  }
  return { cells, neighbors };
}

function generate() {
  const { cells, neighbors } = fixture();
  const result = generateMagicGeography('magic-contract-v1', cells, neighbors, {
    magic: 'mid',
    lakes: [{ id: 'lake-1', cells: ['0:8:0'], areaKm2: 50000 }],
    mountains: [{ id: 'mountain-1', cells: ['0:5:0', '0:11:0'], maxElevation: 4400 }],
    rivers: [{ id: 'river-1', cells: ['0:0:0', '0:5:0', '0:10:0'], mouthFlow: 100 }]
  });
  return {
    result,
    flux: [...cells.values()].map((cell) => cell.magicFlux)
  };
}

const first = generate();
const second = generate();
assert.deepEqual(first, second, 'same seed and geography must reproduce the magic network');
assert.ok(first.result.magicNodes.length >= 3);
assert.ok(first.result.leyLines.length >= first.result.magicNodes.length - 1);
assert.ok(first.result.magicNodes.some((node) => node.kind !== 'ambient'));
assert.ok(Math.max(...first.flux) > Math.min(...first.flux), 'magic flux should form gradients');
assert.ok(first.result.leyLines.every((line) => line.cells.length >= 2));

console.log('magic geography test passed');
