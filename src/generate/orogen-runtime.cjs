var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// vendor/world-orogen/runner.js
var runner_exports = {};
__export(runner_exports, {
  generateFromPositions: () => generateFromPositions
});
module.exports = __toCommonJS(runner_exports);

// node_modules/robust-predicates/esm/util.js
var epsilon = 11102230246251565e-32;
var splitter = 134217729;
var resulterrbound = (3 + 8 * epsilon) * epsilon;
function sum(elen, e, flen, f, h) {
  let Q, Qnew, hh, bvirt;
  let enow = e[0];
  let fnow = f[0];
  let eindex = 0;
  let findex = 0;
  if (fnow > enow === fnow > -enow) {
    Q = enow;
    enow = e[++eindex];
  } else {
    Q = fnow;
    fnow = f[++findex];
  }
  let hindex = 0;
  if (eindex < elen && findex < flen) {
    if (fnow > enow === fnow > -enow) {
      Qnew = enow + Q;
      hh = Q - (Qnew - enow);
      enow = e[++eindex];
    } else {
      Qnew = fnow + Q;
      hh = Q - (Qnew - fnow);
      fnow = f[++findex];
    }
    Q = Qnew;
    if (hh !== 0) {
      h[hindex++] = hh;
    }
    while (eindex < elen && findex < flen) {
      if (fnow > enow === fnow > -enow) {
        Qnew = Q + enow;
        bvirt = Qnew - Q;
        hh = Q - (Qnew - bvirt) + (enow - bvirt);
        enow = e[++eindex];
      } else {
        Qnew = Q + fnow;
        bvirt = Qnew - Q;
        hh = Q - (Qnew - bvirt) + (fnow - bvirt);
        fnow = f[++findex];
      }
      Q = Qnew;
      if (hh !== 0) {
        h[hindex++] = hh;
      }
    }
  }
  while (eindex < elen) {
    Qnew = Q + enow;
    bvirt = Qnew - Q;
    hh = Q - (Qnew - bvirt) + (enow - bvirt);
    enow = e[++eindex];
    Q = Qnew;
    if (hh !== 0) {
      h[hindex++] = hh;
    }
  }
  while (findex < flen) {
    Qnew = Q + fnow;
    bvirt = Qnew - Q;
    hh = Q - (Qnew - bvirt) + (fnow - bvirt);
    fnow = f[++findex];
    Q = Qnew;
    if (hh !== 0) {
      h[hindex++] = hh;
    }
  }
  if (Q !== 0 || hindex === 0) {
    h[hindex++] = Q;
  }
  return hindex;
}
function estimate(elen, e) {
  let Q = e[0];
  for (let i = 1; i < elen; i++) Q += e[i];
  return Q;
}
function vec(n) {
  return new Float64Array(n);
}

// node_modules/robust-predicates/esm/orient2d.js
var ccwerrboundA = (3 + 16 * epsilon) * epsilon;
var ccwerrboundB = (2 + 12 * epsilon) * epsilon;
var ccwerrboundC = (9 + 64 * epsilon) * epsilon * epsilon;
var B = vec(4);
var C1 = vec(8);
var C2 = vec(12);
var D = vec(16);
var u = vec(4);
function orient2dadapt(ax, ay, bx, by, cx, cy, detsum) {
  let acxtail, acytail, bcxtail, bcytail;
  let bvirt, c, ahi, alo, bhi, blo, _i, _j, _0, s1, s0, t1, t0, u32;
  const acx = ax - cx;
  const bcx = bx - cx;
  const acy = ay - cy;
  const bcy = by - cy;
  s1 = acx * bcy;
  c = splitter * acx;
  ahi = c - (c - acx);
  alo = acx - ahi;
  c = splitter * bcy;
  bhi = c - (c - bcy);
  blo = bcy - bhi;
  s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
  t1 = acy * bcx;
  c = splitter * acy;
  ahi = c - (c - acy);
  alo = acy - ahi;
  c = splitter * bcx;
  bhi = c - (c - bcx);
  blo = bcx - bhi;
  t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
  _i = s0 - t0;
  bvirt = s0 - _i;
  B[0] = s0 - (_i + bvirt) + (bvirt - t0);
  _j = s1 + _i;
  bvirt = _j - s1;
  _0 = s1 - (_j - bvirt) + (_i - bvirt);
  _i = _0 - t1;
  bvirt = _0 - _i;
  B[1] = _0 - (_i + bvirt) + (bvirt - t1);
  u32 = _j + _i;
  bvirt = u32 - _j;
  B[2] = _j - (u32 - bvirt) + (_i - bvirt);
  B[3] = u32;
  let det = estimate(4, B);
  let errbound = ccwerrboundB * detsum;
  if (det >= errbound || -det >= errbound) {
    return det;
  }
  bvirt = ax - acx;
  acxtail = ax - (acx + bvirt) + (bvirt - cx);
  bvirt = bx - bcx;
  bcxtail = bx - (bcx + bvirt) + (bvirt - cx);
  bvirt = ay - acy;
  acytail = ay - (acy + bvirt) + (bvirt - cy);
  bvirt = by - bcy;
  bcytail = by - (bcy + bvirt) + (bvirt - cy);
  if (acxtail === 0 && acytail === 0 && bcxtail === 0 && bcytail === 0) {
    return det;
  }
  errbound = ccwerrboundC * detsum + resulterrbound * Math.abs(det);
  det += acx * bcytail + bcy * acxtail - (acy * bcxtail + bcx * acytail);
  if (det >= errbound || -det >= errbound) return det;
  s1 = acxtail * bcy;
  c = splitter * acxtail;
  ahi = c - (c - acxtail);
  alo = acxtail - ahi;
  c = splitter * bcy;
  bhi = c - (c - bcy);
  blo = bcy - bhi;
  s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
  t1 = acytail * bcx;
  c = splitter * acytail;
  ahi = c - (c - acytail);
  alo = acytail - ahi;
  c = splitter * bcx;
  bhi = c - (c - bcx);
  blo = bcx - bhi;
  t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
  _i = s0 - t0;
  bvirt = s0 - _i;
  u[0] = s0 - (_i + bvirt) + (bvirt - t0);
  _j = s1 + _i;
  bvirt = _j - s1;
  _0 = s1 - (_j - bvirt) + (_i - bvirt);
  _i = _0 - t1;
  bvirt = _0 - _i;
  u[1] = _0 - (_i + bvirt) + (bvirt - t1);
  u32 = _j + _i;
  bvirt = u32 - _j;
  u[2] = _j - (u32 - bvirt) + (_i - bvirt);
  u[3] = u32;
  const C1len = sum(4, B, 4, u, C1);
  s1 = acx * bcytail;
  c = splitter * acx;
  ahi = c - (c - acx);
  alo = acx - ahi;
  c = splitter * bcytail;
  bhi = c - (c - bcytail);
  blo = bcytail - bhi;
  s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
  t1 = acy * bcxtail;
  c = splitter * acy;
  ahi = c - (c - acy);
  alo = acy - ahi;
  c = splitter * bcxtail;
  bhi = c - (c - bcxtail);
  blo = bcxtail - bhi;
  t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
  _i = s0 - t0;
  bvirt = s0 - _i;
  u[0] = s0 - (_i + bvirt) + (bvirt - t0);
  _j = s1 + _i;
  bvirt = _j - s1;
  _0 = s1 - (_j - bvirt) + (_i - bvirt);
  _i = _0 - t1;
  bvirt = _0 - _i;
  u[1] = _0 - (_i + bvirt) + (bvirt - t1);
  u32 = _j + _i;
  bvirt = u32 - _j;
  u[2] = _j - (u32 - bvirt) + (_i - bvirt);
  u[3] = u32;
  const C2len = sum(C1len, C1, 4, u, C2);
  s1 = acxtail * bcytail;
  c = splitter * acxtail;
  ahi = c - (c - acxtail);
  alo = acxtail - ahi;
  c = splitter * bcytail;
  bhi = c - (c - bcytail);
  blo = bcytail - bhi;
  s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
  t1 = acytail * bcxtail;
  c = splitter * acytail;
  ahi = c - (c - acytail);
  alo = acytail - ahi;
  c = splitter * bcxtail;
  bhi = c - (c - bcxtail);
  blo = bcxtail - bhi;
  t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
  _i = s0 - t0;
  bvirt = s0 - _i;
  u[0] = s0 - (_i + bvirt) + (bvirt - t0);
  _j = s1 + _i;
  bvirt = _j - s1;
  _0 = s1 - (_j - bvirt) + (_i - bvirt);
  _i = _0 - t1;
  bvirt = _0 - _i;
  u[1] = _0 - (_i + bvirt) + (bvirt - t1);
  u32 = _j + _i;
  bvirt = u32 - _j;
  u[2] = _j - (u32 - bvirt) + (_i - bvirt);
  u[3] = u32;
  const Dlen = sum(C2len, C2, 4, u, D);
  return D[Dlen - 1];
}
function orient2d(ax, ay, bx, by, cx, cy) {
  const detleft = (ay - cy) * (bx - cx);
  const detright = (ax - cx) * (by - cy);
  const det = detleft - detright;
  const detsum = Math.abs(detleft + detright);
  if (Math.abs(det) >= ccwerrboundA * detsum) return det;
  return -orient2dadapt(ax, ay, bx, by, cx, cy, detsum);
}

// node_modules/robust-predicates/esm/orient3d.js
var o3derrboundA = (7 + 56 * epsilon) * epsilon;
var o3derrboundB = (3 + 28 * epsilon) * epsilon;
var o3derrboundC = (26 + 288 * epsilon) * epsilon * epsilon;
var bc = vec(4);
var ca = vec(4);
var ab = vec(4);
var at_b = vec(4);
var at_c = vec(4);
var bt_c = vec(4);
var bt_a = vec(4);
var ct_a = vec(4);
var ct_b = vec(4);
var bct = vec(8);
var cat = vec(8);
var abt = vec(8);
var u2 = vec(4);
var _8 = vec(8);
var _8b = vec(8);
var _16 = vec(16);
var _12 = vec(12);
var fin = vec(192);
var fin2 = vec(192);

// node_modules/robust-predicates/esm/incircle.js
var iccerrboundA = (10 + 96 * epsilon) * epsilon;
var iccerrboundB = (4 + 48 * epsilon) * epsilon;
var iccerrboundC = (44 + 576 * epsilon) * epsilon * epsilon;
var bc2 = vec(4);
var ca2 = vec(4);
var ab2 = vec(4);
var aa = vec(4);
var bb = vec(4);
var cc = vec(4);
var u3 = vec(4);
var v = vec(4);
var axtbc = vec(8);
var aytbc = vec(8);
var bxtca = vec(8);
var bytca = vec(8);
var cxtab = vec(8);
var cytab = vec(8);
var abt2 = vec(8);
var bct2 = vec(8);
var cat2 = vec(8);
var abtt = vec(4);
var bctt = vec(4);
var catt = vec(4);
var _82 = vec(8);
var _162 = vec(16);
var _16b = vec(16);
var _16c = vec(16);
var _32 = vec(32);
var _32b = vec(32);
var _48 = vec(48);
var _64 = vec(64);
var fin3 = vec(1152);
var fin22 = vec(1152);

// node_modules/robust-predicates/esm/insphere.js
var isperrboundA = (16 + 224 * epsilon) * epsilon;
var isperrboundB = (5 + 72 * epsilon) * epsilon;
var isperrboundC = (71 + 1408 * epsilon) * epsilon * epsilon;
var ab3 = vec(4);
var bc3 = vec(4);
var cd = vec(4);
var de = vec(4);
var ea = vec(4);
var ac = vec(4);
var bd = vec(4);
var ce = vec(4);
var da = vec(4);
var eb = vec(4);
var abc = vec(24);
var bcd = vec(24);
var cde = vec(24);
var dea = vec(24);
var eab = vec(24);
var abd = vec(24);
var bce = vec(24);
var cda = vec(24);
var deb = vec(24);
var eac = vec(24);
var adet = vec(1152);
var bdet = vec(1152);
var cdet = vec(1152);
var ddet = vec(1152);
var edet = vec(1152);
var abdet = vec(2304);
var cddet = vec(2304);
var cdedet = vec(3456);
var deter = vec(5760);
var _83 = vec(8);
var _8b2 = vec(8);
var _8c = vec(8);
var _163 = vec(16);
var _24 = vec(24);
var _482 = vec(48);
var _48b = vec(48);
var _96 = vec(96);
var _192 = vec(192);
var _384x = vec(384);
var _384y = vec(384);
var _384z = vec(384);
var _768 = vec(768);
var xdet = vec(96);
var ydet = vec(96);
var zdet = vec(96);
var fin4 = vec(1152);

// node_modules/delaunator/index.js
var EPSILON = Math.pow(2, -52);
var EDGE_STACK = new Uint32Array(512);
var Delaunator = class _Delaunator2 {
  /**
   * Constructs a delaunay triangulation object given an array of points (`[x, y]` by default).
   * `getX` and `getY` are optional functions of the form `(point) => value` for custom point formats.
   *
   * @template P
   * @param {P[]} points
   * @param {(p: P) => number} [getX]
   * @param {(p: P) => number} [getY]
   */
  // @ts-expect-error TS2322
  static from(points, getX = defaultGetX, getY = defaultGetY) {
    const n = points.length;
    const coords = new Float64Array(n * 2);
    for (let i = 0; i < n; i++) {
      const p = points[i];
      coords[2 * i] = getX(p);
      coords[2 * i + 1] = getY(p);
    }
    return new _Delaunator2(coords);
  }
  /**
   * Constructs a delaunay triangulation object given an array of point coordinates of the form:
   * `[x0, y0, x1, y1, ...]` (use a typed array for best performance). Duplicate points are skipped.
   *
   * @param {T} coords
   */
  constructor(coords) {
    const n = coords.length >> 1;
    if (n > 0 && typeof coords[0] !== "number") throw new Error("Expected coords to contain numbers.");
    this.coords = coords;
    const maxTriangles = Math.max(2 * n - 5, 0);
    this._triangles = new Uint32Array(maxTriangles * 3);
    this._halfedges = new Int32Array(maxTriangles * 3);
    this._hashSize = Math.ceil(Math.sqrt(n));
    this._hullPrev = new Uint32Array(n);
    this._hullNext = new Uint32Array(n);
    this._hullTri = new Uint32Array(n);
    this._hullHash = new Int32Array(this._hashSize);
    this._ids = new Uint32Array(n);
    this._dists = new Float64Array(n);
    this.trianglesLen = 0;
    this._cx = 0;
    this._cy = 0;
    this._hullStart = 0;
    this.hull = this._triangles;
    this.triangles = this._triangles;
    this.halfedges = this._halfedges;
    this.update();
  }
  /**
   * Updates the triangulation if you modified `delaunay.coords` values in place, avoiding expensive memory allocations.
   * Useful for iterative relaxation algorithms such as Lloyd's.
   */
  update() {
    const { coords, _hullPrev: hullPrev, _hullNext: hullNext, _hullTri: hullTri, _hullHash: hullHash } = this;
    const n = coords.length >> 1;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < n; i++) {
      const x = coords[2 * i];
      const y = coords[2 * i + 1];
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      this._ids[i] = i;
    }
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    let i0 = 0, i1 = 0, i2 = 0;
    for (let i = 0, minDist = Infinity; i < n; i++) {
      const d = dist(cx, cy, coords[2 * i], coords[2 * i + 1]);
      if (d < minDist) {
        i0 = i;
        minDist = d;
      }
    }
    const i0x = coords[2 * i0];
    const i0y = coords[2 * i0 + 1];
    for (let i = 0, minDist = Infinity; i < n; i++) {
      if (i === i0) continue;
      const d = dist(i0x, i0y, coords[2 * i], coords[2 * i + 1]);
      if (d < minDist && d > 0) {
        i1 = i;
        minDist = d;
      }
    }
    let i1x = coords[2 * i1];
    let i1y = coords[2 * i1 + 1];
    let minRadius = Infinity;
    for (let i = 0; i < n; i++) {
      if (i === i0 || i === i1) continue;
      const r = circumradius(i0x, i0y, i1x, i1y, coords[2 * i], coords[2 * i + 1]);
      if (r < minRadius) {
        i2 = i;
        minRadius = r;
      }
    }
    let i2x = coords[2 * i2];
    let i2y = coords[2 * i2 + 1];
    if (minRadius === Infinity) {
      for (let i = 0; i < n; i++) {
        this._dists[i] = coords[2 * i] - coords[0] || coords[2 * i + 1] - coords[1];
      }
      quicksort(this._ids, this._dists, 0, n - 1);
      const hull = new Uint32Array(n);
      let j = 0;
      for (let i = 0, d0 = -Infinity; i < n; i++) {
        const id = this._ids[i];
        const d = this._dists[id];
        if (d > d0) {
          hull[j++] = id;
          d0 = d;
        }
      }
      this.hull = hull.subarray(0, j);
      this.triangles = new Uint32Array(0);
      this.halfedges = new Int32Array(0);
      return;
    }
    if (orient2d(i0x, i0y, i1x, i1y, i2x, i2y) < 0) {
      const i = i1;
      const x = i1x;
      const y = i1y;
      i1 = i2;
      i1x = i2x;
      i1y = i2y;
      i2 = i;
      i2x = x;
      i2y = y;
    }
    const center = circumcenter(i0x, i0y, i1x, i1y, i2x, i2y);
    this._cx = center.x;
    this._cy = center.y;
    for (let i = 0; i < n; i++) {
      this._dists[i] = dist(coords[2 * i], coords[2 * i + 1], center.x, center.y);
    }
    quicksort(this._ids, this._dists, 0, n - 1);
    this._hullStart = i0;
    let hullSize = 3;
    hullNext[i0] = hullPrev[i2] = i1;
    hullNext[i1] = hullPrev[i0] = i2;
    hullNext[i2] = hullPrev[i1] = i0;
    hullTri[i0] = 0;
    hullTri[i1] = 1;
    hullTri[i2] = 2;
    hullHash.fill(-1);
    hullHash[this._hashKey(i0x, i0y)] = i0;
    hullHash[this._hashKey(i1x, i1y)] = i1;
    hullHash[this._hashKey(i2x, i2y)] = i2;
    this.trianglesLen = 0;
    this._addTriangle(i0, i1, i2, -1, -1, -1);
    for (let k = 0, xp = 0, yp = 0; k < this._ids.length; k++) {
      const i = this._ids[k];
      const x = coords[2 * i];
      const y = coords[2 * i + 1];
      if (k > 0 && Math.abs(x - xp) <= EPSILON && Math.abs(y - yp) <= EPSILON) continue;
      xp = x;
      yp = y;
      if (i === i0 || i === i1 || i === i2) continue;
      let start = 0;
      for (let j = 0, key = this._hashKey(x, y); j < this._hashSize; j++) {
        start = hullHash[(key + j) % this._hashSize];
        if (start !== -1 && start !== hullNext[start]) break;
      }
      start = hullPrev[start];
      let e = start, q;
      while (q = hullNext[e], orient2d(x, y, coords[2 * e], coords[2 * e + 1], coords[2 * q], coords[2 * q + 1]) >= 0) {
        e = q;
        if (e === start) {
          e = -1;
          break;
        }
      }
      if (e === -1) continue;
      let t = this._addTriangle(e, i, hullNext[e], -1, -1, hullTri[e]);
      hullTri[i] = this._legalize(t + 2);
      hullTri[e] = t;
      hullSize++;
      let n2 = hullNext[e];
      while (q = hullNext[n2], orient2d(x, y, coords[2 * n2], coords[2 * n2 + 1], coords[2 * q], coords[2 * q + 1]) < 0) {
        t = this._addTriangle(n2, i, q, hullTri[i], -1, hullTri[n2]);
        hullTri[i] = this._legalize(t + 2);
        hullNext[n2] = n2;
        hullSize--;
        n2 = q;
      }
      if (e === start) {
        while (q = hullPrev[e], orient2d(x, y, coords[2 * q], coords[2 * q + 1], coords[2 * e], coords[2 * e + 1]) < 0) {
          t = this._addTriangle(q, i, e, -1, hullTri[e], hullTri[q]);
          this._legalize(t + 2);
          hullTri[q] = t;
          hullNext[e] = e;
          hullSize--;
          e = q;
        }
      }
      this._hullStart = hullPrev[i] = e;
      hullNext[e] = hullPrev[n2] = i;
      hullNext[i] = n2;
      hullHash[this._hashKey(x, y)] = i;
      hullHash[this._hashKey(coords[2 * e], coords[2 * e + 1])] = e;
    }
    this.hull = new Uint32Array(hullSize);
    for (let i = 0, e = this._hullStart; i < hullSize; i++) {
      this.hull[i] = e;
      e = hullNext[e];
    }
    this.triangles = this._triangles.subarray(0, this.trianglesLen);
    this.halfedges = this._halfedges.subarray(0, this.trianglesLen);
  }
  /**
   * Calculate an angle-based key for the edge hash used for advancing convex hull.
   *
   * @param {number} x
   * @param {number} y
   * @private
   */
  _hashKey(x, y) {
    return Math.floor(pseudoAngle(x - this._cx, y - this._cy) * this._hashSize) % this._hashSize;
  }
  /**
   * Flip an edge in a pair of triangles if it doesn't satisfy the Delaunay condition.
   *
   * @param {number} a
   * @private
   */
  _legalize(a) {
    const { _triangles: triangles, _halfedges: halfedges, coords } = this;
    let i = 0;
    let ar = 0;
    while (true) {
      const b = halfedges[a];
      const a0 = a - a % 3;
      ar = a0 + (a + 2) % 3;
      if (b === -1) {
        if (i === 0) break;
        a = EDGE_STACK[--i];
        continue;
      }
      const b0 = b - b % 3;
      const al = a0 + (a + 1) % 3;
      const bl = b0 + (b + 2) % 3;
      const p0 = triangles[ar];
      const pr = triangles[a];
      const pl = triangles[al];
      const p1 = triangles[bl];
      const illegal = inCircle(
        coords[2 * p0],
        coords[2 * p0 + 1],
        coords[2 * pr],
        coords[2 * pr + 1],
        coords[2 * pl],
        coords[2 * pl + 1],
        coords[2 * p1],
        coords[2 * p1 + 1]
      );
      if (illegal) {
        triangles[a] = p1;
        triangles[b] = p0;
        const hbl = halfedges[bl];
        if (hbl === -1) {
          let e = this._hullStart;
          do {
            if (this._hullTri[e] === bl) {
              this._hullTri[e] = a;
              break;
            }
            e = this._hullPrev[e];
          } while (e !== this._hullStart);
        }
        this._link(a, hbl);
        this._link(b, halfedges[ar]);
        this._link(ar, bl);
        const br = b0 + (b + 1) % 3;
        if (i < EDGE_STACK.length) {
          EDGE_STACK[i++] = br;
        }
      } else {
        if (i === 0) break;
        a = EDGE_STACK[--i];
      }
    }
    return ar;
  }
  /**
   * Link two half-edges to each other.
   * @param {number} a
   * @param {number} b
   * @private
   */
  _link(a, b) {
    this._halfedges[a] = b;
    if (b !== -1) this._halfedges[b] = a;
  }
  /**
   * Add a new triangle given vertex indices and adjacent half-edge ids.
   *
   * @param {number} i0
   * @param {number} i1
   * @param {number} i2
   * @param {number} a
   * @param {number} b
   * @param {number} c
   * @private
   */
  _addTriangle(i0, i1, i2, a, b, c) {
    const t = this.trianglesLen;
    this._triangles[t] = i0;
    this._triangles[t + 1] = i1;
    this._triangles[t + 2] = i2;
    this._link(t, a);
    this._link(t + 1, b);
    this._link(t + 2, c);
    this.trianglesLen += 3;
    return t;
  }
};
function pseudoAngle(dx, dy) {
  const p = dx / (Math.abs(dx) + Math.abs(dy));
  return (dy > 0 ? 3 - p : 1 + p) / 4;
}
function dist(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}
function inCircle(ax, ay, bx, by, cx, cy, px, py) {
  const dx = ax - px;
  const dy = ay - py;
  const ex = bx - px;
  const ey = by - py;
  const fx = cx - px;
  const fy = cy - py;
  const ap = dx * dx + dy * dy;
  const bp = ex * ex + ey * ey;
  const cp = fx * fx + fy * fy;
  return dx * (ey * cp - bp * fy) - dy * (ex * cp - bp * fx) + ap * (ex * fy - ey * fx) < 0;
}
function circumradius(ax, ay, bx, by, cx, cy) {
  const dx = bx - ax;
  const dy = by - ay;
  const ex = cx - ax;
  const ey = cy - ay;
  const bl = dx * dx + dy * dy;
  const cl = ex * ex + ey * ey;
  const d = 0.5 / (dx * ey - dy * ex);
  const x = (ey * bl - dy * cl) * d;
  const y = (dx * cl - ex * bl) * d;
  return x * x + y * y;
}
function circumcenter(ax, ay, bx, by, cx, cy) {
  const dx = bx - ax;
  const dy = by - ay;
  const ex = cx - ax;
  const ey = cy - ay;
  const bl = dx * dx + dy * dy;
  const cl = ex * ex + ey * ey;
  const d = 0.5 / (dx * ey - dy * ex);
  const x = ax + (ey * bl - dy * cl) * d;
  const y = ay + (dx * cl - ex * bl) * d;
  return { x, y };
}
function quicksort(ids, dists, left, right) {
  if (right - left <= 20) {
    for (let i = left + 1; i <= right; i++) {
      const temp = ids[i];
      const tempDist = dists[temp];
      let j = i - 1;
      while (j >= left && dists[ids[j]] > tempDist) ids[j + 1] = ids[j--];
      ids[j + 1] = temp;
    }
  } else {
    const median = left + right >> 1;
    let i = left + 1;
    let j = right;
    swap(ids, median, i);
    if (dists[ids[left]] > dists[ids[right]]) swap(ids, left, right);
    if (dists[ids[i]] > dists[ids[right]]) swap(ids, i, right);
    if (dists[ids[left]] > dists[ids[i]]) swap(ids, left, i);
    const temp = ids[i];
    const tempDist = dists[temp];
    while (true) {
      do
        i++;
      while (dists[ids[i]] < tempDist);
      do
        j--;
      while (dists[ids[j]] > tempDist);
      if (j < i) break;
      swap(ids, i, j);
    }
    ids[left + 1] = ids[j];
    ids[j] = temp;
    if (right - i + 1 >= j - left) {
      quicksort(ids, dists, i, right);
      quicksort(ids, dists, left, j - 1);
    } else {
      quicksort(ids, dists, left, j - 1);
      quicksort(ids, dists, i, right);
    }
  }
}
function swap(arr, i, j) {
  const tmp = arr[i];
  arr[i] = arr[j];
  arr[j] = tmp;
}
function defaultGetX(p) {
  return p[0];
}
function defaultGetY(p) {
  return p[1];
}

// vendor/world-orogen/js/rng.js
function makeRng(seed) {
  let s = Math.abs(Math.floor(seed * 9301 + 49297)) % 2147483646 + 1;
  return () => {
    s = s * 16807 % 2147483647;
    return (s - 1) / 2147483646;
  };
}
function makeRandInt(seed) {
  const r = makeRng(seed);
  return (n) => Math.floor(r() * n);
}

// vendor/world-orogen/js/simplex-noise.js
var SimplexNoise = class {
  constructor(seed = 0) {
    this.G = [[1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0], [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1], [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]];
    const rng = makeRng(seed);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    this.perm = new Uint8Array(512);
    this.pm12 = new Uint8Array(512);
    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
      this.pm12[i] = this.perm[i] % 12;
    }
  }
  noise3D(x, y, z) {
    const F = 1 / 3, H = 1 / 6, s = (x + y + z) * F;
    const i = Math.floor(x + s), j = Math.floor(y + s), k = Math.floor(z + s);
    const t = (i + j + k) * H, x0 = x - i + t, y0 = y - j + t, z0 = z - k + t;
    let i1, j1, k1, i2, j2, k2;
    if (x0 >= y0) {
      if (y0 >= z0) {
        i1 = 1;
        j1 = 0;
        k1 = 0;
        i2 = 1;
        j2 = 1;
        k2 = 0;
      } else if (x0 >= z0) {
        i1 = 1;
        j1 = 0;
        k1 = 0;
        i2 = 1;
        j2 = 0;
        k2 = 1;
      } else {
        i1 = 0;
        j1 = 0;
        k1 = 1;
        i2 = 1;
        j2 = 0;
        k2 = 1;
      }
    } else {
      if (y0 < z0) {
        i1 = 0;
        j1 = 0;
        k1 = 1;
        i2 = 0;
        j2 = 1;
        k2 = 1;
      } else if (x0 < z0) {
        i1 = 0;
        j1 = 1;
        k1 = 0;
        i2 = 0;
        j2 = 1;
        k2 = 1;
      } else {
        i1 = 0;
        j1 = 1;
        k1 = 0;
        i2 = 1;
        j2 = 1;
        k2 = 0;
      }
    }
    const x1 = x0 - i1 + H, y1 = y0 - j1 + H, z1 = z0 - k1 + H, x2 = x0 - i2 + 2 * H, y2 = y0 - j2 + 2 * H, z2 = z0 - k2 + 2 * H, x3 = x0 - 1 + 3 * H, y3 = y0 - 1 + 3 * H, z3 = z0 - 1 + 3 * H;
    const ii = i & 255, jj = j & 255, kk = k & 255, { perm: P, pm12: M, G: g } = this;
    let n0 = 0, n1 = 0, n2 = 0, n3 = 0;
    let a = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
    if (a > 0) {
      a *= a;
      const v2 = g[M[ii + P[jj + P[kk]]]];
      n0 = a * a * (v2[0] * x0 + v2[1] * y0 + v2[2] * z0);
    }
    let b = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
    if (b > 0) {
      b *= b;
      const v2 = g[M[ii + i1 + P[jj + j1 + P[kk + k1]]]];
      n1 = b * b * (v2[0] * x1 + v2[1] * y1 + v2[2] * z1);
    }
    let c = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
    if (c > 0) {
      c *= c;
      const v2 = g[M[ii + i2 + P[jj + j2 + P[kk + k2]]]];
      n2 = c * c * (v2[0] * x2 + v2[1] * y2 + v2[2] * z2);
    }
    let d = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
    if (d > 0) {
      d *= d;
      const v2 = g[M[ii + 1 + P[jj + 1 + P[kk + 1]]]];
      n3 = d * d * (v2[0] * x3 + v2[1] * y3 + v2[2] * z3);
    }
    return 32 * (n0 + n1 + n2 + n3);
  }
  fbm(x, y, z, octaves = 5, persistence = 2 / 3) {
    let sum2 = 0, max = 0, amp = 1;
    for (let o = 0; o < octaves; o++) {
      const f = 1 << o;
      sum2 += amp * this.noise3D(x * f, y * f, z * f);
      max += amp;
      amp *= persistence;
    }
    return sum2 / max;
  }
  ridgedFbm(x, y, z, octaves = 6, lacunarity = 2, gain = 0.5, offset = 1) {
    let sum2 = 0, freq = 1, amp = 1, prev = 1, maxVal = 0;
    for (let o = 0; o < octaves; o++) {
      let n = this.noise3D(x * freq, y * freq, z * freq);
      n = offset - Math.abs(n);
      n = n * n;
      sum2 += n * amp * prev;
      maxVal += amp;
      prev = Math.min(n, 1);
      freq *= lacunarity;
      amp *= gain;
    }
    return sum2 / maxVal;
  }
};

