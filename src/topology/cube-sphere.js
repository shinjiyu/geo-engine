'use strict';

const EARTH_RADIUS_KM = 6371;

/** Face layout: 0=+X, 1=-X, 2=+Y, 3=-Y, 4=+Z, 5=-Z */
function faceUVToVector(face, u, v, n) {
  const a = (2 * (u + 0.5) / n) - 1;
  const b = (2 * (v + 0.5) / n) - 1;
  let x; let y; let z;
  switch (face) {
    case 0: x = 1; y = b; z = -a; break;
    case 1: x = -1; y = b; z = a; break;
    case 2: x = a; y = 1; z = -b; break;
    case 3: x = a; y = -1; z = b; break;
    case 4: x = a; y = b; z = 1; break;
    case 5: x = -a; y = b; z = -1; break;
    default: throw new Error(`Invalid face ${face}`);
  }
  const len = Math.hypot(x, y, z);
  return { x: x / len, y: y / len, z: z / len };
}

function vectorToFaceUV(x, y, z) {
  const ax = Math.abs(x);
  const ay = Math.abs(y);
  const az = Math.abs(z);
  let face; let a; let b; let sc;
  if (ax >= ay && ax >= az) {
    face = x > 0 ? 0 : 1;
    sc = ax;
    a = (face === 0 ? -z : z) / sc;
    b = y / sc;
  } else if (ay >= ax && ay >= az) {
    face = y > 0 ? 2 : 3;
    sc = ay;
    a = x / sc;
    b = (face === 2 ? -z : z) / sc;
  } else {
    face = z > 0 ? 4 : 5;
    sc = az;
    a = (face === 4 ? x : -x) / sc;
    b = y / sc;
  }
  return { face, a, b };
}

function vectorToCell(x, y, z, n) {
  const { face, a, b } = vectorToFaceUV(x, y, z);
  const u = Math.min(n - 1, Math.max(0, Math.floor(((a + 1) / 2) * n)));
  const v = Math.min(n - 1, Math.max(0, Math.floor(((b + 1) / 2) * n)));
  return { face, u, v };
}

function cellKey(face, u, v) {
  return `${face}:${u}:${v}`;
}

function parseCellKey(key) {
  const [f, u, v] = key.split(':').map(Number);
  return { face: f, u, v };
}

function vectorToLatLon(x, y, z) {
  const lat = Math.asin(Math.max(-1, Math.min(1, y))) * (180 / Math.PI);
  const lon = Math.atan2(x, z) * (180 / Math.PI);
  return { lat, lon };
}

function haversineKm(lat1, lon1, lat2, lon2, radiusKm = EARTH_RADIUS_KM) {
  const r = Math.PI / 180;
  const dLat = (lat2 - lat1) * r;
  const dLon = (lon2 - lon1) * r;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLon / 2) ** 2;
  return 2 * radiusKm * Math.asin(Math.sqrt(a));
}

/**
 * Edge-adjacent cells in the order [u+1, u-1, v-1, v+1]. Steps that leave the face extend
 * the face plane by one cell and project onto the adjacent face.
 */
function buildNeighborTable(n) {
  const table = new Map();
  const offsets = [[1, 0], [-1, 0], [0, -1], [0, 1]];

  for (let face = 0; face < 6; face++) {
    for (let u = 0; u < n; u++) {
      for (let v = 0; v < n; v++) {
        const neighbors = offsets.map(([du, dv]) => {
          const nu = u + du;
          const nv = v + dv;
          if (nu >= 0 && nu < n && nv >= 0 && nv < n) return cellKey(face, nu, nv);
          const p = faceUVToVector(face, nu, nv, n);
          const nc = vectorToCell(p.x, p.y, p.z, n);
          return cellKey(nc.face, nc.u, nc.v);
        });
        table.set(cellKey(face, u, v), neighbors);
      }
    }
  }
  return table;
}

function computeAreaWeights(n) {
  const weights = new Map();
  let sum = 0;
  for (let face = 0; face < 6; face++) {
    for (let u = 0; u < n; u++) {
      for (let v = 0; v < n; v++) {
        const vec = faceUVToVector(face, u, v, n);
        const w = 1 / (vec.x ** 2 + vec.y ** 2 + vec.z ** 2 + 1e-9);
        const key = cellKey(face, u, v);
        weights.set(key, w);
        sum += w;
      }
    }
  }
  const avg = sum / weights.size;
  for (const [k, w] of weights) {
    weights.set(k, w / avg);
  }
  return weights;
}

module.exports = {
  EARTH_RADIUS_KM,
  faceUVToVector,
  vectorToFaceUV,
  vectorToCell,
  vectorToLatLon,
  haversineKm,
  cellKey,
  parseCellKey,
  buildNeighborTable,
  computeAreaWeights
};
