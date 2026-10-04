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
  heatCapOcean: 2725,
  heatCapLand: 50,
  heatCapIce: 398.625,
  landOceanExchange: 6.9,
  oceanDiffusion: 0.15,
  oceanBasinLandFrac: 0.1,
  sstAirRecoverDays: 1.3,
  sstWinterGain: 1,
  albedo0: 0.3,
  albedo2: 0.0912,
  albedoIce: 0.62,
  // circulation
  hadleyEdgeDeg: 30,
  polarFrontDeg: 65,
  itczShiftFactor: 1.287,
  monsoonLandGain: 3.4375,
  plateauHeightM: 2500,
  plateauItczGain: 4.5,
  // Share of the land-driven ITCZ excursion by which the rain belt lags the heat trough.
  rainBeltLag: 0.55,
  rainBeltPlateauCancel: 8,
  rainBeltMinShiftDeg: 12,
  // Tropical land share (40 degrees of longitude) over which the heat low develops.
  rainBeltLandMin: 0.75,
  rainBeltLandFull: 0.92,
  // Width of the transition from the rain belt into the dry heat low.
  rainBeltEdgeDeg: 12,
  // Monsoon-desert descent (Rodwell & Hoskins): plateau monsoon heating to the east, weighted
  // with this e-folding distance, forces subsidence over the land west of it (Arabia, Atacama).
  rainBeltEastWindowDeg: 30,
  rainBeltMonsoonDesertGain: 10,
  // Extra column humidity needed to rain under the heat low's subsiding lid.
  rainBeltRhRaise: 0.3,
  ascentBlurDeg: 3.125,
  tradeU: 7,
  tradeV: 1.726,
  westerlyU: 9,
  westerlyV: 2.172,
  polarU: 3,
  polarV: 1,
  gyreWind: 4,
  gyreAscent: 5.625,
  gyreDescent: 0,
  gyreAscentOcean: 0,
  gyreLandBlurDeg: 4,
  gyreInlandKm: 2325,
  sstGyreSubtropical: 1.5,
  sstGyreSubpolar: 3.25,
  thermalWind: 0.32,
  thermalGeoWind: 2.453,
  coldLandHighGain: 1,
  marineDecayDays: 2.1463,
  marineRecoverDays: 2.7062,
  // moisture
  wsatRef: 70,
  wsatRefTempC: 27,
  wsatSlope: 0.063,
  vapourScaleHeightM: 2200,
  wtgLandOffsetC: 0,
  wtgLatDeg: 81.8625,
  oceanEvapCoef: 0.02,
  convergenceFactor: 0.461,
  convTropicsDeg: 25.025,
  extratropLandConv: 0.1875,
  rhBase: 0.666,
  rhAscent: 0.35,
  rhSubsidence: 0,
  rhMin: 0.45,
  rhMax: 0.98,
  condenseTauDays: 0.25,
  // Share of column vapour in the monsoon / LLJ undercurrent that large-scale ascent does not
  // condense: it is advected onshore (ocean cells whose wind hits land) and, over land, scales
  // with marine origin. The dry heat low keeps none of this layer.
  lljBypass: 0.85,
  lljFetchDeg: 10,
  // Below this |latitude| the ITCZ already rains on the coast; the undercurrent is for
  // monsoon land whose trough sits well off the equator (India, south China, the Gulf coast).
  lljMinLat: 12,
  lljMinShiftDeg: 10,
  // Boundary-layer vapour (Wb) mixes into the free troposphere on this timescale; monsoon
  // undercurrent cells add blProtectDays so the jet can travel before it rains.
  blMixDays: 0.08,
  blProtectDays: 2,
  blVentAscent: 0.5,
  frontalRate: 4,
  frontalRhTrue: 1,
  frontalRhExp: 2,
  ascentZonalTerm: 0.125,
  frontalContinentality: 0,
  leeFetchKm: 600,
  leeFrontalScaleM: 3000,
  leeFrontalThresholdM: 700,
  polarFrontalShare: 0.5045,
  orographicEfficiency: 0.05,
  orographicScaleM: 1187.5,
  leeDryingThresholdM: 487,
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
        const heat = (tmNew[i] - rhs[i]) * Cm[i];
        To[i] += heat / Co[i];
        Tl[i] += heat / p.heatCapLand;
      }
      if (p.oceanDiffusion > 0) {
        // Wind-driven and overturning ocean transport needs sea in both bands and coasts to bound
        // the gyres: a circumpolar channel carries no net meridional heat.
        const width = (i) => (1 - landFraction[i]) * smoothstep(0, p.oceanBasinLandFrac, landFraction[i]);
        for (let i = 0; i < nLat; i++) {
          const wo = Math.max(0.05, 1 - landFraction[i]);
          const k = p.oceanDiffusion / (Co[i] * wo * cosC[i] * dPhi * dPhi);
          const wS = i > 0 ? Math.min(width(i - 1), width(i)) : 0;
          const wN = i < nLat - 1 ? Math.min(width(i), width(i + 1)) : 0;
          a[i] = -k * cosEdge[i] * wS;
          c[i] = -k * cosEdge[i + 1] * wN;
          b[i] = 1 - a[i] - c[i];
        }
        To.set(solveTridiagonal(a, b, c, To, nLat));
      }
      for (let i = 0; i < nLat; i++) {
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
  const heatLowCap = new Float64Array(size);
  const lljProtect = new Float64Array(size);
  const baro = new Float64Array(nLat);
  const depIdx = new Int32Array(size * 4);
  const depW = new Float64Array(size * 4);
  const oroFrac = new Float64Array(size);
  const leeFactor = new Float64Array(size);
  const leeFrontal = new Float64Array(size);
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
  const sstSubpolar = new Float64Array(size);
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
      // Only the warm eastern drift: the cold western side comes from continental outflow air.
      sstSubpolar[row + j] = Math.max(0, -shape) * p.sstGyreSubpolar * subpolar;
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
  // Smooth land share: summer convection needs a sizeable heated land area, not a coastal step.
  const landShare = blurField(grid, Float64Array.from(isLand), p.gyreLandBlurDeg, 1);
  const marineAnomaly = new Float64Array(size);
  const anomalyCache = new Array(12).fill(null);
  const diag = p.diagnostics ? {
    itcz: new Array(12),
    plateauFrac: new Array(12),
    beltLandFrac: new Array(12),
    phiOcean: new Float64Array(12),
    vapour: new Float32Array(12 * size),
    ascent: new Float32Array(12 * size),
    u: new Float32Array(12 * size),
    v: new Float32Array(12 * size),
    marine: new Float32Array(12 * size),
    columnRh: new Float32Array(12 * size),
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

  /**
   * Three-cell surface winds per longitude: trades converge on `phiOf[j]`; the Hadley edges and
   * polar fronts follow `cellPhiOf[j]` (the ITCZ by default).
   */
  function baseCirculation(phiOf, baseU, baseV, stormOut, cellPhiOf = phiOf) {
    for (let i = 0; i < nLat; i++) {
      const lat = rowLat[i];
      for (let j = 0; j < nLon; j++) {
        const phi = phiOf[j];
        const edgeN = p.hadleyEdgeDeg + 0.4 * cellPhiOf[j];
        const edgeS = -p.hadleyEdgeDeg + 0.4 * cellPhiOf[j];
        const frontN = p.polarFrontDeg + 0.2 * cellPhiOf[j];
        const frontS = -p.polarFrontDeg + 0.2 * cellPhiOf[j];
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
        if (stormOut) stormOut[i * nLon + j] = st;
        baseU[i * nLon + j] = bu * rot;
        baseV[i * nLon + j] = bv;
      }
    }
  }

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
    const plateauFrac = new Float64Array(nLon);
    const beltLandFrac = new Float64Array(nLon);
    const eastPlateau = new Float64Array(nLon);
    const rx = Math.round(20 / grid.res);
    const rxEast = Math.round(p.rainBeltEastWindowDeg / grid.res);
    const summer = phiLand >= 0 ? 0 : 1;
    for (let j = 0; j < nLon; j++) {
      let s = 0;
      let hp = 0;
      for (let k = -rx; k <= rx; k++) {
        const jj = ((j + k) % nLon + nLon) % nLon;
        s += belt[summer][jj];
        hp += plateau[summer][jj];
      }
      let he = 0;
      let we = 0;
      for (let k = 1; k <= 3 * rxEast; k++) {
        const w = Math.exp(-k / rxEast);
        he += w * plateau[summer][(j + k) % nLon];
        we += w;
      }
      eastPlateau[j] = he / we;
      const beltLand = s / (2 * rx + 1);
      beltLandFrac[j] = beltLand;
      const share = Math.min(1, p.monsoonLandGain * beltLand);
      plateauFrac[j] = hp / (2 * rx + 1);
      const plateauPull = p.plateauItczGain * plateauFrac[j] * phiLandRaw;
      itcz[j] = clamp(phiOcean + share * (phiLand - phiOcean) + plateauPull, -30, 30);
    }
    if (diag) {
      diag.itcz[m] = Float64Array.from(itcz);
      diag.plateauFrac[m] = plateauFrac;
      diag.beltLandFrac[m] = beltLandFrac;
      diag.phiOcean[m] = phiOcean;
    }

    // Base circulation.
    const baseU = new Float64Array(size);
    const baseV = new Float64Array(size);
    baseCirculation(itcz, baseU, baseV, storm);

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
        divRaw[c] = (p.ascentZonalTerm * dudx + dvdy) * 1e6;
      }
    }
    const div = blurField(grid, divRaw, p.ascentBlurDeg, 1);
    for (let c = 0; c < size; c++) ascent[c] = -div[c];
    // Where a wide continent drags the trough far from the ocean ITCZ, the trough's poleward
    // part is a shallow dry heat low under subsiding air (the Saharan heat low north of the
    // Sahel rain belt): its convergence lifts no deep convection. High plateaus keep theirs,
    // and their monsoon heating extends the subsiding heat low over the land to their west.
    heatLowCap.fill(0);
    if (p.rainBeltLag > 0) {
      for (let j = 0; j < nLon; j++) {
        const phi = itcz[j];
        const heatLow = smoothstep(0.5 * p.rainBeltMinShiftDeg, p.rainBeltMinShiftDeg, Math.abs(phi - phiOcean))
          * Math.max(0, 1 - p.rainBeltPlateauCancel * plateauFrac[j])
          * Math.min(1, smoothstep(p.rainBeltLandMin, p.rainBeltLandFull, beltLandFrac[j])
            + p.rainBeltMonsoonDesertGain * eastPlateau[j]);
        if (heatLow <= 0) continue;
        const rain = phi - p.rainBeltLag * heatLow * (phi - phiOcean);
        const side = Math.sign(phi - rain);
        const span = Math.abs(phi - rain);
        for (let i = 0; i < nLat; i++) {
          const c = i * nLon + j;
          const dist = (rowLat[i] - rain) * side;
          const capped = heatLow * smoothstep(0, p.rainBeltEdgeDeg, dist) * (1 - smoothstep(span + 4, span + 10, dist));
          heatLowCap[c] = capped;
          if (ascent[c] > 0) ascent[c] *= 1 - capped;
        }
      }
    }

    // Thermal-low winds toward large-scale warm anomalies.
    const anomaly = new Float64Array(size);
    for (let i = 0; i < nLat; i++) {
      let mean = 0;
      for (let j = 0; j < nLon; j++) mean += tsl[i * nLon + j];
      mean /= nLon;
      for (let j = 0; j < nLon; j++) {
        const c = i * nLon + j;
        const a = tsl[c] - mean;
        // Winter continental highs are shallow: the oceanic lows rule the storm-track surface flow.
        anomaly[c] = isLand[c] && a < 0 ? a * p.coldLandHighGain : a;
      }
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
        const g = gyreField[c];
        const landW = landShare[c] + (1 - landShare[c]) * p.gyreAscentOcean;
        ascent[c] += (g > 0 ? p.gyreAscent * landW : p.gyreDescent) * env * summer * g;
        u[c] = baseU[c] + p.thermalWind * gx + p.thermalGeoWind * geo * gy;
        v[c] = baseV[c] + p.thermalWind * gy - p.thermalGeoWind * geo * gx + gyreV;
        speed[c] = Math.hypot(u[c], v[c]);
      }
    }

    // Boundary-layer moisture that large-scale ascent must not rain out: ocean columns whose
    // wind strikes land within lljFetchDeg, and marine air already over land. Heat lows stay dry.
    lljProtect.fill(0);
    if (p.lljBypass > 0) {
      const steps = Math.max(1, Math.round(p.lljFetchDeg / grid.res));
      for (let i = 0; i < nLat; i++) {
        for (let j = 0; j < nLon; j++) {
          const c = i * nLon + j;
          const open = (1 - heatLowCap[c])
            * smoothstep(p.lljMinLat, p.lljMinLat + 6, Math.abs(rowLat[i]))
            * smoothstep(p.lljMinShiftDeg, p.lljMinShiftDeg + 8, Math.abs(itcz[j] - phiOcean));
          if (open <= 0) continue;
          if (isLand[c]) {
            lljProtect[c] = marine[c] * open;
            continue;
          }
          const sp = speed[c] > 0.1 ? speed[c] : 0.1;
          let lat = rowLat[i];
          let lon = colLon[j];
          const dLat = grid.res * v[c] / sp;
          const dLon0 = grid.res * u[c] / sp;
          for (let k = 1; k <= steps; k++) {
            lat = clamp(lat + dLat, -89.9, 89.9);
            lon += dLon0 / Math.max(0.05, Math.cos(lat * DEG));
            if (isLand[grid.index(lat, lon)]) {
              lljProtect[c] = open * Math.exp(-k * grid.res / p.lljFetchDeg);
              break;
            }
          }
        }
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
      let conv = clamp(Math.exp(-p.convergenceFactor * divSmooth[c] * dtStep), 0.7, 1.4);
      if (conv > 1 && isLand[c]) {
        // Away from the ITCZ, and in the dry heat low, continental lows are shallow and capped:
        // they gather little vapour.
        const off = Math.abs(rowLat[rowOf[c]] - itcz[c % nLon]);
        const tropical = smoothstep(p.convTropicsDeg + 10, p.convTropicsDeg, off) * (1 - heatLowCap[c]);
        conv = 1 + (conv - 1) * (tropical + (1 - tropical) * p.extratropLandConv);
      }
      convergence[c] = conv;
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
        // Downslope flow behind a range suppresses frontal uplift over the lee plains.
        let ridge = 0;
        const steps = Math.max(1, Math.round(p.leeFetchKm * 1000 / cellM));
        for (let k = 1; k <= steps; k++) {
          const uc = grid.index(clamp(lat - k * grid.res * v[c] / sp, -89.9, 89.9),
            lon - k * grid.res * u[c] / sp / Math.max(0.05, rowCos[i]));
          if (h[uc] > ridge) ridge = h[uc];
        }
        leeFrontal[c] = Math.exp(-Math.max(0, ridge - h[c] - p.leeFrontalThresholdM) / p.leeFrontalScaleM);
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
    // Surface air takes on the local sea temperature within about a day.
    const recoverA = Math.exp(-1 / (p.stepsPerDay * p.sstAirRecoverDays));
    // Subpolar gyres release most of their heat in winter, when land air is far colder than the sea.
    const dayM = Math.floor((m + 0.5) * DAYS / 12);
    const winterGain = new Float64Array(nLat);
    for (let i = 0; i < nLat; i++) {
      const contrast = ebm.ocean[dayM * nLat + i] - ebm.land[dayM * nLat + i];
      winterGain[i] = p.sstWinterGain * Math.max(0, contrast) / 10;
    }
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
          const target = sstAnomaly[c] + sstSubpolar[c] * winterGain[rowOf[c]];
          nextAnomaly[c] = target - (target - upA) * recoverA;
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
  const Wb = new Float64Array(size);
  const Wn = new Float64Array(size);
  const Wbn = new Float64Array(size);
  const soil = new Float64Array(size);
  const snow = new Float64Array(size);
  const stepRain = new Float64Array(size);
  const capDay = new Float64Array(size);
  const wtgWeight = Float64Array.from(rowLat, (lat) => smoothstep(p.wtgLatDeg + 10, p.wtgLatDeg, Math.abs(lat)));
  const frontCapDay = new Float64Array(size);
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
          rhcCol[c] = clamp(p.rhBase - p.rhAscent * Math.max(0, asc) + p.rhSubsidence * Math.max(0, -asc)
            + p.rainBeltRhRaise * heatLowCap[c], p.rhMin, p.rhMax);
          // Storm tracks feed on ocean air and weaken as cyclones travel deep into continents.
          const continental = isLand[c] ? p.frontalContinentality * (1 - marine[c]) : 0;
          frontal[c] = p.frontalRate * storm[c] * Math.min(2, baro[rowOf[c]] / 6) * (1 - continental) * leeFrontal[c] * dtDay;
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
        capDay[c] = wsat(p, isLand[c] ? t - wtgWeight[rowOf[c]] * Math.max(0, t - ebm.ocean[d * nLat + rowOf[c]] - p.wtgLandOffsetC) : t);
        frontCapDay[c] = p.frontalRhTrue ? wsat(p, t) : capDay[c];
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
        for (let c = 0; c < size; c++) before += (W[c] + Wb[c]) * colFrac[c] * area[c];
        for (let c = 0; c < size; c++) {
          const o = c * 4;
          let w = depW[o] * W[depIdx[o]] + depW[o + 1] * W[depIdx[o + 1]]
            + depW[o + 2] * W[depIdx[o + 2]] + depW[o + 3] * W[depIdx[o + 3]];
          let wb = depW[o] * Wb[depIdx[o]] + depW[o + 1] * Wb[depIdx[o + 1]]
            + depW[o + 2] * Wb[depIdx[o + 2]] + depW[o + 3] * Wb[depIdx[o + 3]];
          const f = oroFrac[c];
          if (f > 0) {
            // Low-level air is lifted first: orographic rain comes out of the boundary layer.
            const wt = w + wb;
            const rain = Math.min(wt * colFrac[c], wt * f * oroCol[c]);
            let take = rain / colFrac[c];
            const fromBl = Math.min(wb, take);
            wb -= fromBl;
            take -= fromBl;
            w -= take;
            stepRain[c] += rain;
            removed += rain * area[c];
          }
          const stretch = convergence[c] * leeFactor[c];
          w *= stretch;
          wb *= stretch;
          Wn[c] = w;
          Wbn[c] = wb;
          after += (w + wb) * colFrac[c] * area[c];
        }
        const fix = after > 0 ? (before - removed) / after : 1;

        for (let c = 0; c < size; c++) {
          let w = Wn[c] * fix;
          let wb = Wbn[c] * fix;
          const cap = capDay[c];
          const ts = tsDay[c];
          let evap;
          let pet;
          if (!isLand[c]) {
            evap = oceanEvapRate[c] * (iceDay[c] ? 0.15 : 1) * Math.max(0, cap - w - wb);
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
          wb += evap / colFrac[c];
          if (wb > cap) {
            w += wb - cap;
            wb = cap;
          }

          // Slow mixing over onshore ocean; land convection vents the layer immediately.
          const tau = Math.max(0.05, (p.blMixDays
            + p.blProtectDays * p.lljBypass * lljProtect[c] * (isLand[c] ? 0 : 1))
            / (1 + p.blVentAscent * Math.max(0, ascent[c]))
            * (1 - 0.9 * heatLowCap[c]));
          const mix = (1 - Math.exp(-dtDay / tau)) * wb;
          w += mix;
          wb -= mix;

          const fc = frontCapDay[c];
          const total = w + wb;
          const rh = Math.min(1.2, total / (fc > 0.5 ? fc : 0.5));
          const thresh = rhcCol[c] * cap;
          const condensed = w > thresh ? (w - thresh) * condense * (1 - p.lljBypass * lljProtect[c]) : 0;
          let precip = condensed + total * frontal[c] * rh ** p.frontalRhExp;
          if (precip > total) precip = total;
          w -= Math.min(w, condensed);
          let rest = precip - Math.min(condensed, precip);
          const fromFt = Math.min(w, rest);
          w -= fromFt;
          rest -= fromFt;
          wb -= rest;
          W[c] = w > 0 ? w : 0;
          Wb[c] = wb > 0 ? wb : 0;
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
          diag.vapour[k] += (W[c] + Wb[c]) * colFrac[c] * f;
          diag.ascent[k] += ascent[c] * f;
          diag.u[k] += u[c] * f;
          diag.v[k] += v[c] * f;
          diag.marine[k] += marine[c] * f;
          diag.columnRh[k] += (capDay[c] > 0.5 ? (W[c] + Wb[c]) / capDay[c] : 0) * f;
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

  if (diag) {
    diag.sstAnomaly = sstAnomaly;
    diag.ebm = ebm;
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
