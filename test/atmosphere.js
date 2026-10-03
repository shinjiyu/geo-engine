'use strict';

const assert = require('node:assert/strict');
const { LatLonGrid, simulateAtmosphere, dailyInsolation } = require('../src/generate/atmosphere');
const { normalizePlanet } = require('../src/planet/params');

console.log('atmosphere test...');

function annualMeanInsolation(latDeg, obliquityDeg) {
  let s = 0;
  for (let d = 0; d < 365; d++) s += dailyInsolation(latDeg * Math.PI / 180, d + 0.5, obliquityDeg * Math.PI / 180);
  return s / 365;
}
assert.ok(Math.abs(annualMeanInsolation(0, 23.44) - 418) < 6, 'equatorial insolation ~418 W/m2');
assert.ok(Math.abs(annualMeanInsolation(90, 23.44) - 173) < 6, 'polar insolation ~173 W/m2');

// Synthetic world: one continent spanning 60S-60N, 40W-40E, with a meridional ridge at 0 lon.
const grid = new LatLonGrid(4);
function surfaceWithRidge() {
  const landFraction = new Float64Array(grid.size);
  const heightM = new Float64Array(grid.size);
  for (let i = 0; i < grid.nLat; i++) {
    for (let j = 0; j < grid.nLon; j++) {
      const lat = grid.rowLat[i];
      const lon = grid.colLon[j];
      if (Math.abs(lat) > 60 || Math.abs(lon) > 40) continue;
      landFraction[i * grid.nLon + j] = 1;
      heightM[i * grid.nLon + j] = Math.abs(lon) < 4 ? 3000 : 200;
    }
  }
  return { landFraction, heightM };
}

function annual(result, field, lat, lon) {
  const c = grid.index(lat, lon);
  let s = 0;
  for (let m = 0; m < 12; m++) s += result[field][m * grid.size + c];
  return s;
}

const surface = surfaceWithRidge();
const earthLike = simulateAtmosphere(grid, surface, normalizePlanet({}), { spinupDays: 60 });

let precip = 0;
let evap = 0;
for (let c = 0; c < grid.size; c++) {
  const w = Math.cos(grid.rowLat[Math.floor(c / grid.nLon)] * Math.PI / 180);
  for (let m = 0; m < 12; m++) {
    precip += w * earthLike.monthPrecip[m * grid.size + c];
    evap += w * earthLike.monthEvap[m * grid.size + c];
  }
}
assert.ok(Math.abs(precip / evap - 1) < 0.05, `global precipitation balances evaporation (P/E=${(precip / evap).toFixed(3)})`);

const westOfRidge = annual(earthLike, 'monthPrecip', 46, -10);
const eastOfRidge = annual(earthLike, 'monthPrecip', 46, 10);
assert.ok(westOfRidge > 1.3 * eastOfRidge, `westerlies: windward west wetter (${westOfRidge.toFixed(0)} vs ${eastOfRidge.toFixed(0)})`);

const retrograde = simulateAtmosphere(grid, surface, normalizePlanet({ rotationDirection: -1 }), { spinupDays: 60 });
const westRetro = annual(retrograde, 'monthPrecip', 46, -10);
const eastRetro = annual(retrograde, 'monthPrecip', 46, 10);
assert.ok(eastRetro > 1.3 * westRetro, `retrograde rotation flips the rain shadow (${eastRetro.toFixed(0)} vs ${westRetro.toFixed(0)})`);

const noTilt = simulateAtmosphere(grid, surface, normalizePlanet({ obliquity: 0.0001 }), { temperatureOnly: true });
const c45 = grid.index(46, -20);
const tJan = noTilt.monthTempSeaLevel[c45];
const tJul = noTilt.monthTempSeaLevel[6 * grid.size + c45];
assert.ok(Math.abs(tJul - tJan) < 1, `zero obliquity has no seasons (Jan ${tJan.toFixed(1)}, Jul ${tJul.toFixed(1)})`);
const tiltJan = earthLike.monthTempSeaLevel[c45];
const tiltJul = earthLike.monthTempSeaLevel[6 * grid.size + c45];
assert.ok(tiltJul - tiltJan > 10, `continental mid-latitude summer is warmer than winter (Jan ${tiltJan.toFixed(1)}, Jul ${tiltJul.toFixed(1)})`);

console.log(`  windward/lee precip: ${westOfRidge.toFixed(0)} / ${eastOfRidge.toFixed(0)} mm (retrograde ${westRetro.toFixed(0)} / ${eastRetro.toFixed(0)})`);
console.log('atmosphere test passed');
