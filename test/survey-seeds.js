'use strict';

const { createWorld } = require('../src/world-builder');
const { isAlpineSnow, snowLineElevationM, normalizePlanet } = require('../src/planet/params');

const SEEDS = [
  'mesh-demo',
  'w-alpine-a',
  'w-alpine-b',
  'w-alpine-c',
  'smoke-test-v1',
  'continuity-test'
];

const planet = normalizePlanet({ seaLevelM: 900, obliquity: 23.44 });

function surveyWorld(seed) {
  const world = createWorld({
    seed,
    grid: { cellsPerFaceEdge: 64 },
    planet,
    seedWorld: { magic: 'low', races: ['human'], geography: 'mixed' }
  });

  let maxElev = -Infinity;
  let minElev = Infinity;
  let alpineSnow = 0;
  let polarLand = 0;
  let polarIce = 0;
  let mountain = 0;
  let land = 0;

  for (const cell of Object.values(world.cells)) {
    maxElev = Math.max(maxElev, cell.elevation);
    minElev = Math.min(minElev, cell.elevation);
    if (!cell.isLand) {
      if (cell.climateZone === 'ice') polarIce++;
      continue;
    }
    land++;
    if (cell.terrain === 'mountain' || cell.elevation - planet.seaLevelM > 1700) mountain++;
    const absLat = Math.abs(cell.lat);
    const snowLine = snowLineElevationM(planet, absLat);
    const alpine = isAlpineSnow(cell.elevation - planet.seaLevelM, absLat, cell.tempC, planet);
    if (alpine) alpineSnow++;
    else if (cell.climateZone === 'polar' || cell.climateZone === 'snow') {
      if (absLat >= planet.polarCircleLat - 2) polarLand++;
    }
  }

  const basins = world.cells.oceanStats?.basinsFilled ?? '?';
  const riverKm = world.rivers.reduce((s, r) => s + r.lengthKm, 0);

  return {
    seed,
    maxElev: Math.round(maxElev),
    minElev: Math.round(minElev),
    landPct: Math.round((land / Object.keys(world.cells).length) * 100),
    basinsFilled: basins,
    alpineSnowCells: alpineSnow,
    polarLandCells: polarLand,
    polarIceCells: polarIce,
    mountainCells: mountain,
    riverCount: world.rivers.length,
    riverTotalKm: Math.round(riverKm),
    longestRiverKm: world.rivers.length
      ? Math.max(...world.rivers.map((r) => r.lengthKm))
      : 0
  };
}

console.log('Alpine snow / river survey (cube-sphere 64, seaLevel=900m)\n');
console.log(
  'seed'.padEnd(18),
  'maxElev',
  'alpine',
  'polarL',
  'polarIce',
  'rivers',
  'longestKm',
  'basins'
);
console.log('-'.repeat(78));

const rows = [];
for (const seed of SEEDS) {
  const r = surveyWorld(seed);
  rows.push(r);
  console.log(
    r.seed.padEnd(18),
    String(r.maxElev).padStart(6),
    String(r.alpineSnowCells).padStart(6),
    String(r.polarLandCells).padStart(6),
    String(r.polarIceCells).padStart(8),
    String(r.riverCount).padStart(6),
    String(r.longestRiverKm).padStart(9),
    String(r.basinsFilled).padStart(6)
  );
}

const withAlpine = rows.filter((r) => r.alpineSnowCells > 0);
console.log('\nSummary:');
console.log(`  Seeds with alpine snow cells: ${withAlpine.length}/${rows.length}`);
if (withAlpine.length) {
  const best = withAlpine.sort((a, b) => b.alpineSnowCells - a.alpineSnowCells)[0];
  console.log(`  Best: ${best.seed} → ${best.alpineSnowCells} alpine cells, max ${best.maxElev}m`);
} else {
  console.log('  WARNING: no alpine snow in any tested seed');
}

const avgRivers = rows.reduce((s, r) => s + r.riverCount, 0) / rows.length;
console.log(`  Avg rivers/world: ${avgRivers.toFixed(1)} (range ${Math.min(...rows.map(r => r.riverCount))}-${Math.max(...rows.map(r => r.riverCount))})`);
