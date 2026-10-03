'use strict';

const DEFAULT_OBLIQUITY = 23.44;
const DEFAULT_SNOW_LINE_EQUATOR_M = 3800;
const DEFAULT_SNOW_LINE_LAT_SLOPE = 48;

function normalizePlanet(input) {
  const p = input || {};
  const obliquity = clamp(Number(p.obliquity) || DEFAULT_OBLIQUITY, 0, 45);
  const rotationDirection = Number(p.rotationDirection) === -1 ? -1 : 1;
  const seaLevelM = Number.isFinite(Number(p.seaLevelM)) ? Number(p.seaLevelM) : 900;
  const legacyNoiseSea = p.seaLevel;
  const snowLineEquatorM = Number(p.snowLineEquatorM) || DEFAULT_SNOW_LINE_EQUATOR_M;
  const snowLineLatSlopeM = Number(p.snowLineLatSlopeM) || DEFAULT_SNOW_LINE_LAT_SLOPE;
  const lapseRateC = Number(p.lapseRateC) || 6.5;
  const radiusKm = Number(p.radiusKm) || 6371;

  const tropicLat = obliquity;
  const polarCircleLat = 90 - obliquity;

  return {
    radiusKm,
    obliquity,
    rotationDirection,
    seaLevelM,
    legacyNoiseSea: legacyNoiseSea ?? 0.02,
    snowLineEquatorM,
    snowLineLatSlopeM,
    lapseRateC,
    tropicLat,
    polarCircleLat,
    equatorLat: 0
  };
}

/** Snow line as height above sea level. */
function snowLineElevationM(planet, absLatDeg) {
  return planet.snowLineEquatorM - planet.snowLineLatSlopeM * absLatDeg;
}

/** Cell elevations are absolute (sea surface sits at `seaLevelM`); thresholds use height above sea. */
function heightAboveSeaM(elevationM, planetInput) {
  return elevationM - normalizePlanet(planetInput).seaLevelM;
}

/** Alpine / permanent snow — not polar tundra. `heightM` is height above sea level. */
function isAlpineSnow(heightM, absLatDeg, tempC, planetInput) {
  const planet = normalizePlanet(planetInput);
  const snowLine = snowLineElevationM(planet, absLatDeg);
  return heightM >= snowLine - 200 && tempC < 8;
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function graticuleLatitudes(planet) {
  const t = planet.tropicLat;
  const p = planet.polarCircleLat;
  return {
    equator: 0,
    tropicNorth: t,
    tropicSouth: -t,
    polarNorth: p,
    polarSouth: -p
  };
}

module.exports = {
  DEFAULT_OBLIQUITY,
  normalizePlanet,
  snowLineElevationM,
  heightAboveSeaM,
  isAlpineSnow,
  graticuleLatitudes
};
