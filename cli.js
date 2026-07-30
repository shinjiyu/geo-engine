'use strict';

const {
  createWorld,
  loadWorld,
  queryRealmDistance,
  buildFactPack,
  formatFactPackForLlm
} = require('./src/index');

const cmd = process.argv[2];

function usage() {
  console.log(`Usage:
  node cli.js create [seed] [n]
  node cli.js distance <worldId> <realmA> <realmB>
  node cli.js fact-pack <worldId> [realmA] [realmB]`);
}

if (cmd === 'create') {
  const seed = process.argv[3] || 'demo-seed';
  const n = Number(process.argv[4]) || 32;
  console.log(`Creating world seed=${seed} n=${n} ...`);
  const t0 = Date.now();
  const world = createWorld({
    seed,
    grid: { cellsPerFaceEdge: n },
    seedWorld: { magic: 'low', races: ['human', 'elf'], geography: 'forest' }
  });
  console.log(`Done in ${Date.now() - t0}ms`);
  console.log(`worldId: ${world.id}`);
  console.log(`meta:`, world.meta);
  console.log(`realms:`, world.realms.map((r) => `${r.name}(${r.race})`).join(', '));
} else if (cmd === 'distance') {
  const [, , , worldId, realmA, realmB] = process.argv;
  if (!worldId || !realmA || !realmB) return usage();
  const world = loadWorld(worldId);
  if (!world) {
    console.error('World not found:', worldId);
    process.exit(1);
  }
  const result = queryRealmDistance(world, realmA, realmB);
  console.log(JSON.stringify(result, null, 2));
} else if (cmd === 'fact-pack') {
  const [, , , worldId, realmA, realmB] = process.argv;
  if (!worldId) return usage();
  const world = loadWorld(worldId);
  if (!world) {
    console.error('World not found:', worldId);
    process.exit(1);
  }
  const pack = buildFactPack(world, realmA && realmB ? { realmA, realmB } : {});
  console.log(formatFactPackForLlm(pack));
} else {
  usage();
}