// vendor/world-orogen/js/sphere-mesh.js
var _Delaunator = null;
function setDelaunator(D2) {
  _Delaunator = D2;
}
function generateFibonacciSphere(N, jitter, rng) {
  const r_xyz = new Float32Array(3 * N);
  const s = 3.6 / Math.sqrt(N);
  const dlong = Math.PI * (3 - Math.sqrt(5));
  const dz = 2 / N;
  for (let k = 0, lng = 0, z = 1 - dz / 2; k < N; k++, z -= dz) {
    const r = Math.sqrt(1 - z * z);
    let latDeg = Math.asin(z) * 180 / Math.PI;
    let lonDeg = lng * 180 / Math.PI;
    if (jitter > 0) {
      const jLat = rng() - rng();
      const jLon = rng() - rng();
      const nextZ = Math.max(-1, z - dz * 2 * Math.PI * r / s);
      latDeg += jitter * jLat * (latDeg - Math.asin(nextZ) * 180 / Math.PI);
      lonDeg += jitter * jLon * (s / r * 180 / Math.PI);
    }
    const latR = latDeg * Math.PI / 180;
    const lonR = lonDeg * Math.PI / 180;
    r_xyz[3 * k] = Math.cos(latR) * Math.cos(lonR);
    r_xyz[3 * k + 1] = Math.cos(latR) * Math.sin(lonR);
    r_xyz[3 * k + 2] = Math.sin(latR);
    lng += dlong;
  }
  return r_xyz;
}
function stereographicProjection(r_xyz, N) {
  const flat = new Float64Array(2 * N);
  for (let i = 0; i < N; i++) {
    const z = r_xyz[3 * i + 2];
    const denom = Math.max(1e-12, 1 - z);
    flat[2 * i] = r_xyz[3 * i] / denom;
    flat[2 * i + 1] = r_xyz[3 * i + 1] / denom;
  }
  return flat;
}
function addPoleToMesh(poleId, triangles, halfedges) {
  const numSides = triangles.length;
  const next = (s) => s % 3 === 2 ? s - 2 : s + 1;
  let numUnpaired = 0, firstUnpaired = -1;
  const pointToSide = [];
  for (let s = 0; s < numSides; s++) {
    if (halfedges[s] === -1) {
      numUnpaired++;
      pointToSide[triangles[s]] = s;
      firstUnpaired = s;
    }
  }
  const nt = new Int32Array(numSides + 3 * numUnpaired);
  const nh = new Int32Array(numSides + 3 * numUnpaired);
  nt.set(triangles);
  nh.set(halfedges);
  for (let i = 0, s = firstUnpaired; i < numUnpaired; i++, s = pointToSide[nt[next(s)]]) {
    const ns = numSides + 3 * i;
    nh[s] = ns;
    nh[ns] = s;
    nt[ns] = nt[next(s)];
    nt[ns + 1] = nt[s];
    nt[ns + 2] = poleId;
    const k = numSides + (3 * i + 4) % (3 * numUnpaired);
    nh[ns + 2] = k;
    nh[k] = ns + 2;
  }
  return { triangles: nt, halfedges: nh };
}
var SphereMesh = class {
  constructor(triangles, halfedges, numRegions) {
    this.triangles = triangles;
    this.halfedges = halfedges;
    this.numRegions = numRegions;
    this.numSides = triangles.length;
    this.numTriangles = triangles.length / 3 | 0;
    this._r_s = new Int32Array(numRegions).fill(-1);
    for (let s = 0; s < this.numSides; s++) {
      const r = triangles[s];
      if (this._r_s[r] === -1) this._r_s[r] = s;
    }
    const adjCount = new Int32Array(numRegions);
    for (let r = 0; r < numRegions; r++) {
      const s0 = this._r_s[r];
      if (s0 === -1) continue;
      let s = s0;
      do {
        adjCount[r]++;
        s = this._next(this.halfedges[s]);
      } while (s !== s0);
    }
    this._adjOffset = new Int32Array(numRegions + 1);
    for (let r = 0; r < numRegions; r++) {
      this._adjOffset[r + 1] = this._adjOffset[r] + adjCount[r];
    }
    const totalAdj = this._adjOffset[numRegions];
    this._adjList = new Int32Array(totalAdj);
    this._adjTriList = new Int32Array(totalAdj);
    for (let r = 0; r < numRegions; r++) {
      const s0 = this._r_s[r];
      if (s0 === -1) continue;
      let s = s0;
      let idx = this._adjOffset[r];
      do {
        this._adjList[idx] = this.s_end_r(s);
        this._adjTriList[idx] = this.s_inner_t(s);
        idx++;
        s = this._next(this.halfedges[s]);
      } while (s !== s0);
    }
    this.adjOffset = this._adjOffset;
    this.adjList = this._adjList;
  }
  _next(s) {
    return s % 3 === 2 ? s - 2 : s + 1;
  }
  s_begin_r(s) {
    return this.triangles[s];
  }
  s_end_r(s) {
    return this.triangles[this._next(s)];
  }
  s_inner_t(s) {
    return s / 3 | 0;
  }
  s_outer_t(s) {
    return this.halfedges[s] / 3 | 0;
  }
  r_circulate_r(out, r) {
    const start = this._adjOffset[r];
    const end = this._adjOffset[r + 1];
    const len2 = end - start;
    out.length = len2;
    for (let i = 0; i < len2; i++) out[i] = this._adjList[start + i];
    return out;
  }
  r_circulate_t(out, r) {
    const start = this._adjOffset[r];
    const end = this._adjOffset[r + 1];
    const len2 = end - start;
    out.length = len2;
    for (let i = 0; i < len2; i++) out[i] = this._adjTriList[start + i];
    return out;
  }
};
function buildSphere(N, jitter, rng) {
  const r_xyz = generateFibonacciSphere(N, jitter, rng);
  const flat = stereographicProjection(r_xyz, N);
  const delaunay = new _Delaunator(flat);
  const poleXYZ = new Float32Array(3 * (N + 1));
  poleXYZ.set(r_xyz);
  poleXYZ[3 * N] = 0;
  poleXYZ[3 * N + 1] = 0;
  poleXYZ[3 * N + 2] = 1;
  const closed = addPoleToMesh(N, delaunay.triangles, delaunay.halfedges);
  const mesh = new SphereMesh(closed.triangles, closed.halfedges, N + 1);
  return { mesh, r_xyz: poleXYZ };
}
function computeNeighborDist(mesh, r_xyz) {
  const { adjOffset, adjList } = mesh;
  const neighborDist = new Float32Array(adjList.length);
  for (let r = 0; r < mesh.numRegions; r++) {
    const x = r_xyz[3 * r], y = r_xyz[3 * r + 1], z = r_xyz[3 * r + 2];
    for (let i = adjOffset[r]; i < adjOffset[r + 1]; i++) {
      const nb = adjList[i];
      const dx = x - r_xyz[3 * nb], dy = y - r_xyz[3 * nb + 1], dz = z - r_xyz[3 * nb + 2];
      neighborDist[i] = Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
  }
  return neighborDist;
}

// vendor/world-orogen/js/terrain-config.js
var COLLISION_THRESHOLD = 0.75;
var COLLISION_DT_BASE = 0.01;
var COLLISION_DT_REF_REGIONS = 1e4;
var PAIR_INTENSITY_BASE = 0.5;
var SUBDUCT_UNDULATION_DENSITY_DECAY = 12;
var SUBDUCT_UNDULATION_FREQ = 6;
var SUBDUCT_UNDULATION_AMP = 0.4;
var SUBDUCT_FACTOR_BASE = 0.5;
var SUBDUCT_FACTOR_TANH_SCALE = 8;
var SUBDUCT_THRESHOLD = 0.55;
var BOUNDARY_TYPE_THRESH_FACTOR = 0.3;
var STRESS_PROPAGATE_MIN = 0.01;
var STRESS_PROPAGATE_CUTOFF = 5e-3;
var STRESS_DIR_FACTOR_MIN = 0.1;
var STRESS_DIR_FACTOR_BASE = 0.3;
var STRESS_DIR_FACTOR_SCALE = 0.7;
var STRESS_DIR_BLEND_PARENT = 0.8;
var STRESS_DIR_BLEND_TRAVEL = 0.2;
var STRESS_DIR_SMOOTH_PASSES = 2;
var STRESS_DIR_SELF_WEIGHT = 2;
var STRESS_DECAY_BASE = 0.5;
var STRESS_DECAY_SPREAD_FACTOR = 0.04;
var STRESS_SUBDUCT_DECAY_MULT = 0.45;
var STRESS_PASSES_PER_SPREAD = 3;
var STRESS_PERCENTILE = 0.97;
var PLATE_BLEND_T = 0.7;
var _plateBlendW = (s) => -0.5 * s * s + 1.25 * s + 0.25;
var SUPER_W = _plateBlendW(PLATE_BLEND_T);
var SMALL_W = _plateBlendW(1 - PLATE_BLEND_T);
var INTERIOR_BAND_BASE = 16;
var TECTONIC_REACH_BASE = 20;
var COASTAL_PLAIN_WIDTH_BASE = 18;
var COAST_BFS_WIDTH_BASE = 8;
var RIDGE_STRENGTH = 0.12;
var RIDGE_SIGMA_BASE = 5;
var RIDGE_PEAK_SHIFT_BASE = 2;
var RIDGE_EXTENT_BASE = 10;
var RIDGE_ASYM_SUBDUCT_NARROW = 0.6;
var RIDGE_ASYM_OVERRIDE_WIDEN = 0.5;
var RIDGE_STRESS_WIDTH_BASE = 0.75;
var RIDGE_STRESS_WIDTH_SCALE = 0.5;
var RIDGE_WIDTH_NOISE_AMP = 0.2;
var RIDGE_HEIGHT_VAR_BASE = 0.6;
var RIDGE_HEIGHT_VAR_SCALE = 0.6;
var RIDGE_HEIGHT_VAR_FREQ = 2.5;
var BASE_SCALE = 0.6;
var ASYMMETRY_FACTOR = 0.8;
var SUBDUCTING_SUPPRESSION = 0.42;
var STRESS_MAG_SCALE = 0.32;
var STRESS_DEPRESS_FRAC = 0.4;
var STRESS_HEIGHT_VAR_BASE = 0.6;
var STRESS_HEIGHT_VAR_SCALE = 0.8;
var SUBDUCTING_REACH_MIN = 0.35;
var SUBDUCTING_REACH_RANGE = 0.3;
var PHASOR_NUM_KERNELS = 4e3;
var PHASOR_WAVELENGTH_KM = 55;
var PHASOR_BANDWIDTH_KM = 180;
var PHASOR_ORIENTATION_JITTER = 0.22;
var PHASOR_AMPLITUDE = 0.5;
var PHASOR_BIAS = 0.3;
var PHASOR_STRESS_THRESHOLD = 0.02;
var PHASOR_ELEV_THRESHOLD = 5e-3;
var PHASOR_ELEV_RAMP_RANGE = 0.08;
var PHASOR_FOLDBELT_FLOOR = 0.05;
var PHASOR_SF_KERNEL_MAX = 0.75;
var PHASOR_SF_GATE_FULL = 0.55;
var PHASOR_SF_GATE_ZERO = 0.92;
var PHASOR_DIRECTION_PERP = false;
var PHASOR_DIRECTION_SMOOTHING_KM = 220;
var PHASOR_WARP_FREQ = 110;
var PHASOR_WARP_AMPLITUDE = 6e-3;
var PHASOR_WARP_OCTAVES = 5;
var FOLD_FREQ_MULT_SCALE = 2;
var RIFT_HALF_WIDTH_BASE = 3.2;
var RIFT_FLOOR_MULT = 0.35;
var RIFT_SHOULDER_INNER_MULT = 0.5;
var RIFT_SHOULDER_OUTER_MULT = 2.75;
var RIFT_FLOOR_VAR_MIN = 0.5;
var RIFT_SHOULDER_VAR_MIN = 0.65;
var RIFT_WIDTH_VAR_FREQ = 0.5;
var RIFT_WIDTH_ASYM_MIN = 0.65;
var RIFT_WIDTH_ASYM_FREQ = 0.7;
var RIFT_AXIS_DEPTH = -0.12;
var RIFT_AXIS_VOLCANIC_AMP = 0.06;
var RIFT_FLOOR_DEPTH = -0.08;
var RIFT_FLOOR_TAPER = 0.3;
var RIFT_FLOOR_VOLCANIC_AMP = 0.03;
var RIFT_SHOULDER_UPLIFT = 0.5;
var RIFT_SHOULDER_HEIGHT_VAR_BASE = 0.55;
var RIFT_SHOULDER_HEIGHT_VAR_SCALE = 0.55;
var RIFT_SHOULDER_HEIGHT_VAR_FREQ = 2.5;
var RIFT_FADEOUT_RESIDUAL = 1;
var BASIN_FREQ = 1.8;
var BASIN_FACTOR_BIAS = 0.5;
var BASIN_FACTOR_SCALE = 0.6;
var FORELAND_STRESS_THRESH = 0.15;
var FORELAND_WIDTH_FRAC = 0.3;
var FORELAND_BASIN_DEPTH = 0.05;
var FORELAND_PEAK_POS = 0.2;
var FORELAND_BASIN_DEEPENING_BASE = 0.5;
var FORELAND_BASIN_DEEPENING_SCALE = 0.5;
var BACK_ARC_START_BASE = 2;
var BACK_ARC_PEAK_BASE = 3;
var BACK_ARC_END_BASE = 5;
var BACK_ARC_DEPTH = 0.14;
var BACK_ARC_SUBDUCT_THRESH = 0.5;
var WARP_SCALE = 0.4;
var OROGENIC_FREQ = 1.5;
var NOISE_ACTIVITY_SCALE = 4;
var NOISE_BASE_SCALE = 0.15;
var NOISE_ACTIVITY_CONTRIB = 0.45;
var PLATEAU_SUPPRESS_MIN = 0.3;
var PLATEAU_SUPPRESS_SCALE = 0.3;
var BASIN_AMP_SUPPRESS = 0.25;
var CRATON_AMP_SUPPRESS = 0.12;
var RIDGED_NOISE_AMP = 1;
var CONTINENTAL_FREQ_MULT = 4;
var DETAIL_NOISE_FREQ_MULT = 16;
var DETAIL_NOISE_AMP = 0.27;
var FINE_NOISE_FREQ_MULT = 20;
var FINE_NOISE_AMP = 0.14;
var OCEAN_NOISE_AMP = 0.2;
var UNIFORM_LAND_NOISE_FREQ = 72;
var UNIFORM_LAND_NOISE_OCTAVES = 8;
var UNIFORM_LAND_NOISE_AMP = 0.65;
var DISSECT_THRESHOLD = 0.1;
var DISSECT_AMP = 0.3;
var DISSECT_ELEV_SCALE = 2;
var SUMMIT_THRESHOLD = 0.55;
var SUMMIT_STRESS_MIN = 0.03;
var SUMMIT_SPIKE_OFFSET = 0.45;
var SUMMIT_STRESS_FLOOR = 0.2;
var PLATE_BASE_HEIGHT_MEAN = -0.15;
var PLATE_BASE_HEIGHT_STDDEV = 0.025;
var INTERIOR_BASE_SHIELD = 0.14;
var INTERIOR_BASE_BASIN = 0.04;
var INTERIOR_TECTONIC = 0.16;
var COASTAL_DEPRESSION = -0.08;
var COASTAL_DEPRESSION_BASIN_REDUCE = 0.4;
var INTERIOR_UPLIFT_RAMP_FRAC = 0.4;
var INTERIOR_UPLIFT_MOD_AMP = 0.2;
var INTERIOR_FLOOR = 8e-3;
var PLATEAU_BOOST = 0.04;
var PLATEAU_START_BASE = 3;
var MOUNTAIN_BOOST_FRAC = 0.3;
var FOLD_BELT_MULT = 3;
var CRATON_TECTONIC_MULT = 2.5;
var BASIN_TECTONIC_MULT = 2;
var SHELF_NARROW_BASE = 4;
var SHELF_WIDE_BASE = 12;
var SLOPE_WIDTH_BASE = 7;
var SHELF_DEPTH_START = -0.08;
var SHELF_DEPTH_RANGE = 0.08;
var SLOPE_DEPTH_RANGE = 0.19;
var ABYSS_BASE = -0.35;
var ABYSS_NOISE_AMP = 0.03;
var OCEAN_FLOOR_CLAMP = -5e-3;
var RIDGE_HALF_WIDTH_BASE = 4;
var RIDGE_UPLIFT_NOISE = 0.12;
var RIDGE_UPLIFT_BASE = 0.06;
var FRACTURE_HALF_WIDTH_BASE = 3;
var FRACTURE_DEPTH = 0.03;
var TRENCH_BASE_DEPTH = 0.2;
var TRENCH_STRESS_DEPTH = 0.2;
var COAST_ROUGHEN_BASE = 8;
var COAST_PASSIVE_FREQ = 24;
var COAST_ACTIVE_FREQ = 36;
var COAST_PASSIVE_AMP = 0.08;
var COAST_ACTIVE_AMP = 0.12;
var COAST_WARP_PASSIVE_REACH = 1.2;
var COAST_WARP_ACTIVE_REACH = 1.5;
var COAST_WARP_AMT = 0.35;
var COAST_SUBDUCT_SUP_LOW = 0.45;
var COAST_SUBDUCT_SUP_RANGE = 0.55;
var ISLAND_DIST_BASE = 4;
var ISLAND_FREQ = 17.5;
var ISLAND_THRESHOLD_BASE = 0.35;
var ISLAND_THRESHOLD_STRESS = 0.2;
var ISLAND_BUMP_AMP = 0.22;
var ISLAND_PEAK_FLOOR = 0.04;
var ISLAND_SUBDUCT_MAX = 0.3;
var MAX_OCEAN_ARC_ELEV = 0.6;
var ARC_DIST_BASE = 7;
var ARC_PEAK_DIST_BASE = 2;
var ARC_SIGMA_BASE_VAL = 2;
var ARC_MACRO_FREQ = 4;
var ARC_MACRO_THRESH = 0.55;
var ARC_MACRO_STRESS_WEIGHT = 0.25;
var ARC_MAX_ORIGINS = 5;
var ARC_ORIGIN_MIN_SPACING = 0.5;
var ARC_BASE_FREQ = 5;
var ARC_PEAK_FREQ = 36;
var ARC_THRESHOLD = 0.8;
var ARC_BASE_AMP = 2.3;
var ARC_PEAK_AMP = 1.65;
var ARC_SUBDUCT_THRESH = 0.45;
var VOLC_MIN_SPACING = 0.015;
var VOLC_SIGMA_BASE = 3e-3;
var VOLC_HEIGHT_BASE = 0.15;
var VOLC_HEIGHT_VAR_BASE = 0.7;
var VOLC_HEIGHT_VAR_RANGE = 0.6;
var VOLC_SIGMA_VAR_BASE = 0.6;
var VOLC_SIGMA_VAR_RANGE = 0.8;
var VOLC_SUBDUCT_THRESH = 0.45;
var CONT_HOTSPOT_SIGMA_MULT = 2.5;
var CONT_HOTSPOT_STRENGTH_MULT = 0.4;
var CONT_HOTSPOT_CALDERA_SIGMA_FRAC = 0.35;
var CONT_HOTSPOT_CALDERA_DEPTH_FRAC = 0.3;
var CONT_HOTSPOT_SWELL_MULT = 1.5;
var LIP_SIGMA = 0.08;
var LIP_HEIGHT = 0.03;
var LIP_LOBE_COUNT = 6;
var LIP_LOBE_OFFSET = 0.6;
var LIP_LOBE_SIGMA = 0.6;
var LIP_LOBE_STRENGTH = 0.9;
var NUM_HOTSPOTS = 5;
var CHAIN_LENGTH = 6;
var CHAIN_DECAY = 0.65;
var CHAIN_SPACING = 0.06;
var DOME_SIGMA = 6e-3;
var DOME_STRENGTH = 0.6;
var SWELL_SIGMA_MULT = 2;
var SWELL_STR_MULT = 0.1;
var DOME_OCEAN_BOOST = 1.8;
var DOME_PEAK_THRESH_SIGMA = 5.5;
var DOME_SWELL_THRESH_SIGMA = 3;
var DOME_DRIFT_STRETCH = 1.05;
var DOME_SATELLITE_COUNT = 2;
var DOME_SATELLITE_OFFSET = 0.8;
var DOME_SATELLITE_SIGMA = 0.5;
var DOME_SATELLITE_STRENGTH = 0.35;
var DOME_RIFT_BOOST = 0.5;
var DOME_CALDERA_SIGMA_FRAC = 0.25;
var DOME_CALDERA_DEPTH_FRAC = 0.2;
var DOME_CALDERA_STRENGTH_MIN = 0.15;
var DOME_AGE_BROADENING = 0.03;
var DOME_SHAPE_WARP_FREQ = 8;
var DOME_SHAPE_WARP_AMP = 0.4;
var DOME_SHAPE_WARP_DETAIL_FREQ = 20;
var DOME_SHAPE_WARP_DETAIL_AMP = 0.4;
var DOME_TEXTURE_BASE_WEIGHT = 0.7;
var DOME_TEXTURE_DETAIL_WEIGHT = 0.3;
var DOME_TEXTURE_ACTIVE_MIN = 0.4;
var DOME_TEXTURE_ACTIVE_MAX = 1.2;
var DOME_TEXTURE_AGE_MIN_SHIFT = 0.3;
var DOME_TEXTURE_AGE_MAX_SHIFT = 0.2;
var PEAK_COMPRESS_POWER = 0.9;
var ISOSTATIC_K = 0.07;
var HYPS_BLEND = 0.4;
var HYPS_LOW_BREAK = 0.6;
var HYPS_MID_BREAK = 0.85;
var HYPS_LOW_ELEV_FRAC = 0.25;
var HYPS_MID_ELEV_FRAC = 0.35;
var HYPS_HIGH_POWER = 0.7;
var FILL_LEVEL = 5e-3;
var PLAIN_TARGET = 0.02;
var PLAIN_SUPPRESSION_STRENGTH = 0.6;
var WARP_FREQ = 4;
var WARP_OCTAVES = 5;
var WARP_MAX_AMP_MULT = 0.13;
var WARP_BIAS_BASE = 0.25;
var WARP_BIAS_STRENGTH_SCALE = 0.5;
var WARP_HOTSPOT_DAMPEN = 0.8;
var SMOOTH_EDGE_SENSITIVITY = 12;
var GLACIAL_LAT_DIVISOR = 4.5;
var GLACIAL_ELEV_LOW = 0.5;
var GLACIAL_ELEV_HIGH = 0.9;
var GLACIAL_ELEV_FACTOR_SCALE = 0.3;
var GLACIAL_ELEV_FACTOR_LAT_BASE = 0.3;
var GLACIAL_ELEV_FACTOR_LAT_SCALE = 0.7;
var GLACIAL_CARVE_RATE = 0.025;
var GLACIAL_CONVERGENCE_BONUS = 0.015;
var GLACIAL_DEPOSIT_AMOUNT = 7e-3;
var GLACIAL_FJORD_CARVE = 0.02;
var GLACIAL_FLOW_THRESHOLD = 0.1;
var GLACIAL_FJORD_THRESHOLD = 0.5;
var GLACIAL_WIDENING_FRAC = 0.4;
var GLACIAL_TERMINUS_RATIO = 0.3;
var GLACIAL_FJORD_ICE_MIN = 0.2;
var GLACIAL_POST_SMOOTH = 0.3;
var GLACIAL_MID_FLOOD_FRAC = 0.75;
var GLACIAL_MID_FLOOD_CARVE = 0.85;
var GLACIAL_INITIAL_CARVE = 0.5;
var HYDRAULIC_DEPOSIT_FRAC = 0.5;
var HYDRAULIC_SLOPE_SENSITIVITY = 50;
var THERMAL_TRANSFER_FRAC = 0.5;
var RIDGE_SHARPEN_CAP = 2;
var VALLEY_DEEPEN_FACTOR = 0.5;
var VALLEY_FLOOR_FRAC = 0.5;
var VALLEY_FLOOR_MIN = 1e-3;
var FLOOD_NOISE_AMP = 0.01;
var FLOOD_CARVE_RADIUS_FRAC = 0.3;
var PLATE_LOW_PLATE_T_HIGH = 80;
var PLATE_LOW_PLATE_T_RANGE = 60;
var PLATE_RATE_MIN_BASE = 0.7;
var PLATE_RATE_MIN_LOW_T = 0.4;
var PLATE_RATE_RANGE_BASE = 2.3;
var PLATE_RATE_RANGE_LOW_T = 2.4;
var PLATE_DIR_BASE_BASE = 0.15;
var PLATE_DIR_BASE_LOW_T = 0.25;
var PLATE_DIR_SCALE_BASE = 0.25;
var PLATE_DIR_SCALE_LOW_T = 0.25;
var PLATE_DIR_STRENGTH_CAP = 0.85;
var PLATE_COMPACT_BASE = 0.3;
var PLATE_COMPACT_LOW_T = 0.22;
var PLATE_AREA_GOVERNOR_BASE = 2;
var PLATE_AREA_GOVERNOR_LOW_T = 2;
var PLATE_COMPACT_THRESHOLD_MULT = 1.8;
var PLATE_COMPACT_PENALTY_MULT = 4;
var PLATE_OMEGA_MIN = 0.5;
var PLATE_OMEGA_RANGE = 1.5;
var CONTINENTAL_DRAG_FACTOR = 0.35;
var OCEAN_DRAG_FACTOR = 1;
var SIZE_VEL_POWER = 0.5;
var SIZE_VEL_MIN_FACTOR = 0.4;
var SIZE_VEL_MAX_FACTOR = 2.5;
var MANTLE_CELLS = 5;
var MANTLE_ROTATION_STRENGTH = 0.6;
var MANTLE_DOMINANT_STRENGTH = 2;
var MANTLE_MINOR_STRENGTH = 0.7;
var MANTLE_POLE_BLEND = 0.45;
var SLAB_PULL_POLE_BLEND = 0.65;
var RIDGE_PUSH_POLE_BLEND = 0.4;
var SUPER_PLATE_PHYSICS_MULT = 1.6;
var MANTLE_SPEED_ALIGN_STRENGTH = 0.35;
var DYNAMIC_TOPO_UPLIFT = 0.035;
var DYNAMIC_TOPO_SUBSIDENCE = 0.025;
var MANTLE_STRESS_BOOST = 0.4;
var HOTSPOT_UPWELLING_CANDIDATES = 8;
var HOTSPOT_UPWELLING_JITTER = 0.3;
var PLATE_SMOOTH_BASE = 3;
var PLATE_SMOOTH_LOW_T = 2;
var PLATE_SMOOTH_FIRST_THRESH = 0.4;
var PLATE_SMOOTH_LATER_THRESH = 0.5;
var DETAIL_NOISE_AMP_KM = 0.1;
var DETAIL_NOISE_FREQ = 5;
var DETAIL_NOISE_OCTAVES = 6;
var DETAIL_NOISE_WARP_FREQ = 3;
var DETAIL_NOISE_WARP_AMP = 0.08;
var DETAIL_NOISE_WARP_OCTAVES = 3;
var DETAIL_NOISE_DAMPEN_STRENGTH = 0.5;
var N_COARSE = 2e4;
var COARSE_JITTER = 0.75;
var COARSE_PERTURB_BASE = 1.5;
var COARSE_PERTURB_LOW_T = 1;
var COARSE_FBM_BASE_FREQ = 8;
var COARSE_FBM_OCTAVES = 4;
var COARSE_FBM_DECAY = 0.5;
var COARSE_FBM_FREQ_MULT = 2;

// vendor/world-orogen/js/plates.js
function generatePlates(mesh, r_xyz, numPlates, seed) {
  const { numRegions } = mesh;
  const r_plate = new Int32Array(numRegions).fill(-1);
  const rng = makeRng(seed + 0.5);
  const randInt = makeRandInt(seed);
  const plateSeeds = /* @__PURE__ */ new Set();
  const isSeed = new Uint8Array(numRegions);
  const minDistToSeed = new Float32Array(numRegions).fill(Infinity);
  const firstSeed = randInt(numRegions);
  plateSeeds.add(firstSeed);
  isSeed[firstSeed] = 1;
  const fsx = r_xyz[3 * firstSeed], fsy = r_xyz[3 * firstSeed + 1], fsz = r_xyz[3 * firstSeed + 2];
  for (let r = 0; r < numRegions; r++) {
    minDistToSeed[r] = 1 - (r_xyz[3 * r] * fsx + r_xyz[3 * r + 1] * fsy + r_xyz[3 * r + 2] * fsz);
  }
  minDistToSeed[firstSeed] = 0;
  while (plateSeeds.size < numPlates && plateSeeds.size < numRegions) {
    let t0r = -1, t0d = -1, t1r = -1, t1d = -1, t2r = -1, t2d = -1;
    for (let r = 0; r < numRegions; r++) {
      if (isSeed[r]) continue;
      const d = minDistToSeed[r];
      if (d > t2d) {
        if (d > t0d) {
          t2r = t1r;
          t2d = t1d;
          t1r = t0r;
          t1d = t0d;
          t0r = r;
          t0d = d;
        } else if (d > t1d) {
          t2r = t1r;
          t2d = t1d;
          t1r = r;
          t1d = d;
        } else {
          t2r = r;
          t2d = d;
        }
      }
    }
    let validCount = (t0r !== -1) + (t1r !== -1) + (t2r !== -1);
    if (!validCount) break;
    const pick = randInt(validCount);
    const newSeed = pick === 0 ? t0r : pick === 1 ? t1r : t2r;
    plateSeeds.add(newSeed);
    isSeed[newSeed] = 1;
    const nsx = r_xyz[3 * newSeed], nsy = r_xyz[3 * newSeed + 1], nsz = r_xyz[3 * newSeed + 2];
    if (plateSeeds.size < numPlates) {
      t0r = -1;
      t0d = -1;
      t1r = -1;
      t1d = -1;
      t2r = -1;
      t2d = -1;
      for (let r = 0; r < numRegions; r++) {
        const d = 1 - (r_xyz[3 * r] * nsx + r_xyz[3 * r + 1] * nsy + r_xyz[3 * r + 2] * nsz);
        if (d < minDistToSeed[r]) minDistToSeed[r] = d;
        if (isSeed[r]) continue;
        const md = minDistToSeed[r];
        if (md > t2d) {
          if (md > t0d) {
            t2r = t1r;
            t2d = t1d;
            t1r = t0r;
            t1d = t0d;
            t0r = r;
            t0d = md;
          } else if (md > t1d) {
            t2r = t1r;
            t2d = t1d;
            t1r = r;
            t1d = md;
          } else {
            t2r = r;
            t2d = md;
          }
        }
      }
      validCount = (t0r !== -1) + (t1r !== -1) + (t2r !== -1);
      if (!validCount) break;
      const pick2 = randInt(validCount);
      const newSeed2 = pick2 === 0 ? t0r : pick2 === 1 ? t1r : t2r;
      plateSeeds.add(newSeed2);
      isSeed[newSeed2] = 1;
      const ns2x = r_xyz[3 * newSeed2], ns2y = r_xyz[3 * newSeed2 + 1], ns2z = r_xyz[3 * newSeed2 + 2];
      for (let r = 0; r < numRegions; r++) {
        const d = 1 - (r_xyz[3 * r] * ns2x + r_xyz[3 * r + 1] * ns2y + r_xyz[3 * r + 2] * ns2z);
        if (d < minDistToSeed[r]) minDistToSeed[r] = d;
      }
    } else {
      for (let r = 0; r < numRegions; r++) {
        const d = 1 - (r_xyz[3 * r] * nsx + r_xyz[3 * r + 1] * nsy + r_xyz[3 * r + 2] * nsz);
        if (d < minDistToSeed[r]) minDistToSeed[r] = d;
      }
    }
  }
  const lowPlateT = Math.max(0, Math.min(1, (PLATE_LOW_PLATE_T_HIGH - numPlates) / PLATE_LOW_PLATE_T_RANGE));
  const plateGrowthRate = {};
  const plateGrowthDir = {};
  const plateDirStrength = {};
  const rateMin = PLATE_RATE_MIN_BASE - PLATE_RATE_MIN_LOW_T * lowPlateT;
  const rateRange = PLATE_RATE_RANGE_BASE + PLATE_RATE_RANGE_LOW_T * lowPlateT;
  const dirBase = PLATE_DIR_BASE_BASE + PLATE_DIR_BASE_LOW_T * lowPlateT;
  const dirScale = PLATE_DIR_SCALE_BASE + PLATE_DIR_SCALE_LOW_T * lowPlateT;
  for (const center of plateSeeds) {
    plateGrowthRate[center] = rateMin + rng() * rng() * rateRange;
    const px = r_xyz[3 * center], py = r_xyz[3 * center + 1], pz = r_xyz[3 * center + 2];
    const pLen = Math.sqrt(px * px + py * py + pz * pz) || 1;
    const nx = px / pLen, ny = py / pLen, nz = pz / pLen;
    const rx = rng() - 0.5, ry = rng() - 0.5, rz = rng() - 0.5;
    const d = rx * nx + ry * ny + rz * nz;
    let tx = rx - d * nx, ty = ry - d * ny, tz = rz - d * nz;
    const tLen = Math.sqrt(tx * tx + ty * ty + tz * tz) || 1;
    plateGrowthDir[center] = [tx / tLen, ty / tLen, tz / tLen];
    plateDirStrength[center] = Math.min(PLATE_DIR_STRENGTH_CAP, rng() * (dirBase + dirScale / plateGrowthRate[center]));
  }
  const plateIds = Array.from(plateSeeds);
  const frontiers = /* @__PURE__ */ new Map();
  const plateAreaCount = {};
  for (const pid of plateIds) {
    r_plate[pid] = pid;
    frontiers.set(pid, [pid]);
    plateAreaCount[pid] = 1;
  }
  const { adjOffset, adjList } = mesh;
  let remaining = numRegions - plateIds.length;
  const COMPACT_WEIGHT = PLATE_COMPACT_BASE - PLATE_COMPACT_LOW_T * lowPlateT;
  const expectedArea = Math.max(1, (numRegions - plateIds.length) / numPlates);
  const areaGovernorMult = PLATE_AREA_GOVERNOR_BASE + PLATE_AREA_GOVERNOR_LOW_T * lowPlateT;
  const invNumRegions = 1 / numRegions;
  while (remaining > 0) {
    let anyProgress = false;
    for (const pid of plateIds) {
      const frontier = frontiers.get(pid);
      if (frontier.length === 0) continue;
      const rate = plateGrowthRate[pid];
      const dir = plateGrowthDir[pid];
      const d0 = dir[0], d1 = dir[1], d2 = dir[2];
      const dirStr = plateDirStrength[pid];
      const dirStrHalf = dirStr * 0.5;
      let steps = Math.max(1, Math.ceil(rate * (0.5 + rng())));
      if (plateAreaCount[pid] > expectedArea * areaGovernorMult) {
        steps = Math.max(1, Math.ceil(steps * 0.5));
      }
      const expectedChordDist = Math.sqrt((plateAreaCount[pid] || 1) * invNumRegions / Math.PI) * 2;
      const compactThreshold = expectedChordDist * PLATE_COMPACT_THRESHOLD_MULT;
      const sx = r_xyz[3 * pid], sy = r_xyz[3 * pid + 1], sz = r_xyz[3 * pid + 2];
      for (let s = 0; s < steps && frontier.length > 0; s++) {
        let bestIdx = 0, bestScore = -Infinity;
        const samples = Math.min(frontier.length, 3 + Math.floor(dirStr * 5));
        for (let i = 0; i < samples; i++) {
          const idx = randInt(frontier.length);
          const cell = frontier[idx];
          const ci = 3 * cell;
          const dx = r_xyz[ci] - sx, dy = r_xyz[ci + 1] - sy, dz = r_xyz[ci + 2] - sz;
          const dLenSq = dx * dx + dy * dy + dz * dz;
          const dLen = Math.sqrt(dLenSq) || 1;
          const alignment = (dx * d0 + dy * d1 + dz * d2) / dLen;
          const excess = Math.max(0, dLenSq * 0.5 - compactThreshold);
          const compactPenalty = excess * (COMPACT_WEIGHT * PLATE_COMPACT_PENALTY_MULT);
          const score = alignment * dirStr + rng() * (1 - dirStrHalf) - compactPenalty;
          if (score > bestScore) {
            bestScore = score;
            bestIdx = idx;
          }
        }
        const current = frontier[bestIdx];
        frontier[bestIdx] = frontier[frontier.length - 1];
        frontier.pop();
        for (let j = adjOffset[current], jEnd = adjOffset[current + 1]; j < jEnd; j++) {
          const nb = adjList[j];
          if (r_plate[nb] === -1) {
            r_plate[nb] = pid;
            frontier.push(nb);
            plateAreaCount[pid]++;
            remaining--;
            anyProgress = true;
          }
        }
      }
    }
    if (!anyProgress) break;
  }
  let orphans = true;
  while (orphans) {
    orphans = false;
    for (let r = 0; r < numRegions; r++) {
      if (r_plate[r] === -1) {
        for (let j = adjOffset[r], jEnd = adjOffset[r + 1]; j < jEnd; j++) {
          const nb = adjList[j];
          if (r_plate[nb] !== -1) {
            r_plate[r] = r_plate[nb];
            orphans = true;
            break;
          }
        }
      }
    }
  }
  smoothAndReconnectPlates(mesh, r_plate, plateSeeds, Math.round(PLATE_SMOOTH_BASE - PLATE_SMOOTH_LOW_T * lowPlateT));
  const plateVec = {};
  for (const center of plateSeeds) {
    const theta = rng() * 2 * Math.PI;
    const cosP = 2 * rng() - 1;
    const sinP = Math.sqrt(1 - cosP * cosP);
    const pole = [sinP * Math.cos(theta), sinP * Math.sin(theta), cosP];
    const omega = (PLATE_OMEGA_MIN + rng() * PLATE_OMEGA_RANGE) * (rng() < 0.5 ? -1 : 1);
    plateVec[center] = { pole, omega };
  }
  return { r_plate, plateSeeds, plateVec };
}
function smoothAndReconnectPlates(mesh, r_plate, plateSeeds, numPasses) {
  const { numRegions, adjOffset, adjList } = mesh;
  const plateIds = Array.from(plateSeeds);
  const isSeed = new Uint8Array(numRegions);
  for (const pid of plateIds) {
    if (pid < numRegions && r_plate[pid] === pid) isSeed[pid] = 1;
  }
  let maxDeg = 0;
  for (let r = 0; r < numRegions; r++) {
    const deg = adjOffset[r + 1] - adjOffset[r];
    if (deg > maxDeg) maxDeg = deg;
  }
  const cntPlates = new Int32Array(maxDeg);
  const cntValues = new Uint8Array(maxDeg);
  for (let pass = 0; pass < numPasses; pass++) {
    const threshold = pass === 0 ? PLATE_SMOOTH_FIRST_THRESH : PLATE_SMOOTH_LATER_THRESH;
    for (let r = 0; r < numRegions; r++) {
      const rStart = adjOffset[r], rEnd = adjOffset[r + 1];
      const deg = rEnd - rStart;
      let nDistinct = 0;
      for (let j = rStart; j < rEnd; j++) {
        const p = r_plate[adjList[j]];
        let found = false;
        for (let k = 0; k < nDistinct; k++) {
          if (cntPlates[k] === p) {
            cntValues[k]++;
            found = true;
            break;
          }
        }
        if (!found) {
          cntPlates[nDistinct] = p;
          cntValues[nDistinct] = 1;
          nDistinct++;
        }
      }
      let bestPlate = r_plate[r], bestCount = 0;
      for (let k = 0; k < nDistinct; k++) {
        if (cntValues[k] > bestCount) {
          bestCount = cntValues[k];
          bestPlate = cntPlates[k];
        }
      }
      if (bestCount > deg * threshold && !isSeed[r]) {
        r_plate[r] = bestPlate;
      }
    }
  }
  {
    const visited = new Uint8Array(numRegions);
    const bestComponent = {};
    for (let r = 0; r < numRegions; r++) {
      if (visited[r]) continue;
      const pid = r_plate[r];
      const bfs = [r];
      visited[r] = 1;
      for (let qi = 0; qi < bfs.length; qi++) {
        for (let ni = adjOffset[bfs[qi]], niEnd = adjOffset[bfs[qi] + 1]; ni < niEnd; ni++) {
          const nb = adjList[ni];
          if (!visited[nb] && r_plate[nb] === pid) {
            visited[nb] = 1;
            bfs.push(nb);
          }
        }
      }
      if (!bestComponent[pid] || bfs.length > bestComponent[pid].length) {
        bestComponent[pid] = bfs;
      }
    }
    const inMain = new Uint8Array(numRegions);
    for (const pid of Object.keys(bestComponent)) {
      for (const r of bestComponent[pid]) inMain[r] = 1;
    }
    const queue = [];
    for (let r = 0; r < numRegions; r++) {
      if (!inMain[r]) {
        for (let ni = adjOffset[r], niEnd = adjOffset[r + 1]; ni < niEnd; ni++) {
          if (inMain[adjList[ni]]) {
            r_plate[r] = r_plate[adjList[ni]];
            inMain[r] = 1;
            queue.push(r);
            break;
          }
        }
      }
    }
    for (let qi = 0; qi < queue.length; qi++) {
      const r = queue[qi];
      for (let ni = adjOffset[r], niEnd = adjOffset[r + 1]; ni < niEnd; ni++) {
        const nb = adjList[ni];
        if (!inMain[nb]) {
          r_plate[nb] = r_plate[r];
          inMain[nb] = 1;
          queue.push(nb);
        }
      }
    }
  }
}

// vendor/world-orogen/js/ocean-land.js
function assignOceanLand(mesh, r_plate, plateSeeds, r_xyz, seed, numContinents, continentSizeVariety = 0, landCoverage = 0.3) {
  const rng = makeRng(seed + 42);
  const numRegions = mesh.numRegions;
  const plateIds = Array.from(plateSeeds);
  const numPlates = plateIds.length;
  const { adjOffset, adjList } = mesh;
  const plateArea = {};
  const plateCentroid = {};
  for (const pid of plateIds) {
    plateArea[pid] = 0;
    plateCentroid[pid] = [0, 0, 0];
  }
  for (let r = 0; r < numRegions; r++) {
    const p = r_plate[r];
    if (!plateCentroid[p]) {
      plateArea[p] = 0;
      plateCentroid[p] = [0, 0, 0];
    }
    plateArea[p]++;
    plateCentroid[p][0] += r_xyz[3 * r];
    plateCentroid[p][1] += r_xyz[3 * r + 1];
    plateCentroid[p][2] += r_xyz[3 * r + 2];
  }
  for (const pid of plateIds) {
    const a = plateArea[pid] || 1;
    plateCentroid[pid][0] /= a;
    plateCentroid[pid][1] /= a;
    plateCentroid[pid][2] /= a;
  }
  const plateAdj = {};
  const platePerim = {};
  for (const pid of plateIds) {
    plateAdj[pid] = /* @__PURE__ */ new Set();
    platePerim[pid] = 0;
  }
  for (let r = 0; r < numRegions; r++) {
    const myPlate = r_plate[r];
    let isBoundary = false;
    for (let ni = adjOffset[r], niEnd = adjOffset[r + 1]; ni < niEnd; ni++) {
      const nbPlate = r_plate[adjList[ni]];
      if (myPlate !== nbPlate) {
        plateAdj[myPlate].add(nbPlate);
        isBoundary = true;
      }
    }
    if (isBoundary) platePerim[myPlate]++;
  }
  const plateCompact = {};
  let maxCompact = 0;
  for (const pid of plateIds) {
    const c = Math.sqrt(plateArea[pid] || 1) / (platePerim[pid] || 1);
    plateCompact[pid] = c;
    if (c > maxCompact) maxCompact = c;
  }
  if (maxCompact > 0) {
    for (const pid of plateIds) plateCompact[pid] /= maxCompact;
  }
  const targetLandArea = landCoverage * numRegions;
  const effectiveNum = Math.min(numContinents, numPlates);
  const continentSeeds = [];
  const chosen = /* @__PURE__ */ new Set();
  const first = plateIds[Math.floor(rng() * numPlates)];
  continentSeeds.push(first);
  chosen.add(first);
  for (let s = 1; s < effectiveNum; s++) {
    const candidates = [];
    for (const pid of plateIds) {
      if (chosen.has(pid)) continue;
      const cx = plateCentroid[pid];
      let minDist = Infinity;
      for (const existing of continentSeeds) {
        const ex = plateCentroid[existing];
        const dx = cx[0] - ex[0], dy = cx[1] - ex[1], dz = cx[2] - ex[2];
        const d = dx * dx + dy * dy + dz * dz;
        if (d < minDist) minDist = d;
      }
      const rawAreaFactor = Math.sqrt(numRegions / numPlates) / Math.sqrt(plateArea[pid] || 1);
      const areaFactor = 1 + (rawAreaFactor - 1) * (1 - continentSizeVariety * 0.5);
      const compact = 0.3 + 0.7 * plateCompact[pid];
      candidates.push({ pid, score: minDist * areaFactor * compact });
    }
    if (candidates.length === 0) break;
    candidates.sort((a, b) => b.score - a.score);
    const topK = Math.min(candidates.length, 3);
    const pick = candidates[Math.floor(rng() * topK)];
    continentSeeds.push(pick.pid);
    chosen.add(pick.pid);
  }
  let seedArea = 0;
  for (const pid of continentSeeds) seedArea += plateArea[pid];
  while (continentSeeds.length > 1 && seedArea > targetLandArea) {
    let maxIdx = 0;
    for (let i = 1; i < continentSeeds.length; i++) {
      if (plateArea[continentSeeds[i]] > plateArea[continentSeeds[maxIdx]]) maxIdx = i;
    }
    seedArea -= plateArea[continentSeeds[maxIdx]];
    chosen.delete(continentSeeds[maxIdx]);
    continentSeeds.splice(maxIdx, 1);
  }
  const plateContinent = {};
  for (let c = 0; c < continentSeeds.length; c++) {
    plateContinent[continentSeeds[c]] = c;
  }
  let landArea = seedArea;
  const growTarget = targetLandArea * 0.9;
  const numC = continentSeeds.length;
  const continentTarget = new Float64Array(numC);
  const continentArea = new Float64Array(numC);
  for (let c = 0; c < numC; c++) {
    continentArea[c] = plateArea[continentSeeds[c]];
  }
  if (continentSizeVariety > 0 && numC > 1) {
    const weights = [];
    for (let c = 0; c < numC; c++) {
      const logWeight = (rng() - 0.5) * continentSizeVariety * 2.5;
      weights.push(Math.exp(logWeight));
    }
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    for (let c = 0; c < numC; c++) {
      continentTarget[c] = growTarget * weights[c] / totalWeight;
    }
  } else {
    const equal = growTarget / Math.max(numC, 1);
    for (let c = 0; c < numC; c++) continentTarget[c] = equal;
  }
  let progress = true;
  while (progress && landArea < growTarget) {
    progress = false;
    for (let c = 0; c < numC && landArea < growTarget; c++) {
      if (continentArea[c] >= continentTarget[c]) continue;
      const candidates = [];
      for (const pid of plateIds) {
        if (plateContinent[pid] !== void 0) continue;
        let touchesSelf = false, touchesOther = false;
        let sameCount = 0;
        for (const adj of plateAdj[pid]) {
          const ac2 = plateContinent[adj];
          if (ac2 === c) {
            touchesSelf = true;
            sameCount++;
          } else if (ac2 !== void 0) {
            touchesOther = true;
            break;
          }
        }
        if (touchesSelf && !touchesOther) {
          candidates.push({ pid, score: sameCount + plateCompact[pid] * 3 + rng() * 0.5 });
        }
      }
      if (candidates.length === 0) continue;
      candidates.sort((a, b) => b.score - a.score);
      const topK = Math.min(candidates.length, 3);
      const pick = candidates[Math.floor(rng() * topK)];
      plateContinent[pick.pid] = c;
      continentArea[c] += plateArea[pick.pid];
      landArea += plateArea[pick.pid];
      progress = true;
    }
  }
  const oceanComponents = [];
  const visited = /* @__PURE__ */ new Set();
  for (const pid of plateIds) {
    if (plateContinent[pid] !== void 0 || visited.has(pid)) continue;
    const component = [pid];
    visited.add(pid);
    for (let qi = 0; qi < component.length; qi++) {
      for (const adj of plateAdj[component[qi]]) {
        if (plateContinent[adj] === void 0 && !visited.has(adj)) {
          visited.add(adj);
          component.push(adj);
        }
      }
    }
    oceanComponents.push(component);
  }
  let mainIdx = 0;
  for (let i = 1; i < oceanComponents.length; i++) {
    let areaI = 0, areaM = 0;
    for (const p of oceanComponents[i]) areaI += plateArea[p];
    for (const p of oceanComponents[mainIdx]) areaM += plateArea[p];
    if (areaI > areaM) mainIdx = i;
  }
  const absorbCap = targetLandArea * 1.1;
  for (let i = 0; i < oceanComponents.length; i++) {
    if (i === mainIdx) continue;
    const component = oceanComponents[i];
    const bordering = /* @__PURE__ */ new Set();
    for (const op of component) {
      for (const adj of plateAdj[op]) {
        if (plateContinent[adj] !== void 0) bordering.add(plateContinent[adj]);
      }
      if (bordering.size > 1) break;
    }
    if (bordering.size === 1) {
      let compArea = 0;
      for (const op of component) compArea += plateArea[op];
      if (landArea + compArea <= absorbCap) {
        const c = bordering.values().next().value;
        for (const op of component) plateContinent[op] = c;
        landArea += compArea;
      }
    }
  }
  const plateIsOcean = /* @__PURE__ */ new Set();
  for (const pid of plateIds) {
    if (plateContinent[pid] === void 0) plateIsOcean.add(pid);
  }
  return plateIsOcean;
}

// vendor/world-orogen/js/coarse-plates.js
function generateCoarsePlates(seed, numPlates, numContinents, continentSizeVariety = 0, landCoverage = 0.3) {
  const coarseRng = makeRng(seed + 137);
  const { mesh: coarseMesh, r_xyz: coarse_xyz } = buildSphere(N_COARSE, COARSE_JITTER, coarseRng);
  const { r_plate: coarse_r_plate, plateSeeds: coarsePlateSeeds, plateVec: coarsePlateVec } = generatePlates(coarseMesh, coarse_xyz, numPlates, seed);
  const coarsePlateIsOcean = assignOceanLand(
    coarseMesh,
    coarse_r_plate,
    coarsePlateSeeds,
    coarse_xyz,
    seed,
    numContinents,
    continentSizeVariety,
    landCoverage
  );
  return {
    coarseMesh,
    coarse_xyz,
    coarse_r_plate,
    coarsePlateSeeds,
    coarsePlateVec,
    coarsePlateIsOcean
  };
}
function projectCoarsePlates(mesh, r_xyz, coarseMesh, coarse_xyz, coarse_r_plate, seed, numPlates) {
  const N = mesh.numRegions;
  const r_plate = new Int32Array(N);
  const { adjOffset: cOff, adjList: cAdj } = coarseMesh;
  const noise = new SimplexNoise(seed + 999);
  const coarseEdgeRad = Math.PI / Math.sqrt(coarseMesh.numRegions);
  const lowPlateT = numPlates != null ? Math.max(0, Math.min(1, (PLATE_LOW_PLATE_T_HIGH - numPlates) / PLATE_LOW_PLATE_T_RANGE)) : 0;
  const perturbAmp = coarseEdgeRad * (COARSE_PERTURB_BASE + COARSE_PERTURB_LOW_T * lowPlateT);
  const BASE_FREQ = COARSE_FBM_BASE_FREQ;
  const NC = coarseMesh.numRegions;
  const MAX_WALK = Math.ceil(Math.sqrt(NC));
  let cur = 0;
  for (let r = 0; r < N; r++) {
    const ox = r_xyz[3 * r], oy = r_xyz[3 * r + 1], oz = r_xyz[3 * r + 2];
    let dx = 0, dy = 0, dz = 0;
    let amp = perturbAmp;
    let fx = ox * BASE_FREQ, fy = oy * BASE_FREQ, fz = oz * BASE_FREQ;
    for (let oct = 0; oct < COARSE_FBM_OCTAVES; oct++) {
      dx += noise.noise3D(fx, fy, fz) * amp;
      dy += noise.noise3D(fx + 100, fy + 100, fz + 100) * amp;
      dz += noise.noise3D(fx + 200, fy + 200, fz + 200) * amp;
      amp *= COARSE_FBM_DECAY;
      fx *= COARSE_FBM_FREQ_MULT;
      fy *= COARSE_FBM_FREQ_MULT;
      fz *= COARSE_FBM_FREQ_MULT;
    }
    let px = ox + dx, py = oy + dy, pz = oz + dz;
    const len2 = Math.sqrt(px * px + py * py + pz * pz) || 1;
    px /= len2;
    py /= len2;
    pz /= len2;
    let bestDot = px * coarse_xyz[3 * cur] + py * coarse_xyz[3 * cur + 1] + pz * coarse_xyz[3 * cur + 2];
    let improved = true;
    let steps = 0;
    while (improved && steps < MAX_WALK) {
      improved = false;
      steps++;
      for (let i = cOff[cur], iEnd = cOff[cur + 1]; i < iEnd; i++) {
        const nb = cAdj[i];
        const d = px * coarse_xyz[3 * nb] + py * coarse_xyz[3 * nb + 1] + pz * coarse_xyz[3 * nb + 2];
        if (d > bestDot) {
          bestDot = d;
          cur = nb;
          improved = true;
        }
      }
    }
    if (steps >= MAX_WALK) {
      for (let c = 0; c < NC; c++) {
        const d = px * coarse_xyz[3 * c] + py * coarse_xyz[3 * c + 1] + pz * coarse_xyz[3 * c + 2];
        if (d > bestDot) {
          bestDot = d;
          cur = c;
        }
      }
    }
    r_plate[r] = coarse_r_plate[cur];
  }
  return r_plate;
}

// vendor/world-orogen/js/plate-physics.js
function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  ];
}
function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function len(a) {
  return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
}
function normalize(a) {
  const l = len(a);
  return l > 1e-12 ? [a[0] / l, a[1] / l, a[2] / l] : [0, 0, 1];
}
function scale2(a, s) {
  return [a[0] * s, a[1] * s, a[2] * s];
}
function add(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}
function sub(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
function lerp3(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
function velocityAt(pole, omega, pos) {
  return scale2(cross(pole, pos), omega);
}
function biasPole(pole, omega, centroid, desiredDir, blend) {
  const vCur = velocityAt(pole, omega, centroid);
  const vTarget = normalize(add(vCur, scale2(desiredDir, blend * len(vCur) + 0.01)));
  const candidate = normalize(cross(centroid, vTarget));
  if (len(cross(centroid, vTarget)) < 1e-10) return pole;
  let newPole = normalize(lerp3(pole, candidate, blend));
  if (dot(newPole, pole) < 0) {
    newPole = scale2(newPole, -1);
  }
  return newPole;
}
function applyPlatePhysics(plateVec, plateSeeds, plateIsOcean, r_plate, mesh, r_xyz, seed, blendMult = 1) {
  const { numRegions, adjOffset, adjList } = mesh;
  const seedArr = Array.from(plateSeeds);
  const numPlates = seedArr.length;
  const plateArea = {};
  const plateCentroid = {};
  for (const pid of seedArr) {
    plateArea[pid] = 0;
    plateCentroid[pid] = [0, 0, 0];
  }
  for (let r = 0; r < numRegions; r++) {
    const pid = r_plate[r];
    plateArea[pid]++;
    plateCentroid[pid][0] += r_xyz[3 * r];
    plateCentroid[pid][1] += r_xyz[3 * r + 1];
    plateCentroid[pid][2] += r_xyz[3 * r + 2];
  }
  for (const pid of seedArr) {
    const a = plateArea[pid] || 1;
    plateCentroid[pid] = normalize([
      plateCentroid[pid][0] / a,
      plateCentroid[pid][1] / a,
      plateCentroid[pid][2] / a
    ]);
  }
  const avgArea = numRegions / numPlates;
  const boundaryPoints = {};
  for (let r = 0; r < numRegions; r++) {
    const pidA = r_plate[r];
    for (let ni = adjOffset[r], niEnd = adjOffset[r + 1]; ni < niEnd; ni++) {
      const nb = adjList[ni];
      const pidB = r_plate[nb];
      if (pidA >= pidB) continue;
      if (pidA === pidB) continue;
      const key = pidA + ":" + pidB;
      if (!boundaryPoints[key]) boundaryPoints[key] = [];
      boundaryPoints[key].push([
        (r_xyz[3 * r] + r_xyz[3 * nb]) * 0.5,
        (r_xyz[3 * r + 1] + r_xyz[3 * nb + 1]) * 0.5,
        (r_xyz[3 * r + 2] + r_xyz[3 * nb + 2]) * 0.5
      ]);
    }
  }
  const plateDebug = {};
  const velBefore = new Float32Array(numRegions * 3);
  for (let r = 0; r < numRegions; r++) {
    const pid = r_plate[r];
    const pv = plateVec[pid];
    const x = r_xyz[3 * r], y = r_xyz[3 * r + 1], z = r_xyz[3 * r + 2];
    const v2 = velocityAt(pv.pole, pv.omega, [x, y, z]);
    velBefore[3 * r] = v2[0];
    velBefore[3 * r + 1] = v2[1];
    velBefore[3 * r + 2] = v2[2];
  }
  for (const pid of seedArr) {
    plateDebug[pid] = {
      omegaBefore: Math.abs(plateVec[pid].omega),
      continentalDrag: 1,
      sizeVelFactor: 1,
      omegaAfter: 0
    };
  }
  const landAreas = [];
  for (const pid of seedArr) {
    if (!plateIsOcean.has(pid)) landAreas.push(plateArea[pid]);
  }
  let landMean = 0, landStdDev = 1;
  if (landAreas.length > 0) {
    landMean = landAreas.reduce((a, b) => a + b, 0) / landAreas.length;
    const variance = landAreas.reduce((s, a) => s + (a - landMean) * (a - landMean), 0) / landAreas.length;
    landStdDev = Math.sqrt(variance) || 1;
  }
  for (const pid of seedArr) {
    let dragFactor;
    if (plateIsOcean.has(pid)) {
      dragFactor = OCEAN_DRAG_FACTOR;
    } else {
      const sigmasBelow = Math.max(0, (landMean - plateArea[pid]) / landStdDev);
      const t = Math.min(1, sigmasBelow / 2);
      dragFactor = CONTINENTAL_DRAG_FACTOR + (OCEAN_DRAG_FACTOR - CONTINENTAL_DRAG_FACTOR) * t;
    }
    plateDebug[pid].continentalDrag = dragFactor;
    const relArea = plateArea[pid] / avgArea;
    const sizeFactor = Math.min(
      SIZE_VEL_MAX_FACTOR,
      Math.max(SIZE_VEL_MIN_FACTOR, 1 / Math.pow(relArea, SIZE_VEL_POWER))
    );
    plateDebug[pid].sizeVelFactor = sizeFactor;
    plateVec[pid].omega *= dragFactor * sizeFactor;
  }
  const mantleRng = makeRng(seed + 9999);
  const convPoints = [];
  for (const key of Object.keys(boundaryPoints)) {
    const [pidAStr, pidBStr] = key.split(":");
    const pidA = +pidAStr, pidB = +pidBStr;
    const points = boundaryPoints[key];
    let convCount = 0;
    for (const pt of points) {
      const vA = velocityAt(plateVec[pidA].pole, plateVec[pidA].omega, pt);
      const vB = velocityAt(plateVec[pidB].pole, plateVec[pidB].omega, pt);
      const vRel = sub(vA, vB);
      const normal = normalize(sub(plateCentroid[pidB], plateCentroid[pidA]));
      if (-dot(vRel, normal) > 0.05) convCount++;
    }
    if (convCount > points.length * 0.4) {
      for (const pt of points) convPoints.push(pt);
    }
  }
  const MIN_CELL_SEP = 0.6;
  function isFarEnough(pt, placed) {
    const npt = normalize(pt);
    for (const c of placed) {
      if (1 - dot(npt, c) < MIN_CELL_SEP) return false;
    }
    return true;
  }
  const numDown = Math.min(Math.ceil(MANTLE_CELLS / 2), convPoints.length);
  const numUp = MANTLE_CELLS - numDown;
  const mantleCenters = [];
  const placedPositions = [];
  if (convPoints.length > 0) {
    const first = normalize(convPoints[Math.floor(mantleRng() * convPoints.length)]);
    placedPositions.push(first);
    for (let i = 1; i < numDown; i++) {
      let bestDist = -1, bestPt = null;
      for (const pt of convPoints) {
        const npt = normalize(pt);
        let minDist = Infinity;
        for (const dc of placedPositions) {
          const d = 1 - dot(npt, dc);
          if (d < minDist) minDist = d;
        }
        if (minDist >= MIN_CELL_SEP && minDist > bestDist) {
          bestDist = minDist;
          bestPt = npt;
        }
      }
      if (bestPt) placedPositions.push(bestPt);
    }
    for (let i = 0; i < placedPositions.length; i++) {
      const rotSign = mantleRng() < 0.5 ? 1 : -1;
      const str = i === 0 ? MANTLE_DOMINANT_STRENGTH : MANTLE_MINOR_STRENGTH;
      mantleCenters.push({ pos: placedPositions[i], radialSign: -1, rotSign, strength: str });
    }
  }
  {
    const stride = Math.max(1, Math.floor(numRegions / 400));
    const candidates = [];
    for (let r = 0; r < numRegions; r += stride) {
      candidates.push(normalize([r_xyz[3 * r], r_xyz[3 * r + 1], r_xyz[3 * r + 2]]));
    }
    for (let i = 0; i < numUp; i++) {
      let bestDist = -1, bestPt = null;
      for (const pt of candidates) {
        let minDist = Infinity;
        for (const c of placedPositions) {
          const d = 1 - dot(pt, c);
          if (d < minDist) minDist = d;
        }
        if (minDist >= MIN_CELL_SEP && minDist > bestDist) {
          bestDist = minDist;
          bestPt = pt;
        }
      }
      if (!bestPt) {
        for (const pt of candidates) {
          let minDist = Infinity;
          for (const c of placedPositions) {
            const d = 1 - dot(pt, c);
            if (d < minDist) minDist = d;
          }
          if (minDist > bestDist) {
            bestDist = minDist;
            bestPt = pt;
          }
        }
      }
      if (bestPt) {
        placedPositions.push(bestPt);
        const rotSign = mantleRng() < 0.5 ? 1 : -1;
        const str = i === 0 ? MANTLE_DOMINANT_STRENGTH : MANTLE_MINOR_STRENGTH;
        mantleCenters.push({ pos: bestPt, radialSign: 1, rotSign, strength: str });
      }
    }
  }
  if (mantleCenters.length === 0) {
    for (let i = 0; i < MANTLE_CELLS; i++) {
      const theta = mantleRng() * 2 * Math.PI;
      const cosP = 2 * mantleRng() - 1;
      const sinP = Math.sqrt(1 - cosP * cosP);
      const pos = [sinP * Math.cos(theta), sinP * Math.sin(theta), cosP];
      const radialSign = i % 2 === 0 ? 1 : -1;
      const rotSign = mantleRng() < 0.5 ? 1 : -1;
      const str = i < 2 ? MANTLE_DOMINANT_STRENGTH : MANTLE_MINOR_STRENGTH;
      mantleCenters.push({ pos, radialSign, rotSign, strength: str });
    }
  }
  const mantleField = new Float32Array(numRegions);
  const plateMantleFlow = {};
  for (const pid of seedArr) plateMantleFlow[pid] = [0, 0, 0];
  for (let r = 0; r < numRegions; r++) {
    const px = r_xyz[3 * r], py = r_xyz[3 * r + 1], pz = r_xyz[3 * r + 2];
    const pos = [px, py, pz];
    let flowX = 0, flowY = 0, flowZ = 0;
    for (const cell of mantleCenters) {
      const cp = cross(cross(pos, cell.pos), pos);
      const cpLen = len(cp);
      if (cpLen < 1e-10) continue;
      const cosAngle = dot(pos, cell.pos);
      const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle)));
      if (angle < 1e-6) continue;
      const radialX = cp[0] / cpLen, radialY = cp[1] / cpLen, radialZ = cp[2] / cpLen;
      const tanX = py * radialZ - pz * radialY;
      const tanY = pz * radialX - px * radialZ;
      const tanZ = px * radialY - py * radialX;
      const tanLen = Math.sqrt(tanX * tanX + tanY * tanY + tanZ * tanZ);
      if (tanLen < 1e-10) continue;
      const strength = cell.strength / (0.5 + angle * angle);
      const radialStr = cell.radialSign * strength;
      const rotStr = cell.rotSign * MANTLE_ROTATION_STRENGTH * strength;
      flowX += radialX * radialStr + tanX / tanLen * rotStr;
      flowY += radialY * radialStr + tanY / tanLen * rotStr;
      flowZ += radialZ * radialStr + tanZ / tanLen * rotStr;
    }
    const flowMag = Math.sqrt(flowX * flowX + flowY * flowY + flowZ * flowZ);
    let radialSum = 0;
    for (const cell of mantleCenters) {
      const cosAngle = dot(pos, cell.pos);
      const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle)));
      if (angle < 1e-6) continue;
      radialSum += cell.radialSign * cell.strength / (0.5 + angle * angle);
    }
    mantleField[r] = flowMag * Math.sign(radialSum);
    const pid = r_plate[r];
    plateMantleFlow[pid][0] += flowX;
    plateMantleFlow[pid][1] += flowY;
    plateMantleFlow[pid][2] += flowZ;
  }
  for (const pid of seedArr) {
    const flow = plateMantleFlow[pid];
    const flowLen = len(flow);
    if (flowLen < 1e-10) continue;
    const flowDir = normalize(flow);
    const centroid = plateCentroid[pid];
    const d = dot(flowDir, centroid);
    const tangent = normalize(sub(flowDir, scale2(centroid, d)));
    if (len(sub(flowDir, scale2(centroid, d))) < 1e-10) continue;
    plateVec[pid].pole = biasPole(
      plateVec[pid].pole,
      plateVec[pid].omega,
      centroid,
      tangent,
      Math.min(0.9, MANTLE_POLE_BLEND * blendMult)
    );
    plateDebug[pid].mantleAlignment = dot(
      normalize(velocityAt(plateVec[pid].pole, plateVec[pid].omega, centroid)),
      tangent
    );
  }
  for (const pid of seedArr) {
    const flow = plateMantleFlow[pid];
    const flowLen = len(flow);
    if (flowLen < 1e-10) continue;
    const centroid = plateCentroid[pid];
    const vel = velocityAt(plateVec[pid].pole, plateVec[pid].omega, centroid);
    const velLen = len(vel);
    if (velLen < 1e-10) continue;
    const d = dot(flow, centroid);
    const tangentFlow = sub(flow, scale2(centroid, d));
    const tfLen = len(tangentFlow);
    if (tfLen < 1e-10) continue;
    const alignment = dot(normalize(vel), normalize(tangentFlow));
    const speedMult = 1 + MANTLE_SPEED_ALIGN_STRENGTH * Math.max(0, alignment);
    plateVec[pid].omega *= speedMult;
  }
  const plateConvergentBdry = {};
  const plateDivergentBdry = {};
  for (const pid of seedArr) {
    plateConvergentBdry[pid] = [];
    plateDivergentBdry[pid] = [];
  }
  for (const key of Object.keys(boundaryPoints)) {
    const [pidAStr, pidBStr] = key.split(":");
    const pidA = +pidAStr, pidB = +pidBStr;
    const points = boundaryPoints[key];
    let convCount = 0, divCount = 0;
    let convCenterA = [0, 0, 0], convCenterB = [0, 0, 0];
    let divCenter = [0, 0, 0];
    for (const pt of points) {
      const vA = velocityAt(plateVec[pidA].pole, plateVec[pidA].omega, pt);
      const vB = velocityAt(plateVec[pidB].pole, plateVec[pidB].omega, pt);
      const vRel = sub(vA, vB);
      const normal = normalize(sub(plateCentroid[pidB], plateCentroid[pidA]));
      const convergence = -dot(vRel, normal);
      if (convergence > 0.05) {
        convCount++;
        convCenterA = add(convCenterA, pt);
        convCenterB = add(convCenterB, pt);
      } else if (convergence < -0.05) {
        divCount++;
        divCenter = add(divCenter, pt);
      }
    }
    if (convCount > points.length * 0.3) {
      const center = scale2(convCenterA, 1 / convCount);
      if (plateIsOcean.has(pidA)) plateConvergentBdry[pidA].push(center);
      if (plateIsOcean.has(pidB)) plateDivergentBdry[pidB].push(center);
    }
    if (divCount > points.length * 0.3) {
      const center = scale2(divCenter, 1 / divCount);
      plateDivergentBdry[pidA].push(center);
      plateDivergentBdry[pidB].push(center);
    }
  }
  for (const pid of seedArr) {
    if (!plateIsOcean.has(pid)) continue;
    const convPts = plateConvergentBdry[pid];
    if (convPts.length === 0) continue;
    let cx = 0, cy = 0, cz = 0;
    for (const pt of convPts) {
      cx += pt[0];
      cy += pt[1];
      cz += pt[2];
    }
    const convCenter = normalize([cx / convPts.length, cy / convPts.length, cz / convPts.length]);
    const centroid = plateCentroid[pid];
    const pullDir = normalize(sub(convCenter, centroid));
    const d = dot(pullDir, centroid);
    const tangentPull = normalize(sub(pullDir, scale2(centroid, d)));
    if (len(sub(pullDir, scale2(centroid, d))) < 1e-10) continue;
    plateVec[pid].pole = biasPole(
      plateVec[pid].pole,
      plateVec[pid].omega,
      centroid,
      tangentPull,
      Math.min(0.9, SLAB_PULL_POLE_BLEND * blendMult)
    );
    plateDebug[pid].slabPullStrength = SLAB_PULL_POLE_BLEND;
  }
  for (const pid of seedArr) {
    const divPts = plateDivergentBdry[pid];
    if (divPts.length === 0) continue;
    let dx = 0, dy = 0, dz = 0;
    for (const pt of divPts) {
      dx += pt[0];
      dy += pt[1];
      dz += pt[2];
    }
    const divCenter = normalize([dx / divPts.length, dy / divPts.length, dz / divPts.length]);
    const centroid = plateCentroid[pid];
    const pushDir = normalize(sub(centroid, divCenter));
    const d = dot(pushDir, centroid);
    const tangentPush = normalize(sub(pushDir, scale2(centroid, d)));
    if (len(sub(pushDir, scale2(centroid, d))) < 1e-10) continue;
    plateVec[pid].pole = biasPole(
      plateVec[pid].pole,
      plateVec[pid].omega,
      centroid,
      tangentPush,
      Math.min(0.9, RIDGE_PUSH_POLE_BLEND * blendMult)
    );
    plateDebug[pid].ridgePushStrength = RIDGE_PUSH_POLE_BLEND;
  }
  for (const pid of seedArr) {
    plateVec[pid].pole = normalize(plateVec[pid].pole);
    plateDebug[pid].omegaAfter = Math.abs(plateVec[pid].omega);
  }
  const velDelta = new Float32Array(numRegions);
  for (let r = 0; r < numRegions; r++) {
    const pid = r_plate[r];
    const pv = plateVec[pid];
    const x = r_xyz[3 * r], y = r_xyz[3 * r + 1], z = r_xyz[3 * r + 2];
    const vAfter = velocityAt(pv.pole, pv.omega, [x, y, z]);
    const dx = vAfter[0] - velBefore[3 * r];
    const dy = vAfter[1] - velBefore[3 * r + 1];
    const dz = vAfter[2] - velBefore[3 * r + 2];
    velDelta[r] = Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  return { plateDebug, mantleField, velDelta };
}

