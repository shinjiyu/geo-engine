'use strict';

/**
 * Browser-equivalent mesh river survey (icosphere + CA + hydrology).
 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const PUBLIC = path.join(__dirname, '../public');

const sandbox = {
  window: {},
  global: {},
  console,
  Math,
  Uint8Array,
  Uint16Array,
  Float32Array,
  Float64Array,
  Int32Array,
  Set,
  Array,
  Object,
  Infinity
};
sandbox.window = sandbox;
sandbox.global = sandbox;

const ctx = vm.createContext(sandbox);

for (const file of [
  'terrain-sampler.js',
  'planet-params.js',
  'ocean-connectivity.js',
  'water-cycle.js',
  'icosphere.js',
  'climate-sim.js'
]) {
  vm.runInContext(fs.readFileSync(path.join(PUBLIC, file), 'utf8'), ctx);
}

const { createIcosphere } = sandbox.IcoSphere;
const { normalizePlanet } = sandbox.PlanetParams;
const { createElevationField } = sandbox.TerrainSampler;
const { runMeshSimulation } = sandbox.ClimateSim;

function buildNeighbors(faces, vertCount) {
  const sets = Array.from({ length: vertCount }, () => new Set());
  for (const [a, b, c] of faces) {
    sets[a].add(b); sets[a].add(c);
    sets[b].add(a); sets[b].add(c);
    sets[c].add(a); sets[c].add(b);
  }
  return sets.map((s) => [...s]);
}

function smoothHeights(heights, neighbors, iterations) {
  let h = Float64Array.from(heights);
  for (let it = 0; it < iterations; it++) {
    const next = new Float64Array(h.length);
    for (let i = 0; i < h.length; i++) {
      let sum = 0;
      for (const j of neighbors[i]) sum += h[j];
      next[i] = h[i] * 0.55 + (sum / neighbors[i].length) * 0.45;
    }
    h = next;
  }
  return h;
}

function surveyMeshSeed(seed, subdiv, planet) {
  const ico = createIcosphere(subdiv);
  const n = ico.vertices.length;
  const neighbors = buildNeighbors(ico.faces, n);
  const base = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    base[i * 3] = ico.vertices[i][0];
    base[i * 3 + 1] = ico.vertices[i][1];
    base[i * 3 + 2] = ico.vertices[i][2];
  }
  const mesh = { vertexCount: n, neighbors, base };

  const sample = createElevationField(seed);
  const raw = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    raw[i] = sample(base[i * 3], base[i * 3 + 1], base[i * 3 + 2]);
  }
  const heights = smoothHeights(raw, neighbors, 3);

  const sim = runMeshSimulation(mesh, heights, planet, seed);
  const h = sim.hydrology;
  let maxFlow = 0;
  let riverVerts = 0;
  for (let i = 0; i < n; i++) {
    if (sim.isLand[i] && h.flow[i] >= h.minFlowThreshold) riverVerts++;
    if (h.flow[i] > maxFlow) maxFlow = h.flow[i];
  }

  return {
    seed,
    subdiv,
    vertices: n,
    riverCount: h.riverCount,
    riverEdges: h.riverEdgeCount,
    longest: h.longestRiverSegments,
    riverVerts,
    minFlow: Math.round(h.minFlowThreshold * 10) / 10,
    maxFlow: Math.round(maxFlow * 10) / 10,
    landPct: (100 * [...sim.isLand].reduce((a, b) => a + b, 0) / n).toFixed(1)
  };
}

const planet = normalizePlanet({ seaLevelM: 900 });
const seeds = ['mesh-demo', 'w-alpine-a', 'w-alpine-c', 'continuity-test'];

console.log('=== Browser mesh pipeline (source → mouth main stems) ===\n');
console.log('subdiv | seed              | verts  | rivers | edges | longest | minFlow | maxFlow');
console.log('-'.repeat(88));

for (const subdiv of [5, 6]) {
  for (const seed of seeds) {
    const r = surveyMeshSeed(seed, subdiv, planet);
    console.log(
      String(subdiv).padStart(6),
      r.seed.padEnd(18),
      String(r.vertices).padStart(6),
      String(r.riverCount).padStart(6),
      String(r.riverEdges).padStart(6),
      String(r.longest).padStart(7),
      String(r.minFlow).padStart(7),
      String(r.maxFlow).padStart(7)
    );
  }
}

console.log('\n=== Server cube-sphere 64 (my earlier survey — NOT the 3D viewer) ===');
console.log('Same seeds produce ~131–216 traced rivers on 24,576 cells (different grid + algorithm).\n');
