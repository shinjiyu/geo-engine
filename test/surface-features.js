'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createWorld } = require('../src/world-builder');

const PUBLIC = path.join(__dirname, '../public');

function loadBrowserPipeline() {
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
    'climate-sim.js',
    'surface-features.js',
    'icosphere.js'
  ]) {
    vm.runInContext(fs.readFileSync(path.join(PUBLIC, file), 'utf8'), ctx);
  }
  return sandbox;
}

function buildMeshSurvey(subdiv, seed, planet, sandbox) {
  const { createIcosphere } = sandbox.IcoSphere;
  const { createElevationField } = sandbox.TerrainSampler;
  const { runMeshSimulation } = sandbox.ClimateSim;

  const ico = createIcosphere(subdiv);
  const n = ico.vertices.length;
  const neighbors = Array.from({ length: n }, () => new Set());
  for (const [a, b, c] of ico.faces) {
    neighbors[a].add(b); neighbors[a].add(c);
    neighbors[b].add(a); neighbors[b].add(c);
    neighbors[c].add(a); neighbors[c].add(b);
  }
  const nb = neighbors.map((s) => [...s]);
  const base = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    base[i * 3] = ico.vertices[i][0];
    base[i * 3 + 1] = ico.vertices[i][1];
    base[i * 3 + 2] = ico.vertices[i][2];
  }
  const mesh = { vertexCount: n, neighbors: nb, base };
  const sample = createElevationField(seed);
  const raw = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    raw[i] = sample(base[i * 3], base[i * 3 + 1], base[i * 3 + 2]);
  }
  let heights = raw;
  for (let it = 0; it < 3; it++) {
    const next = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (const j of nb[i]) sum += heights[j];
      next[i] = heights[i] * 0.55 + (sum / nb[i].length) * 0.45;
    }
    heights = next;
  }

  const sim = runMeshSimulation(mesh, heights, planet, seed);
  return sim.surfaceFeatures;
}

console.log('surface-features test...');

const planet = { seaLevelM: 900, obliquity: 23.44 };
const sandbox = loadBrowserPipeline();
const meshSurface = buildMeshSurvey(5, 'continuity-test', planet, sandbox);
if (!meshSurface) throw new Error('mesh surfaceFeatures missing');
if (!Array.isArray(meshSurface.lakes)) throw new Error('lakes array missing');
if (!Array.isArray(meshSurface.islands)) throw new Error('islands array missing');
if (!meshSurface.vegetationCounts || typeof meshSurface.vegetationCounts !== 'object') {
  throw new Error('vegetationCounts missing');
}

const world = createWorld({
  seed: 'surface-features-smoke',
  grid: { cellsPerFaceEdge: 32 },
  planet,
  seedWorld: { magic: 'low', races: ['human'], geography: 'mixed' }
});

if (!Array.isArray(world.lakes)) throw new Error('world.lakes missing');
if (world.lakes.length === 0) throw new Error('orogen world should generate permanent lakes');
if (!world.lakes.every((lake) => lake.areaKm2 > 0)) throw new Error('lake areaKm2 missing');
if (!Array.isArray(world.islands)) throw new Error('world.islands missing');
if (!world.vegetationSummary) throw new Error('world.vegetationSummary missing');

console.log(`  mesh lakes=${meshSurface.lakeCount} islands=${meshSurface.islandCount}`);
console.log(`  world lakes=${world.lakes.length} islands=${world.islands.length}`);
console.log('surface-features test passed');