// vendor/world-orogen/js/super-plates.js
function buildSuperPlates(coarseMesh, coarse_r_plate, plateSeeds, plateVec, plateIsOcean, plateDensity, hiResRPlate) {
  const { numRegions: coarseNumRegions, adjOffset, adjList } = coarseMesh;
  const numPlates = plateSeeds.size;
  const plateArea = {};
  for (const pid of plateSeeds) plateArea[pid] = 0;
  for (let r = 0; r < coarseNumRegions; r++) {
    plateArea[coarse_r_plate[r]]++;
  }
  const plateNeighbors = {};
  for (const pid of plateSeeds) plateNeighbors[pid] = /* @__PURE__ */ new Set();
  for (let r = 0; r < coarseNumRegions; r++) {
    const myPlate = coarse_r_plate[r];
    for (let ni = adjOffset[r], niEnd = adjOffset[r + 1]; ni < niEnd; ni++) {
      const nbPlate = coarse_r_plate[adjList[ni]];
      if (nbPlate !== myPlate) {
        plateNeighbors[myPlate].add(nbPlate);
      }
    }
  }
  const plateVisited = /* @__PURE__ */ new Set();
  const components = [];
  for (const pid of plateSeeds) {
    if (plateVisited.has(pid)) continue;
    const isOcean = plateIsOcean.has(pid);
    const comp = [];
    const queue = [pid];
    plateVisited.add(pid);
    let head = 0;
    while (head < queue.length) {
      const cur = queue[head++];
      comp.push(cur);
      for (const nb of plateNeighbors[cur]) {
        if (!plateVisited.has(nb) && plateIsOcean.has(nb) === isOcean) {
          plateVisited.add(nb);
          queue.push(nb);
        }
      }
    }
    components.push(comp);
  }
  const target = Math.max(2, Math.min(20, Math.round(numPlates / 4)));
  const totalPlates = numPlates;
  const plateToSuperPlate = {};
  let nextSuperPlate = 0;
  for (const comp of components) {
    const k = Math.max(1, Math.round(target * comp.length / totalPlates));
    if (k <= 1) {
      const spId = nextSuperPlate++;
      for (const pid of comp) plateToSuperPlate[pid] = spId;
    } else {
      const compSet = new Set(comp);
      const localAdj = {};
      for (const pid of comp) {
        localAdj[pid] = [];
        for (const nb of plateNeighbors[pid]) {
          if (compSet.has(nb)) localAdj[pid].push(nb);
        }
      }
      const edgeWeight = {};
      for (const pid of comp) {
        edgeWeight[pid] = Math.sqrt(plateArea[pid] || 1);
      }
      const dist2 = {};
      const dijkstraFrom = (startPids) => {
        for (const pid of comp) dist2[pid] = Infinity;
        const visited2 = /* @__PURE__ */ new Set();
        for (const s of startPids) dist2[s] = 0;
        for (let iter = 0; iter < comp.length; iter++) {
          let cur = -1, minD = Infinity;
          for (const pid of comp) {
            if (!visited2.has(pid) && dist2[pid] < minD) {
              minD = dist2[pid];
              cur = pid;
            }
          }
          if (cur === -1) break;
          visited2.add(cur);
          for (const nb of localAdj[cur]) {
            const nd = dist2[cur] + edgeWeight[nb];
            if (nd < dist2[nb]) dist2[nb] = nd;
          }
        }
      };
      const seeds = [comp[0]];
      dijkstraFrom([comp[0]]);
      for (let si = 1; si < k; si++) {
        let farthest = comp[0], maxDist = -1;
        for (const pid of comp) {
          if (dist2[pid] > maxDist) {
            maxDist = dist2[pid];
            farthest = pid;
          }
        }
        seeds.push(farthest);
        dijkstraFrom(seeds);
      }
      const assignment = {};
      for (const pid of comp) assignment[pid] = -1;
      const d = {};
      for (const pid of comp) d[pid] = Infinity;
      const visited = /* @__PURE__ */ new Set();
      for (let si = 0; si < seeds.length; si++) {
        const spId = nextSuperPlate + si;
        assignment[seeds[si]] = spId;
        d[seeds[si]] = 0;
      }
      for (let iter = 0; iter < comp.length; iter++) {
        let cur = -1, minD = Infinity;
        for (const pid of comp) {
          if (!visited.has(pid) && d[pid] < minD) {
            minD = d[pid];
            cur = pid;
          }
        }
        if (cur === -1) break;
        visited.add(cur);
        for (const nb of localAdj[cur]) {
          const nd = d[cur] + edgeWeight[nb];
          if (nd < d[nb]) {
            d[nb] = nd;
            assignment[nb] = assignment[cur];
          }
        }
      }
      for (const pid of comp) {
        plateToSuperPlate[pid] = assignment[pid];
      }
      nextSuperPlate += seeds.length;
    }
  }
  const numSuperPlates = nextSuperPlate;
  const hiResNumRegions = hiResRPlate.length;
  const r_superPlate = new Int32Array(hiResNumRegions);
  for (let r = 0; r < hiResNumRegions; r++) {
    r_superPlate[r] = plateToSuperPlate[hiResRPlate[r]];
  }
  const spLx = new Float64Array(numSuperPlates);
  const spLy = new Float64Array(numSuperPlates);
  const spLz = new Float64Array(numSuperPlates);
  const spOmegaSum = new Float64Array(numSuperPlates);
  const spAreaSum = new Float64Array(numSuperPlates);
  const spLargestPlate = new Array(numSuperPlates).fill(null);
  for (const pid of plateSeeds) {
    const spId = plateToSuperPlate[pid];
    const pv = plateVec[pid];
    if (!pv || !pv.pole) continue;
    const area = plateArea[pid];
    const omega = pv.omega;
    const px = pv.pole[0], py = pv.pole[1], pz = pv.pole[2];
    spLx[spId] += area * omega * px;
    spLy[spId] += area * omega * py;
    spLz[spId] += area * omega * pz;
    spOmegaSum[spId] += area * Math.abs(omega);
    spAreaSum[spId] += area;
    if (!spLargestPlate[spId] || area > spLargestPlate[spId].area) {
      spLargestPlate[spId] = { pid, area };
    }
  }
  const superPlateVec = {};
  for (let sp = 0; sp < numSuperPlates; sp++) {
    const lx = spLx[sp], ly = spLy[sp], lz = spLz[sp];
    const lLen = Math.sqrt(lx * lx + ly * ly + lz * lz);
    const totalArea = spAreaSum[sp];
    if (lLen < 1e-8 || totalArea < 1) {
      const largest = spLargestPlate[sp];
      if (largest) {
        const pv = plateVec[largest.pid];
        if (pv && pv.pole) {
          superPlateVec[sp] = { pole: [pv.pole[0], pv.pole[1], pv.pole[2]], omega: pv.omega };
          continue;
        }
      }
      superPlateVec[sp] = { pole: [0, 1, 0], omega: 0 };
      continue;
    }
    const pole = [lx / lLen, ly / lLen, lz / lLen];
    const omega = spOmegaSum[sp] / totalArea;
    superPlateVec[sp] = { pole, omega };
  }
  const superPlateIsOcean = /* @__PURE__ */ new Set();
  const spOceanArea = new Float64Array(numSuperPlates);
  const spTotalArea = new Float64Array(numSuperPlates);
  for (const pid of plateSeeds) {
    const spId = plateToSuperPlate[pid];
    const area = plateArea[pid];
    spTotalArea[spId] += area;
    if (plateIsOcean.has(pid)) spOceanArea[spId] += area;
  }
  for (let sp = 0; sp < numSuperPlates; sp++) {
    if (spOceanArea[sp] > spTotalArea[sp] * 0.5) {
      superPlateIsOcean.add(sp);
    }
  }
  const superPlateDensity = {};
  const spDensitySum = new Float64Array(numSuperPlates);
  const spDensityArea = new Float64Array(numSuperPlates);
  for (const pid of plateSeeds) {
    const spId = plateToSuperPlate[pid];
    const area = plateArea[pid];
    const density = plateDensity[pid];
    if (density !== void 0) {
      spDensitySum[spId] += area * density;
      spDensityArea[spId] += area;
    }
  }
  for (let sp = 0; sp < numSuperPlates; sp++) {
    superPlateDensity[sp] = spDensityArea[sp] > 0 ? spDensitySum[sp] / spDensityArea[sp] : 2.7;
  }
  return { r_superPlate, superPlateVec, superPlateIsOcean, superPlateDensity, numSuperPlates };
}

