'use strict';

function latLonToVector(lat, lon) {
  const latR = (lat * Math.PI) / 180;
  const lonR = (lon * Math.PI) / 180;
  const cosLat = Math.cos(latR);
  return {
    x: cosLat * Math.sin(lonR),
    y: Math.sin(latR),
    z: cosLat * Math.cos(lonR)
  };
}

function pixelToLatLon(px, py, width, height) {
  const lat = 90 - (py + 0.5) * (180 / height);
  const lon = -180 + (px + 0.5) * (360 / width);
  return { lat, lon };
}

module.exports = { latLonToVector, pixelToLatLon };
