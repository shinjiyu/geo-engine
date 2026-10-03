'use strict';

/**
 * Seasonal global climate on a fixed latitude-longitude grid (independent of the cell grid).
 *
 *  1. Temperature: two-component (ocean slab / continental) seasonal energy-balance model per
 *     latitude band with implicit meridional diffusion; columns mix the two by marine influence.
 *  2. Winds: three-cell circulation anchored on the thermal equator (moving ITCZ), plus winds
 *     toward large-scale warm anomalies (thermal lows / monsoons).
 *  3. Water: column vapour advected semi-Lagrangian; ocean evaporation, land evapotranspiration,
 *     condensation controlled by large-scale ascent, frontal rain, orographic barriers; land
 *     bucket soil and snowpack produce runoff.
 *
 * Units: temperature degC, water mm, wind m/s, time in days.
 */

const DAYS = 365;
const SOLAR_CONSTANT = 1361;
const DEG = Math.PI / 180;
const SEA_ICE_TEMP_C = -1.8;

const DEFAULT_PARAMS = {
  resolutionDeg: 1,
  stepsPerDay: 4,
  spinupDays: 120,
  ebmSpinupYears: 12,
  // energy balance
  olrA: 206.2,
  olrB: 2.09,
  diffusion: 0.59,
  heatCapOcean: 4000,
  heatCapLand: 116,
  heatCapIce: 78,
  landOceanExchange: 6.9,
  albedo0: 0.3,
  albedo2: 0.11,
  albedoIce: 0.62,
  // circulation
  hadleyEdgeDeg: 30,
  polarFrontDeg: 65,
  itczShiftFactor: 1.287,
  monsoonLandGain: 5,
  plateauHeightM: 2500,
  plateauItczGain: 5.625,
  ascentBlurDeg: 1.956,
  tradeU: 7,
  tradeV: 1.726,
  westerlyU: 9,
  westerlyV: 2.172,
  polarU: 3,
  polarV: 1,
  gyreWind: 3,
  gyreAscent: 1,
  gyreInlandKm: 3000,
  sstGyreSubtropical: 3,
  sstGyreSubpolar: 4,
  thermalWind: 0.32,
  thermalGeoWind: 2.453,
  marineDecayDays: 1.24,
  marineRecoverDays: 2.1,
  // moisture
  wsatRef: 70,
  wsatRefTempC: 27,
  wsatSlope: 0.063,
  vapourScaleHeightM: 2200,
  wtgLandOffsetC: 0,
  oceanEvapCoef: 0.02,
  convergenceFactor: 0.461,
  rhBase: 0.622,
  rhAscent: 0.189,
  rhSubsidence: 0,
  rhMin: 0.45,
  rhMax: 0.98,
  condenseTauDays: 0.25,
  frontalRate: 2,
  polarFrontalShare: 0.441,
  orographicEfficiency: 0.086,
  orographicScaleM: 3156,
  leeDryingThresholdM: 488,
  // land surface
  soilCapacityMm: 150,
  fastRunoff: 0.3,
  netRadiationFactor: 0.55,
  netRadiationLoss: 30,
  degreeDayMelt: 3,
  dryWarmingC: 5,
  maxSnowMm: 1000
};

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function smoothstep(e0, e1, x) {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Daily-mean top-of-atmosphere insolation (W/m2) on a circular orbit. */
function dailyInsolation(latRad, day, obliquityRad) {
  const lambda = (2 * Math.PI * (day - 80)) / DAYS;
  const dec = Math.asin(Math.sin(obliquityRad) * Math.sin(lambda));
  const x = -Math.tan(latRad) * Math.tan(dec);
  const h0 = x >= 1 ? 0 : x <= -1 ? Math.PI : Math.acos(x);
  return (SOLAR_CONSTANT / Math.PI)
    * (h0 * Math.sin(latRad) * Math.sin(dec) + Math.cos(latRad) * Math.cos(dec) * Math.sin(h0));
}

function surfaceAlbedo(p, sinLat, tempC, iceStart, iceFull) {
  const free = p.albedo0 + p.albedo2 * 0.5 * (3 * sinLat * sinLat - 1);
  const ice = smoothstep(iceStart, iceFull, -tempC);
  return free + (p.albedoIce - free) * ice;
}

function solveTridiagonal(a, b, c, d, n) {
  const cp = new Float64Array(n);
  const dp = new Float64Array(n);
  cp[0] = c[0] / b[0];
  dp[0] = d[0] / b[0];
  for (let i = 1; i < n; i++) {
    const m = b[i] - a[i] * cp[i - 1];
    cp[i] = c[i] / m;
    dp[i] = (d[i] - a[i] * dp[i - 1]) / m;
  }
  const x = new Float64Array(n);
  x[n - 1] = dp[n - 1];
  for (let i = n - 2; i >= 0; i--) x[i] = dp[i] - cp[i] * x[i + 1];
  return x;
}

/**
 * Seasonal EBM. Returns daily sea-level temperatures for ocean and continental surfaces:
 * ocean[day * nLat + row], land[day * nLat + row].
 */
function runEnergyBalance(rowLat, landFraction, planet, p) {
  const nLat = rowLat.length;
  const obl = planet.obliquity * DEG;
  const dPhi = (rowLat[1] - rowLat[0]) * DEG;
  const cosC = rowLat.map((l) => Math.cos(l * DEG));
  const sinC = rowLat.map((l) => Math.sin(l * DEG));
  const cosEdge = new Float64Array(nLat + 1);
  for (let i = 1; i < nLat; i++) cosEdge[i] = Math.cos(((rowLat[i - 1] + rowLat[i]) / 2) * DEG);

  const Q = new Float64Array(DAYS * nLat);
  for (let d = 0; d < DAYS; d++) {
    for (let i = 0; i < nLat; i++) Q[d * nLat + i] = dailyInsolation(rowLat[i] * DEG, d + 0.5, obl);
  }

  const To = new Float64Array(nLat).fill(10);
  const Tl = new Float64Array(nLat).fill(10);
  const a = new Float64Array(nLat);
  const b = new Float64Array(nLat);
  const c = new Float64Array(nLat);
  const rhs = new Float64Array(nLat);
  const Cm = new Float64Array(nLat);
  const Co = new Float64Array(nLat);

  const ocean = new Float32Array(DAYS * nLat);
  const land = new Float32Array(DAYS * nLat);
  const totalYears = p.ebmSpinupYears + 1;
  for (let y = 0; y < totalYears; y++) {
    for (let d = 0; d < DAYS; d++) {
      for (let i = 0; i < nLat; i++) {
        const q = Q[d * nLat + i];
        const fl = landFraction[i];
        // Sea ice insulates the mixed layer: the surface then responds like a thin slab.
        Co[i] = To[i] < SEA_ICE_TEMP_C ? p.heatCapIce : p.heatCapOcean;
        // Transport heats both surfaces per unit area, so the band mean responds with the harmonic capacity.
        Cm[i] = 1 / (fl / p.heatCapLand + (1 - fl) / Co[i]);
        const exch = p.landOceanExchange * (To[i] - Tl[i]);
        const ao = surfaceAlbedo(p, sinC[i], To[i], 2, 10);
        const al = surfaceAlbedo(p, sinC[i], Tl[i], 0, 8);
        To[i] += (q * (1 - ao) - (p.olrA + p.olrB * To[i]) - exch * fl / Math.max(0.05, 1 - fl)) / Co[i];
        Tl[i] += (q * (1 - al) - (p.olrA + p.olrB * Tl[i]) + exch) / p.heatCapLand;
      }
      for (let i = 0; i < nLat; i++) {
        const fl = landFraction[i];
        const tm = fl * Tl[i] + (1 - fl) * To[i];
        const k = p.diffusion / (Cm[i] * cosC[i] * dPhi * dPhi);
        a[i] = -k * cosEdge[i];
        c[i] = -k * cosEdge[i + 1];
        b[i] = 1 - a[i] - c[i];
        rhs[i] = tm;
      }
      const tmNew = solveTridiagonal(a, b, c, rhs, nLat);
      for (let i = 0; i < nLat; i++) {
        const fl = landFraction[i];
        const heat = (tmNew[i] - rhs[i]) * Cm[i];
        To[i] += heat / Co[i];
        Tl[i] += heat / p.heatCapLand;
        if (y === totalYears - 1) {
          ocean[d * nLat + i] = To[i];
          land[d * nLat + i] = Tl[i];
        }
      }
    }
  }
  return { ocean, land, insolation: Q };
}

class LatLonGrid {
  constructor(resolutionDeg) {
    this.res = resolutionDeg;
    this.nLat = Math.round(180 / resolutionDeg);
    this.nLon = Math.round(360 / resolutionDeg);
    this.size = this.nLat * this.nLon;
    this.rowLat = Float64Array.from({ length: this.nLat }, (_, i) => -90 + (i + 0.5) * resolutionDeg);
    this.colLon = Float64Array.from({ length: this.nLon }, (_, j) => -180 + (j + 0.5) * resolutionDeg);
  }

  index(lat, lon) {
    const i = clamp(Math.floor((lat + 90) / this.res), 0, this.nLat - 1);
    let j = Math.floor((lon + 180) / this.res) % this.nLon;
    if (j < 0) j += this.nLon;
    return i * this.nLon + j;
  }

  /** Writes 4 corner indices and weights for bilinear sampling at (lat, lon). */
  bilinear(lat, lon, idx, w, o) {
    const fy = clamp((lat + 90) / this.res - 0.5, 0, this.nLat - 1);
    const i0 = Math.min(this.nLat - 2, Math.floor(fy));
    const ty = fy - i0;
    let fx = (lon + 180) / this.res - 0.5;
    fx -= Math.floor(fx / this.nLon) * this.nLon;
    const j0 = Math.floor(fx) % this.nLon;
    const tx = fx - Math.floor(fx);
    const j1 = (j0 + 1) % this.nLon;
    idx[o] = i0 * this.nLon + j0;
    idx[o + 1] = i0 * this.nLon + j1;
    idx[o + 2] = (i0 + 1) * this.nLon + j0;
    idx[o + 3] = (i0 + 1) * this.nLon + j1;
    w[o] = (1 - tx) * (1 - ty);
    w[o + 1] = tx * (1 - ty);
    w[o + 2] = (1 - tx) * ty;
    w[o + 3] = tx * ty;
  }
}

/** Separable box blur on a lat-lon field; lon radius widens toward the poles. */
function blurField(grid, src, radiusDeg, passes = 2) {
  const { nLat, nLon, res } = grid;
  let a = Float64Array.from(src);
  let tmp = new Float64Array(grid.size);
  const ry = Math.max(1, Math.round(radiusDeg / res));
  for (let pass = 0; pass < passes; pass++) {
    for (let i = 0; i < nLat; i++) {
      const cosL = Math.max(0.05, Math.cos(grid.rowLat[i] * DEG));
      const rx = Math.min(Math.floor(nLon / 2) - 1, Math.max(1, Math.round(radiusDeg / res / cosL)));
      const row = i * nLon;
      let sum = 0;
      for (let k = -rx; k <= rx; k++) sum += a[row + ((k % nLon) + nLon) % nLon];
      for (let j = 0; j < nLon; j++) {
        tmp[row + j] = sum / (2 * rx + 1);
        sum += a[row + (j + rx + 1) % nLon] - a[row + ((j - rx) % nLon + nLon) % nLon];
      }
    }
    for (let j = 0; j < nLon; j++) {
      for (let i = 0; i < nLat; i++) {
        let sum = 0;
        let cnt = 0;
        for (let k = Math.max(0, i - ry); k <= Math.min(nLat - 1, i + ry); k++) {
          sum += tmp[k * nLon + j];
          cnt++;
        }
        a[i * nLon + j] = sum / cnt;
      }
    }
  }
  return a;
}

function wsat(p, tempSeaLevelC) {
  return p.wsatRef * Math.exp(p.wsatSlope * (tempSeaLevelC - p.wsatRefTempC));
}

/** Priestley-Taylor slope factor s/(s+gamma) as a function of temperature. */
function ptFactor(tempC) {
  return clamp(0.4 + 0.0135 * tempC, 0.05, 0.85);
}

/**
 * @param {object} surface
 * @param {Float64Array} surface.landFraction per grid column
 * @param {Float64Array} surface.heightM mean land surface height above sea per column (0 for sea)
 * @param {object} planet normalized planet params
 * @param {object} [options] overrides of DEFAULT_PARAMS
 */
function simulateAtmosphere(grid, surface, planet, options = {}) {
  const p = { ...DEFAULT_PARAMS, ...options };
  const { nLat, nLon, size, rowLat, colLon } = grid;
  const isLand = new Uint8Array(size);
  const h = new Float64Array(size);
  const rowLand = new Float64Array(nLat);
  for (let c = 0; c < size; c++) {
    isLand[c] = surface.landFraction[c] >= 0.5 ? 1 : 0;
    h[c] = isLand[c] ? Math.max(0, surface.heightM[c]) : 0;
    rowLand[Math.floor(c / nLon)] += surface.landFraction[c] / nLon;
  }
  // Column vapour W is sea-level-equivalent (behaves like a mixing ratio); the water actually
  // above a column is W * colFrac. Low-level air that would be lifted onto a plateau is
  // instead blocked, so high terrain does not drain vapour through saturation alone.
  const colFrac = Float64Array.from(h, (z) => Math.exp(-z / p.vapourScaleHeightM));
  const lapse = planet.lapseRateC / 1000;
  const radiusM = planet.radiusKm * 1000;
  const rot = planet.rotationDirection;

  const ebm = runEnergyBalance(rowLat, rowLand, planet, p);
  const rowSin = rowLat.map((l) => Math.sin(l * DEG));
  const rowCos = rowLat.map((l) => Math.cos(l * DEG));

  const marine = new Float64Array(size).fill(1);
  const u = new Float64Array(size);
  const v = new Float64Array(size);
  const speed = new Float64Array(size);
  const ascent = new Float64Array(size);
  const baro = new Float64Array(nLat);
  const depIdx = new Int32Array(size * 4);
  const depW = new Float64Array(size * 4);
  const oroFrac = new Float64Array(size);
  const leeFactor = new Float64Array(size);
  const oroCol = new Float64Array(size);
  const storm = new Float64Array(size);
  const tsl = new Float64Array(size);
  const marineCache = new Array(12).fill(null);
  // Land share of the 5-30 degree belt in each hemisphere, per longitude (monsoon pull).
  const belt = [new Float64Array(nLon), new Float64Array(nLon)];
  let beltRows = 0;
  for (let i = 0; i < nLat; i++) {
    const a = Math.abs(rowLat[i]);
    if (a < 5 || a > 30) continue;
    if (rowLat[i] > 0) beltRows++;
    for (let j = 0; j < nLon; j++) belt[rowLat[i] > 0 ? 0 : 1][j] += isLand[i * nLon + j];
  }
  for (const b of belt) for (let j = 0; j < nLon; j++) b[j] /= Math.max(1, beltRows);
  // Share of high plateau in the 15-45 degree belt: elevated summer heating (Tibet, Altiplano)
  // draws the monsoon trough further poleward than lowland heating alone.
  const plateau = [new Float64Array(nLon), new Float64Array(nLon)];
  let plateauRows = 0;
  for (let i = 0; i < nLat; i++) {
    const a = Math.abs(rowLat[i]);
    if (a < 15 || a > 45) continue;
    if (rowLat[i] > 0) plateauRows++;
    for (let j = 0; j < nLon; j++) {
      if (h[i * nLon + j] > p.plateauHeightM) plateau[rowLat[i] > 0 ? 0 : 1][j] += 1;
    }
  }
  for (const b of plateau) for (let j = 0; j < nLon; j++) b[j] /= Math.max(1, plateauRows);
  const convergence = new Float64Array(size);

  // Ocean-basin geometry for subtropical highs and boundary currents: position across the
  // basin along each latitude row (cos(pi*x) is +1 at the western edge, -1 at the eastern edge).
  const gyreShape = new Float64Array(size);
  const sstAnomaly = new Float64Array(size);
  for (let i = 0; i < nLat; i++) {
    const row = i * nLon;
    let anyLand = false;
    for (let j = 0; j < nLon; j++) if (isLand[row + j]) { anyLand = true; break; }
    if (!anyLand) continue;
    const kmPerCol = grid.res * DEG * planet.radiusKm * Math.max(0.05, rowCos[i]);
    const a = Math.abs(rowLat[i]);
    const subtropical = a > 10 && a < 45 ? Math.sin(Math.PI * (a - 10) / 35) : 0;
    const subpolar = a > 40 && a < 70 ? Math.sin(Math.PI * (a - 40) / 30) : 0;
    for (let j = 0; j < nLon; j++) {
      if (isLand[row + j]) continue;
      let dw = 1;
      while (dw < nLon && !isLand[row + ((j - dw) % nLon + nLon) % nLon]) dw++;
      let de = 1;
      while (de < nLon && !isLand[row + (j + de) % nLon]) de++;
      const width = (dw + de - 1) * kmPerCol;
      const shape = Math.cos(Math.PI * (dw - 0.5) / (dw + de - 1)) * smoothstep(500, 3000, width);
      gyreShape[row + j] = shape;
      sstAnomaly[row + j] = shape * (p.sstGyreSubtropical * subtropical - p.sstGyreSubpolar * subpolar);
    }
    // The highs' flanks reach inland: moist return flow over east coasts, dry subsiding flow
    // over west coasts, fading with distance from the nearest coast on each side.
    for (let j = 0; j < nLon; j++) {
      if (!isLand[row + j]) continue;
      let de = 1;
      while (de < nLon && isLand[row + (j + de) % nLon]) de++;
      let dw = 1;
      while (dw < nLon && isLand[row + ((j - dw) % nLon + nLon) % nLon]) dw++;
      if (de >= nLon) continue;
      const east = gyreShape[row + (j + de) % nLon];
      const west = gyreShape[row + ((j - dw) % nLon + nLon) % nLon];
      gyreShape[row + j] = Math.max(0, east) * Math.exp(-de * kmPerCol / p.gyreInlandKm)
        + Math.min(0, west) * Math.exp(-dw * kmPerCol / p.gyreInlandKm);
    }
  }
  const gyreField = blurField(grid, gyreShape, 4, 1);
  const marineAnomaly = new Float64Array(size);
  const anomalyCache = new Array(12).fill(null);
  const diag = p.diagnostics ? {
    itcz: new Array(12),
    vapour: new Float32Array(12 * size),
    ascent: new Float32Array(12 * size),
    u: new Float32Array(12 * size),
    v: new Float32Array(12 * size),
    marine: new Float32Array(12 * size),
    orographicRain: new Float32Array(12 * size),
    condensationRain: new Float32Array(12 * size),
    frontalRain: new Float32Array(12 * size)
  } : null;
  const rowOf = new Int32Array(size);
  for (let c = 0; c < size; c++) rowOf[c] = Math.floor(c / nLon);

  const columnTemp = (day, c) => {
    const i = rowOf[c];
    const to = ebm.ocean[day * nLat + i];
    const tl = ebm.land[day * nLat + i];
    return marine[c] * to + (1 - marine[c]) * tl + marineAnomaly[c];
  };

  function prepareMonth(m) {
    const day = Math.floor((m + 0.5) * DAYS / 12);
    for (let c = 0; c < size; c++) tsl[c] = columnTemp(day, c);

    // ITCZ: oceanic thermal equator, pulled toward the continental one where the tropics hold land.
    const thermalEquator = (series, maxLat) => {
      let tMax = -Infinity;
      for (let i = 0; i < nLat; i++) if (Math.abs(rowLat[i]) <= maxLat) tMax = Math.max(tMax, series[day * nLat + i]);
      let sw = 0;
      let sl = 0;
      for (let i = 0; i < nLat; i++) {
        if (Math.abs(rowLat[i]) > maxLat) continue;
        const w = Math.exp((series[day * nLat + i] - tMax) / 1.5);
        sw += w;
        sl += w * rowLat[i];
      }
      return sl / sw;
    };
    const phiOcean = thermalEquator(ebm.ocean, 30);
    const phiLandRaw = thermalEquator(ebm.land, 35);
    const phiLand = p.itczShiftFactor * phiLandRaw;
    const itcz = new Float64Array(nLon);
    const rx = Math.round(20 / grid.res);
    const summer = phiLand >= 0 ? 0 : 1;
    for (let j = 0; j < nLon; j++) {
      let s = 0;
      let hp = 0;
      for (let k = -rx; k <= rx; k++) {
        const jj = ((j + k) % nLon + nLon) % nLon;
        s += belt[summer][jj];
        hp += plateau[summer][jj];
      }
      const share = Math.min(1, p.monsoonLandGain * s / (2 * rx + 1));
      const plateauPull = p.plateauItczGain * (hp / (2 * rx + 1)) * phiLandRaw;
      itcz[j] = clamp(phiOcean + share * (phiLand - phiOcean) + plateauPull, -30, 30);
    }
    if (diag) diag.itcz[m] = Float64Array.from(itcz);

    // Base circulation.
    const baseU = new Float64Array(size);
    const baseV = new Float64Array(size);
    for (let i = 0; i < nLat; i++) {
      const lat = rowLat[i];
      for (let j = 0; j < nLon; j++) {
        const phi = itcz[j];
        const edgeN = p.hadleyEdgeDeg + 0.4 * phi;
        const edgeS = -p.hadleyEdgeDeg + 0.4 * phi;
        const frontN = p.polarFrontDeg + 0.2 * phi;
        const frontS = -p.polarFrontDeg + 0.2 * phi;
        let bu;
        let bv;
        let st = 0;
        if (lat >= edgeS && lat <= edgeN) {
          const s = lat >= phi ? (lat - phi) / Math.max(8, edgeN - phi) : (lat - phi) / Math.max(8, phi - edgeS);
          const amp = Math.sin(Math.PI * Math.min(1, Math.abs(s)));
          bv = -p.tradeV * Math.sign(s) * amp;
          if (lat * s < 0) {
            bu = 0.7 * p.tradeU * amp * smoothstep(0, Math.max(3, Math.abs(phi)), Math.abs(lat));
          } else {
            bu = -p.tradeU * amp;
          }
        } else if (lat > edgeN && lat <= frontN) {
          const amp = Math.sin(Math.PI * (lat - edgeN) / (frontN - edgeN));
          bu = p.westerlyU * amp;
          bv = p.westerlyV * amp;
          st = amp;
        } else if (lat < edgeS && lat >= frontS) {
          const amp = Math.sin(Math.PI * (edgeS - lat) / (edgeS - frontS));
          bu = p.westerlyU * amp;
          bv = -p.westerlyV * amp;
          st = amp;
        } else if (lat > frontN) {
          const amp = Math.sin(Math.PI * (lat - frontN) / (90 - frontN));
          bu = -p.polarU * amp;
          bv = -p.polarV * amp;
          st = p.polarFrontalShare;
        } else {
          const amp = Math.sin(Math.PI * (frontS - lat) / (frontS + 90));
          bu = -p.polarU * amp;
          bv = p.polarV * amp;
          st = p.polarFrontalShare;
        }
        storm[i * nLon + j] = st;
        baseU[i * nLon + j] = bu * rot;
        baseV[i * nLon + j] = bv;
      }
    }

    // Large-scale ascent from base-flow convergence (1e-6 s^-1).
    const dx = (k) => grid.res * DEG * radiusM * Math.max(0.05, rowCos[k]);
    const dy = grid.res * DEG * radiusM;
    const divRaw = new Float64Array(size);
    for (let i = 0; i < nLat; i++) {
      for (let j = 0; j < nLon; j++) {
        const c = i * nLon + j;
        const e = i * nLon + (j + 1) % nLon;
        const w = i * nLon + (j - 1 + nLon) % nLon;
        const dudx = (baseU[e] - baseU[w]) / (2 * dx(i));
        const iN = Math.min(nLat - 1, i + 1);
        const iS = Math.max(0, i - 1);
        const dvdy = (baseV[iN * nLon + j] * rowCos[iN] - baseV[iS * nLon + j] * rowCos[iS])
          / ((iN - iS) * dy * Math.max(0.05, rowCos[i]));
        divRaw[c] = (dudx + dvdy) * 1e6;
      }
    }
    const div = blurField(grid, divRaw, p.ascentBlurDeg, 1);
    for (let c = 0; c < size; c++) ascent[c] = -div[c];

    // Thermal-low winds toward large-scale warm anomalies.
    const anomaly = new Float64Array(size);
    for (let i = 0; i < nLat; i++) {
      let mean = 0;
      for (let j = 0; j < nLon; j++) mean += tsl[i * nLon + j];
      mean /= nLon;
      for (let j = 0; j < nLon; j++) anomaly[i * nLon + j] = tsl[i * nLon + j] - mean;
    }
    const smooth = blurField(grid, anomaly, 8, 2);
    for (let i = 0; i < nLat; i++) {
      const geo = smoothstep(5, 20, Math.abs(rowLat[i])) * Math.sign(rowLat[i]) * rot;
      for (let j = 0; j < nLon; j++) {
        const c = i * nLon + j;
        const e = i * nLon + (j + 1) % nLon;
        const w = i * nLon + (j - 1 + nLon) % nLon;
        const iN = Math.min(nLat - 1, i + 1);
        const iS = Math.max(0, i - 1);
        const gx = (smooth[e] - smooth[w]) / (2 * dx(i)) * 1e6;
        const gy = (smooth[iN * nLon + j] - smooth[iS * nLon + j]) / ((iN - iS) * dy) * 1e6;
        const a = Math.abs(rowLat[i]);
        const centre = 30 + 0.3 * Math.abs(itcz[j]) * (rowLat[i] * itcz[j] >= 0 ? 1 : -1);
        const env = a > 10 && a < 50 ? Math.exp(-(((a - centre) / 10) ** 2)) : 0;
        const summer = rowLat[i] * itcz[j] >= 0 ? 1.3 : 0.7;
        const gyreV = p.gyreWind * env * summer * gyreField[c] * Math.sign(rowLat[i]);
        // Subtropical highs subside over eastern basins / west coasts and lift on their western flanks.
        ascent[c] += p.gyreAscent * env * summer * gyreField[c];
        u[c] = baseU[c] + p.thermalWind * gx + p.thermalGeoWind * geo * gy;
        v[c] = baseV[c] + p.thermalWind * gy - p.thermalGeoWind * geo * gx + gyreV;
        speed[c] = Math.hypot(u[c], v[c]);
      }
    }

    // Column vapour obeys continuity: low-level convergence concentrates it.
    const totalDiv = new Float64Array(size);
    for (let i = 0; i < nLat; i++) {
      const iN = Math.min(nLat - 1, i + 1);
      const iS = Math.max(0, i - 1);
      for (let j = 0; j < nLon; j++) {
        const e = i * nLon + (j + 1) % nLon;
        const w = i * nLon + (j - 1 + nLon) % nLon;
        totalDiv[i * nLon + j] = (u[e] - u[w]) / (2 * dx(i))
          + (v[iN * nLon + j] * rowCos[iN] - v[iS * nLon + j] * rowCos[iS]) / ((iN - iS) * dy * Math.max(0.05, rowCos[i]));
      }
    }
    const divSmooth = blurField(grid, totalDiv, 2, 1);
    const dtStep = 86400 / p.stepsPerDay;
    for (let c = 0; c < size; c++) {
      convergence[c] = clamp(Math.exp(-p.convergenceFactor * divSmooth[c] * dtStep), 0.7, 1.4);
    }

    // Storm-track strength from the zonal-mean temperature gradient (K per 1000 km).
    for (let i = 0; i < nLat; i++) {
      const iN = Math.min(nLat - 1, i + 1);
      const iS = Math.max(0, i - 1);
      const tN = ebm.ocean[day * nLat + iN] * (1 - rowLand[iN]) + ebm.land[day * nLat + iN] * rowLand[iN];
      const tS = ebm.ocean[day * nLat + iS] * (1 - rowLand[iS]) + ebm.land[day * nLat + iS] * rowLand[iS];
      baro[i] = Math.abs(tN - tS) / ((iN - iS) * dy) * 1e6;
    }

    // Semi-Lagrangian departure points and orographic barriers for one step.
    const dtSec = 86400 / p.stepsPerDay;
    const cellM = grid.res * DEG * radiusM;
    for (let i = 0; i < nLat; i++) {
      for (let j = 0; j < nLon; j++) {
        const c = i * nLon + j;
        const dLat = (v[c] * dtSec / radiusM) / DEG;
        const dLon = (u[c] * dtSec / (radiusM * Math.max(0.05, rowCos[i]))) / DEG;
        const lat = rowLat[i];
        const lon = colLon[j];
        grid.bilinear(clamp(lat - dLat, -89.9, 89.9), lon - dLon, depIdx, depW, c * 4);
        // Terrain one grid spacing upwind gives a resolution-independent slope along the wind.
        const sp = speed[c] > 0.1 ? speed[c] : 0.1;
        const up = grid.index(clamp(lat - grid.res * v[c] / sp, -89.9, 89.9),
          lon - grid.res * u[c] / sp / Math.max(0.05, rowCos[i]));
        const lift = (h[c] - h[up]) / cellM * sp * dtSec;
        oroFrac[c] = lift > 0 ? p.orographicEfficiency * (1 - Math.exp(-lift / p.orographicScaleM)) : 0;
        oroCol[c] = colFrac[up];
        // Air that crossed higher ground keeps only the vapour above that crest (dry lee side);
        // the factor is spread over the steps the air needs to cross one cell.
        const crest = h[up] - h[c] - p.leeDryingThresholdM;
        leeFactor[c] = crest > 0 ? Math.exp(-crest / p.vapourScaleHeightM * Math.min(1, sp * dtSec / cellM)) : 1;
      }
    }

    // Marine influence: ocean air carried inland, decaying over land.
    if (marineCache[m]) {
      marine.set(marineCache[m]);
      marineAnomaly.set(anomalyCache[m]);
      return;
    }
    const decay = Math.exp(-1 / (p.stepsPerDay * p.marineDecayDays));
    const recover = Math.exp(-1 / (p.stepsPerDay * p.marineRecoverDays));
    const next = new Float64Array(size);
    const nextAnomaly = new Float64Array(size);
    const iterations = (marineCache.some(Boolean) ? 12 : 30) * p.stepsPerDay;
    for (let iter = 0; iter < iterations; iter++) {
      for (let c = 0; c < size; c++) {
        const o = c * 4;
        const up = depW[o] * marine[depIdx[o]] + depW[o + 1] * marine[depIdx[o + 1]]
          + depW[o + 2] * marine[depIdx[o + 2]] + depW[o + 3] * marine[depIdx[o + 3]];
        const upA = depW[o] * marineAnomaly[depIdx[o]] + depW[o + 1] * marineAnomaly[depIdx[o + 1]]
          + depW[o + 2] * marineAnomaly[depIdx[o + 2]] + depW[o + 3] * marineAnomaly[depIdx[o + 3]];
        if (isLand[c]) {
          next[c] = up * decay;
          nextAnomaly[c] = upA * decay;
        } else {
          next[c] = 1 - (1 - up) * recover;
          nextAnomaly[c] = sstAnomaly[c] - (sstAnomaly[c] - upA) * recover;
        }
      }
      marine.set(next);
      marineAnomaly.set(nextAnomaly);
    }
    marineCache[m] = Float64Array.from(marine);
    anomalyCache[m] = Float64Array.from(marineAnomaly);
  }

  const monthT = new Float32Array(12 * size);
  const daysInMonth = Array.from({ length: 12 }, (_, m) => Math.floor((m + 1) * DAYS / 12) - Math.floor(m * DAYS / 12));
  const monthOfDay = Int32Array.from({ length: DAYS }, (_, d) => Math.min(11, Math.floor(d * 12 / DAYS)));

  if (p.temperatureOnly) {
    for (let m = 0; m < 12; m++) {
      prepareMonth(m);
      const start = Math.floor(m * DAYS / 12);
      for (let d = start; d < start + daysInMonth[m]; d++) {
        for (let c = 0; c < size; c++) monthT[m * size + c] += columnTemp(d, c) / daysInMonth[m];
      }
    }
    return { grid, isLand, heightM: h, monthTempSeaLevel: monthT, params: p };
  }

  const W = new Float64Array(size);
  const Wn = new Float64Array(size);
  const soil = new Float64Array(size);
  const snow = new Float64Array(size);
  const stepRain = new Float64Array(size);
  const capDay = new Float64Array(size);
  const tsDay = new Float64Array(size);
  const petDay = new Float64Array(size);
  const petSnowDay = new Float64Array(size);
  const iceDay = new Uint8Array(size);
  for (let c = 0; c < size; c++) {
    W[c] = 25;
    soil[c] = isLand[c] ? p.soilCapacityMm * 0.5 : 0;
  }

  const monthP = new Float32Array(12 * size);
  const monthE = new Float32Array(12 * size);
  const monthR = new Float32Array(12 * size);
  const monthPet = new Float32Array(12 * size);
  const soilMean = new Float64Array(size);
  const snowMin = new Float64Array(size).fill(Infinity);
  const dtDay = 1 / p.stepsPerDay;
  const area = Float64Array.from(rowOf, (i) => rowCos[i]);
  const rhcCol = new Float64Array(size);
  const frontal = new Float64Array(size);
  const oceanEvapRate = new Float64Array(size);
  const soilCap = p.soilCapacityMm;
  const betaCap = 0.75 * soilCap;
  const condense = Math.min(1, dtDay / p.condenseTauDays);

  // Spin up soil and snow through the preceding autumn and early winter, then record one year.
  const spinup = Math.max(0, Math.min(DAYS, Math.round(p.spinupDays)));
  const schedule = [];
  for (let d = DAYS - spinup; d < DAYS; d++) schedule.push([d, false]);
  for (let d = 0; d < DAYS; d++) schedule.push([d, true]);
  {
    let month = -1;
    for (const [d, record] of schedule) {
      const m = monthOfDay[d];
      if (m !== month) {
        month = m;
        prepareMonth(m);
        for (let c = 0; c < size; c++) {
          const asc = ascent[c];
          rhcCol[c] = clamp(p.rhBase - p.rhAscent * Math.max(0, asc) + p.rhSubsidence * Math.max(0, -asc), p.rhMin, p.rhMax);
          frontal[c] = p.frontalRate * storm[c] * Math.min(2, baro[rowOf[c]] / 6) * dtDay;
          oceanEvapRate[c] = p.oceanEvapCoef * (speed[c] + 2) * dtDay;
        }
      }
      for (let c = 0; c < size; c++) {
        const t = columnTemp(d, c);
        tsl[c] = t;
        const ts = t - lapse * h[c];
        tsDay[c] = ts;
        // Weak temperature gradient: the free troposphere over hot land is barely warmer than
        // over the ocean at that latitude, so hot ground does not inflate saturation capacity.
        capDay[c] = wsat(p, isLand[c] ? Math.min(t, ebm.ocean[d * nLat + rowOf[c]] + p.wtgLandOffsetC) : t);
        if (isLand[c]) {
          const q = ebm.insolation[d * nLat + rowOf[c]];
          const pt = 1.26 * ptFactor(ts) / 28.4 * dtDay;
          petDay[c] = pt * Math.max(0, p.netRadiationFactor * q * 0.8 - p.netRadiationLoss);
          petSnowDay[c] = pt * Math.max(0, p.netRadiationFactor * q * 0.4 - p.netRadiationLoss);
        } else {
          iceDay[c] = ebm.ocean[d * nLat + rowOf[c]] < SEA_ICE_TEMP_C ? 1 : 0;
        }
      }

      for (let s = 0; s < p.stepsPerDay; s++) {
        let before = 0;
        let after = 0;
        let removed = 0;
        stepRain.fill(0);
        for (let c = 0; c < size; c++) before += W[c] * colFrac[c] * area[c];
        for (let c = 0; c < size; c++) {
          const o = c * 4;
          let w = depW[o] * W[depIdx[o]] + depW[o + 1] * W[depIdx[o + 1]]
            + depW[o + 2] * W[depIdx[o + 2]] + depW[o + 3] * W[depIdx[o + 3]];
          const f = oroFrac[c];
          if (f > 0) {
            // The lifted air comes from the upwind, lower slope and carries that column's vapour.
            const rain = Math.min(w * colFrac[c], w * f * oroCol[c]);
            w -= rain / colFrac[c];
            stepRain[c] += rain;
            removed += rain * area[c];
          }
          w *= convergence[c] * leeFactor[c];
          Wn[c] = w;
          after += w * colFrac[c] * area[c];
        }
        const fix = after > 0 ? (before - removed) / after : 1;

        for (let c = 0; c < size; c++) {
          let w = Wn[c] * fix;
          const cap = capDay[c];
          const ts = tsDay[c];
          let evap;
          let pet;
          if (!isLand[c]) {
            evap = oceanEvapRate[c] * (iceDay[c] ? 0.15 : 1) * Math.max(0, cap - w);
            pet = evap;
          } else {
            pet = snow[c] > 10 ? petSnowDay[c] : petDay[c];
            const sc = soil[c];
            evap = Math.min(sc, pet * (sc < betaCap ? sc / betaCap : 1));
            soil[c] = sc - evap;
            if (snow[c] > 0 && ts < 0) {
              const sub = Math.min(snow[c], 0.1 * pet);
              snow[c] -= sub;
              evap += sub;
            }
          }
          w += evap / colFrac[c];

          const rh = Math.min(1.2, w / (cap > 0.5 ? cap : 0.5));
          const thresh = rhcCol[c] * cap;
          const condensed = w > thresh ? (w - thresh) * condense : 0;
          let precip = condensed + w * frontal[c] * rh * rh;
          if (precip > w) precip = w;
          W[c] = w - precip;
          if (record && diag) {
            const k = m * size + c;
            const cond = Math.min(condensed, precip);
            diag.condensationRain[k] += cond * colFrac[c];
            diag.frontalRain[k] += (precip - cond) * colFrac[c];
            diag.orographicRain[k] += stepRain[c];
          }
          precip = precip * colFrac[c] + stepRain[c];

          let runoff = 0;
          if (isLand[c]) {
            const snowFrac = ts <= -1 ? 1 : ts >= 1 ? 0 : smoothstep(1, -1, ts);
            let sw = snow[c] + precip * snowFrac;
            let water = precip * (1 - snowFrac);
            if (ts > 0 && sw > 0) {
              const melt = Math.min(sw, p.degreeDayMelt * ts * dtDay);
              sw -= melt;
              water += melt;
            }
            if (sw > p.maxSnowMm) {
              runoff += sw - p.maxSnowMm;
              sw = p.maxSnowMm;
            }
            snow[c] = sw;
            const sr = soil[c] / soilCap;
            const fast = water * p.fastRunoff * sr * sr;
            let sc = soil[c] + water - fast;
            runoff += fast;
            if (sc > soilCap) {
              runoff += sc - soilCap;
              sc = soilCap;
            }
            soil[c] = sc;
          }

          if (record) {
            const k = m * size + c;
            monthP[k] += precip;
            monthE[k] += evap;
            monthR[k] += runoff;
            monthPet[k] += pet;
          }
        }
      }

      if (record && diag) {
        for (let c = 0; c < size; c++) {
          const k = m * size + c;
          const f = 1 / daysInMonth[m];
          diag.vapour[k] += W[c] * colFrac[c] * f;
          diag.ascent[k] += ascent[c] * f;
          diag.u[k] += u[c] * f;
          diag.v[k] += v[c] * f;
          diag.marine[k] += marine[c] * f;
        }
      }
      if (record) {
        for (let c = 0; c < size; c++) {
          monthT[m * size + c] += tsl[c] / daysInMonth[m];
          soilMean[c] += soil[c] / DAYS;
          if (snow[c] < snowMin[c]) snowMin[c] = snow[c];
        }
      }
    }
  }

  // Dry surfaces cannot cool by evaporation, so their air runs warmer (Bowen-ratio effect).
  for (let c = 0; c < size; c++) {
    if (!isLand[c]) continue;
    for (let m = 0; m < 12; m++) {
      const k = m * size + c;
      if (monthPet[k] > 1) monthT[k] += p.dryWarmingC * (1 - Math.min(1, monthE[k] / monthPet[k]));
    }
  }

  return {
    grid,
    isLand,
    heightM: h,
    monthTempSeaLevel: monthT,
    monthPrecip: monthP,
    monthEvap: monthE,
    monthRunoff: monthR,
    monthPet,
    soilMean,
    snowMin,
    diagnostics: diag,
    params: p
  };
}

module.exports = {
  DEFAULT_PARAMS,
  LatLonGrid,
  dailyInsolation,
  runEnergyBalance,
  simulateAtmosphere,
  blurField
};