// vendor/world-orogen/js/elevation.js
function plateVelocityAt(plateVec, plateId, x, y, z) {
  const pv = plateVec[plateId];
  const px = pv.pole[0], py = pv.pole[1], pz = pv.pole[2];
  const omega = pv.omega;
  return [
    omega * (py * z - pz * y),
    omega * (pz * x - px * z),
    omega * (px * y - py * x)
  ];
}
function findCollisions(mesh, r_xyz, plateIsOcean, r_plate, plateVec, plateDensity, noise) {
  const dt = COLLISION_DT_BASE / Math.max(1, Math.sqrt(mesh.numRegions / COLLISION_DT_REF_REGIONS));
  const { numRegions } = mesh;
  const mountain_r = /* @__PURE__ */ new Set();
  const coastline_r = /* @__PURE__ */ new Set();
  const ocean_r = /* @__PURE__ */ new Set();
  const r_stress = new Float32Array(numRegions);
  const r_stressDir = new Float32Array(numRegions * 3);
  const r_subductFactor = new Float32Array(numRegions).fill(0.5);
  const r_boundaryType = new Int8Array(numRegions);
  const r_bothOcean = new Uint8Array(numRegions);
  const r_hasOcean = new Uint8Array(numRegions);
  const { adjOffset, adjList } = mesh;
  const plateOcean = {};
  for (const pid of plateIsOcean) plateOcean[pid] = 1;
  const pairIntensityCache = /* @__PURE__ */ new Map();
  function getPairIntensity(a, b) {
    const lo = Math.min(a, b), hi = Math.max(a, b);
    const key = lo * 1000003 + hi;
    if (pairIntensityCache.has(key)) return pairIntensityCache.get(key);
    let h = (lo * 16807 ^ hi * 48271) >>> 0;
    h = (h >> 16 ^ h) * 73244475 >>> 0;
    const val = PAIR_INTENSITY_BASE + h % 10001 / 1e4;
    pairIntensityCache.set(key, val);
    return val;
  }
  const undulOctaves = numRegions > 2e5 ? 2 : 3;
  for (let r = 0; r < numRegions; r++) {
    const myPlate = r_plate[r];
    let bestComp = -Infinity;
    let best = -1;
    let bestNormalComp = 0;
    for (let ni = adjOffset[r], niEnd = adjOffset[r + 1]; ni < niEnd; ni++) {
      const nb = adjList[ni];
      if (myPlate !== r_plate[nb]) {
        const ri3 = 3 * r, ni3 = 3 * nb;
        const dx = r_xyz[ri3] - r_xyz[ni3], dy = r_xyz[ri3 + 1] - r_xyz[ni3 + 1], dz = r_xyz[ri3 + 2] - r_xyz[ni3 + 2];
        const dBefore = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const v1 = plateVelocityAt(plateVec, myPlate, r_xyz[ri3], r_xyz[ri3 + 1], r_xyz[ri3 + 2]);
        const v2 = plateVelocityAt(plateVec, r_plate[nb], r_xyz[ni3], r_xyz[ni3 + 1], r_xyz[ni3 + 2]);
        const ax = r_xyz[ri3] + v1[0] * dt, ay = r_xyz[ri3 + 1] + v1[1] * dt, az = r_xyz[ri3 + 2] + v1[2] * dt;
        const bx = r_xyz[ni3] + v2[0] * dt, by = r_xyz[ni3 + 1] + v2[1] * dt, bz = r_xyz[ni3 + 2] + v2[2] * dt;
        const adx = ax - bx, ady = ay - by, adz = az - bz;
        const dAfter = Math.sqrt(adx * adx + ady * ady + adz * adz);
        const comp = dBefore - dAfter;
        if (comp > bestComp) {
          bestComp = comp;
          best = nb;
          const rvx = v1[0] - v2[0], rvy = v1[1] - v2[1], rvz = v1[2] - v2[2];
          const bnLen = dBefore || 1;
          bestNormalComp = -(rvx * dx + rvy * dy + rvz * dz) / bnLen;
        }
      }
    }
    if (best !== -1) {
      const collided = bestComp > COLLISION_THRESHOLD * dt;
      const rOcean = plateOcean[myPlate] || 0;
      const nOcean = plateOcean[r_plate[best]] || 0;
      r_bothOcean[r] = rOcean && nOcean ? 1 : 0;
      r_hasOcean[r] = rOcean || nOcean ? 1 : 0;
      const thresh = BOUNDARY_TYPE_THRESH_FACTOR * dt;
      if (bestNormalComp > thresh) r_boundaryType[r] = 1;
      else if (bestNormalComp < -thresh) r_boundaryType[r] = 2;
      else r_boundaryType[r] = 3;
      if (collided) {
        r_stress[r] = bestComp / dt * getPairIntensity(myPlate, r_plate[best]);
        const sdx = r_xyz[3 * r] - r_xyz[3 * best], sdy = r_xyz[3 * r + 1] - r_xyz[3 * best + 1], sdz = r_xyz[3 * r + 2] - r_xyz[3 * best + 2];
        const sdLen = Math.sqrt(sdx * sdx + sdy * sdy + sdz * sdz) || 1e-10;
        r_stressDir[3 * r] = sdx / sdLen;
        r_stressDir[3 * r + 1] = sdy / sdLen;
        r_stressDir[3 * r + 2] = sdz / sdLen;
      }
      const myDensity = plateDensity[myPlate];
      const nbDensity = plateDensity[r_plate[best]];
      const densityDiff = myDensity - nbDensity;
      const baseFactor = SUBDUCT_FACTOR_BASE + SUBDUCT_FACTOR_BASE * Math.tanh(densityDiff * SUBDUCT_FACTOR_TANH_SCALE);
      const densityContrast = Math.abs(densityDiff);
      const undulationStrength = Math.exp(-densityContrast * SUBDUCT_UNDULATION_DENSITY_DECAY);
      const x = r_xyz[3 * r], y = r_xyz[3 * r + 1], z = r_xyz[3 * r + 2];
      const undulation = noise.fbm(x * SUBDUCT_UNDULATION_FREQ, y * SUBDUCT_UNDULATION_FREQ, z * SUBDUCT_UNDULATION_FREQ, undulOctaves) * SUBDUCT_UNDULATION_AMP * undulationStrength;
      r_subductFactor[r] = Math.max(0, Math.min(1, baseFactor + undulation));
      if (rOcean && nOcean) {
        (collided ? coastline_r : ocean_r).add(r);
      } else if (!rOcean && !nOcean) {
        if (collided) {
          if (r_subductFactor[r] < SUBDUCT_THRESHOLD) mountain_r.add(r);
          else coastline_r.add(r);
        }
      } else {
        (collided ? mountain_r : coastline_r).add(r);
      }
    }
  }
  return { mountain_r, coastline_r, ocean_r, r_stress, r_stressDir, r_subductFactor, r_boundaryType, r_bothOcean, r_hasOcean };
}
function propagateStress(mesh, r_stress, r_stressDir, r_subductFactor, r_plate, r_xyz, plateIsOcean, decayFactor, subductDecayFactor, numPasses) {
  const { adjOffset, adjList } = mesh;
  const plateOcean = {};
  for (const pid of plateIsOcean) plateOcean[pid] = 1;
  let frontier = [];
  for (let r = 0; r < mesh.numRegions; r++) {
    if (r_stress[r] > STRESS_PROPAGATE_MIN) frontier.push(r);
  }
  for (let pass = 0; pass < numPasses && frontier.length > 0; pass++) {
    const nextFrontier = [];
    for (let fi = 0; fi < frontier.length; fi++) {
      const r = frontier[fi];
      const plate = r_plate[r];
      if (plateOcean[plate]) continue;
      const sf = r_subductFactor[r];
      const effDecay = sf > SUBDUCT_FACTOR_BASE ? subductDecayFactor : decayFactor;
      const basePropagate = r_stress[r] * effDecay;
      if (basePropagate < STRESS_PROPAGATE_CUTOFF) continue;
      const sdx = r_stressDir[3 * r], sdy = r_stressDir[3 * r + 1], sdz = r_stressDir[3 * r + 2];
      const hasDir = sdx !== 0 || sdy !== 0 || sdz !== 0;
      for (let ni = adjOffset[r], niEnd = adjOffset[r + 1]; ni < niEnd; ni++) {
        const nb = adjList[ni];
        if (r_plate[nb] !== plate) continue;
        let propagated = basePropagate;
        if (hasDir) {
          const tdx = r_xyz[3 * nb] - r_xyz[3 * r];
          const tdy = r_xyz[3 * nb + 1] - r_xyz[3 * r + 1];
          const tdz = r_xyz[3 * nb + 2] - r_xyz[3 * r + 2];
          const tLen = Math.sqrt(tdx * tdx + tdy * tdy + tdz * tdz) || 1e-10;
          const alignment = (sdx * tdx + sdy * tdy + sdz * tdz) / tLen;
          const dirFactor = Math.max(STRESS_DIR_FACTOR_MIN, STRESS_DIR_FACTOR_BASE + STRESS_DIR_FACTOR_SCALE * alignment);
          propagated *= dirFactor;
        }
        if (propagated > r_stress[nb]) {
          r_stress[nb] = propagated;
          r_subductFactor[nb] = sf;
          nextFrontier.push(nb);
          if (hasDir) {
            const tdx = r_xyz[3 * nb] - r_xyz[3 * r];
            const tdy = r_xyz[3 * nb + 1] - r_xyz[3 * r + 1];
            const tdz = r_xyz[3 * nb + 2] - r_xyz[3 * r + 2];
            const tLen = Math.sqrt(tdx * tdx + tdy * tdy + tdz * tdz) || 1e-10;
            const bx = sdx * STRESS_DIR_BLEND_PARENT + tdx / tLen * STRESS_DIR_BLEND_TRAVEL;
            const by = sdy * STRESS_DIR_BLEND_PARENT + tdy / tLen * STRESS_DIR_BLEND_TRAVEL;
            const bz = sdz * STRESS_DIR_BLEND_PARENT + tdz / tLen * STRESS_DIR_BLEND_TRAVEL;
            const bLen = Math.sqrt(bx * bx + by * by + bz * bz) || 1e-10;
            r_stressDir[3 * nb] = bx / bLen;
            r_stressDir[3 * nb + 1] = by / bLen;
            r_stressDir[3 * nb + 2] = bz / bLen;
          }
        }
      }
    }
    frontier = nextFrontier;
  }
  for (let pass = 0; pass < STRESS_DIR_SMOOTH_PASSES; pass++) {
    for (let r = 0; r < mesh.numRegions; r++) {
      if (r_stress[r] < STRESS_PROPAGATE_MIN) continue;
      const plate = r_plate[r];
      if (plateOcean[plate]) continue;
      let ax = 0, ay = 0, az = 0, totalW = 0;
      const selfW = r_stress[r] * STRESS_DIR_SELF_WEIGHT;
      ax += r_stressDir[3 * r] * selfW;
      ay += r_stressDir[3 * r + 1] * selfW;
      az += r_stressDir[3 * r + 2] * selfW;
      totalW += selfW;
      for (let ni = adjOffset[r], niEnd = adjOffset[r + 1]; ni < niEnd; ni++) {
        const nb = adjList[ni];
        if (r_plate[nb] !== plate || r_stress[nb] < STRESS_PROPAGATE_MIN) continue;
        const w = r_stress[nb];
        ax += r_stressDir[3 * nb] * w;
        ay += r_stressDir[3 * nb + 1] * w;
        az += r_stressDir[3 * nb + 2] * w;
        totalW += w;
      }
      if (totalW > 0) {
        const len2 = Math.sqrt(ax * ax + ay * ay + az * az) || 1e-10;
        r_stressDir[3 * r] = ax / len2;
        r_stressDir[3 * r + 1] = ay / len2;
        r_stressDir[3 * r + 2] = az / len2;
      }
    }
  }
}
function assignDistanceField(mesh, seeds, stops, seed) {
  const randInt = makeRandInt(seed);
  const { numRegions } = mesh;
  const r_dist = new Float32Array(numRegions).fill(Infinity);
  const isStop = new Uint8Array(numRegions);
  for (const r of stops) isStop[r] = 1;
  const queue = [];
  for (const r of seeds) {
    queue.push(r);
    r_dist[r] = 0;
  }
  const { adjOffset, adjList } = mesh;
  for (let qi = 0; qi < queue.length; qi++) {
    const pos = qi + randInt(queue.length - qi);
    const cur = queue[pos];
    queue[pos] = queue[qi];
    for (let ni = adjOffset[cur], niEnd = adjOffset[cur + 1]; ni < niEnd; ni++) {
      const nb = adjList[ni];
      if (r_dist[nb] === Infinity && !isStop[nb]) {
        r_dist[nb] = r_dist[cur] + 1;
        queue.push(nb);
      }
    }
  }
  return r_dist;
}
function computeTectonicState(mesh, r_xyz, plateIsOcean, r_plate, plateVec, plateSeeds, plateDensity, noise, superPlateData, r_mantleField, spread) {
  const { numRegions } = mesh;
  let r_mantleNorm = null;
  if (r_mantleField) {
    let mantleMax = 0;
    for (let r = 0; r < numRegions; r++) {
      const v2 = Math.abs(r_mantleField[r]);
      if (v2 > mantleMax) mantleMax = v2;
    }
    if (mantleMax > 1e-6) {
      r_mantleNorm = new Float32Array(numRegions);
      const inv = 1 / mantleMax;
      for (let r = 0; r < numRegions; r++) r_mantleNorm[r] = r_mantleField[r] * inv;
    }
  }
  const smallCol = findCollisions(mesh, r_xyz, plateIsOcean, r_plate, plateVec, plateDensity, noise);
  const hasSuperPlates = superPlateData != null;
  let superCol = null;
  if (hasSuperPlates) {
    superCol = findCollisions(
      mesh,
      r_xyz,
      superPlateData.superPlateIsOcean,
      superPlateData.r_superPlate,
      superPlateData.superPlateVec,
      superPlateData.superPlateDensity,
      noise
    );
  }
  let mountain_r, coastline_r, ocean_r, r_stress, r_stressDir, r_subductFactor, r_boundaryType, r_bothOcean, r_hasOcean;
  if (!hasSuperPlates) {
    ({ mountain_r, coastline_r, ocean_r, r_stress, r_stressDir, r_subductFactor, r_boundaryType, r_bothOcean, r_hasOcean } = smallCol);
  } else {
    mountain_r = new Set(superCol.mountain_r);
    ocean_r = new Set(superCol.ocean_r);
    coastline_r = /* @__PURE__ */ new Set();
    for (const r of superCol.coastline_r) {
      if (!mountain_r.has(r)) coastline_r.add(r);
    }
    r_boundaryType = new Int8Array(superCol.r_boundaryType);
    r_bothOcean = new Uint8Array(superCol.r_bothOcean);
    r_hasOcean = new Uint8Array(superCol.r_hasOcean);
    r_stress = new Float32Array(numRegions);
    for (let r = 0; r < numRegions; r++) {
      r_stress[r] = SMALL_W * smallCol.r_stress[r] + SUPER_W * superCol.r_stress[r];
    }
    r_subductFactor = new Float32Array(numRegions);
    for (let r = 0; r < numRegions; r++) {
      const wS = SMALL_W * smallCol.r_stress[r], wP = SUPER_W * superCol.r_stress[r];
      const total = wS + wP;
      if (total > 1e-6) {
        r_subductFactor[r] = (wS * smallCol.r_subductFactor[r] + wP * superCol.r_subductFactor[r]) / total;
      } else {
        r_subductFactor[r] = SMALL_W * smallCol.r_subductFactor[r] + SUPER_W * superCol.r_subductFactor[r];
      }
    }
    r_stressDir = new Float32Array(numRegions * 3);
    for (let r = 0; r < numRegions; r++) {
      const wS = SMALL_W * smallCol.r_stress[r], wP = SUPER_W * superCol.r_stress[r];
      const total = wS + wP;
      if (total > 1e-6) {
        const bx = wS * smallCol.r_stressDir[3 * r] + wP * superCol.r_stressDir[3 * r];
        const by = wS * smallCol.r_stressDir[3 * r + 1] + wP * superCol.r_stressDir[3 * r + 1];
        const bz = wS * smallCol.r_stressDir[3 * r + 2] + wP * superCol.r_stressDir[3 * r + 2];
        const bLen = Math.sqrt(bx * bx + by * by + bz * bz) || 1e-10;
        r_stressDir[3 * r] = bx / bLen;
        r_stressDir[3 * r + 1] = by / bLen;
        r_stressDir[3 * r + 2] = bz / bLen;
      }
    }
  }
  const scaleFactor = Math.sqrt(numRegions / COLLISION_DT_REF_REGIONS);
  const baseDecay = STRESS_DECAY_BASE + spread * STRESS_DECAY_SPREAD_FACTOR;
  const decayFactor = Math.pow(baseDecay, 1 / scaleFactor);
  const subductBaseDecay = baseDecay * STRESS_SUBDUCT_DECAY_MULT;
  const subductDecayFactor = Math.pow(subductBaseDecay, 1 / scaleFactor);
  const numPasses = Math.max(1, Math.round(spread * STRESS_PASSES_PER_SPREAD * scaleFactor));
  if (!hasSuperPlates) {
    propagateStress(mesh, r_stress, r_stressDir, r_subductFactor, r_plate, r_xyz, plateIsOcean, decayFactor, subductDecayFactor, numPasses);
  } else {
    const smallStress = new Float32Array(smallCol.r_stress);
    const smallDir = new Float32Array(smallCol.r_stressDir);
    const smallSubduct = new Float32Array(smallCol.r_subductFactor);
    propagateStress(mesh, smallStress, smallDir, smallSubduct, r_plate, r_xyz, plateIsOcean, decayFactor, subductDecayFactor, numPasses);
    const superStress = new Float32Array(superCol.r_stress);
    const superDir = new Float32Array(superCol.r_stressDir);
    const superSubduct = new Float32Array(superCol.r_subductFactor);
    propagateStress(mesh, superStress, superDir, superSubduct, superPlateData.r_superPlate, r_xyz, superPlateData.superPlateIsOcean, decayFactor, subductDecayFactor, numPasses);
    for (let r = 0; r < numRegions; r++) {
      r_stress[r] = SMALL_W * smallStress[r] + SUPER_W * superStress[r];
    }
    for (let r = 0; r < numRegions; r++) {
      const wS = SMALL_W * smallStress[r], wP = SUPER_W * superStress[r];
      const total = wS + wP;
      if (total > 1e-6) {
        r_subductFactor[r] = (wS * smallSubduct[r] + wP * superSubduct[r]) / total;
      }
    }
  }
  if (r_mantleNorm) {
    for (let r = 0; r < numRegions; r++) {
      if (r_stress[r] < 1e-6) continue;
      const mult = 1 + MANTLE_STRESS_BOOST * Math.max(-0.5, r_mantleNorm[r]);
      r_stress[r] *= mult;
    }
  }
  {
    const plateRep = {};
    for (let r = 0; r < numRegions; r++) {
      const pid = r_plate[r];
      if (plateRep[pid] === void 0 && !mountain_r.has(r) && !coastline_r.has(r) && !ocean_r.has(r)) {
        plateRep[pid] = r;
      }
    }
    for (const pid of plateSeeds) {
      const rep = plateRep[pid];
      if (rep !== void 0) {
        (plateIsOcean.has(pid) ? ocean_r : coastline_r).add(rep);
      }
    }
  }
  const stress_mountain_r = /* @__PURE__ */ new Set();
  for (const r of mountain_r) {
    if (r_subductFactor[r] < SUBDUCT_THRESHOLD) stress_mountain_r.add(r);
  }
  let maxStress = 0;
  const stressVals = [];
  for (let r = 0; r < numRegions; r++) {
    if (r_stress[r] > STRESS_PROPAGATE_MIN) stressVals.push(r_stress[r]);
    if (r_stress[r] > maxStress) maxStress = r_stress[r];
  }
  if (stressVals.length > 0) {
    stressVals.sort((a, b) => a - b);
    maxStress = stressVals[Math.min(stressVals.length - 1, Math.floor(stressVals.length * STRESS_PERCENTILE))];
  }
  if (maxStress < 0.01) maxStress = 1;
  return {
    mountain_r,
    coastline_r,
    ocean_r,
    stress_mountain_r,
    r_stress,
    r_stressDir,
    r_subductFactor,
    r_boundaryType,
    r_bothOcean,
    r_hasOcean,
    r_mantleNorm,
    maxStress,
    scaleFactor
  };
}
function computeSpatialFields(mesh, r_xyz, r_plate, plateIsOcean, tect, seed, superPlateData) {
  const { numRegions, adjOffset, adjList } = mesh;
  const { stress_mountain_r, coastline_r, ocean_r, r_boundaryType, r_bothOcean, r_hasOcean, r_subductFactor, r_stress, maxStress, scaleFactor } = tect;
  const r_riftPlate = superPlateData ? superPlateData.r_superPlate : r_plate;
  const r_isOcean = new Uint8Array(numRegions);
  for (let r = 0; r < numRegions; r++) {
    if (plateIsOcean.has(r_plate[r])) r_isOcean[r] = 1;
  }
  const stop_r = /* @__PURE__ */ new Set([...stress_mountain_r, ...coastline_r, ...ocean_r]);
  const dist_mountain = assignDistanceField(mesh, stress_mountain_r, ocean_r, seed + 1);
  const dist_ocean = assignDistanceField(mesh, ocean_r, coastline_r, seed + 2);
  const dist_coastline = assignDistanceField(mesh, coastline_r, stop_r, seed + 3);
  const coastSeeds = /* @__PURE__ */ new Set();
  for (let r = 0; r < numRegions; r++) {
    if (!r_isOcean[r]) {
      for (let ni = adjOffset[r], niEnd = adjOffset[r + 1]; ni < niEnd; ni++) {
        if (r_isOcean[adjList[ni]]) {
          coastSeeds.add(adjList[ni]);
          break;
        }
      }
    }
  }
  const dist_coast = assignDistanceField(mesh, coastSeeds, /* @__PURE__ */ new Set(), seed + 4);
  const landCoastSeeds = /* @__PURE__ */ new Set();
  for (let r = 0; r < numRegions; r++) {
    if (r_isOcean[r]) continue;
    for (let ni = adjOffset[r], niEnd = adjOffset[r + 1]; ni < niEnd; ni++) {
      if (r_isOcean[adjList[ni]]) {
        landCoastSeeds.add(r);
        break;
      }
    }
  }
  const oceanBarriers = /* @__PURE__ */ new Set();
  for (let r = 0; r < numRegions; r++) {
    if (r_isOcean[r]) oceanBarriers.add(r);
  }
  const dist_coast_land = assignDistanceField(mesh, landCoastSeeds, oceanBarriers, seed + 5);
  const coastBdry = [];
  for (let r = 0; r < numRegions; r++) {
    const rOc = r_isOcean[r];
    for (let ni = adjOffset[r], niEnd = adjOffset[r + 1]; ni < niEnd; ni++) {
      if (r_isOcean[adjList[ni]] !== rOc) {
        coastBdry.push(r);
        break;
      }
    }
  }
  const maxCD = Math.max(8, Math.round(COAST_BFS_WIDTH_BASE * scaleFactor));
  const dBdry = new Float32Array(numRegions);
  dBdry.fill(maxCD + 1);
  const coastStressMax = new Float32Array(numRegions);
  const coastSubductMax = new Float32Array(numRegions);
  const coastConvergent = new Uint8Array(numRegions);
  for (let i = 0; i < coastBdry.length; i++) {
    const r = coastBdry[i];
    dBdry[r] = 0;
    coastStressMax[r] = Math.min(1, r_stress[r] / maxStress);
    coastSubductMax[r] = r_subductFactor[r];
    coastConvergent[r] = r_boundaryType[r] === 1 ? 1 : 0;
  }
  {
    let qi = 0;
    while (qi < coastBdry.length) {
      const r = coastBdry[qi++];
      const nd = dBdry[r] + 1;
      if (nd > maxCD) continue;
      for (let ni = adjOffset[r], niEnd = adjOffset[r + 1]; ni < niEnd; ni++) {
        const nr = adjList[ni];
        if (nd < dBdry[nr]) {
          dBdry[nr] = nd;
          coastStressMax[nr] = coastStressMax[r];
          coastSubductMax[nr] = coastSubductMax[r];
          coastConvergent[nr] = coastConvergent[r];
          coastBdry.push(nr);
        } else if (nd === dBdry[nr] && coastStressMax[r] > coastStressMax[nr]) {
          coastStressMax[nr] = coastStressMax[r];
          coastSubductMax[nr] = coastSubductMax[r];
          coastConvergent[nr] = coastConvergent[r];
        }
      }
    }
  }
  const riftHalfWidth = Math.max(2, Math.round(RIFT_HALF_WIDTH_BASE * scaleFactor));
  const riftDist = new Float32Array(numRegions).fill(Infinity);
  const riftSeeds = [];
  for (let r = 0; r < numRegions; r++) {
    if (r_boundaryType[r] === 2 && !r_hasOcean[r]) {
      riftSeeds.push(r);
      riftDist[r] = 0;
    }
  }
  {
    let qi = 0;
    while (qi < riftSeeds.length) {
      const r = riftSeeds[qi++];
      const nd = riftDist[r] + 1;
      if (nd > riftHalfWidth) continue;
      const plate = r_riftPlate[r];
      for (let ni = adjOffset[r], niEnd = adjOffset[r + 1]; ni < niEnd; ni++) {
        const nr = adjList[ni];
        if (nd < riftDist[nr] && r_riftPlate[nr] === plate && !r_isOcean[nr]) {
          riftDist[nr] = nd;
          riftSeeds.push(nr);
        }
      }
    }
  }
  const ridgeHalfWidth = Math.max(2, Math.round(RIDGE_HALF_WIDTH_BASE * scaleFactor));
  const ridgeDist = new Float32Array(numRegions).fill(Infinity);
  const ridgeSeeds = [];
  for (let r = 0; r < numRegions; r++) {
    if (r_boundaryType[r] === 2 && r_bothOcean[r]) {
      ridgeSeeds.push(r);
      ridgeDist[r] = 0;
    }
  }
  {
    let qi = 0;
    while (qi < ridgeSeeds.length) {
      const r = ridgeSeeds[qi++];
      const nd = ridgeDist[r] + 1;
      if (nd > ridgeHalfWidth) continue;
      for (let ni = adjOffset[r], niEnd = adjOffset[r + 1]; ni < niEnd; ni++) {
        const nr = adjList[ni];
        if (nd < ridgeDist[nr] && r_isOcean[nr]) {
          ridgeDist[nr] = nd;
          ridgeSeeds.push(nr);
        }
      }
    }
  }
  const fractureHalfWidth = Math.max(2, Math.round(FRACTURE_HALF_WIDTH_BASE * scaleFactor));
  const fractureDist = new Float32Array(numRegions).fill(Infinity);
  const fractureSeeds = [];
  for (let r = 0; r < numRegions; r++) {
    if (r_boundaryType[r] === 3 && r_bothOcean[r]) {
      fractureSeeds.push(r);
      fractureDist[r] = 0;
    }
  }
  {
    let qi = 0;
    while (qi < fractureSeeds.length) {
      const r = fractureSeeds[qi++];
      const nd = fractureDist[r] + 1;
      if (nd > fractureHalfWidth) continue;
      for (let ni = adjOffset[r], niEnd = adjOffset[r + 1]; ni < niEnd; ni++) {
        const nr = adjList[ni];
        if (nd < fractureDist[nr] && r_isOcean[nr]) {
          fractureDist[nr] = nd;
          fractureSeeds.push(nr);
        }
      }
    }
  }
  const baStart = Math.max(1, Math.round(BACK_ARC_START_BASE * scaleFactor));
  const baPeak = Math.max(2, Math.round(BACK_ARC_PEAK_BASE * scaleFactor));
  const baEnd = Math.max(3, Math.round(BACK_ARC_END_BASE * scaleFactor));
  const backArcDist = new Float32Array(numRegions).fill(Infinity);
  const backArcStress = new Float32Array(numRegions);
  const backArcSeeds = [];
  for (let r = 0; r < numRegions; r++) {
    if (r_boundaryType[r] === 1 && r_hasOcean[r] && r_subductFactor[r] < BACK_ARC_SUBDUCT_THRESH) {
      backArcSeeds.push(r);
      backArcDist[r] = 0;
      backArcStress[r] = Math.min(1, r_stress[r] / maxStress);
    }
  }
  {
    let qi = 0;
    while (qi < backArcSeeds.length) {
      const r = backArcSeeds[qi++];
      const nd = backArcDist[r] + 1;
      if (nd > baEnd) continue;
      const plate = r_plate[r];
      for (let ni = adjOffset[r], niEnd = adjOffset[r + 1]; ni < niEnd; ni++) {
        const nr = adjList[ni];
        if (nd < backArcDist[nr] && r_plate[nr] === plate) {
          backArcDist[nr] = nd;
          backArcStress[nr] = backArcStress[r];
          backArcSeeds.push(nr);
        }
      }
    }
  }
  return {
    r_isOcean,
    dist_mountain,
    dist_ocean,
    dist_coastline,
    dist_coast,
    dist_coast_land,
    dBdry,
    coastStressMax,
    coastSubductMax,
    coastConvergent,
    maxCD,
    riftDist,
    riftHalfWidth,
    ridgeDist,
    ridgeHalfWidth,
    fractureDist,
    fractureHalfWidth,
    backArcDist,
    backArcStress,
    baStart,
    baPeak,
    baEnd,
    interiorBand: Math.max(4, Math.round(INTERIOR_BAND_BASE * scaleFactor)),
    tectonicReach: Math.max(6, Math.round(TECTONIC_REACH_BASE * scaleFactor)),
    plateauStart: Math.max(2, Math.round(PLATEAU_START_BASE * scaleFactor)),
    ridgeSigmaBase: Math.max(2, Math.round(RIDGE_SIGMA_BASE * scaleFactor)),
    ridgePeakShift: Math.max(1, Math.round(RIDGE_PEAK_SHIFT_BASE * scaleFactor)),
    ridgeExtent: Math.max(4, Math.round(RIDGE_EXTENT_BASE * scaleFactor))
  };
}
function classifyTerrain(mesh, r_xyz, tect, sf, seed) {
  const { numRegions } = mesh;
  const { r_subductFactor, r_stress, maxStress } = tect;
  const { r_isOcean, dist_mountain, tectonicReach, plateauStart } = sf;
  const r_basinFactor = new Float32Array(numRegions);
  {
    const basinNoise = new SimplexNoise(seed + 661);
    for (let r = 0; r < numRegions; r++) {
      if (r_isOcean[r]) continue;
      const bx = r_xyz[3 * r], by = r_xyz[3 * r + 1], bz = r_xyz[3 * r + 2];
      const raw = basinNoise.fbm(bx * BASIN_FREQ + 7.3, by * BASIN_FREQ + 3.1, bz * BASIN_FREQ + 9.7, 2, 0.5);
      r_basinFactor[r] = Math.max(0, Math.min(1, BASIN_FACTOR_BIAS + raw * BASIN_FACTOR_SCALE));
    }
  }
  const r_tectonicActivity = new Float32Array(numRegions);
  const r_t_foldBelt = new Float32Array(numRegions);
  const r_t_craton = new Float32Array(numRegions);
  const r_t_basin = new Float32Array(numRegions);
  const r_t_plateau = new Uint8Array(numRegions);
  const r_noiseAmp = new Float32Array(numRegions);
  for (let r = 0; r < numRegions; r++) {
    const sf_r = r_subductFactor[r];
    const stressNorm = Math.min(1, r_stress[r] / maxStress);
    const dMtn = dist_mountain[r];
    const effReach = sf_r > 0.5 ? tectonicReach * (SUBDUCTING_REACH_MIN + SUBDUCTING_REACH_RANGE * (1 - sf_r)) : tectonicReach;
    const rawProximity = dMtn === Infinity || dMtn >= effReach ? 0 : 1 - dMtn / effReach;
    const tecActivity = Math.max(stressNorm, rawProximity * rawProximity * rawProximity);
    r_tectonicActivity[r] = tecActivity;
    if (r_isOcean[r]) continue;
    const basin = r_basinFactor[r];
    r_t_foldBelt[r] = Math.min(1, stressNorm * FOLD_BELT_MULT);
    r_t_craton[r] = Math.max(0, 1 - tecActivity * CRATON_TECTONIC_MULT) * (1 - basin);
    r_t_basin[r] = basin * Math.max(0, 1 - tecActivity * BASIN_TECTONIC_MULT);
    const isPlateauZone = sf_r < 0.45 && dMtn !== Infinity && dMtn > plateauStart;
    r_t_plateau[r] = isPlateauZone ? 1 : 0;
    const noiseActivity = Math.min(1, stressNorm * NOISE_ACTIVITY_SCALE);
    const plateauSuppress = isPlateauZone ? Math.max(PLATEAU_SUPPRESS_MIN, 1 - tecActivity * PLATEAU_SUPPRESS_SCALE) : 1;
    const basinAmpSuppress = 1 - r_t_basin[r] * BASIN_AMP_SUPPRESS;
    const cratonAmpSuppress = 1 - r_t_craton[r] * CRATON_AMP_SUPPRESS;
    r_noiseAmp[r] = (NOISE_BASE_SCALE + NOISE_ACTIVITY_CONTRIB * noiseActivity) * plateauSuppress * basinAmpSuppress * cratonAmpSuppress;
  }
  return { r_basinFactor, r_tectonicActivity, r_t_foldBelt, r_t_craton, r_t_basin, r_t_plateau, r_noiseAmp };
}
function buildSkeleton(mesh, r_xyz, plateIsOcean, r_plate, plateVec, plateSeeds, tect, sf, tt, noise, noiseMag, seed, debugLayers) {
  const { numRegions } = mesh;
  const r_elevation = new Float32Array(numRegions);
  const dl_base = debugLayers.base;
  const dl_tectonic = debugLayers.tectonic;
  const dl_interior = debugLayers.interior;
  const dl_ocean = debugLayers.ocean;
  const dl_coastal = debugLayers.coastal;
  const dl_margins = debugLayers.margins;
  const dl_backArc = debugLayers.backArc;
  const dl_orogenicPower = debugLayers.orogenicPower;
  const { r_subductFactor, r_stress, r_boundaryType, r_hasOcean, r_bothOcean, maxStress, scaleFactor } = tect;
  const {
    r_isOcean,
    dist_mountain,
    dist_ocean,
    dist_coastline,
    dist_coast,
    dist_coast_land,
    dBdry,
    coastConvergent,
    maxCD,
    riftDist,
    riftHalfWidth,
    ridgeDist,
    ridgeHalfWidth,
    fractureDist,
    fractureHalfWidth,
    backArcDist,
    backArcStress,
    baStart,
    baPeak,
    baEnd,
    interiorBand,
    tectonicReach,
    plateauStart,
    ridgeSigmaBase,
    ridgePeakShift,
    ridgeExtent
  } = sf;
  const { r_basinFactor, r_tectonicActivity, r_t_plateau } = tt;
  const plateBaseHeight = {};
  {
    const rng = makeRng(seed + 777);
    for (const pid of plateSeeds) {
      if (!plateIsOcean.has(pid)) {
        const u1 = rng(), u22 = rng();
        const normal = Math.sqrt(-2 * Math.log(u1 || 1e-10)) * Math.cos(2 * Math.PI * u22);
        plateBaseHeight[pid] = PLATE_BASE_HEIGHT_MEAN + normal * PLATE_BASE_HEIGHT_STDDEV;
      }
    }
  }
  const foldNoise = new SimplexNoise(seed + 557);
  const riftNoise = new SimplexNoise(seed + 419);
  const eps = 1e-3;
  const warpScale = WARP_SCALE;
  const warpOctaves = numRegions > 2e5 ? 2 : 3;
  for (let r = 0; r < numRegions; r++) {
    const isOceanPlate = r_isOcean[r];
    const sf_r = r_subductFactor[r];
    const stressNorm = Math.min(1, r_stress[r] / maxStress);
    const btype = r_boundaryType[r];
    const x = r_xyz[3 * r], y = r_xyz[3 * r + 1], z = r_xyz[3 * r + 2];
    const sfAsym = sf_r;
    const asymmetry = 1 + (sfAsym - 0.5) * ASYMMETRY_FACTOR;
    const a = dist_mountain[r] * asymmetry + eps;
    const b = dist_ocean[r] + eps;
    const c = dist_coastline[r] + eps;
    if (a === Infinity && b === Infinity) {
      r_elevation[r] = 0.1 * BASE_SCALE;
    } else {
      r_elevation[r] = (1 / a - 1 / b) / (1 / a + 1 / b + 1 / c) * BASE_SCALE;
    }
    dl_base[r] = r_elevation[r];
    const wx = x + warpScale * noise.fbm(x + 5.3, y + 1.7, z + 3.1, warpOctaves);
    const wy = y + warpScale * noise.fbm(x + 8.1, y + 2.9, z + 7.3, warpOctaves);
    const wz = z + warpScale * noise.fbm(x + 1.4, y + 6.2, z + 4.8, warpOctaves);
    const rawOro = noise.noise3D(x * OROGENIC_FREQ + 33.7, y * OROGENIC_FREQ + 11.2, z * OROGENIC_FREQ + 22.9);
    const shaped = rawOro >= 0 ? Math.sqrt(rawOro) : -Math.sqrt(-rawOro);
    const orogenicPower = Math.max(0, Math.min(1, 0.5 + 0.5 * shaped));
    dl_orogenicPower[r] = orogenicPower - 0.5;
    if (!isOceanPlate) {
      const pid = r_plate[r];
      if (plateBaseHeight[pid] !== void 0) {
        r_elevation[r] += plateBaseHeight[pid];
      }
      const elevBefore = r_elevation[r];
      if (sf_r > 0.5 && r_elevation[r] > 0) {
        const suppression = (sf_r - 0.5) * 2;
        r_elevation[r] *= 1 - suppression * SUBDUCTING_SUPPRESSION;
      }
      if (stressNorm > 0.01) {
        const stressMag = stressNorm * stressNorm * STRESS_MAG_SCALE * orogenicPower;
        const uplift = stressMag * (1 - sf_r);
        const depress = stressMag * STRESS_DEPRESS_FRAC * sf_r;
        const heightVar = STRESS_HEIGHT_VAR_BASE + STRESS_HEIGHT_VAR_SCALE * noise.fbm(x * 8 + 13.7, y * 8 + 9.2, z * 8 + 4.5, 3);
        r_elevation[r] += (uplift - depress) * heightVar;
      }
      {
        const dMtn = dist_mountain[r];
        if (dMtn !== Infinity && stressNorm < FORELAND_STRESS_THRESH && sf_r < BACK_ARC_SUBDUCT_THRESH) {
          const forelandWidth = Math.max(2, Math.round(interiorBand * FORELAND_WIDTH_FRAC));
          if (dMtn < forelandWidth) {
            const t = dMtn / forelandWidth;
            const peakPos = FORELAND_PEAK_POS;
            let profile;
            if (t < peakPos) {
              const s = t / peakPos;
              profile = s * s * (3 - 2 * s);
            } else {
              const s = (t - peakPos) / (1 - peakPos);
              profile = 1 - s * s * (3 - 2 * s);
            }
            const stressFade = 1 - Math.min(1, stressNorm / FORELAND_STRESS_THRESH);
            const basinDeepening = FORELAND_BASIN_DEEPENING_BASE + FORELAND_BASIN_DEEPENING_SCALE * r_basinFactor[r];
            r_elevation[r] -= FORELAND_BASIN_DEPTH * profile * stressFade * basinDeepening;
          }
        }
      }
      {
        const rd = riftDist[r];
        if (rd !== Infinity) {
          const widthRaw = riftNoise.fbm(
            x * RIFT_WIDTH_VAR_FREQ + 91.3,
            y * RIFT_WIDTH_VAR_FREQ + 17.6,
            z * RIFT_WIDTH_VAR_FREQ + 64.2,
            2
          );
          const widthNorm = Math.max(0, Math.min(1, 0.5 + widthRaw));
          const floorScale = RIFT_FLOOR_VAR_MIN + (1 - RIFT_FLOOR_VAR_MIN) * widthNorm * widthNorm;
          const shoulderScale = RIFT_SHOULDER_VAR_MIN + (1 - RIFT_SHOULDER_VAR_MIN) * widthNorm;
          const plateOffset = r_plate[r] * 0.6180339887 % 1 * 100;
          const asymRaw = riftNoise.fbm(
            x * RIFT_WIDTH_ASYM_FREQ + plateOffset,
            y * RIFT_WIDTH_ASYM_FREQ + plateOffset * 1.7,
            z * RIFT_WIDTH_ASYM_FREQ + plateOffset * 0.3,
            2
          );
          const asymNorm = Math.max(0, Math.min(1, 0.5 + asymRaw));
          const widthAsym = RIFT_WIDTH_ASYM_MIN + (1 - RIFT_WIDTH_ASYM_MIN) * asymNorm;
          const floorEnd = RIFT_FLOOR_MULT * scaleFactor * floorScale * widthAsym;
          const shoulderEnd = floorEnd + RIFT_SHOULDER_INNER_MULT * scaleFactor * shoulderScale * widthAsym;
          const localHalfWidth = floorEnd + RIFT_SHOULDER_OUTER_MULT * scaleFactor * shoulderScale * widthAsym;
          if (rd <= localHalfWidth + 0.5) {
            const shoulderHeightNoise = RIFT_SHOULDER_HEIGHT_VAR_BASE + RIFT_SHOULDER_HEIGHT_VAR_SCALE * foldNoise.fbm(
              x * RIFT_SHOULDER_HEIGHT_VAR_FREQ + 41.7,
              y * RIFT_SHOULDER_HEIGHT_VAR_FREQ + 53.1,
              z * RIFT_SHOULDER_HEIGHT_VAR_FREQ + 27.4,
              2
            );
            let riftEffect = 0;
            if (rd <= 0.5) {
              riftEffect = RIFT_AXIS_DEPTH;
              riftEffect += riftNoise.ridgedFbm(x * 8, y * 8, z * 8, 3) * RIFT_AXIS_VOLCANIC_AMP;
            } else if (rd <= floorEnd) {
              const t = floorEnd > 0 ? rd / floorEnd : 1;
              riftEffect = RIFT_FLOOR_DEPTH * (1 - t * RIFT_FLOOR_TAPER);
              riftEffect += riftNoise.ridgedFbm(x * 8, y * 8, z * 8, 3) * RIFT_FLOOR_VOLCANIC_AMP * (1 - t);
            } else if (rd <= shoulderEnd) {
              riftEffect = RIFT_SHOULDER_UPLIFT * shoulderHeightNoise;
            } else if (localHalfWidth > shoulderEnd) {
              const t = (rd - shoulderEnd) / (localHalfWidth - shoulderEnd);
              const fadeT = Math.min(1, Math.max(0, t));
              const fade = fadeT * fadeT * (3 - 2 * fadeT);
              riftEffect = RIFT_SHOULDER_UPLIFT * (1 - fade) * RIFT_FADEOUT_RESIDUAL * shoulderHeightNoise;
            }
            r_elevation[r] += riftEffect;
          }
        }
      }
      {
        const bad = backArcDist[r];
        if (bad !== Infinity && bad >= baStart) {
          const dMtn = dist_mountain[r];
          const orogenyFactor = dMtn !== Infinity && dMtn < bad ? Math.max(0, dMtn / bad) : 1;
          let baEffect = 0;
          if (bad <= baPeak) {
            const t = (bad - baStart) / Math.max(1, baPeak - baStart);
            const s = t * t * (3 - 2 * t);
            baEffect = -BACK_ARC_DEPTH * backArcStress[r] * s * orogenyFactor;
          } else if (bad <= baEnd) {
            const t = (bad - baPeak) / Math.max(1, baEnd - baPeak);
            const s = t * t * (3 - 2 * t);
            baEffect = -BACK_ARC_DEPTH * backArcStress[r] * (1 - s) * orogenyFactor;
          }
          r_elevation[r] += baEffect;
          dl_backArc[r] = baEffect;
        }
      }
      {
        const dMtnRidge = dist_mountain[r];
        if (dMtnRidge !== Infinity && dMtnRidge < ridgeExtent && stressNorm > 0.01) {
          const sfAsymmetry = Math.abs(sf_r - 0.5) * 2;
          const signedDist = sf_r > 0.5 ? dMtnRidge : -dMtnRidge;
          const peakPos = -sfAsymmetry * ridgePeakShift;
          const dFromPeak = signedDist - peakPos;
          const stressWidthMod = RIDGE_STRESS_WIDTH_BASE + RIDGE_STRESS_WIDTH_SCALE * stressNorm;
          const widthNoise = 1 + RIDGE_WIDTH_NOISE_AMP * foldNoise.fbm(x * 3 + 44.1, y * 3 + 22.7, z * 3 + 11.3, 2);
          const localRidgeSigma = ridgeSigmaBase * stressWidthMod * widthNoise;
          const sigma = dFromPeak > 0 ? localRidgeSigma * (1 - sfAsymmetry * RIDGE_ASYM_SUBDUCT_NARROW) : localRidgeSigma * (1 + sfAsymmetry * RIDGE_ASYM_OVERRIDE_WIDEN);
          const safeSigma = Math.max(0.5, sigma);
          const gauss = Math.exp(-0.5 * (dFromPeak / safeSigma) ** 2);
          const ridgeHeightNoise = RIDGE_HEIGHT_VAR_BASE + RIDGE_HEIGHT_VAR_SCALE * foldNoise.fbm(x * RIDGE_HEIGHT_VAR_FREQ + 17.3, y * RIDGE_HEIGHT_VAR_FREQ + 31.7, z * RIDGE_HEIGHT_VAR_FREQ + 8.9, 2);
          r_elevation[r] += gauss * stressNorm * RIDGE_STRENGTH * ridgeHeightNoise;
        }
      }
      dl_tectonic[r] = r_elevation[r] - elevBefore;
      const tectonicActivity = r_tectonicActivity[r];
      const dMtnFold = dist_mountain[r];
      const lcd = dist_coast_land[r];
      if (lcd < Infinity) {
        let mountainBoost = 0;
        if (dMtnFold !== Infinity && sf_r < BACK_ARC_SUBDUCT_THRESH && dMtnFold < lcd) {
          const proximity = Math.max(0, 1 - dMtnFold / Math.max(1, tectonicReach));
          mountainBoost = proximity * interiorBand * MOUNTAIN_BOOST_FRAC;
        }
        const effectiveLcd = lcd + mountainBoost;
        const tDown = Math.min(effectiveLcd / interiorBand, 1);
        const sDown = tDown * tDown * (3 - 2 * tDown);
        const tUp = Math.min(effectiveLcd / (interiorBand * INTERIOR_UPLIFT_RAMP_FRAC), 1);
        const sUp = tUp * tUp * (3 - 2 * tUp);
        const bf = r_basinFactor[r];
        const interiorBase = INTERIOR_BASE_SHIELD * (1 - bf) + INTERIOR_BASE_BASIN * bf;
        const interiorUplift = interiorBase + tectonicActivity * INTERIOR_TECTONIC;
        const coastalDepression = COASTAL_DEPRESSION * (1 - bf * COASTAL_DEPRESSION_BASIN_REDUCE);
        const baseBias = coastalDepression * (1 - sDown) + interiorUplift * sUp;
        const mod = 1 + INTERIOR_UPLIFT_MOD_AMP * noise.fbm(x * 2 + 19.3, y * 2 + 7.6, z * 2 + 13.1, 2);
        const bias = baseBias * mod;
        r_elevation[r] += bias;
        dl_interior[r] = bias;
      }
      if (r_t_plateau[r] && tectonicActivity > 0.1) {
        const plateauBoost = PLATEAU_BOOST * tectonicActivity * (1 - sf_r);
        r_elevation[r] += plateauBoost;
        dl_interior[r] += plateauBoost;
      }
      {
        const coastPlainWidth = Math.max(6, Math.round(COASTAL_PLAIN_WIDTH_BASE * scaleFactor));
        if (lcd < coastPlainWidth && dBdry[r] <= maxCD && !coastConvergent[r]) {
          const t = lcd / coastPlainWidth;
          const fade = t * t * (3 - 2 * t);
          const suppressionStrength = PLAIN_SUPPRESSION_STRENGTH * (1 - fade);
          if (r_elevation[r] > PLAIN_TARGET) {
            const excess = r_elevation[r] - PLAIN_TARGET;
            const suppression = excess * suppressionStrength;
            r_elevation[r] -= suppression;
            dl_coastal[r] -= suppression;
          }
        }
      }
      {
        const rd = riftDist[r];
        const inRiftFloor = rd !== Infinity && rd <= RIFT_FLOOR_MULT * scaleFactor + 0.5;
        if (!inRiftFloor) {
          const floorRamp = Math.min(1, lcd / (5 * scaleFactor));
          const minElev = INTERIOR_FLOOR * floorRamp;
          if (r_elevation[r] < minElev) r_elevation[r] = minElev;
        }
      }
    } else {
      const dc = dist_coast[r];
      const isActiveMarginShelf = coastConvergent[r] === 1;
      const shelfWidth = isActiveMarginShelf ? Math.max(2, Math.round(SHELF_NARROW_BASE * scaleFactor)) : Math.max(4, Math.round(SHELF_WIDE_BASE * scaleFactor));
      const slopeWidth = Math.max(3, Math.round(SLOPE_WIDTH_BASE * scaleFactor));
      const totalMargin = shelfWidth + slopeWidth;
      let oceanBase;
      if (dc < shelfWidth) {
        oceanBase = SHELF_DEPTH_START - SHELF_DEPTH_RANGE * (dc / shelfWidth);
      } else if (dc < totalMargin) {
        oceanBase = SHELF_DEPTH_START - SHELF_DEPTH_RANGE - SLOPE_DEPTH_RANGE * ((dc - shelfWidth) / slopeWidth);
      } else {
        oceanBase = ABYSS_BASE + noise.fbm(x * 2, y * 2, z * 2, 3) * ABYSS_NOISE_AMP;
      }
      r_elevation[r] = Math.min(r_elevation[r], oceanBase);
      dl_ocean[r] = r_elevation[r];
      const isActiveMargin = coastConvergent[r] === 1;
      dl_margins[r] = isActiveMargin ? 0.8 : 0.2;
      if (ridgeDist[r] !== Infinity && ridgeDist[r] <= ridgeHalfWidth) dl_margins[r] = 1;
      if (fractureDist[r] !== Infinity && fractureDist[r] <= fractureHalfWidth) dl_margins[r] = -0.5;
      const elevBeforeOcTec = r_elevation[r];
      const rd = ridgeDist[r];
      if (rd !== Infinity && rd <= ridgeHalfWidth) {
        const t = rd / ridgeHalfWidth;
        const ridgeFade = (1 - t) * (1 - t);
        const ridgeNoise = noise.ridgedFbm(x * 3, y * 3, z * 3, 4);
        const ridgeUplift = (RIDGE_UPLIFT_NOISE * ridgeNoise + RIDGE_UPLIFT_BASE) * ridgeFade;
        r_elevation[r] += ridgeUplift;
      }
      const fd = fractureDist[r];
      if (fd !== Infinity && fd <= fractureHalfWidth) {
        const ft = fd / fractureHalfWidth;
        const fractureFade = 1 - ft;
        r_elevation[r] -= FRACTURE_DEPTH * fractureFade;
      }
      if (btype === 1) {
        r_elevation[r] -= TRENCH_BASE_DEPTH + TRENCH_STRESS_DEPTH * stressNorm;
      }
      {
        const bad = backArcDist[r];
        if (bad !== Infinity && bad >= baStart) {
          const dMtn = dist_mountain[r];
          const orogenyFactor = dMtn !== Infinity && dMtn < bad ? Math.max(0, dMtn / bad) : 1;
          let baEffect = 0;
          if (bad <= baPeak) {
            const t = (bad - baStart) / Math.max(1, baPeak - baStart);
            const s = t * t * (3 - 2 * t);
            baEffect = -BACK_ARC_DEPTH * backArcStress[r] * s * orogenyFactor;
          } else if (bad <= baEnd) {
            const t = (bad - baPeak) / Math.max(1, baEnd - baPeak);
            const s = t * t * (3 - 2 * t);
            baEffect = -BACK_ARC_DEPTH * backArcStress[r] * (1 - s) * orogenyFactor;
          }
          r_elevation[r] += baEffect;
          dl_backArc[r] = baEffect;
        }
      }
      dl_tectonic[r] = r_elevation[r] - elevBeforeOcTec;
      if (r_elevation[r] > OCEAN_FLOOR_CLAMP) r_elevation[r] = OCEAN_FLOOR_CLAMP;
    }
  }
  return r_elevation;
}
function applyTectonicBandNoise(mesh, r_xyz, r_elevation, sf, tt, noise, noiseMag, debugLayers) {
  const { numRegions } = mesh;
  const { r_isOcean } = sf;
  const { r_t_foldBelt, r_noiseAmp } = tt;
  const dl_noise = debugLayers.noise;
  const warpScale = WARP_SCALE;
  const warpOctaves = numRegions > 2e5 ? 2 : 3;
  for (let r = 0; r < numRegions; r++) {
    const x = r_xyz[3 * r], y = r_xyz[3 * r + 1], z = r_xyz[3 * r + 2];
    const wx = x + warpScale * noise.fbm(x + 5.3, y + 1.7, z + 3.1, warpOctaves);
    const wy = y + warpScale * noise.fbm(x + 8.1, y + 2.9, z + 7.3, warpOctaves);
    const wz = z + warpScale * noise.fbm(x + 1.4, y + 6.2, z + 4.8, warpOctaves);
    if (r_isOcean[r]) {
      const ocf = CONTINENTAL_FREQ_MULT;
      const oceanNoise = noise.fbm(wx * ocf, wy * ocf, wz * ocf) * noiseMag * OCEAN_NOISE_AMP;
      r_elevation[r] += oceanNoise;
      dl_noise[r] = oceanNoise;
      if (r_elevation[r] > OCEAN_FLOOR_CLAMP && r_elevation[r] < ISLAND_PEAK_FLOOR) {
        r_elevation[r] = OCEAN_FLOOR_CLAMP;
      }
      continue;
    }
    const foldBelt = r_t_foldBelt[r];
    const foldFreqMult = 1 + foldBelt * FOLD_FREQ_MULT_SCALE;
    const continentalFreq = foldFreqMult * CONTINENTAL_FREQ_MULT;
    const noiseScale = r_noiseAmp[r];
    const continental = noise.fbm(wx * continentalFreq, wy * continentalFreq, wz * continentalFreq) * noiseMag;
    const ridged = noise.ridgedFbm(wx * continentalFreq, wy * continentalFreq, wz * continentalFreq) * noiseMag * RIDGED_NOISE_AMP;
    const continentalMixed = continental * (1 - foldBelt) + ridged * foldBelt;
    const regional = noise.fbm(
      wx * DETAIL_NOISE_FREQ_MULT * foldFreqMult + 22.1,
      wy * DETAIL_NOISE_FREQ_MULT * foldFreqMult + 6.8,
      wz * DETAIL_NOISE_FREQ_MULT * foldFreqMult + 15.4,
      4,
      0.5
    ) * noiseMag * DETAIL_NOISE_AMP;
    const local = noise.fbm(
      wx * FINE_NOISE_FREQ_MULT + 41.7,
      wy * FINE_NOISE_FREQ_MULT + 13.2,
      wz * FINE_NOISE_FREQ_MULT + 27.9,
      3,
      0.5
    ) * noiseMag * FINE_NOISE_AMP;
    const total = (continentalMixed + regional) * noiseScale + local * Math.sqrt(noiseScale);
    r_elevation[r] += total;
    dl_noise[r] = total;
  }
}
function applyDetailTexture(mesh, r_xyz, r_elevation, tect, sf, noise, noiseMag, debugLayers) {
  const { numRegions } = mesh;
  const { r_stress, maxStress } = tect;
  const { r_isOcean } = sf;
  const dl_noise = debugLayers.noise;
  const warpScale = WARP_SCALE;
  const warpOctaves = numRegions > 2e5 ? 2 : 3;
  for (let r = 0; r < numRegions; r++) {
    if (r_isOcean[r]) continue;
    const currentElev = r_elevation[r];
    if (currentElev <= DISSECT_THRESHOLD) continue;
    const x = r_xyz[3 * r], y = r_xyz[3 * r + 1], z = r_xyz[3 * r + 2];
    const wx = x + warpScale * noise.fbm(x + 5.3, y + 1.7, z + 3.1, warpOctaves);
    const wy = y + warpScale * noise.fbm(x + 8.1, y + 2.9, z + 7.3, warpOctaves);
    const wz = z + warpScale * noise.fbm(x + 1.4, y + 6.2, z + 4.8, warpOctaves);
    const stressNorm = Math.min(1, r_stress[r] / maxStress);
    const elevExcess = currentElev - DISSECT_THRESHOLD;
    const dissectVal = noise.fbm(wx * 32 + 71.3, wy * 32 + 44.8, wz * 32 + 29.1, 3, 0.5);
    const elevDrive = Math.min(1, Math.sqrt(elevExcess) * DISSECT_ELEV_SCALE);
    const dissectAmp = Math.sqrt(elevExcess) * Math.max(elevDrive, stressNorm) * noiseMag * DISSECT_AMP;
    const dissectContrib = dissectVal * dissectAmp;
    r_elevation[r] += dissectContrib;
    dl_noise[r] = (dl_noise[r] || 0) + dissectContrib;
    const elevAfterDissect = r_elevation[r];
    if (elevAfterDissect > SUMMIT_THRESHOLD && stressNorm > SUMMIT_STRESS_MIN) {
      const excess = elevAfterDissect - SUMMIT_THRESHOLD;
      const peakNoise = noise.ridgedFbm(wx * 36 + 91.3, wy * 36 + 55.7, wz * 36 + 38.2, 3, 0.5);
      const spike = Math.max(0, peakNoise - SUMMIT_SPIKE_OFFSET);
      const peakContrib = spike * excess * Math.max(stressNorm, SUMMIT_STRESS_FLOOR) * 1;
      r_elevation[r] += peakContrib;
      dl_noise[r] += peakContrib;
    }
  }
}
function applyPhasorRidges(mesh, r_xyz, r_elevation, tect, sf, tt, noiseMag, seed, debugLayers) {
  const { numRegions, adjOffset, adjList } = mesh;
  const { r_stress, r_stressDir, r_subductFactor, maxStress } = tect;
  const { r_isOcean } = sf;
  const { r_t_foldBelt } = tt;
  const dl_phasor = debugLayers.phasorRidge;
  const dl_oroPower = debugLayers.orogenicPower;
  const wavelengthRad = PHASOR_WAVELENGTH_KM / 6371;
  const bandwidthRad = PHASOR_BANDWIDTH_KM / 6371;
  const frequency = 1 / wavelengthRad;
  const invBw2 = -0.5 / (bandwidthRad * bandwidthRad);
  const envelopeCutoffSq = 9 * bandwidthRad * bandwidthRad;
  const rng = makeRng(seed + 1313);
  const avgEdgeKm = Math.PI * 6371 / Math.sqrt(numRegions);
  const smoothingPasses = Math.max(2, Math.round(PHASOR_DIRECTION_SMOOTHING_KM / avgEdgeKm));
  const stressActiveFloor = PHASOR_STRESS_THRESHOLD * maxStress;
  let curDir = new Float32Array(r_stressDir);
  if (smoothingPasses > 0) {
    let nextDir = new Float32Array(numRegions * 3);
    for (let pass = 0; pass < smoothingPasses; pass++) {
      nextDir.set(curDir);
      for (let r = 0; r < numRegions; r++) {
        if (r_stress[r] < stressActiveFloor) continue;
        const w0 = r_stress[r];
        let ax = curDir[3 * r] * w0;
        let ay = curDir[3 * r + 1] * w0;
        let az = curDir[3 * r + 2] * w0;
        for (let ni = adjOffset[r], niEnd = adjOffset[r + 1]; ni < niEnd; ni++) {
          const nb = adjList[ni];
          if (r_stress[nb] < stressActiveFloor) continue;
          const w = r_stress[nb];
          ax += curDir[3 * nb] * w;
          ay += curDir[3 * nb + 1] * w;
          az += curDir[3 * nb + 2] * w;
        }
        const len2 = Math.sqrt(ax * ax + ay * ay + az * az);
        if (len2 > 1e-6) {
          nextDir[3 * r] = ax / len2;
          nextDir[3 * r + 1] = ay / len2;
          nextDir[3 * r + 2] = az / len2;
        }
      }
      const tmp = curDir;
      curDir = nextDir;
      nextDir = tmp;
    }
  }
  const r_stressDirSmoothed = curDir;
  const candidates = [];
  const stressFloor = PHASOR_STRESS_THRESHOLD;
  for (let r = 0; r < numRegions; r++) {
    if (r_isOcean[r]) continue;
    if (r_stress[r] / maxStress < stressFloor) continue;
    if (r_subductFactor[r] > PHASOR_SF_KERNEL_MAX) continue;
    const sdx = r_stressDirSmoothed[3 * r], sdy = r_stressDirSmoothed[3 * r + 1], sdz = r_stressDirSmoothed[3 * r + 2];
    const sdLen2 = sdx * sdx + sdy * sdy + sdz * sdz;
    if (sdLen2 < 0.25) continue;
    candidates.push(r);
  }
  if (candidates.length === 0) return;
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = candidates[i];
    candidates[i] = candidates[j];
    candidates[j] = tmp;
  }
  const numKernels = Math.min(PHASOR_NUM_KERNELS, candidates.length);
  const kernels = new Array(numKernels);
  for (let ki = 0; ki < numKernels; ki++) {
    const r = candidates[ki];
    const px = r_xyz[3 * r], py = r_xyz[3 * r + 1], pz = r_xyz[3 * r + 2];
    let dx = r_stressDirSmoothed[3 * r], dy = r_stressDirSmoothed[3 * r + 1], dz = r_stressDirSmoothed[3 * r + 2];
    const radial = dx * px + dy * py + dz * pz;
    dx -= radial * px;
    dy -= radial * py;
    dz -= radial * pz;
    let dLen = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dLen < 1e-6) continue;
    dx /= dLen;
    dy /= dLen;
    dz /= dLen;
    if (PHASOR_DIRECTION_PERP) {
      const rx = py * dz - pz * dy;
      const ry = pz * dx - px * dz;
      const rz = px * dy - py * dx;
      dx = rx;
      dy = ry;
      dz = rz;
    }
    const jitter = (rng() - 0.5) * 2 * PHASOR_ORIENTATION_JITTER;
    const cosJ = Math.cos(jitter), sinJ = Math.sin(jitter);
    const cx = py * dz - pz * dy;
    const cy = pz * dx - px * dz;
    const cz = px * dy - py * dx;
    const ndx = dx * cosJ + cx * sinJ;
    const ndy = dy * cosJ + cy * sinJ;
    const ndz = dz * cosJ + cz * sinJ;
    kernels[ki] = {
      x: px,
      y: py,
      z: pz,
      dx: ndx,
      dy: ndy,
      dz: ndz,
      phase: rng() * 2 * Math.PI,
      stressNorm: Math.min(1, r_stress[r] / maxStress)
    };
  }
  const liveKernels = kernels.filter((k) => k);
  const PLAT_BINS = 36, PLON_BINS = 72;
  const grid = new Array(PLAT_BINS * PLON_BINS);
  for (let ki = 0; ki < liveKernels.length; ki++) {
    const k = liveKernels[ki];
    const lat = Math.asin(Math.max(-1, Math.min(1, k.y)));
    const lon = Math.atan2(k.x, k.z);
    const bi = Math.max(0, Math.min(PLAT_BINS - 1, Math.floor((lat + Math.PI / 2) / Math.PI * PLAT_BINS)));
    const bj = Math.max(0, Math.min(PLON_BINS - 1, Math.floor((lon + Math.PI) / (2 * Math.PI) * PLON_BINS)));
    const bin = bi * PLON_BINS + bj;
    if (!grid[bin]) grid[bin] = [];
    grid[bin].push(ki);
  }
  const binLatRad = Math.PI / PLAT_BINS;
  const searchBins = Math.max(1, Math.ceil(3 * bandwidthRad / binLatRad));
  const baseAmp = PHASOR_AMPLITUDE;
  const warpNoise = new SimplexNoise(seed + 1717);
  for (let r = 0; r < numRegions; r++) {
    if (r_isOcean[r]) continue;
    const elev = r_elevation[r];
    if (elev < PHASOR_ELEV_THRESHOLD) continue;
    const px = r_xyz[3 * r], py = r_xyz[3 * r + 1], pz = r_xyz[3 * r + 2];
    const wf = PHASOR_WARP_FREQ;
    const wa = PHASOR_WARP_AMPLITUDE;
    const woct = PHASOR_WARP_OCTAVES;
    const warpX = warpNoise.fbm(px * wf + 17.3, py * wf + 28.4, pz * wf + 9.1, woct, 0.5) * wa;
    const warpY = warpNoise.fbm(px * wf + 5.2, py * wf + 33.6, pz * wf + 22.8, woct, 0.5) * wa;
    const warpZ = warpNoise.fbm(px * wf + 11.7, py * wf + 6.9, pz * wf + 41.5, woct, 0.5) * wa;
    const wpx = px + warpX;
    const wpy = py + warpY;
    const wpz = pz + warpZ;
    const lat = Math.asin(Math.max(-1, Math.min(1, py)));
    const lon = Math.atan2(px, pz);
    const rbi = Math.max(0, Math.min(PLAT_BINS - 1, Math.floor((lat + Math.PI / 2) / Math.PI * PLAT_BINS)));
    const rbj = Math.max(0, Math.min(PLON_BINS - 1, Math.floor((lon + Math.PI) / (2 * Math.PI) * PLON_BINS)));
    let phasorRe = 0, phasorIm = 0;
    let envelopeSum = 0;
    for (let di = -searchBins; di <= searchBins; di++) {
      const bi = rbi + di;
      if (bi < 0 || bi >= PLAT_BINS) continue;
      for (let dj = -searchBins; dj <= searchBins; dj++) {
        const bj = ((rbj + dj) % PLON_BINS + PLON_BINS) % PLON_BINS;
        const cell = grid[bi * PLON_BINS + bj];
        if (!cell) continue;
        for (let ci = 0; ci < cell.length; ci++) {
          const k = liveKernels[cell[ci]];
          const ddx = px - k.x, ddy = py - k.y, ddz = pz - k.z;
          const chordSq = ddx * ddx + ddy * ddy + ddz * ddz;
          if (chordSq > envelopeCutoffSq) continue;
          const envelope = Math.exp(chordSq * invBw2);
          if (envelope < 0.01) continue;
          const phaseCoord = wpx * k.dx + wpy * k.dy + wpz * k.dz;
          const phase = 2 * Math.PI * frequency * phaseCoord + k.phase;
          phasorRe += envelope * Math.cos(phase);
          phasorIm += envelope * Math.sin(phase);
          envelopeSum += envelope;
        }
      }
    }
    if (envelopeSum < 0.02) continue;
    const totalPhase = Math.atan2(phasorIm, phasorRe);
    const ridgeCentered = totalPhase / (2 * Math.PI) + PHASOR_BIAS;
    const elevGate = Math.min(1, (elev - PHASOR_ELEV_THRESHOLD) / PHASOR_ELEV_RAMP_RANGE);
    const fb = r_t_foldBelt[r] || 0;
    const foldBeltMul = PHASOR_FOLDBELT_FLOOR + (1 - PHASOR_FOLDBELT_FLOOR) * fb;
    const oroRaw = (dl_oroPower[r] || 0) + 0.5;
    const oroPow = oroRaw * oroRaw;
    let sfGate;
    const sfR = r_subductFactor[r];
    if (sfR <= PHASOR_SF_GATE_FULL) {
      sfGate = 1;
    } else if (sfR >= PHASOR_SF_GATE_ZERO) {
      sfGate = 0;
    } else {
      const t = (sfR - PHASOR_SF_GATE_FULL) / (PHASOR_SF_GATE_ZERO - PHASOR_SF_GATE_FULL);
      sfGate = 1 - t * t * (3 - 2 * t);
    }
    const contrib = ridgeCentered * baseAmp * elevGate * foldBeltMul * sfGate * oroPow;
    r_elevation[r] += contrib;
    dl_phasor[r] = contrib;
  }
  let nonzero = 0, sumAbs = 0, maxAbs = 0;
  for (let r = 0; r < numRegions; r++) {
    const v2 = dl_phasor[r];
    if (v2 !== 0) {
      nonzero++;
      const a = Math.abs(v2);
      sumAbs += a;
      if (a > maxAbs) maxAbs = a;
    }
  }
  console.log(`[phasor] kernels=${liveKernels.length} cells_affected=${nonzero} max=${maxAbs.toFixed(4)} mean=${nonzero > 0 ? (sumAbs / nonzero).toFixed(4) : 0}`);
}
function applyCoastalDetail(mesh, r_xyz, r_elevation, tect, sf, noise, noiseMag, seed, debugLayers) {
  const { numRegions } = mesh;
  const { r_stress, maxStress, scaleFactor } = tect;
  const { r_isOcean, dBdry, coastStressMax, coastSubductMax, coastConvergent } = sf;
  const dl_coastal = debugLayers.coastal;
  const coastRoughenDist = Math.max(8, Math.round(COAST_ROUGHEN_BASE * scaleFactor));
  const cNoise = new SimplexNoise(seed + 77);
  const cNoise2 = new SimplexNoise(seed + 133);
  const cNoise3 = new SimplexNoise(seed + 211);
  const islandMaxDist = Math.max(4, Math.round(ISLAND_DIST_BASE * scaleFactor));
  for (let r = 0; r < numRegions; r++) {
    if (dBdry[r] > coastRoughenDist) continue;
    const x = r_xyz[3 * r], y = r_xyz[3 * r + 1], z = r_xyz[3 * r + 2];
    const t = dBdry[r] / coastRoughenDist;
    const sn = Math.min(1, Math.max(coastStressMax[r], r_stress[r] / maxStress));
    const isSubductingOcean = r_isOcean[r] && coastConvergent[r] && coastSubductMax[r] > COAST_SUBDUCT_SUP_LOW;
    const subSup = isSubductingOcean ? Math.min(1, (coastSubductMax[r] - COAST_SUBDUCT_SUP_LOW) / COAST_SUBDUCT_SUP_RANGE) : 0;
    const elevBeforeCoast = r_elevation[r];
    const isPassiveCoast = !coastConvergent[r];
    const falloff1 = (1 - t) * (1 - t);
    const stressAmp1 = 1 + sn * 5;
    const coastFreq = isPassiveCoast ? COAST_PASSIVE_FREQ : COAST_ACTIVE_FREQ;
    const coastAmp = isPassiveCoast ? COAST_PASSIVE_AMP : COAST_ACTIVE_AMP;
    let n1 = cNoise.fbm(x * coastFreq + 3.7, y * coastFreq + 7.1, z * coastFreq + 2.3, 5, 0.55);
    let coastNoise1 = n1 * coastAmp * falloff1 * stressAmp1;
    if (subSup > 0 && coastNoise1 > 0) coastNoise1 *= 1 - subSup;
    r_elevation[r] += coastNoise1;
    const warpReach = isPassiveCoast ? COAST_WARP_PASSIVE_REACH : COAST_WARP_ACTIVE_REACH;
    const falloffW = Math.max(0, 1 - t * warpReach);
    if (falloffW > 0) {
      const warpAmt = COAST_WARP_AMT * falloffW * (1 + sn * 2);
      const dwx = cNoise3.fbm(x * 3 + 11.3, y * 3 + 4.7, z * 3 + 8.2, 3, 0.6) * warpAmt;
      const dwy = cNoise3.fbm(x * 3 + 2.9, y * 3 + 9.4, z * 3 + 1.6, 3, 0.6) * warpAmt;
      const dwz = cNoise3.fbm(x * 3 + 7.5, y * 3 + 0.3, z * 3 + 5.9, 3, 0.6) * warpAmt;
      const origN = noise.fbm(x, y, z) * noiseMag;
      const warpN = noise.fbm(x + dwx, y + dwy, z + dwz) * noiseMag;
      let warpDelta = (warpN - origN) * falloffW;
      if (subSup > 0 && warpDelta > 0) warpDelta *= 1 - subSup;
      r_elevation[r] += warpDelta;
    }
    if (r_isOcean[r] && r_elevation[r] > OCEAN_FLOOR_CLAMP && r_elevation[r] < ISLAND_PEAK_FLOOR) {
      r_elevation[r] = OCEAN_FLOOR_CLAMP;
    }
    if (r_isOcean[r] && dBdry[r] > 0 && dBdry[r] <= islandMaxDist && subSup < ISLAND_SUBDUCT_MAX) {
      const islandN = cNoise2.fbm(x * ISLAND_FREQ + 5.1, y * ISLAND_FREQ + 9.3, z * ISLAND_FREQ + 2.7, 4, 0.5);
      const threshold = ISLAND_THRESHOLD_BASE - sn * ISLAND_THRESHOLD_STRESS;
      if (islandN > threshold) {
        const excess = (islandN - threshold) / (1 - threshold);
        const distFade = 1 - dBdry[r] / islandMaxDist;
        const peakN = cNoise2.ridgedFbm(x * ISLAND_FREQ * 2.5 + 31.7, y * ISLAND_FREQ * 2.5 + 17.3, z * ISLAND_FREQ * 2.5 + 8.9, 3, 0.5);
        const peakMask = peakN * peakN;
        let bump = excess * excess * ISLAND_BUMP_AMP * (1 + sn * 2) * distFade * peakMask;
        bump *= 1 - subSup / ISLAND_SUBDUCT_MAX;
        if (bump + r_elevation[r] > ISLAND_PEAK_FLOOR) {
          r_elevation[r] += bump;
        }
      }
    }
    dl_coastal[r] += r_elevation[r] - elevBeforeCoast;
  }
}
function applyIslandArcs(mesh, r_xyz, r_elevation, tect, sf, r_plate, seed, debugLayers) {
  const { numRegions, adjOffset, adjList } = mesh;
  const { r_boundaryType, r_subductFactor, r_stress, r_bothOcean, maxStress, scaleFactor } = tect;
  const { r_isOcean } = sf;
  const dl_coastal = debugLayers.coastal;
  const arcNoise = new SimplexNoise(seed + 307);
  const arcMacroNoise = new SimplexNoise(seed + 911);
  const maxArcDist = Math.max(5, Math.round(ARC_DIST_BASE * scaleFactor));
  const arcSeeds = [];
  const arcDist = new Float32Array(numRegions);
  arcDist.fill(maxArcDist + 1);
  const arcStress = new Float32Array(numRegions);
  const arcCandidates = [];
  let macroAccepted = 0, macroRejected = 0;
  for (let r = 0; r < numRegions; r++) {
    if (r_boundaryType[r] === 1 && r_bothOcean[r] && r_subductFactor[r] < ARC_SUBDUCT_THRESH) {
      const stressNorm = Math.min(1, r_stress[r] / maxStress);
      const x = r_xyz[3 * r], y = r_xyz[3 * r + 1], z = r_xyz[3 * r + 2];
      const macroVal = arcMacroNoise.fbm(x * ARC_MACRO_FREQ, y * ARC_MACRO_FREQ, z * ARC_MACRO_FREQ, 3, 0.5);
      const score = macroVal + stressNorm * ARC_MACRO_STRESS_WEIGHT;
      if (score < ARC_MACRO_THRESH) {
        macroRejected++;
        continue;
      }
      arcCandidates.push({ r, x, y, z, stressNorm, score });
      macroAccepted++;
    }
  }
  arcCandidates.sort((a, b) => b.score - a.score);
  const minSpacingSq = ARC_ORIGIN_MIN_SPACING * ARC_ORIGIN_MIN_SPACING;
  const arcOrigins = [];
  for (let ci = 0; ci < arcCandidates.length && arcOrigins.length < ARC_MAX_ORIGINS; ci++) {
    const c = arcCandidates[ci];
    let tooClose = false;
    for (let oi = 0; oi < arcOrigins.length; oi++) {
      const o = arcOrigins[oi];
      const dx = c.x - o.x, dy = c.y - o.y, dz = c.z - o.z;
      if (dx * dx + dy * dy + dz * dz < minSpacingSq) {
        tooClose = true;
        break;
      }
    }
    if (tooClose) continue;
    arcOrigins.push(c);
  }
  for (const o of arcOrigins) {
    arcSeeds.push(o.r);
    arcDist[o.r] = 0;
    arcStress[o.r] = o.stressNorm;
  }
  let aq = 0;
  while (aq < arcSeeds.length) {
    const r = arcSeeds[aq++];
    const nd = arcDist[r] + 1;
    if (nd > maxArcDist) continue;
    const plate = r_plate[r];
    for (let ni = adjOffset[r], niEnd = adjOffset[r + 1]; ni < niEnd; ni++) {
      const nr = adjList[ni];
      if (nd < arcDist[nr] && r_plate[nr] === plate && r_isOcean[nr]) {
        arcDist[nr] = nd;
        arcStress[nr] = arcStress[r];
        arcSeeds.push(nr);
      }
    }
  }
  let arcCellsBumped = 0, arcUpliftSum = 0, arcMaxFinal = 0;
  for (let r = 0; r < numRegions; r++) {
    const d = arcDist[r];
    if (d < 1 || d > maxArcDist) continue;
    const x = r_xyz[3 * r], y = r_xyz[3 * r + 1], z = r_xyz[3 * r + 2];
    const peakDist = Math.max(ARC_PEAK_DIST_BASE, ARC_PEAK_DIST_BASE * scaleFactor);
    const sigma = Math.max(ARC_SIGMA_BASE_VAL, ARC_SIGMA_BASE_VAL * scaleFactor);
    const distWeight = Math.exp(-0.5 * ((d - peakDist) / sigma) ** 2);
    const n = arcNoise.ridgedFbm(x * ARC_BASE_FREQ, y * ARC_BASE_FREQ, z * ARC_BASE_FREQ, 2, 2, 0.5, 1);
    if (n > ARC_THRESHOLD) {
      const excess = (n - ARC_THRESHOLD) / (1 - ARC_THRESHOLD);
      const peakN = arcNoise.ridgedFbm(x * ARC_PEAK_FREQ + 13.7, y * ARC_PEAK_FREQ + 27.1, z * ARC_PEAK_FREQ + 5.3, 3, 2, 0.5, 1);
      const peakMask = peakN * peakN;
      const stressFactor = 0.5 + arcStress[r];
      const baseLift = excess * ARC_BASE_AMP * distWeight * stressFactor;
      const peakSpike = peakMask * ARC_PEAK_AMP * distWeight * stressFactor;
      let uplift = baseLift + peakSpike;
      if (r_isOcean[r]) {
        const maxOceanUplift = Math.max(0, -r_elevation[r] + MAX_OCEAN_ARC_ELEV);
        uplift = Math.min(uplift, maxOceanUplift);
      }
      r_elevation[r] += uplift;
      dl_coastal[r] += uplift;
      arcCellsBumped++;
      arcUpliftSum += uplift;
      if (r_elevation[r] > arcMaxFinal) arcMaxFinal = r_elevation[r];
    }
  }
  console.log(`[islandArcs] macro_accepted=${macroAccepted}/${macroAccepted + macroRejected} origins_kept=${arcOrigins.length}/${ARC_MAX_ORIGINS} cells_bumped=${arcCellsBumped} mean_uplift=${arcCellsBumped > 0 ? (arcUpliftSum / arcCellsBumped).toFixed(3) : 0} max_final_elev=${arcMaxFinal.toFixed(3)}`);
}
function applyVolcanicArcs(mesh, r_xyz, r_elevation, tect, seed, debugLayers) {
  const { numRegions } = mesh;
  const { r_boundaryType, r_subductFactor, r_stress, r_hasOcean, maxStress } = tect;
  const dl_hotspot = debugLayers.hotspot;
  const arcVolcNoise = new SimplexNoise(seed + 713);
  const VOLC_MIN_SPACING_SQ = VOLC_MIN_SPACING * VOLC_MIN_SPACING;
  const candidates = [];
  for (let r = 0; r < numRegions; r++) {
    if (r_boundaryType[r] === 1 && r_hasOcean[r] && r_subductFactor[r] < VOLC_SUBDUCT_THRESH) {
      const stressLocal = Math.min(1, r_stress[r] / maxStress);
      const x = r_xyz[3 * r], y = r_xyz[3 * r + 1], z = r_xyz[3 * r + 2];
      const score = stressLocal + 0.3 * arcVolcNoise.noise3D(x * 8, y * 8, z * 8);
      candidates.push({ r, x, y, z, score, stressLocal });
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  const volcPositions = [];
  for (let ci = 0; ci < candidates.length; ci++) {
    const c = candidates[ci];
    let tooClose = false;
    for (let vi = 0; vi < volcPositions.length; vi++) {
      const v2 = volcPositions[vi];
      const dot2 = c.x * v2.x + c.y * v2.y + c.z * v2.z;
      const distSq = Math.max(0, 2 * (1 - dot2));
      if (distSq < VOLC_MIN_SPACING_SQ) {
        tooClose = true;
        break;
      }
    }
    if (tooClose) continue;
    const heightVar = VOLC_HEIGHT_VAR_BASE + VOLC_HEIGHT_VAR_RANGE * arcVolcNoise.noise3D(c.x * 10, c.y * 10, c.z * 10);
    const height = VOLC_HEIGHT_BASE * (0.5 + c.stressLocal) * heightVar;
    const sigmaVar = VOLC_SIGMA_VAR_BASE + VOLC_SIGMA_VAR_RANGE * arcVolcNoise.noise3D(c.x * 5 + 17.3, c.y * 5 + 9.1, c.z * 5 + 4.7);
    volcPositions.push({ x: c.x, y: c.y, z: c.z, height, sigma: VOLC_SIGMA_BASE * sigmaVar });
  }
  for (let vi = 0; vi < volcPositions.length; vi++) {
    const v2 = volcPositions[vi];
    v2.invS2 = -0.5 / (v2.sigma * v2.sigma);
  }
  const VLAT_BINS = 36, VLON_BINS = 72;
  const volcGrid = new Array(VLAT_BINS * VLON_BINS);
  for (let vi = 0; vi < volcPositions.length; vi++) {
    const v2 = volcPositions[vi];
    const lat = Math.asin(Math.max(-1, Math.min(1, v2.y)));
    const lon = Math.atan2(v2.x, v2.z);
    const bi = Math.max(0, Math.min(VLAT_BINS - 1, Math.floor((lat + Math.PI / 2) / Math.PI * VLAT_BINS)));
    const bj = Math.max(0, Math.min(VLON_BINS - 1, Math.floor((lon + Math.PI) / (2 * Math.PI) * VLON_BINS)));
    const bin = bi * VLON_BINS + bj;
    if (!volcGrid[bin]) volcGrid[bin] = [];
    volcGrid[bin].push(vi);
  }
  for (let r = 0; r < numRegions; r++) {
    const rx = r_xyz[3 * r], ry = r_xyz[3 * r + 1], rz = r_xyz[3 * r + 2];
    const rLat = Math.asin(Math.max(-1, Math.min(1, ry)));
    const rLon = Math.atan2(rx, rz);
    const rbi = Math.max(0, Math.min(VLAT_BINS - 1, Math.floor((rLat + Math.PI / 2) / Math.PI * VLAT_BINS)));
    const rbj = Math.max(0, Math.min(VLON_BINS - 1, Math.floor((rLon + Math.PI) / (2 * Math.PI) * VLON_BINS)));
    let volcUplift = 0;
    for (let di = -1; di <= 1; di++) {
      const bi = rbi + di;
      if (bi < 0 || bi >= VLAT_BINS) continue;
      for (let dj = -1; dj <= 1; dj++) {
        const bj = ((rbj + dj) % VLON_BINS + VLON_BINS) % VLON_BINS;
        const cell = volcGrid[bi * VLON_BINS + bj];
        if (!cell) continue;
        for (let ci = 0; ci < cell.length; ci++) {
          const v2 = volcPositions[cell[ci]];
          const dot2 = rx * v2.x + ry * v2.y + rz * v2.z;
          if (dot2 < 0.9999) continue;
          const angleSq = Math.max(0, 2 * (1 - dot2));
          const gauss = Math.exp(angleSq * v2.invS2);
          if (gauss > 0.01) volcUplift += v2.height * gauss;
        }
      }
    }
    if (volcUplift > 1e-3) {
      r_elevation[r] += volcUplift;
      dl_hotspot[r] += volcUplift;
    }
  }
}
function applyHotspotsAndLIPs(mesh, r_xyz, r_elevation, tect, sf, plateVec, r_plate, plateIsOcean, seed, debugLayers) {
  const { numRegions } = mesh;
  const { r_mantleNorm } = tect;
  const { r_isOcean } = sf;
  const dl_hotspot = debugLayers.hotspot;
  const dl_lip = debugLayers.lip;
  const hsRng = makeRng(seed + 999);
  const hsNoise = new SimplexNoise(seed + 501);
  const hsNoise2 = new SimplexNoise(seed + 502);
  const hsNoise3 = new SimplexNoise(seed + 503);
  const domes = [];
  const lipSites = [];
  const buildTangentFrame = (px, py, pz, dx, dy, dz) => {
    const dd = dx * px + dy * py + dz * pz;
    let ux = dx - dd * px, uy = dy - dd * py, uz = dz - dd * pz;
    const uLen = Math.sqrt(ux * ux + uy * uy + uz * uz) || 1;
    ux /= uLen;
    uy /= uLen;
    uz /= uLen;
    const vx = py * uz - pz * uy, vy = pz * ux - px * uz, vz = px * uy - py * ux;
    return { ux, uy, uz, vx, vy, vz };
  };
  const hsPosRng = makeRng(seed + 1001);
  const findNearestR = (px, py, pz) => {
    let bestDot = -2, bestR = 0;
    for (let r = 0; r < numRegions; r++) {
      const dot2 = px * r_xyz[3 * r] + py * r_xyz[3 * r + 1] + pz * r_xyz[3 * r + 2];
      if (dot2 > bestDot) {
        bestDot = dot2;
        bestR = r;
      }
    }
    return bestR;
  };
  const spawnSatellites = (parent, satRng) => {
    for (let s = 0; s < DOME_SATELLITE_COUNT; s++) {
      const angle = satRng() * 2 * Math.PI;
      const offDist = parent.sigma * DOME_SATELLITE_OFFSET * (0.5 + satRng() * 0.5);
      const offX = Math.cos(angle) * parent.ux + Math.sin(angle) * parent.vx;
      const offY = Math.cos(angle) * parent.uy + Math.sin(angle) * parent.vy;
      const offZ = Math.cos(angle) * parent.uz + Math.sin(angle) * parent.vz;
      const cosA = Math.cos(offDist), sinA = Math.sin(offDist);
      let sx = parent.x * cosA + offX * sinA;
      let sy = parent.y * cosA + offY * sinA;
      let sz = parent.z * cosA + offZ * sinA;
      const sLen = Math.sqrt(sx * sx + sy * sy + sz * sz);
      sx /= sLen;
      sy /= sLen;
      sz /= sLen;
      const satFrame = buildTangentFrame(sx, sy, sz, parent.dx, parent.dy, parent.dz);
      domes.push({
        x: sx,
        y: sy,
        z: sz,
        strength: parent.strength * DOME_SATELLITE_STRENGTH,
        baseStrength: parent.baseStrength * DOME_SATELLITE_STRENGTH,
        sigma: parent.sigma * DOME_SATELLITE_SIGMA,
        chainIndex: parent.chainIndex,
        chainLength: parent.chainLength,
        dx: parent.dx,
        dy: parent.dy,
        dz: parent.dz,
        ...satFrame,
        riftAngles: []
      });
    }
  };
  for (let h = 0; h < NUM_HOTSPOTS; h++) {
    const hStrength = DOME_STRENGTH * (0.4 + hsRng() * 1.2);
    const hSigma = DOME_SIGMA * (0.4 + hsRng() * 1.2);
    const hDecay = CHAIN_DECAY + (hsRng() - 0.5) * 0.35;
    const hLength = Math.max(3, CHAIN_LENGTH + Math.round((hsRng() - 0.5) * 10));
    let hx, hy, hz;
    if (r_mantleNorm) {
      let bestScore = -Infinity;
      for (let c = 0; c < HOTSPOT_UPWELLING_CANDIDATES; c++) {
        const cTheta = 2 * Math.PI * hsPosRng();
        const cCosPhi = 2 * hsPosRng() - 1;
        const cSinPhi = Math.sqrt(1 - cCosPhi * cCosPhi);
        const cx2 = cSinPhi * Math.cos(cTheta);
        const cy2 = cSinPhi * Math.sin(cTheta);
        const cz2 = cCosPhi;
        const cr = findNearestR(cx2, cy2, cz2);
        const score = r_mantleNorm[cr] + (hsPosRng() - 0.5) * HOTSPOT_UPWELLING_JITTER;
        if (score > bestScore) {
          bestScore = score;
          hx = cx2;
          hy = cy2;
          hz = cz2;
        }
      }
    } else {
      const theta = 2 * Math.PI * hsPosRng();
      const cosPhiVal = 2 * hsPosRng() - 1;
      const sinPhiVal = Math.sqrt(1 - cosPhiVal * cosPhiVal);
      hx = sinPhiVal * Math.cos(theta);
      hy = sinPhiVal * Math.sin(theta);
      hz = cosPhiVal;
    }
    const centerR = findNearestR(hx, hy, hz);
    const plate = r_plate[centerR];
    const pv = plateVec[plate];
    if (!pv) continue;
    const drift = plateVelocityAt(plateVec, plate, hx, hy, hz);
    const driftLen = Math.sqrt(drift[0] * drift[0] + drift[1] * drift[1] + drift[2] * drift[2]);
    if (driftLen < 1e-6) continue;
    drift[0] /= driftLen;
    drift[1] /= driftLen;
    drift[2] /= driftLen;
    const isOceanHotspot = plateIsOcean.has(plate);
    const isContinental = !isOceanHotspot;
    const sigmaScale = isContinental ? CONT_HOTSPOT_SIGMA_MULT : 1;
    const strengthScale = isContinental ? CONT_HOTSPOT_STRENGTH_MULT : 1;
    const oceanBoost = isOceanHotspot ? DOME_OCEAN_BOOST : 1;
    const effectiveSigma = hSigma * sigmaScale;
    const effectiveStrength = hStrength * strengthScale * oceanBoost;
    const baseRiftAngle = hsNoise3.noise3D(hx * 10, hy * 10, hz * 10) * Math.PI;
    const riftAnglesForDome = (ci, cl) => {
      if (ci === 0) return [baseRiftAngle, baseRiftAngle + Math.PI * 0.6, baseRiftAngle - Math.PI * 0.6];
      if (ci === 1) return [baseRiftAngle, baseRiftAngle + Math.PI];
      if (ci <= Math.floor(cl * 0.4)) return [baseRiftAngle];
      return [];
    };
    const frame0 = buildTangentFrame(hx, hy, hz, drift[0], drift[1], drift[2]);
    domes.push({
      x: hx,
      y: hy,
      z: hz,
      strength: effectiveStrength,
      baseStrength: hStrength * strengthScale,
      sigma: effectiveSigma,
      chainIndex: 0,
      chainLength: hLength,
      dx: drift[0],
      dy: drift[1],
      dz: drift[2],
      ...frame0,
      riftAngles: riftAnglesForDome(0, hLength),
      isContinental
    });
    spawnSatellites(domes[domes.length - 1], hsRng);
    let perpX = drift[1] * hz - drift[2] * hy;
    let perpY = drift[2] * hx - drift[0] * hz;
    let perpZ = drift[0] * hy - drift[1] * hx;
    const perpLen = Math.sqrt(perpX * perpX + perpY * perpY + perpZ * perpZ) || 1;
    perpX /= perpLen;
    perpY /= perpLen;
    perpZ /= perpLen;
    let cx = hx, cy = hy, cz = hz;
    let str = effectiveStrength;
    let baseStr = hStrength * strengthScale;
    for (let c = 0; c < hLength; c++) {
      const ci = c + 1;
      const decayJitter = hDecay * (0.7 + hsRng() * 0.6);
      str *= decayJitter;
      baseStr *= decayJitter;
      const stepSpacing = CHAIN_SPACING * (0.3 + hsRng() * 1.4);
      const ageBroadening = 1 + ci * DOME_AGE_BROADENING;
      const stepSigma = effectiveSigma * (0.5 + hsRng() * 1) * ageBroadening;
      const wobble = (hsRng() - 0.5) * 0.8;
      const ddx = -drift[0] + perpX * wobble;
      const ddy = -drift[1] + perpY * wobble;
      const ddz = -drift[2] + perpZ * wobble;
      const dot2 = ddx * cx + ddy * cy + ddz * cz;
      let tx = ddx - dot2 * cx, ty = ddy - dot2 * cy, tz = ddz - dot2 * cz;
      const tLen = Math.sqrt(tx * tx + ty * ty + tz * tz);
      if (tLen < 1e-6) break;
      tx /= tLen;
      ty /= tLen;
      tz /= tLen;
      const cosA = Math.cos(stepSpacing);
      const sinA = Math.sin(stepSpacing);
      cx = cx * cosA + tx * sinA;
      cy = cy * cosA + ty * sinA;
      cz = cz * cosA + tz * sinA;
      const nL = Math.sqrt(cx * cx + cy * cy + cz * cz);
      cx /= nL;
      cy /= nL;
      cz /= nL;
      const frameC = buildTangentFrame(cx, cy, cz, drift[0], drift[1], drift[2]);
      domes.push({
        x: cx,
        y: cy,
        z: cz,
        strength: str,
        baseStrength: baseStr,
        sigma: stepSigma,
        chainIndex: ci,
        chainLength: hLength,
        dx: drift[0],
        dy: drift[1],
        dz: drift[2],
        ...frameC,
        riftAngles: riftAnglesForDome(ci, hLength),
        isContinental
      });
      if (ci <= Math.ceil(hLength * 0.4)) {
        spawnSatellites(domes[domes.length - 1], hsRng);
      }
    }
    {
      const lipR = findNearestR(cx, cy, cz);
      const upwelling = r_mantleNorm ? Math.max(0, r_mantleNorm[lipR]) : 0.5;
      const landBoost = r_isOcean[lipR] ? 0.6 : 1;
      const baseLipStr = LIP_HEIGHT * (0.5 + hsRng()) * (0.5 + upwelling) * landBoost;
      const baseLipSigma = LIP_SIGMA * (0.7 + 0.6 * hsRng());
      const lipFrame = buildTangentFrame(cx, cy, cz, drift[0], drift[1], drift[2]);
      const lipAspect = 1.5 + hsRng() * 1.5;
      lipSites.push({
        x: cx,
        y: cy,
        z: cz,
        sigma: baseLipSigma,
        height: baseLipStr,
        ux: lipFrame.ux,
        uy: lipFrame.uy,
        uz: lipFrame.uz,
        vx: lipFrame.vx,
        vy: lipFrame.vy,
        vz: lipFrame.vz,
        aspect: lipAspect
      });
      for (let lb = 0; lb < LIP_LOBE_COUNT; lb++) {
        const angle = hsRng() * 2 * Math.PI;
        const dist2 = baseLipSigma * LIP_LOBE_OFFSET * (0.4 + hsRng() * 0.6);
        const offX = Math.cos(angle) * lipFrame.ux + Math.sin(angle) * lipFrame.vx;
        const offY = Math.cos(angle) * lipFrame.uy + Math.sin(angle) * lipFrame.vy;
        const offZ = Math.cos(angle) * lipFrame.uz + Math.sin(angle) * lipFrame.vz;
        const cosD = Math.cos(dist2), sinD = Math.sin(dist2);
        let lx = cx * cosD + offX * sinD;
        let ly = cy * cosD + offY * sinD;
        let lz = cz * cosD + offZ * sinD;
        const ll = Math.sqrt(lx * lx + ly * ly + lz * lz);
        lx /= ll;
        ly /= ll;
        lz /= ll;
        const lobeAngle = hsRng() * Math.PI;
        const ca3 = Math.cos(lobeAngle), sa = Math.sin(lobeAngle);
        lipSites.push({
          x: lx,
          y: ly,
          z: lz,
          sigma: baseLipSigma * LIP_LOBE_SIGMA * (0.6 + hsRng() * 0.8),
          height: baseLipStr * LIP_LOBE_STRENGTH * (0.5 + hsRng() * 0.5),
          ux: ca3 * lipFrame.ux + sa * lipFrame.vx,
          uy: ca3 * lipFrame.uy + sa * lipFrame.vy,
          uz: ca3 * lipFrame.uz + sa * lipFrame.vz,
          vx: -sa * lipFrame.ux + ca3 * lipFrame.vx,
          vy: -sa * lipFrame.uy + ca3 * lipFrame.vy,
          vz: -sa * lipFrame.uz + ca3 * lipFrame.vz,
          aspect: 1.2 + hsRng() * 1.3
        });
      }
    }
  }
  for (let d = 0; d < domes.length; d++) {
    const dm = domes[d];
    dm.cosThreshPeak = Math.cos(dm.sigma * DOME_PEAK_THRESH_SIGMA);
    dm.invS2 = -0.5 / (dm.sigma * dm.sigma);
    const swMult = dm.isContinental ? CONT_HOTSPOT_SWELL_MULT : 1;
    const swSigma = dm.sigma * SWELL_SIGMA_MULT * swMult;
    dm.swellSigma = swSigma;
    dm.swellStrength = dm.baseStrength * SWELL_STR_MULT;
    dm.cosThreshSwell = Math.cos(swSigma * DOME_SWELL_THRESH_SIGMA);
    dm.invS2Swell = -0.5 / (swSigma * swSigma);
    dm.driftStretch = 1 / DOME_DRIFT_STRETCH;
    dm.hasCaldera = dm.chainIndex <= 1 && dm.strength > DOME_CALDERA_STRENGTH_MIN;
    const calSigFrac = dm.isContinental ? CONT_HOTSPOT_CALDERA_SIGMA_FRAC : DOME_CALDERA_SIGMA_FRAC;
    const calDepFrac = dm.isContinental ? CONT_HOTSPOT_CALDERA_DEPTH_FRAC : DOME_CALDERA_DEPTH_FRAC;
    dm.calderaSigma = dm.sigma * calSigFrac;
    dm.calderaDepth = dm.strength * calDepFrac;
    dm.invS2Caldera = -0.5 / (dm.calderaSigma * dm.calderaSigma);
    dm.ageFactor = dm.chainLength > 0 ? dm.chainIndex / dm.chainLength : 0;
  }
  const DLAT_BINS = 18, DLON_BINS = 36;
  const domeGrid = new Array(DLAT_BINS * DLON_BINS);
  for (let d = 0; d < domes.length; d++) {
    const dm = domes[d];
    const lat = Math.asin(Math.max(-1, Math.min(1, dm.y)));
    const lon = Math.atan2(dm.x, dm.z);
    const bi = Math.max(0, Math.min(DLAT_BINS - 1, Math.floor((lat + Math.PI / 2) / Math.PI * DLAT_BINS)));
    const bj = Math.max(0, Math.min(DLON_BINS - 1, Math.floor((lon + Math.PI) / (2 * Math.PI) * DLON_BINS)));
    const bin = bi * DLON_BINS + bj;
    if (!domeGrid[bin]) domeGrid[bin] = [];
    domeGrid[bin].push(d);
  }
  for (let r = 0; r < numRegions; r++) {
    const rx = r_xyz[3 * r], ry = r_xyz[3 * r + 1], rz = r_xyz[3 * r + 2];
    const rLat = Math.asin(Math.max(-1, Math.min(1, ry)));
    const rLon = Math.atan2(rx, rz);
    const rbi = Math.max(0, Math.min(DLAT_BINS - 1, Math.floor((rLat + Math.PI / 2) / Math.PI * DLAT_BINS)));
    const rbj = Math.max(0, Math.min(DLON_BINS - 1, Math.floor((rLon + Math.PI) / (2 * Math.PI) * DLON_BINS)));
    let totalUplift = 0;
    let totalSwellUplift = 0;
    let weightedAge = 0;
    let ageWeightSum = 0;
    let nearPeak = false;
    let shapeWarpSq = 1;
    let hasContrib = false;
    for (let di = -1; di <= 1; di++) {
      const bi = rbi + di;
      if (bi < 0 || bi >= DLAT_BINS) continue;
      for (let dj = -1; dj <= 1; dj++) {
        const bj = ((rbj + dj) % DLON_BINS + DLON_BINS) % DLON_BINS;
        const cell = domeGrid[bi * DLON_BINS + bj];
        if (!cell) continue;
        for (let ci = 0; ci < cell.length; ci++) {
          const dm = domes[cell[ci]];
          const cdot = dm.x * rx + dm.y * ry + dm.z * rz;
          if (cdot > dm.cosThreshSwell) hasContrib = true;
          if (cdot > dm.cosThreshPeak && !nearPeak) nearPeak = true;
        }
      }
    }
    if (!hasContrib) continue;
    if (nearPeak) {
      const hsWarpScale = DOME_SHAPE_WARP_FREQ;
      const wx = hsNoise2.fbm(rx * hsWarpScale + 5.1, ry * hsWarpScale + 3.7, rz * hsWarpScale + 9.2, 2, 0.5) * DOME_SHAPE_WARP_AMP;
      const wy = hsNoise2.fbm(rx * hsWarpScale + 11.3, ry * hsWarpScale + 7.1, rz * hsWarpScale + 2.9, 2, 0.5) * DOME_SHAPE_WARP_AMP;
      const wz = hsNoise2.fbm(rx * hsWarpScale + 1.7, ry * hsWarpScale + 13.5, rz * hsWarpScale + 6.4, 2, 0.5) * DOME_SHAPE_WARP_AMP;
      const shapeWarp = 1 + DOME_SHAPE_WARP_DETAIL_AMP * hsNoise.fbm(
        (rx + wx) * DOME_SHAPE_WARP_DETAIL_FREQ + 3.2,
        (ry + wy) * DOME_SHAPE_WARP_DETAIL_FREQ + 7.8,
        (rz + wz) * DOME_SHAPE_WARP_DETAIL_FREQ + 1.5,
        4,
        0.5
      );
      shapeWarpSq = shapeWarp * shapeWarp;
    }
    for (let di = -1; di <= 1; di++) {
      const bi = rbi + di;
      if (bi < 0 || bi >= DLAT_BINS) continue;
      for (let dj = -1; dj <= 1; dj++) {
        const bj = ((rbj + dj) % DLON_BINS + DLON_BINS) % DLON_BINS;
        const cell = domeGrid[bi * DLON_BINS + bj];
        if (!cell) continue;
        for (let ci = 0; ci < cell.length; ci++) {
          const dm = domes[cell[ci]];
          const dot2 = dm.x * rx + dm.y * ry + dm.z * rz;
          if (dot2 > dm.cosThreshSwell) {
            const swAngleSq = 2 * (1 - dot2);
            totalSwellUplift += dm.swellStrength * Math.exp(swAngleSq * dm.invS2Swell);
          }
          if (dot2 < dm.cosThreshPeak) continue;
          const offX = rx - dot2 * dm.x, offY = ry - dot2 * dm.y, offZ = rz - dot2 * dm.z;
          const parComp = offX * dm.ux + offY * dm.uy + offZ * dm.uz;
          const perpComp = offX * dm.vx + offY * dm.vy + offZ * dm.vz;
          const stretchedParSq = parComp * dm.driftStretch * (parComp * dm.driftStretch);
          const angleSq = stretchedParSq + perpComp * perpComp;
          let gauss = Math.exp(angleSq * shapeWarpSq * dm.invS2);
          if (dm.riftAngles.length > 0 && gauss > 0.01) {
            const angle = Math.atan2(perpComp, parComp);
            let maxRift = 0;
            for (let ri = 0; ri < dm.riftAngles.length; ri++) {
              let da2 = angle - dm.riftAngles[ri];
              da2 = da2 - Math.round(da2 / (2 * Math.PI)) * 2 * Math.PI;
              const c2 = Math.cos(da2);
              const riftFactor = c2 * c2 * c2 * c2;
              if (riftFactor > maxRift) maxRift = riftFactor;
            }
            gauss *= 1 + DOME_RIFT_BOOST * maxRift;
          }
          const peakUplift = dm.strength * gauss;
          totalUplift += peakUplift;
          weightedAge += dm.ageFactor * peakUplift;
          ageWeightSum += peakUplift;
          if (dm.hasCaldera) {
            const calderaGauss = Math.exp(angleSq * dm.invS2Caldera);
            totalUplift -= dm.calderaDepth * calderaGauss;
          }
        }
      }
    }
    const combinedUplift = totalSwellUplift + totalUplift;
    if (combinedUplift > 1e-3) {
      const age = ageWeightSum > 0 ? weightedAge / ageWeightSum : 0;
      const texBase = DOME_TEXTURE_BASE_WEIGHT * hsNoise.ridgedFbm(rx * 12, ry * 12, rz * 12, 4, 2, 0.5, 1);
      const texDetail = DOME_TEXTURE_DETAIL_WEIGHT * hsNoise.ridgedFbm(rx * 30, ry * 30, rz * 30, 3, 2, 0.5, 1);
      const texRaw = texBase + texDetail;
      const texMin = DOME_TEXTURE_ACTIVE_MIN + age * DOME_TEXTURE_AGE_MIN_SHIFT;
      const texMax = DOME_TEXTURE_ACTIVE_MAX - age * DOME_TEXTURE_AGE_MAX_SHIFT;
      const volc = texMin + (texMax - texMin) * texRaw;
      const uplift = totalSwellUplift + Math.max(0, totalUplift) * volc;
      r_elevation[r] += uplift;
      dl_hotspot[r] = uplift;
    }
  }
  if (lipSites.length > 0) {
    const lipWarpNoise = new SimplexNoise(seed + 7771);
    const lipWarpAmp = 0.08;
    for (let r = 0; r < numRegions; r++) {
      const rx = r_xyz[3 * r], ry = r_xyz[3 * r + 1], rz = r_xyz[3 * r + 2];
      const wx = rx + lipWarpNoise.noise3D(rx * 6, ry * 6, rz * 6) * lipWarpAmp;
      const wy = ry + lipWarpNoise.noise3D(rx * 6 + 40, ry * 6 + 40, rz * 6 + 40) * lipWarpAmp;
      const wz = rz + lipWarpNoise.noise3D(rx * 6 + 80, ry * 6 + 80, rz * 6 + 80) * lipWarpAmp;
      const wl = Math.sqrt(wx * wx + wy * wy + wz * wz);
      const wrx = wx / wl, wry = wy / wl, wrz = wz / wl;
      for (let li = 0; li < lipSites.length; li++) {
        const lip = lipSites[li];
        const dot2 = wrx * lip.x + wry * lip.y + wrz * lip.z;
        if (dot2 < 0.9) continue;
        const dx = wrx - lip.x * dot2;
        const dy = wry - lip.y * dot2;
        const dz = wrz - lip.z * dot2;
        const du = dx * lip.ux + dy * lip.uy + dz * lip.uz;
        const dv = dx * lip.vx + dy * lip.vy + dz * lip.vz;
        const aspect = lip.aspect || 1;
        const ellipDist = du * du / (aspect * aspect) + dv * dv;
        const invS2 = -0.5 / (lip.sigma * lip.sigma);
        const gauss = Math.exp(ellipDist * invS2);
        if (gauss > 0.01) {
          const contrib = lip.height * gauss;
          r_elevation[r] += contrib;
          dl_lip[r] += contrib;
          dl_hotspot[r] += contrib;
        }
      }
    }
  }
}
function applyUniformLandNoise(mesh, r_xyz, r_elevation, sf, tt, noiseMag, seed, debugLayers) {
  const { numRegions, adjOffset, adjList } = mesh;
  const { r_isOcean, dist_mountain } = sf;
  const { r_basinFactor } = tt;
  const dl_uniformNoise = debugLayers.uniformNoise;
  const scaleFactor = Math.sqrt(numRegions / COLLISION_DT_REF_REGIONS);
  const addNoise = new SimplexNoise(seed + 500);
  const subNoise = new SimplexNoise(seed + 501);
  const freq = UNIFORM_LAND_NOISE_FREQ;
  const oct = UNIFORM_LAND_NOISE_OCTAVES;
  const amp = UNIFORM_LAND_NOISE_AMP * noiseMag;
  const mtnRampDist = Math.max(4, Math.round(20 * scaleFactor));
  const halfFreq = freq * 0.5;
  const halfAmp = amp * 0.5;
  for (let r = 0; r < numRegions; r++) {
    if (r_isOcean[r] && r_elevation[r] <= 0) continue;
    const ex = r_elevation[r];
    let sum2 = 0, count = 0;
    for (let ni = adjOffset[r], niEnd = adjOffset[r + 1]; ni < niEnd; ni++) {
      sum2 += Math.abs(r_elevation[adjList[ni]] - ex);
      count++;
    }
    const slopeVal = sum2 / (count | 1);
    const gradDamp = 1 / (1 + 4 * slopeVal);
    const elev = ex > 0 ? ex : 0;
    const elevT = elev < 0.3 ? elev / 0.3 : 1;
    const elevBoost = elevT * elevT * (3 - 2 * elevT);
    const basinDamp = 1 - 0.6 * r_basinFactor[r];
    const dm = dist_mountain[r];
    const mtnT = dm === Infinity ? 0 : dm < mtnRampDist ? 1 - dm / mtnRampDist : 0;
    const modulation = Math.max(0.1, gradDamp * elevBoost * basinDamp * (1 + 0.5 * mtnT * mtnT));
    const i3 = 3 * r;
    const x = r_xyz[i3], y = r_xyz[i3 + 1], z = r_xyz[i3 + 2];
    const addVal = addNoise.fbm(x * halfFreq + 55.3, y * halfFreq + 18.7, z * halfFreq + 42.1, oct) * amp;
    const subVal = subNoise.fbm(x * freq + 88.9, y * freq + 33.4, z * freq + 61.6, oct) * halfAmp;
    const uniformContrib = (addVal - subVal) * modulation;
    r_elevation[r] += uniformContrib;
    dl_uniformNoise[r] = uniformContrib;
  }
}
function applyDynamicTopography(r_elevation, r_mantleNorm, debugLayers) {
  if (!r_mantleNorm) return;
  const dl_dynamicTopo = debugLayers.dynamicTopo;
  for (let r = 0; r < r_elevation.length; r++) {
    const mn = r_mantleNorm[r];
    const dtopo = mn > 0 ? mn * DYNAMIC_TOPO_UPLIFT : mn * DYNAMIC_TOPO_SUBSIDENCE;
    r_elevation[r] += dtopo;
    dl_dynamicTopo[r] = dtopo;
  }
}
function applyFinalShaping(r_elevation) {
  const numRegions = r_elevation.length;
  for (let r = 0; r < numRegions; r++) {
    if (r_elevation[r] > 0) {
      r_elevation[r] = Math.pow(r_elevation[r], PEAK_COMPRESS_POWER);
    }
  }
  for (let r = 0; r < numRegions; r++) {
    const e = r_elevation[r];
    r_elevation[r] = e - Math.abs(e) * e * ISOSTATIC_K;
  }
  const landRegions = [];
  for (let r = 0; r < numRegions; r++) {
    if (r_elevation[r] > 0) landRegions.push(r);
  }
  const n = landRegions.length;
  if (n > 1) {
    landRegions.sort((a, b) => r_elevation[a] - r_elevation[b]);
    const minLandElev = r_elevation[landRegions[0]];
    const maxLandElev = r_elevation[landRegions[n - 1]];
    const range = maxLandElev - minLandElev;
    if (range > 0.01) {
      for (let i = 0; i < n; i++) {
        const r = landRegions[i];
        const rank = i / (n - 1);
        let targetPct;
        if (rank < HYPS_LOW_BREAK) {
          targetPct = HYPS_LOW_ELEV_FRAC * (rank / HYPS_LOW_BREAK);
        } else if (rank < HYPS_MID_BREAK) {
          targetPct = HYPS_LOW_ELEV_FRAC + HYPS_MID_ELEV_FRAC * ((rank - HYPS_LOW_BREAK) / (HYPS_MID_BREAK - HYPS_LOW_BREAK));
        } else {
          const t = (rank - HYPS_MID_BREAK) / (1 - HYPS_MID_BREAK);
          targetPct = HYPS_LOW_ELEV_FRAC + HYPS_MID_ELEV_FRAC + (1 - HYPS_LOW_ELEV_FRAC - HYPS_MID_ELEV_FRAC) * Math.pow(t, HYPS_HIGH_POWER);
        }
        const targetElev = minLandElev + targetPct * range;
        r_elevation[r] = r_elevation[r] * (1 - HYPS_BLEND) + targetElev * HYPS_BLEND;
      }
    }
  }
}
function fixupTopology(mesh, r_elevation, r_isOcean) {
  const { numRegions, adjOffset, adjList } = mesh;
  const visited = new Uint8Array(numRegions);
  const queue = [];
  for (let r = 0; r < numRegions; r++) {
    if (r_isOcean[r]) {
      visited[r] = 1;
      queue.push(r);
    }
  }
  let qi = 0;
  while (qi < queue.length) {
    const r = queue[qi++];
    for (let ni = adjOffset[r], niEnd = adjOffset[r + 1]; ni < niEnd; ni++) {
      const nb = adjList[ni];
      if (!visited[nb] && r_elevation[nb] <= 0) {
        visited[nb] = 1;
        queue.push(nb);
      }
    }
  }
  for (let r = 0; r < numRegions; r++) {
    if (!r_isOcean[r] && !visited[r] && r_elevation[r] <= 0) {
      r_elevation[r] = FILL_LEVEL;
    }
  }
}
function assignElevation(mesh, r_xyz, plateIsOcean, r_plate, plateVec, plateSeeds, noise, noiseMag, seed, spread, plateDensity, superPlateData, r_mantleField) {
  const { numRegions } = mesh;
  const _timing = [];
  let _t0 = performance.now();
  const debugLayers = {
    base: new Float32Array(numRegions),
    tectonic: new Float32Array(numRegions),
    noise: new Float32Array(numRegions),
    interior: new Float32Array(numRegions),
    coastal: new Float32Array(numRegions),
    ocean: new Float32Array(numRegions),
    hotspot: new Float32Array(numRegions),
    lip: new Float32Array(numRegions),
    tecActivity: new Float32Array(numRegions),
    margins: new Float32Array(numRegions),
    backArc: new Float32Array(numRegions),
    phasorRidge: new Float32Array(numRegions),
    orogenicPower: new Float32Array(numRegions),
    uniformNoise: new Float32Array(numRegions),
    dynamicTopo: new Float32Array(numRegions)
  };
  const tect = computeTectonicState(mesh, r_xyz, plateIsOcean, r_plate, plateVec, plateSeeds, plateDensity, noise, superPlateData, r_mantleField, spread);
  _timing.push({ stage: "1. Tectonic state", ms: performance.now() - _t0 });
  _t0 = performance.now();
  const sf = computeSpatialFields(mesh, r_xyz, r_plate, plateIsOcean, tect, seed, superPlateData);
  _timing.push({ stage: "2. Spatial fields", ms: performance.now() - _t0 });
  _t0 = performance.now();
  const tt = classifyTerrain(mesh, r_xyz, tect, sf, seed);
  debugLayers.basin = tt.r_basinFactor;
  debugLayers.tecActivity = tt.r_tectonicActivity;
  debugLayers.noiseAmp = tt.r_noiseAmp;
  debugLayers.foldBeltWeight = tt.r_t_foldBelt;
  debugLayers.cratonWeight = tt.r_t_craton;
  debugLayers.basinWeight = tt.r_t_basin;
  _timing.push({ stage: "3. Terrain classification", ms: performance.now() - _t0 });
  _t0 = performance.now();
  const r_elevation = buildSkeleton(mesh, r_xyz, plateIsOcean, r_plate, plateVec, plateSeeds, tect, sf, tt, noise, noiseMag, seed, debugLayers);
  debugLayers.skeleton = new Float32Array(r_elevation);
  _timing.push({ stage: "4. Skeleton", ms: performance.now() - _t0 });
  _t0 = performance.now();
  applyPhasorRidges(mesh, r_xyz, r_elevation, tect, sf, tt, noiseMag, seed, debugLayers);
  _timing.push({ stage: "5. Phasor ridges", ms: performance.now() - _t0 });
  _t0 = performance.now();
  applyIslandArcs(mesh, r_xyz, r_elevation, tect, sf, r_plate, seed, debugLayers);
  applyVolcanicArcs(mesh, r_xyz, r_elevation, tect, seed, debugLayers);
  applyHotspotsAndLIPs(mesh, r_xyz, r_elevation, tect, sf, plateVec, r_plate, plateIsOcean, seed, debugLayers);
  _timing.push({ stage: "6. Edifices", ms: performance.now() - _t0 });
  _t0 = performance.now();
  applyTectonicBandNoise(mesh, r_xyz, r_elevation, sf, tt, noise, noiseMag, debugLayers);
  _timing.push({ stage: "7. Tectonic-band noise", ms: performance.now() - _t0 });
  _t0 = performance.now();
  applyDetailTexture(mesh, r_xyz, r_elevation, tect, sf, noise, noiseMag, debugLayers);
  _timing.push({ stage: "8. Detail texture", ms: performance.now() - _t0 });
  _t0 = performance.now();
  applyCoastalDetail(mesh, r_xyz, r_elevation, tect, sf, noise, noiseMag, seed, debugLayers);
  _timing.push({ stage: "9. Coastal detail", ms: performance.now() - _t0 });
  _t0 = performance.now();
  applyUniformLandNoise(mesh, r_xyz, r_elevation, sf, tt, noiseMag, seed, debugLayers);
  _timing.push({ stage: "10. Uniform land noise", ms: performance.now() - _t0 });
  _t0 = performance.now();
  applyDynamicTopography(r_elevation, tect.r_mantleNorm, debugLayers);
  _timing.push({ stage: "11. Dynamic topography", ms: performance.now() - _t0 });
  _t0 = performance.now();
  applyFinalShaping(r_elevation);
  _timing.push({ stage: "12. Final shaping", ms: performance.now() - _t0 });
  _t0 = performance.now();
  fixupTopology(mesh, r_elevation, sf.r_isOcean);
  _timing.push({ stage: "13. Topology fixup", ms: performance.now() - _t0 });
  if (superPlateData) {
    debugLayers.superPlates = new Float32Array(superPlateData.r_superPlate);
  }
  return {
    r_elevation,
    mountain_r: tect.mountain_r,
    coastline_r: tect.coastline_r,
    ocean_r: tect.ocean_r,
    r_stress: tect.r_stress,
    debugLayers,
    _timing
  };
}

// vendor/world-orogen/js/terrain-post.js
var MinHeap = class {
  constructor(keyArray) {
    this._key = keyArray;
    this._data = [];
  }
  get size() {
    return this._data.length;
  }
  push(cell) {
    this._data.push(cell);
    let i = this._data.length - 1;
    while (i > 0) {
      const parent = i - 1 >> 1;
      if (this._key[this._data[i]] >= this._key[this._data[parent]]) break;
      const tmp = this._data[i];
      this._data[i] = this._data[parent];
      this._data[parent] = tmp;
      i = parent;
    }
  }
  pop() {
    const top = this._data[0];
    const last = this._data.pop();
    if (this._data.length > 0) {
      this._data[0] = last;
      let i = 0;
      const n = this._data.length;
      while (true) {
        let smallest = i;
        const l = 2 * i + 1, r = 2 * i + 2;
        if (l < n && this._key[this._data[l]] < this._key[this._data[smallest]]) smallest = l;
        if (r < n && this._key[this._data[r]] < this._key[this._data[smallest]]) smallest = r;
        if (smallest === i) break;
        const tmp = this._data[i];
        this._data[i] = this._data[smallest];
        this._data[smallest] = tmp;
        i = smallest;
      }
    }
    return top;
  }
};
function priorityFloodCarve(mesh, r_elevation, r_isOcean, carveStrength) {
  const N = mesh.numRegions;
  const { adjOffset, adjList } = mesh;
  const EPS = 1e-7;
  const oceanLabel = new Int32Array(N).fill(-1);
  const componentSizes = [];
  for (let r = 0; r < N; r++) {
    if (!r_isOcean[r] || oceanLabel[r] >= 0) continue;
    const label = componentSizes.length;
    let size = 0;
    const queue = [r];
    oceanLabel[r] = label;
    while (queue.length > 0) {
      const cur = queue.pop();
      size++;
      for (let i = adjOffset[cur], iEnd = adjOffset[cur + 1]; i < iEnd; i++) {
        const nb = adjList[i];
        if (r_isOcean[nb] && oceanLabel[nb] < 0) {
          oceanLabel[nb] = label;
          queue.push(nb);
        }
      }
    }
    componentSizes.push(size);
  }
  let mainOceanLabel = 0;
  for (let i = 1; i < componentSizes.length; i++) {
    if (componentSizes[i] > componentSizes[mainOceanLabel]) mainOceanLabel = i;
  }
  const isOpenOcean = new Uint8Array(N);
  for (let r = 0; r < N; r++) {
    if (r_isOcean[r] && oceanLabel[r] === mainOceanLabel) isOpenOcean[r] = 1;
  }
  const NOISE_AMP = FLOOD_NOISE_AMP;
  function cellNoise(r) {
    let h = r * 2654435761 >>> 0;
    h = (h >>> 16 ^ h) * 73244475 >>> 0;
    h = (h >>> 16 ^ h) >>> 0;
    return h / 4294967295 * NOISE_AMP;
  }
  const surface = new Float32Array(r_elevation);
  const drainTo = new Int32Array(N).fill(-1);
  const visited = new Uint8Array(N);
  const key = new Float32Array(N);
  for (let r = 0; r < N; r++) key[r] = r_elevation[r] + cellNoise(r);
  const heap = new MinHeap(key);
  for (let r = 0; r < N; r++) {
    if (r_isOcean[r]) {
      visited[r] = 1;
      continue;
    }
    for (let i = adjOffset[r], iEnd = adjOffset[r + 1]; i < iEnd; i++) {
      if (isOpenOcean[adjList[i]]) {
        visited[r] = 1;
        drainTo[r] = adjList[i];
        heap.push(r);
        break;
      }
    }
  }
  while (heap.size > 0) {
    const r = heap.pop();
    const surfR = surface[r];
    for (let i = adjOffset[r], iEnd = adjOffset[r + 1]; i < iEnd; i++) {
      const nb = adjList[i];
      if (visited[nb]) continue;
      visited[nb] = 1;
      drainTo[nb] = r;
      if (r_elevation[nb] < surfR + EPS) {
        surface[nb] = surfR + EPS;
        key[nb] = surface[nb] + cellNoise(nb);
      }
      heap.push(nb);
    }
  }
  for (let r = 0; r < N; r++) {
    if (r_isOcean[r]) continue;
    const deficit = surface[r] - r_elevation[r];
    if (deficit <= EPS) continue;
    const path = [];
    let peakIdx = -1;
    let peakElev = -Infinity;
    let cur = r;
    while (cur >= 0 && !r_isOcean[cur]) {
      path.push(cur);
      if (r_elevation[cur] > peakElev) {
        peakElev = r_elevation[cur];
        peakIdx = path.length - 1;
      }
      cur = drainTo[cur];
    }
    if (peakIdx < 0 || path.length === 0) continue;
    const carveAmount = deficit * carveStrength;
    const radius = Math.max(3, Math.ceil(path.length * FLOOD_CARVE_RADIUS_FRAC));
    const startIdx = Math.max(0, peakIdx - radius);
    const endIdx = Math.min(path.length - 1, peakIdx + radius);
    let kernelSum = 0;
    for (let k = startIdx; k <= endIdx; k++) {
      const dist2 = Math.abs(k - peakIdx);
      kernelSum += 1 - dist2 / (radius + 1);
    }
    if (kernelSum > 0) {
      for (let k = startIdx; k <= endIdx; k++) {
        const dist2 = Math.abs(k - peakIdx);
        const weight = (1 - dist2 / (radius + 1)) / kernelSum;
        r_elevation[path[k]] -= carveAmount * weight;
        if (r_elevation[path[k]] < 0) r_elevation[path[k]] = 0;
      }
    }
    const fillAmount = deficit * (1 - carveStrength);
    r_elevation[r] += fillAmount;
  }
  const order = [];
  for (let r = 0; r < N; r++) {
    if (!r_isOcean[r]) order.push(r);
  }
  order.sort((a, b) => surface[a] - surface[b]);
  for (let i = 0; i < order.length; i++) {
    const r = order[i];
    const target = drainTo[r];
    if (target < 0) continue;
    const targetElev = r_isOcean[target] ? 0 : r_elevation[target];
    if (r_elevation[r] <= targetElev) {
      r_elevation[r] = targetElev + EPS;
    }
  }
}
function warpTerrain(mesh, r_elevation, r_xyz, seed, strength, r_hotspot) {
  if (strength <= 0) return;
  const N = mesh.numRegions;
  const { adjOffset, adjList } = mesh;
  const noise = new SimplexNoise(seed + 9999);
  const freq = WARP_FREQ;
  const octaves = WARP_OCTAVES;
  const maxAmp = WARP_MAX_AMP_MULT * strength;
  const out = new Float32Array(r_elevation);
  for (let r = 0; r < N; r++) {
    const px = r_xyz[3 * r], py = r_xyz[3 * r + 1], pz = r_xyz[3 * r + 2];
    let ex = -pz, ey = 0, ez = px;
    const elen = Math.sqrt(ex * ex + ez * ez);
    if (elen > 1e-10) {
      ex /= elen;
      ez /= elen;
    } else {
      ex = 1;
      ez = 0;
    }
    const nx = py * ez;
    const ny = pz * ex - px * ez;
    const nz = -py * ex;
    const nlen = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    const nnx = nx / nlen, nny = ny / nlen, nnz = nz / nlen;
    const pfx = px * freq, pfy = py * freq, pfz = pz * freq;
    const d1 = noise.fbm(pfx, pfy, pfz, octaves) * maxAmp;
    const d2 = noise.fbm(pfx + 31.7, pfy + 47.3, pfz + 19.1, octaves) * maxAmp;
    let wx = px + ex * d1 + nnx * d2;
    let wy = py + ey * d1 + nny * d2;
    let wz = pz + ez * d1 + nnz * d2;
    const wlen = Math.sqrt(wx * wx + wy * wy + wz * wz) || 1;
    wx /= wlen;
    wy /= wlen;
    wz /= wlen;
    let cur = r;
    let bestDot = wx * px + wy * py + wz * pz;
    for (; ; ) {
      let moved = false;
      for (let i = adjOffset[cur], iEnd = adjOffset[cur + 1]; i < iEnd; i++) {
        const nb = adjList[i];
        const dot2 = wx * r_xyz[3 * nb] + wy * r_xyz[3 * nb + 1] + wz * r_xyz[3 * nb + 2];
        if (dot2 > bestDot) {
          bestDot = dot2;
          cur = nb;
          moved = true;
        }
      }
      if (!moved) break;
    }
    out[r] = r_elevation[cur];
  }
  const warpBias = WARP_BIAS_BASE + WARP_BIAS_STRENGTH_SCALE * strength;
  for (let r = 0; r < N; r++) {
    const orig = r_elevation[r];
    const warped = out[r];
    let bias = warpBias;
    if (r_hotspot) {
      const hotFrac = Math.min(1, Math.abs(r_hotspot[r]) / (Math.abs(orig) || 1));
      bias *= 1 - WARP_HOTSPOT_DAMPEN * hotFrac;
    }
    if (warped > orig) {
      r_elevation[r] = orig + (warped - orig) * bias;
    } else {
      r_elevation[r] = warped + (orig - warped) * (1 - bias);
    }
  }
}
function smoothElevation(mesh, r_elevation, r_isOcean, iterations, strength) {
  const N = mesh.numRegions;
  const tmp = new Float32Array(N);
  const { adjOffset, adjList } = mesh;
  const locked = new Uint8Array(N);
  for (let r = 0; r < N; r++) {
    if (r_isOcean[r]) {
      if (r_elevation[r] > 0) locked[r] = 1;
      continue;
    }
    for (let i = adjOffset[r], iEnd = adjOffset[r + 1]; i < iEnd; i++) {
      if (r_isOcean[adjList[i]]) {
        locked[r] = 1;
        break;
      }
    }
  }
  for (let iter = 0; iter < iterations; iter++) {
    for (let r = 0; r < N; r++) {
      if (locked[r]) {
        tmp[r] = r_elevation[r];
        continue;
      }
      const h = r_elevation[r];
      let wSum = 0, hSum = 0;
      for (let i = adjOffset[r], iEnd = adjOffset[r + 1]; i < iEnd; i++) {
        const nh = r_elevation[adjList[i]];
        const diff = Math.abs(nh - h);
        const w = 1 / (1 + diff * SMOOTH_EDGE_SENSITIVITY);
        wSum += w;
        hSum += nh * w;
      }
      if (wSum > 0) {
        const avg = hSum / wSum;
        tmp[r] = h + (avg - h) * strength;
      } else {
        tmp[r] = h;
      }
    }
    for (let r = 0; r < N; r++) r_elevation[r] = tmp[r];
  }
}
function erodeComposite(mesh, r_elevation, r_xyz, r_isOcean, hIters, K, m, dt, tIters, talusSlope, kThermal, gIters, glacialStrength, neighborDist) {
  gIters = gIters || 0;
  glacialStrength = glacialStrength || 0;
  const totalIters = Math.max(hIters, tIters, gIters);
  if (totalIters <= 0) return;
  const N = mesh.numRegions;
  const { adjOffset, adjList } = mesh;
  const landCells = [];
  for (let r = 0; r < N; r++) {
    if (!r_isOcean[r]) landCells.push(r);
  }
  const landCount = landCells.length;
  if (landCount === 0) return;
  const drainTarget = new Int32Array(N);
  const cellDist = new Float32Array(N);
  const flow = new Float32Array(N);
  const delta = new Float32Array(N);
  if (hIters > 0) {
    priorityFloodCarve(mesh, r_elevation, r_isOcean, GLACIAL_INITIAL_CARVE);
  }
  let glacIdx = null;
  let iceTarget = null;
  let iceFlow = null;
  let numIceUpstream = null;
  if (gIters > 0 && glacialStrength > 0) {
    let smoothstep = function(x, edge0, edge1) {
      const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
      return t * t * (3 - 2 * t);
    };
    glacIdx = new Float32Array(N);
    const thresholdLat = Math.PI / 2 - glacialStrength * Math.PI / GLACIAL_LAT_DIVISOR;
    for (let r = 0; r < N; r++) {
      if (r_isOcean[r]) continue;
      const y = r_xyz[3 * r + 1];
      const polarDist = Math.abs(Math.asin(Math.max(-1, Math.min(1, y))));
      const latFactor = smoothstep(polarDist, thresholdLat, Math.PI / 2);
      const elevFactor = smoothstep(r_elevation[r], GLACIAL_ELEV_LOW, GLACIAL_ELEV_HIGH);
      const latScale = smoothstep(polarDist, Math.PI / 8, Math.PI / 3);
      glacIdx[r] = Math.max(latFactor, elevFactor * GLACIAL_ELEV_FACTOR_SCALE * (GLACIAL_ELEV_FACTOR_LAT_BASE + GLACIAL_ELEV_FACTOR_LAT_SCALE * latScale)) * glacialStrength;
    }
    iceTarget = new Int32Array(N);
    iceFlow = new Float32Array(N);
    numIceUpstream = new Uint8Array(N);
  }
  const gScale = gIters > 0 ? 1 / gIters : 0;
  const gCarveRate = GLACIAL_CARVE_RATE * gScale;
  const gConvergenceBonus = GLACIAL_CONVERGENCE_BONUS * gScale;
  const gDepositAmount = GLACIAL_DEPOSIT_AMOUNT * gScale;
  const gFjordCarve = GLACIAL_FJORD_CARVE * gScale;
  const gFlowThreshold = GLACIAL_FLOW_THRESHOLD;
  const gFjordThreshold = GLACIAL_FJORD_THRESHOLD;
  const midFloodIter = Math.round(totalIters * GLACIAL_MID_FLOOD_FRAC);
  let midFloodDone = false;
  let maxDeg = 0;
  for (let r = 0; r < N; r++) {
    const deg = adjOffset[r + 1] - adjOffset[r];
    if (deg > maxDeg) maxDeg = deg;
  }
  const excNb = new Int32Array(maxDeg);
  const excVal = new Float32Array(maxDeg);
  const excAdjIdx = new Int32Array(maxDeg);
  const excSlope = new Float32Array(maxDeg);
  for (let iter = 0; iter < totalIters; iter++) {
    if (!midFloodDone && iter >= midFloodIter) {
      midFloodDone = true;
      priorityFloodCarve(mesh, r_elevation, r_isOcean, GLACIAL_MID_FLOOD_CARVE);
    }
    const glacialThisIter = iter < gIters && glacIdx;
    const hydraulicThisIter = iter < hIters;
    if (glacialThisIter || hydraulicThisIter) {
      landCells.sort((a, b) => r_elevation[b] - r_elevation[a]);
    }
    if (glacialThisIter) {
      iceTarget.fill(-1);
      numIceUpstream.fill(0);
      for (let i = 0; i < landCount; i++) {
        const r = landCells[i];
        if (glacIdx[r] <= 0) continue;
        const h = r_elevation[r];
        let bestNb = -1, bestDrop = 0;
        for (let j = adjOffset[r], jEnd = adjOffset[r + 1]; j < jEnd; j++) {
          const nb = adjList[j];
          const drop = h - r_elevation[nb];
          if (drop > bestDrop) {
            bestDrop = drop;
            bestNb = nb;
          }
        }
        if (bestNb >= 0) iceTarget[r] = bestNb;
      }
      for (let r = 0; r < N; r++) iceFlow[r] = glacIdx[r];
      for (let i = 0; i < landCount; i++) {
        const r = landCells[i];
        const target = iceTarget[r];
        if (target >= 0 && iceFlow[r] > 0) {
          iceFlow[target] += iceFlow[r];
          numIceUpstream[target]++;
        }
      }
      for (let i = 0; i < landCount; i++) {
        const r = landCells[i];
        if (iceFlow[r] <= gFlowThreshold) continue;
        const deepening = gCarveRate * Math.pow(iceFlow[r], 0.6) * glacialStrength;
        r_elevation[r] -= deepening;
        for (let j = adjOffset[r], jEnd = adjOffset[r + 1]; j < jEnd; j++) {
          const nb = adjList[j];
          if (r_isOcean[nb]) continue;
          const d = neighborDist[j] || 1e-6;
          const slope = Math.abs(r_elevation[r] - r_elevation[nb]) / d;
          r_elevation[nb] -= deepening * GLACIAL_WIDENING_FRAC * Math.max(0, 1 - slope);
        }
        if (numIceUpstream[r] >= 2) {
          r_elevation[r] -= gConvergenceBonus * Math.pow(iceFlow[r], 0.4);
        }
      }
      for (let i = 0; i < landCount; i++) {
        const r = landCells[i];
        if (iceFlow[r] <= gFlowThreshold) continue;
        const target = iceTarget[r];
        if (target < 0 || r_isOcean[target]) continue;
        if (glacIdx[target] < glacIdx[r] * GLACIAL_TERMINUS_RATIO) {
          r_elevation[target] += gDepositAmount * Math.pow(iceFlow[r], 0.3);
        }
      }
      for (let r = 0; r < N; r++) {
        if (r_isOcean[r]) continue;
        if (glacIdx[r] <= GLACIAL_FJORD_ICE_MIN || iceFlow[r] <= gFjordThreshold) continue;
        let isCoastal = false;
        for (let j = adjOffset[r], jEnd = adjOffset[r + 1]; j < jEnd; j++) {
          if (r_isOcean[adjList[j]]) {
            isCoastal = true;
            break;
          }
        }
        if (isCoastal) {
          r_elevation[r] -= gFjordCarve * Math.pow(iceFlow[r], 0.5);
          if (r_elevation[r] < 0) r_elevation[r] = 0;
        }
      }
      for (let r = 0; r < N; r++) {
        if (!r_isOcean[r] && r_elevation[r] < 0) r_elevation[r] = 0;
      }
    }
    if (hydraulicThisIter) {
      if (glacialThisIter) {
        landCells.sort((a, b) => r_elevation[b] - r_elevation[a]);
      }
      drainTarget.fill(-1);
      for (let i = 0; i < landCount; i++) {
        const r = landCells[i];
        const h = r_elevation[r];
        let bestNb = -1, bestDrop = -Infinity, bestJ = -1;
        for (let j = adjOffset[r], jEnd = adjOffset[r + 1]; j < jEnd; j++) {
          const nb = adjList[j];
          const drop = h - r_elevation[nb];
          if (drop > bestDrop) {
            bestDrop = drop;
            bestNb = nb;
            bestJ = j;
          }
        }
        if (bestDrop <= 0) {
          let minAscent = Infinity;
          for (let j = adjOffset[r], jEnd = adjOffset[r + 1]; j < jEnd; j++) {
            const nb = adjList[j];
            const ascent = r_elevation[nb] - h;
            if (ascent < minAscent) {
              minAscent = ascent;
              bestNb = nb;
              bestJ = j;
            }
          }
        }
        if (bestNb >= 0) {
          drainTarget[r] = bestNb;
          cellDist[r] = neighborDist[bestJ] || 1e-6;
        }
      }
      flow.fill(0);
      for (let i = 0; i < landCount; i++) flow[landCells[i]] = 1;
      for (let i = 0; i < landCount; i++) {
        const r = landCells[i];
        const target = drainTarget[r];
        if (target >= 0) flow[target] += flow[r];
      }
      for (let i = landCount - 1; i >= 0; i--) {
        const r = landCells[i];
        const target = drainTarget[r];
        if (target < 0 || cellDist[r] <= 0) continue;
        const factor = K * Math.pow(flow[r], m) * dt / cellDist[r];
        const h_receiver = Math.max(r_elevation[target], 0);
        let h_new = (r_elevation[r] + factor * h_receiver) / (1 + factor);
        if (h_new < h_receiver) h_new = h_receiver;
        if (h_new < 0) h_new = 0;
        const eroded = r_elevation[r] - h_new;
        if (eroded > 0 && !r_isOcean[target]) {
          const drainOfTarget = drainTarget[target];
          let receiverSlope = 0;
          if (drainOfTarget >= 0 && cellDist[target] > 0) {
            receiverSlope = Math.abs(r_elevation[target] - r_elevation[drainOfTarget]) / cellDist[target];
          }
          const depositFrac = HYDRAULIC_DEPOSIT_FRAC / (1 + receiverSlope * HYDRAULIC_SLOPE_SENSITIVITY);
          const deposit = eroded * depositFrac;
          r_elevation[target] += deposit;
          if (r_elevation[target] > h_new) r_elevation[target] = h_new;
        }
        r_elevation[r] = h_new;
      }
    }
    if (iter < tIters) {
      delta.fill(0);
      for (let i = 0; i < landCount; i++) {
        const r = landCells[i];
        const h = r_elevation[r];
        let totalExcess = 0;
        let excCount = 0;
        for (let j = adjOffset[r], jEnd = adjOffset[r + 1]; j < jEnd; j++) {
          const nb = adjList[j];
          if (r_isOcean[nb]) continue;
          const nh = r_elevation[nb];
          if (nh >= h) continue;
          const d = neighborDist[j] || 1e-6;
          const slope = (h - nh) / d;
          if (slope > talusSlope) {
            const excess = (slope - talusSlope) * d;
            excNb[excCount] = nb;
            excVal[excCount] = excess;
            excAdjIdx[excCount] = j;
            excCount++;
            totalExcess += excess;
          }
        }
        if (totalExcess <= 0) continue;
        let totalSlopeWeighted = 0;
        for (let k = 0; k < excCount; k++) {
          const d = neighborDist[excAdjIdx[k]] || 1e-6;
          excSlope[k] = (h - r_elevation[excNb[k]]) / d;
          totalSlopeWeighted += excVal[k] * excSlope[k];
        }
        const transfer = kThermal * totalExcess * THERMAL_TRANSFER_FRAC;
        if (totalSlopeWeighted > 0) {
          for (let k = 0; k < excCount; k++) {
            const share = excVal[k] * excSlope[k] / totalSlopeWeighted * transfer;
            delta[r] -= share;
            delta[excNb[k]] += share;
          }
        } else {
          for (let k = 0; k < excCount; k++) {
            const share = excVal[k] / totalExcess * transfer;
            delta[r] -= share;
            delta[excNb[k]] += share;
          }
        }
      }
      for (let i = 0; i < landCount; i++) {
        r_elevation[landCells[i]] += delta[landCells[i]];
      }
    }
  }
  if (glacIdx) {
    const tmp = new Float32Array(r_elevation);
    for (let r = 0; r < N; r++) {
      if (r_isOcean[r] || glacIdx[r] <= 0) continue;
      let sum2 = 0, count = 0;
      for (let j = adjOffset[r], jEnd = adjOffset[r + 1]; j < jEnd; j++) {
        if (!r_isOcean[adjList[j]]) {
          sum2 += r_elevation[adjList[j]];
          count++;
        }
      }
      if (count > 0) {
        const avg = sum2 / count;
        tmp[r] = r_elevation[r] + (avg - r_elevation[r]) * GLACIAL_POST_SMOOTH;
      }
    }
    for (let r = 0; r < N; r++) {
      if (!r_isOcean[r] && glacIdx[r] > 0) r_elevation[r] = tmp[r];
    }
  }
}
function sharpenRidges(mesh, r_elevation, r_isOcean, iterations, strength) {
  const N = mesh.numRegions;
  const { adjOffset, adjList } = mesh;
  const landCells = [];
  for (let r = 0; r < N; r++) {
    if (!r_isOcean[r]) landCells.push(r);
  }
  const landCount = landCells.length;
  const tmp = new Float32Array(N);
  const original = new Float32Array(r_elevation);
  for (let iter = 0; iter < iterations; iter++) {
    for (let li = 0; li < landCount; li++) {
      const r = landCells[li];
      const h = r_elevation[r];
      let sum2 = 0;
      const count = adjOffset[r + 1] - adjOffset[r];
      for (let i = adjOffset[r], iEnd = adjOffset[r + 1]; i < iEnd; i++) {
        sum2 += r_elevation[adjList[i]];
      }
      if (count === 0) {
        tmp[r] = h;
        continue;
      }
      const avg = sum2 / count;
      if (h > avg) {
        let h_new = h + (h - avg) * strength;
        const cap = original[r] * RIDGE_SHARPEN_CAP;
        if (h_new > cap) h_new = cap;
        tmp[r] = h_new;
      } else if (h < avg) {
        const VALLEY_FACTOR = VALLEY_DEEPEN_FACTOR;
        let h_new = h - (avg - h) * strength * VALLEY_FACTOR;
        const floor = original[r] * VALLEY_FLOOR_FRAC;
        if (original[r] > 0 && h_new < floor) h_new = floor;
        if (original[r] > 0 && h_new < VALLEY_FLOOR_MIN) h_new = VALLEY_FLOOR_MIN;
        tmp[r] = h_new;
      } else {
        tmp[r] = h;
      }
    }
    for (let li = 0; li < landCount; li++) r_elevation[landCells[li]] = tmp[landCells[li]];
  }
}
function applyDetailNoise(mesh, r_xyz, r_elevation, r_isOcean, seed, opts = {}) {
  const amplitudeKm = opts.amplitudeKm ?? DETAIL_NOISE_AMP_KM;
  const frequencyMult = opts.frequencyMult ?? 1;
  const warpAmpMult = opts.warpAmpMult ?? 1;
  const bipolar = opts.bipolar ?? false;
  const biasExponent = opts.biasExponent ?? 1;
  const seedOffset = opts.seedOffset ?? 31337;
  const dampenField = opts.dampenField ?? null;
  const dampenStrength = opts.dampenStrength ?? 0;
  const useDampen = dampenField !== null && dampenStrength > 0;
  const amplitudeField = opts.amplitudeField ?? null;
  const N = mesh.numRegions;
  const noise = new SimplexNoise(seed + seedOffset);
  const wf = DETAIL_NOISE_WARP_FREQ * frequencyMult;
  const wa = DETAIL_NOISE_WARP_AMP * warpAmpMult;
  const wo = DETAIL_NOISE_WARP_OCTAVES;
  const df = DETAIL_NOISE_FREQ * frequencyMult;
  const doct = DETAIL_NOISE_OCTAVES;
  for (let r = 0; r < N; r++) {
    if (r_isOcean[r]) continue;
    const elev = r_elevation[r];
    if (elev <= 0 || elev >= 0.99) continue;
    const px = r_xyz[3 * r], py = r_xyz[3 * r + 1], pz = r_xyz[3 * r + 2];
    const dx = noise.fbm(px * wf + 1.7, py * wf + 9.2, pz * wf + 4.5, wo) * wa;
    const dy = noise.fbm(px * wf - 5.1, py * wf + 2.8, pz * wf - 7.3, wo) * wa;
    const dz = noise.fbm(px * wf + 6.6, py * wf - 8.4, pz * wf + 3.1, wo) * wa;
    let n = noise.fbm((px + dx) * df, (py + dy) * df, (pz + dz) * df, doct);
    if (n < -1) n = -1;
    else if (n > 1) n = 1;
    let mapped;
    if (bipolar) {
      const absN = n < 0 ? -n : n;
      mapped = (n < 0 ? -1 : 1) * Math.pow(absN, biasExponent);
    } else {
      mapped = n * 0.5 + 0.5;
      if (mapped < 0) mapped = 0;
    }
    let deltaKm = mapped * amplitudeKm;
    if (useDampen) deltaKm *= 1 - dampenStrength * dampenField[r];
    if (amplitudeField) deltaKm *= amplitudeField[r];
    if (deltaKm > -1e-9 && deltaKm < 1e-9) continue;
    const t02 = elev * elev, t04 = t02 * t02;
    const km0 = 6 * t04 * (5 - 4 * elev);
    const kmTarget = Math.max(1e-4, km0 + deltaKm);
    let t = Math.max(elev, Math.pow(kmTarget / 30, 0.25));
    if (t > 0.999) t = 0.999;
    for (let i = 0; i < 5; i++) {
      const t2 = t * t, t3 = t2 * t, t4 = t3 * t;
      const f = 6 * t4 * (5 - 4 * t) - kmTarget;
      const fp = 120 * t3 * (1 - t);
      if (fp < 1e-6) break;
      const dt = f / fp;
      t -= dt;
      if (t < 1e-4) t = 1e-4;
      else if (t > 0.9999) t = 0.9999;
      if (Math.abs(dt) < 1e-6) break;
    }
    r_elevation[r] = t;
  }
}
function applySoilCreep(mesh, r_elevation, r_isOcean, iterations, strength) {
  const N = mesh.numRegions;
  const { adjOffset, adjList } = mesh;
  const interiorLand = [];
  for (let r = 0; r < N; r++) {
    if (r_isOcean[r]) continue;
    let coastal = false;
    for (let i = adjOffset[r], iEnd = adjOffset[r + 1]; i < iEnd; i++) {
      if (r_isOcean[adjList[i]]) {
        coastal = true;
        break;
      }
    }
    if (!coastal) interiorLand.push(r);
  }
  const ilCount = interiorLand.length;
  const tmp = new Float32Array(N);
  for (let iter = 0; iter < iterations; iter++) {
    for (let li = 0; li < ilCount; li++) {
      const r = interiorLand[li];
      const h = r_elevation[r];
      let sum2 = 0, count = 0;
      for (let i = adjOffset[r], iEnd = adjOffset[r + 1]; i < iEnd; i++) {
        if (!r_isOcean[adjList[i]]) {
          sum2 += r_elevation[adjList[i]];
          count++;
        }
      }
      if (count === 0) {
        tmp[r] = h;
        continue;
      }
      const avg = sum2 / count;
      tmp[r] = h + (avg - h) * strength;
    }
    for (let li = 0; li < ilCount; li++) r_elevation[interiorLand[li]] = tmp[interiorLand[li]];
  }
}

// vendor/world-orogen/js/color-map.js
function elevToHeightKm(elev) {
  if (elev <= 0) return elev * 10;
  const t = Math.min(elev, 1);
  const t2 = t * t;
  return 6 * t2 * t2 * (5 - 4 * t);
}

// vendor/world-orogen/runner.js
setDelaunator(Delaunator);
function buildMeshFromPositions(sourceXYZ) {
  const count = sourceXYZ.length / 3;
  const r_xyz = new Float32Array(3 * (count + 1));
  r_xyz.set(sourceXYZ);
  r_xyz[3 * count + 2] = 1;
  const flat = stereographicProjection(r_xyz, count);
  const delaunay = new Delaunator(flat);
  const closed = addPoleToMesh(count, delaunay.triangles, delaunay.halfedges);
  return {
    mesh: new SphereMesh(closed.triangles, closed.halfedges, count + 1),
    r_xyz,
    count
  };
}
function detailDampenField(debugLayers) {
  const cw = debugLayers?.cratonWeight;
  const bw = debugLayers?.basinWeight;
  if (!cw || !bw) return null;
  const out = new Float32Array(cw.length);
  for (let i = 0; i < out.length; i++) out[i] = Math.max(cw[i], bw[i]);
  return out;
}
function orogenicField(debugLayers) {
  const source = debugLayers?.orogenicPower;
  if (!source) return null;
  const out = new Float32Array(source.length);
  for (let i = 0; i < out.length; i++) out[i] = Math.max(0, Math.min(1, source[i] + 0.5));
  return out;
}
function postProcess(mesh, r_xyz, elevation, debugLayers, neighborDist, seed, options) {
  const warp = options.terrainWarp ?? 0.12;
  if (warp > 0) warpTerrain(mesh, elevation, r_xyz, seed, warp, debugLayers.hotspot);
  const ocean = new Uint8Array(mesh.numRegions);
  for (let r = 0; r < ocean.length; r++) ocean[r] = elevation[r] <= 0 ? 1 : 0;
  const smoothing = options.smoothing ?? 0.2;
  if (smoothing > 0) {
    smoothElevation(mesh, elevation, ocean, Math.round(1 + smoothing * 4), 0.2 + smoothing * 0.5);
  }
  const dampenField = detailDampenField(debugLayers);
  const amplitudeField = orogenicField(debugLayers);
  applyDetailNoise(mesh, r_xyz, elevation, ocean, seed, {
    dampenField,
    dampenStrength: DETAIL_NOISE_DAMPEN_STRENGTH,
    amplitudeField
  });
  applyDetailNoise(mesh, r_xyz, elevation, ocean, seed, {
    amplitudeKm: 0.05,
    frequencyMult: 2,
    warpAmpMult: 2,
    bipolar: true,
    biasExponent: 0.4,
    seedOffset: 13579,
    dampenField,
    dampenStrength: DETAIL_NOISE_DAMPEN_STRENGTH,
    amplitudeField
  });
  const hydraulic = options.hydraulicErosion ?? 0.08;
  const thermal = options.thermalErosion ?? 0.05;
  if (hydraulic > 0 || thermal > 0) {
    erodeComposite(
      mesh,
      elevation,
      r_xyz,
      ocean,
      Math.round(hydraulic * 20),
      hydraulic * 6e-4,
      0.5,
      1,
      Math.round(thermal * 10),
      1.2 - thermal * 0.4,
      thermal * 0.15,
      0,
      0,
      neighborDist
    );
  }
  const sharpening = options.ridgeSharpening ?? 0.2;
  if (sharpening > 0) {
    sharpenRidges(mesh, elevation, ocean, Math.round(1 + sharpening * 3), sharpening * 0.08);
  }
  applySoilCreep(mesh, elevation, ocean, 2, 0.075);
}
function generateFromPositions(sourceXYZ, seed, options = {}) {
  const P = options.plateCount ?? 16;
  const numContinents = options.continentCount ?? 4;
  const landCoverage = options.landCoverage ?? 0.3;
  const nMag = options.noiseMagnitude ?? 0.22;
  const { mesh, r_xyz, count } = buildMeshFromPositions(sourceXYZ);
  const neighborDist = computeNeighborDist(mesh, r_xyz);
  const {
    coarseMesh,
    coarse_xyz,
    coarse_r_plate,
    coarsePlateSeeds: plateSeeds,
    coarsePlateVec: plateVec,
    coarsePlateIsOcean: plateIsOcean
  } = generateCoarsePlates(seed, P, numContinents, options.continentSizeVariety ?? 0, landCoverage);
  const r_plate = projectCoarsePlates(
    mesh,
    r_xyz,
    coarseMesh,
    coarse_xyz,
    coarse_r_plate,
    seed,
    P
  );
  smoothAndReconnectPlates(mesh, r_plate, plateSeeds, 3);
  const plateDensity = {};
  for (const plate of plateSeeds) {
    const rng = makeRng(plate + 777);
    const oceanDensity = 3 + rng() * 0.5;
    const landDensity = 2.4 + rng() * 0.5;
    plateDensity[plate] = plateIsOcean.has(plate) ? oceanDensity : landDensity;
  }
  const { mantleField } = applyPlatePhysics(
    plateVec,
    plateSeeds,
    plateIsOcean,
    coarse_r_plate,
    coarseMesh,
    coarse_xyz,
    seed
  );
  let superPlateData = null;
  if (P >= 8) {
    superPlateData = buildSuperPlates(
      coarseMesh,
      coarse_r_plate,
      plateSeeds,
      plateVec,
      plateIsOcean,
      plateDensity,
      r_plate
    );
    const superSeeds = /* @__PURE__ */ new Set();
    for (let i = 0; i < superPlateData.numSuperPlates; i++) superSeeds.add(i);
    applyPlatePhysics(
      superPlateData.superPlateVec,
      superSeeds,
      superPlateData.superPlateIsOcean,
      superPlateData.r_superPlate,
      mesh,
      r_xyz,
      seed + 7777,
      SUPER_PLATE_PHYSICS_MULT
    );
  }
  const plateMantleSum = {};
  const plateMantleCount = {};
  for (let r = 0; r < coarseMesh.numRegions; r++) {
    const plate = coarse_r_plate[r];
    plateMantleSum[plate] = (plateMantleSum[plate] || 0) + mantleField[r];
    plateMantleCount[plate] = (plateMantleCount[plate] || 0) + 1;
  }
  const mantle = new Float32Array(mesh.numRegions);
  for (let r = 0; r < mantle.length; r++) {
    const plate = r_plate[r];
    mantle[r] = plateMantleCount[plate] ? plateMantleSum[plate] / plateMantleCount[plate] : 0;
  }
  const noise = new SimplexNoise(seed);
  const { r_elevation: elevation, debugLayers } = assignElevation(
    mesh,
    r_xyz,
    plateIsOcean,
    r_plate,
    plateVec,
    plateSeeds,
    noise,
    nMag,
    seed,
    5,
    plateDensity,
    superPlateData,
    mantle
  );
  postProcess(mesh, r_xyz, elevation, debugLayers, neighborDist, seed, options);
  const raw = Array.from(elevation.subarray(0, count));
  const sorted = [...raw].sort((a, b) => a - b);
  const seaIndex = Math.max(0, Math.min(sorted.length - 1, Math.floor(sorted.length * (1 - landCoverage))));
  const seaThreshold = sorted[seaIndex];
  const elevationM = raw.map((value) => Math.round(elevToHeightKm(value - seaThreshold) * 1e3));
  const plateIds = Array.from(r_plate.subarray(0, count));
  const plateBoundary = new Array(count).fill(false);
  for (let r = 0; r < count; r++) {
    for (let i = mesh.adjOffset[r]; i < mesh.adjOffset[r + 1]; i++) {
      const neighbor = mesh.adjList[i];
      if (neighbor < count && r_plate[neighbor] !== r_plate[r]) {
        plateBoundary[r] = true;
        break;
      }
    }
  }
  return { elevationM, plateIds, plateBoundary };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  generateFromPositions
});
