'use strict';

/** Web Mercator — same as Google Maps / OpenStreetMap (EPSG:3857) */
const MERCATOR_MAX_LAT = 85.05112877980659;

function mercatorYFromLat(latDeg) {
  const latRad = (Math.max(-MERCATOR_MAX_LAT, Math.min(MERCATOR_MAX_LAT, latDeg)) * Math.PI) / 180;
  return Math.log(Math.tan(Math.PI / 4 + latRad / 2));
}

function latFromMercatorY(yMerc) {
  return ((2 * Math.atan(Math.exp(yMerc)) - Math.PI / 2) * 180) / Math.PI;
}

function mercatorBounds() {
  const yMax = mercatorYFromLat(MERCATOR_MAX_LAT);
  return { yMin: -yMax, yMax, maxLat: MERCATOR_MAX_LAT };
}

/** Equirectangular (Plate Carrée) */
function pixelToLatLonEquirect(px, py, width, height) {
  const lat = 90 - (py + 0.5) * (180 / height);
  const lon = -180 + (px + 0.5) * (360 / width);
  return { lat, lon };
}

/** Web Mercator: x linear in lon, y linear in mercator Y */
function pixelToLatLonMercator(px, py, width, height) {
  const lon = -180 + ((px + 0.5) / width) * 360;
  const { yMin, yMax } = mercatorBounds();
  const t = 1 - (py + 0.5) / height;
  const yMerc = yMin + t * (yMax - yMin);
  const lat = latFromMercatorY(yMerc);
  return { lat, lon };
}

function latLonToMercatorPixel(lat, lon, width, height) {
  const px = ((lon + 180) / 360) * width - 0.5;
  const { yMin, yMax } = mercatorBounds();
  const yMerc = mercatorYFromLat(lat);
  const t = (yMerc - yMin) / (yMax - yMin);
  const py = (1 - t) * height - 0.5;
  return { px, py };
}

module.exports = {
  MERCATOR_MAX_LAT,
  mercatorYFromLat,
  latFromMercatorY,
  mercatorBounds,
  pixelToLatLonEquirect,
  pixelToLatLonMercator,
  latLonToMercatorPixel
};
