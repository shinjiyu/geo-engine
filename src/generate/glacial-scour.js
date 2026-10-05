'use strict';

const { makeNoise3D, fbm } = require('./noise');
const { wasIceScoured } = require('./drainage');

const DEFAULTS = {
  maxDepthM: 300,
  // fbm level above which ice gouged a basin; higher leaves fewer, smaller basins.
  threshold: 0.12,
  fullDepthAt: 0.3,
  // Basin scale: a few hundred km, like the Great Lakes or Ladoga and Onega.
  frequency: 9,
  maxReliefM: 1500,
  subseaMinDepthM: 60
};

/**
 * Ice sheets of the last glacial maximum gouged rock basins into low shield ground. Lower the
 * relief there so drainage finds the depressions that hold glacial lakes. Mountains are left
 * alone: their cirque and valley lakes are far smaller than a cell.
 */
function scourGlacialBasins(cells, neighborTable, planet, seed, options = {}) {
  const opts = { ...DEFAULTS, ...options };
  const noise = makeNoise3D(`${seed}:glacial-scour`);
  let scoured = 0;
  for (const [key, cell] of cells) {
    if (!cell.isLand || cell.isLake || cell.terrain === 'snow' || cell.koppen === 'EF') continue;
    const reliefM = cell.elevation - planet.seaLevelM;
    if (reliefM <= 0 || reliefM > opts.maxReliefM || !wasIceScoured(cell)) continue;
    // Gouging a shore cell would open a sound to the sea rather than enclose a lake. Two rings of
    // the 4-neighbour table cover the diagonal neighbours that drainage also follows.
    const ring = neighborTable.get(key) || [];
    const nearSea = ring.some((nk) => !cells.get(nk)?.isLand
      || (neighborTable.get(nk) || []).some((mk) => !cells.get(mk)?.isLand));
    if (nearSea) continue;
    const lat = cell.lat * Math.PI / 180;
    const lon = cell.lon * Math.PI / 180;
    const f = opts.frequency;
    const v = fbm(noise, Math.cos(lat) * Math.sin(lon) * f, Math.sin(lat) * f, Math.cos(lat) * Math.cos(lon) * f, 3);
    const strength = (v - opts.threshold) / (opts.fullDepthAt - opts.threshold);
    if (strength <= 0) continue;
    const depthM = Math.min(1, strength) * opts.maxDepthM;
    // Only basins deep enough to hold a lake may sink below sea level; shallow ones would dry out there.
    const floorM = depthM >= opts.subseaMinDepthM ? -Infinity : planet.seaLevelM + 5;
    cell.elevation = Math.max(floorM, cell.elevation - depthM);
    cell.drainageElevation = Math.max(floorM, (cell.drainageElevation ?? cell.elevation + depthM) - depthM);
    scoured++;
  }
  return { scoured };
}

module.exports = { DEFAULTS, scourGlacialBasins };
