'use strict';

/**
 * Climate on worlds without observations: the hypothetical continent must show the textbook
 * Koppen pattern, an aquaplanet must be symmetric with a wet equator, and generated worlds
 * must stay physically sane. Guards against parameters that only fit Earth's map.
 */

const assert = require('node:assert/strict');
const { buildNeighborTable, computeAreaWeights } = require('../src/topology/cube-sphere');
const { generateTerrain } = require('../src/generate/terrain');
const { runClimateStage } = require('../src/generate/climate-stage');
const { normalizePlanet } = require('../src/planet/params');
const { scoreContinent, scoreContinentTemp, buildIdealCells, cellAt } = require('./support/ideal-worlds');

console.log('procedural climate test...');

const LIMITS = { continentHits: 18, winterHits: 7 };
const planet = normalizePlanet({});

{
  const n = 48;
  const neighborTable = buildNeighborTable(n);
  const continent = buildIdealCells('continent', n, planet);
  runClimateStage(continent, neighborTable, planet, 'continent', { resolutionDeg: 2 });
  const s = scoreContinent((lat, lon) => cellAt(continent, n, lat, lon));
  const misses = s.results.filter((r) => !r.hit).map((r) => `${r.lat}${r.side}:${r.koppen}/${r.precip}`);
  console.log(`  hypothetical continent ${s.hits}/${s.total} (misses ${misses.join(' ')})`);
  assert.ok(s.hits >= LIMITS.continentHits, `hypothetical continent matches ${s.hits}/${s.total} textbook targets`);
  const tw = scoreContinentTemp((lat, lon) => Math.min(...cellAt(continent, n, lat, lon).tempMonthlyC));
  const coldMisses = tw.results.filter((r) => !r.hit).map((r) => `${r.lat}${r.side}:${r.tmin}`);
  console.log(`  coldest-month targets ${tw.hits}/${tw.total} (misses ${coldMisses.join(' ')})`);
  assert.ok(tw.hits >= LIMITS.winterHits, `hypothetical continent winters match ${tw.hits}/${tw.total} targets`);

  const aqua = buildIdealCells('aquaplanet', n, planet);
  runClimateStage(aqua, neighborTable, planet, 'aquaplanet', { resolutionDeg: 2 });
  const band = (lo, hi) => {
    let p = 0; let w = 0;
    for (const c of aqua.values()) if (c.lat >= lo && c.lat < hi) { p += c.precip * c.areaWeight; w += c.areaWeight; }
    return p / w;
  };
  const north = [band(0, 15), band(15, 35), band(35, 60), band(60, 90)];
  const south = [band(-15, 0), band(-35, -15), band(-60, -35), band(-90, -60)];
  console.log(`  aquaplanet N ${north.map(Math.round).join('/')} S ${south.map(Math.round).join('/')}`);
  for (let k = 0; k < 4; k++) {
    assert.ok(Math.abs(north[k] - south[k]) <= 0.1 * (north[k] + south[k]) / 2 + 20, `aquaplanet hemispheres symmetric (band ${k})`);
  }
  assert.ok(north[0] > 2 * north[1], 'aquaplanet: wet deep tropics, dry subtropics');
  assert.ok(north[2] > 2 * north[1], 'aquaplanet: storm-track maximum in mid-latitudes');
  assert.ok(north[3] < north[2], 'aquaplanet: polar regions drier than the storm tracks');
}

{
  const n = 32;
  const neighborTable = buildNeighborTable(n);
  const areaWeights = computeAreaWeights(n);
  const seeds = ['pc-1', 'pc-2', 'pc-3', 'pc-4', 'pc-5', 'pc-6'];
  for (const seed of seeds) {
    const cells = generateTerrain(seed, n, { planet, backend: 'orogen', orogen: { plateCount: 16, continentCount: 4, landCoverage: 0.3 } });
    for (const [k, w] of areaWeights) cells.get(k).areaWeight = w;
    runClimateStage(cells, neighborTable, planet, seed, {});
    const land = [...cells.values()].filter((c) => c.isLand && !c.isLake);
    let P = 0; let E = 0; let R = 0; let A = 0; let arid = 0;
    const lowEq = []; const sub = [];
    for (const c of land) {
      assert.ok(Number.isFinite(c.precip) && Number.isFinite(c.tempC), `${seed}: finite climate`);
      assert.ok(c.precip >= 0 && c.precip < 10000, `${seed}: precipitation ${c.precip} mm/yr within physical range`);
      assert.ok(c.tempC > -60 && c.tempC < 40, `${seed}: temperature ${c.tempC} C within physical range`);
      const w = c.areaWeight;
      P += c.precip * w; E += c.evaporation * w; R += c.runoff * w; A += w;
      if (c.koppen[0] === 'B') arid += w;
      const a = Math.abs(c.lat);
      if (a < 10 && c.elevation - planet.seaLevelM < 500) lowEq.push(c.precip);
      if (a > 18 && a < 32) sub.push(c.precip);
    }
    const median = (x) => x.sort((p, q) => p - q)[x.length >> 1];
    const closure = (P - E - R) / P;
    const aridShare = arid / A;
    console.log(`  ${seed}: land P ${Math.round(P / A)} closure ${(closure * 100).toFixed(1)}% arid ${Math.round(aridShare * 100)}%`
      + ` equatorial lowland ${lowEq.length ? median(lowEq) : '-'} subtropics ${sub.length ? median(sub) : '-'}`);
    assert.ok(Math.abs(closure) < 0.03, `${seed}: land water balance closes (P - E - R = ${(closure * 100).toFixed(1)}%)`);
    assert.ok(P / A > 300 && P / A < 1300, `${seed}: land precipitation ${Math.round(P / A)} mm/yr`);
    assert.ok(aridShare > 0.1 && aridShare < 0.65, `${seed}: arid share ${Math.round(aridShare * 100)}%`);
    if (lowEq.length >= 20 && sub.length >= 20) {
      assert.ok(median(lowEq) > 700, `${seed}: equatorial lowlands are wet (${median(lowEq)} mm/yr)`);
      assert.ok(median(lowEq) > 1.5 * median(sub), `${seed}: equatorial lowlands wetter than the subtropics`);
    }
  }
}

console.log('procedural climate test passed');
