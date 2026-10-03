'use strict';

const assert = require('node:assert/strict');
const { buildNeighborTable, faceUVToVector, parseCellKey } = require('../src/topology/cube-sphere');
const { openNarrowStraits } = require('../src/generate/ocean-connectivity');

console.log('topology test...');

for (const n of [3, 16, 48]) {
  const table = buildNeighborTable(n);
  assert.equal(table.size, 6 * n * n);
  const cellDeg = 90 / n;
  for (const [key, neighbors] of table) {
    assert.equal(new Set(neighbors).size, 4, `${key} has duplicate neighbours`);
    const a = parseCellKey(key);
    const pa = faceUVToVector(a.face, a.u, a.v, n);
    for (const other of neighbors) {
      assert.notEqual(other, key);
      assert.ok(table.get(other).includes(key), `${key} -> ${other} is not symmetric`);
      const b = parseCellKey(other);
      if (b.face === a.face) assert.equal(Math.abs(b.u - a.u) + Math.abs(b.v - a.v), 1, `${key} -> ${other} skips cells`);
      const pb = faceUVToVector(b.face, b.u, b.v, n);
      const deg = Math.acos(Math.min(1, pa.x * pb.x + pa.y * pb.y + pa.z * pb.z)) * 180 / Math.PI;
      assert.ok(deg < 1.5 * cellDeg, `${key} -> ${other} is ${deg.toFixed(2)} deg apart`);
    }
  }
}

// A 1x7 strip: ocean | land(strait, sub-sea footprint) | inland sea | land | land | land | lake.
const keys = ['o', 's', 'b', 'l1', 'l2', 'l3', 'k'];
const cells = new Map(keys.map((k) => [k, { isLand: !['o', 'b', 'k'].includes(k), elevation: ['o', 'b', 'k'].includes(k) ? -100 : 50 }]));
const neighborTable = new Map(keys.map((k, i) => [k, [keys[i - 1], keys[i + 1]].filter(Boolean)]));
const footprint = new Map([['s', -20], ['l1', 30], ['l2', 30], ['l3', 30]]);
assert.equal(openNarrowStraits(cells, neighborTable, footprint, 0, 2), 1);
assert.equal(cells.get('s').isLand, false);
assert.ok(cells.get('s').elevation < 0);
assert.equal(cells.get('l3').isLand, true, 'basins without a sub-sea path stay closed');

console.log('topology test passed');
