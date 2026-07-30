/**
 * Planet parameters — keep in sync with src/planet/params.js
 */
(function (global) {
  const DEFAULT_OBLIQUITY = 23.44;

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function normalizePlanet(input) {
    const p = input || {};
    const obliquity = clamp(Number(p.obliquity) || DEFAULT_OBLIQUITY, 0, 45);
    const rotationDirection = Number(p.rotationDirection) === -1 ? -1 : 1;
    const seaLevelM = Number.isFinite(Number(p.seaLevelM)) ? Number(p.seaLevelM) : 900;
    const snowLineEquatorM = Number(p.snowLineEquatorM) || 3800;
    const snowLineLatSlopeM = Number(p.snowLineLatSlopeM) || 48;
    const lapseRateC = Number(p.lapseRateC) || 6.5;
    const radiusKm = Number(p.radiusKm) || 6371;
    const tropicLat = obliquity;
    const polarCircleLat = 90 - obliquity;

    return {
      radiusKm,
      obliquity,
      rotationDirection,
      seaLevelM,
      snowLineEquatorM,
      snowLineLatSlopeM,
      lapseRateC,
      tropicLat,
      polarCircleLat
    };
  }

  function snowLineElevationM(planet, absLatDeg) {
    return planet.snowLineEquatorM - planet.snowLineLatSlopeM * absLatDeg;
  }

  function isAlpineSnow(elevationM, absLatDeg, tempC, planet) {
    const snowLine = snowLineElevationM(planet, absLatDeg);
    return elevationM >= snowLine - 200 && tempC < 8;
  }

  function latLonToVector(lat, lon) {
    const latR = (lat * Math.PI) / 180;
    const lonR = (lon * Math.PI) / 180;
    const cosLat = Math.cos(latR);
    return [cosLat * Math.sin(lonR), Math.sin(latR), cosLat * Math.cos(lonR)];
  }

  function buildLatCircle(latDeg, segments, radius) {
    radius = radius ?? 1.015;
    segments = segments ?? 128;
    const pts = [];
    for (let i = 0; i <= segments; i++) {
      const lon = -180 + (i / segments) * 360;
      const v = latLonToVector(latDeg, lon);
      pts.push(v[0] * radius, v[1] * radius, v[2] * radius);
    }
    return pts;
  }

  function buildRotationArrow(planet, radius) {
    radius = radius ?? 1.04;
    const rot = planet.rotationDirection;
    const pts = [];
    for (let lon = -30; lon <= 30; lon += 2) {
      const v = latLonToVector(0, lon * rot);
      pts.push(v[0] * radius, v[1] * radius, v[2] * radius);
    }
    const tip = latLonToVector(0, 32 * rot);
    const base = latLonToVector(0, 24 * rot);
    pts.push(
      tip[0] * radius, tip[1] * radius, tip[2] * radius,
      base[0] * radius, base[1] * radius, base[2] * radius
    );
    return pts;
  }

  const GRATICULE_COLORS = {
    equator: [1, 0.85, 0.2],
    tropic: [1, 0.55, 0.15],
    polar: [0.55, 0.75, 1],
    rotation: [0.35, 1, 0.55]
  };

  global.PlanetParams = {
    DEFAULT_OBLIQUITY,
    normalizePlanet,
    snowLineElevationM,
    isAlpineSnow,
    latLonToVector,
    buildLatCircle,
    buildRotationArrow,
    GRATICULE_COLORS
  };
})(window);
