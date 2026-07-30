'use strict';

const { makeNoise3D, fbm } = require('./noise');
const { normalizePlanet, snowLineElevationM, isAlpineSnow } = require('../planet/params');
const { TERRAIN } = require('./terrain');

const CLIMATE_ZONES = {
  OCEAN: 'ocean',
  ICE: 'ice',
  COAST: 'coast',
  TROPICAL: 'tropical',
  SUBTROPICAL: 'subtropical',
  ARID: 'arid',
  TEMPERATE: 'temperate',
  COLD: 'cold',
  POLAR: 'polar',
  SNOW: 'snow'
};

function smoothstep(e0, e1, x) {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

function computeClimateAt(lat, lon, elevation, isLand, planetInput, seed, unit) {
  const planet = normalizePlanet(planetInput);
  const absLat = Math.abs(lat);
  const rot = planet.rotationDirection;
  const x = unit?.x ?? 0;
  const y = unit?.y ?? 0;
  const z = unit?.z ?? 0;

  const insolation = Math.max(0.08, Math.cos((absLat * Math.PI) / 180));
  let tempC = 30 * insolation - (elevation / 1000) * planet.lapseRateC;
  if (absLat > planet.polarCircleLat) tempC -= 14;
  else if (absLat > planet.tropicLat) {
    tempC -= 6 * ((absLat - planet.tropicLat) / (planet.polarCircleLat - planet.tropicLat));
  }

  const itcz = Math.exp(-((absLat / 10) ** 2));
  const midStorm = Math.exp(-(((absLat - 50) / 18) ** 2));
  const latDry = Math.exp(-(((absLat - planet.tropicLat) / 16) ** 2)) * 0.32;

  let continentMoist = 0;
  let dryPatch = 0.5;
  let windward = 0;
  if (seed) {
    const moist = makeNoise3D(`${seed}:moist`);
    const dry = makeNoise3D(`${seed}:dry`);
    continentMoist = fbm(moist, x * 1.4, y * 1.4, z * 1.4, 3);
    dryPatch = fbm(dry, x * 2.1 + 5, y * 2.1, z * 2.1, 2) * 0.5 + 0.5;
    windward = fbm(moist, lon * 0.028, lat * 0.028, rot * 0.4, 2);
  }

  let precip = 0;
  let evaporation = 0;
  if (isLand) {
    precip = (itcz * 1.15 + midStorm * 0.65) * (0.42 + insolation * 0.58);
    precip *= 0.78 + Math.max(0, continentMoist) * 0.55 + Math.max(0, windward) * 0.22;
    precip -= latDry * dryPatch * 0.38;
    precip = Math.max(0.04, precip);
    evaporation = Math.max(0.05, tempC * 0.016 + insolation * 0.11 + Math.max(0, dryPatch - 0.5) * 0.08);
  } else {
    evaporation = Math.max(0.25, insolation * 0.95 + (absLat < planet.tropicLat ? 0.2 : 0));
  }

  const runoff = isLand ? Math.max(0, precip - evaporation * 0.36) : 0;
  const snowLine = snowLineElevationM(planet, absLat);
  const isSnow = isAlpineSnow(elevation, absLat, tempC, planet);
  const isPolarIce = !isLand && absLat >= planet.polarCircleLat;

  const aridScore = isLand
    ? smoothstep(0.38, 0.78, (1 - precip / 0.95) * (0.25 + latDry * 0.75) * (0.55 + dryPatch * 0.65))
    : 0;

  let zone = CLIMATE_ZONES.OCEAN;
  if (isLand) {
    if (isSnow) zone = CLIMATE_ZONES.SNOW;
    else if (absLat >= planet.polarCircleLat && elevation < snowLine - 350 && tempC < 2) {
      zone = CLIMATE_ZONES.POLAR;
    }
    else if (aridScore > 0.62) zone = CLIMATE_ZONES.ARID;
    else if (absLat <= planet.tropicLat) zone = tempC > 22 ? CLIMATE_ZONES.TROPICAL : CLIMATE_ZONES.SUBTROPICAL;
    else if (tempC < 4) zone = CLIMATE_ZONES.COLD;
    else zone = CLIMATE_ZONES.TEMPERATE;
  } else if (isPolarIce) {
    zone = CLIMATE_ZONES.ICE;
  }

  return {
    tempC: Math.round(tempC * 10) / 10,
    precip: Math.round(precip * 1000) / 1000,
    evaporation: Math.round(evaporation * 1000) / 1000,
    runoff: Math.round(runoff * 1000) / 1000,
    snowLineM: Math.round(snowLine),
    zone,
    aridScore,
    isSnow,
    isPolarIce,
    tropicLat: planet.tropicLat,
    polarCircleLat: planet.polarCircleLat
  };
}

function classifyZoneFromWater(cell, planetInput) {
  const planet = normalizePlanet(planetInput);
  const absLat = Math.abs(cell.lat);
  const p = cell.precip ?? 0;
  const tempC = cell.tempC ?? 15;
  const snowLine = snowLineElevationM(planet, absLat);

  if (!cell.isLand) {
    return absLat >= planet.polarCircleLat ? CLIMATE_ZONES.ICE : CLIMATE_ZONES.OCEAN;
  }
  if (isAlpineSnow(cell.elevation, absLat, tempC, planet)) return CLIMATE_ZONES.SNOW;
  if (absLat >= planet.polarCircleLat && cell.elevation < snowLine - 350 && tempC < 2) {
    return CLIMATE_ZONES.POLAR;
  }
  if (p < 220 && absLat > 18) return CLIMATE_ZONES.ARID;
  if (absLat <= planet.tropicLat) return p > 1500 ? CLIMATE_ZONES.TROPICAL : CLIMATE_ZONES.SUBTROPICAL;
  if (tempC < 4) return CLIMATE_ZONES.COLD;
  return CLIMATE_ZONES.TEMPERATE;
}

function reclassifyZonesFromWater(cells, planetInput) {
  const planet = normalizePlanet(planetInput);
  for (const cell of cells.values()) {
    cell.climateZone = classifyZoneFromWater(cell, planet);
  }
}

function applyClimateToCells(cells, planetInput, seed) {
  const { faceUVToVector } = require('../topology/cube-sphere');
  const n = Math.sqrt(cells.size / 6);

  for (const cell of cells.values()) {
    const vec = faceUVToVector(cell.face, cell.u, cell.v, n);
    const c = computeClimateAt(
      cell.lat, cell.lon, cell.elevation, cell.isLand, planetInput, seed,
      { x: vec.x, y: vec.y, z: vec.z }
    );
    cell.tempC = c.tempC;
    cell.precip = c.precip;
    cell.evaporation = c.evaporation;
    cell.runoff = c.runoff;
    cell.climateZone = c.zone;
    cell.snowLineM = c.snowLineM;
    cell.aridScore = c.aridScore;
    if (c.isSnow && cell.isLand) cell.terrain = TERRAIN.SNOW;
    else if (c.isPolarIce) cell.terrain = TERRAIN.ICE;
  }
}

module.exports = {
  CLIMATE_ZONES,
  computeClimateAt,
  applyClimateToCells,
  classifyZoneFromWater,
  reclassifyZonesFromWater
};
