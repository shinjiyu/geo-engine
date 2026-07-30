'use strict';

const { cellKey, haversineKm } = require('../topology/cube-sphere');

function priorityFloodRoute(cells, neighborTable) {
  const keys = [...cells.keys()];
  const filled = new Map();
  const downslope = new Map();
  const done = new Set();
  const eps = 0.001;

  for (const key of keys) {
    const c = cells.get(key);
    filled.set(key, c.elevation);
  }

  const pq = [];
  for (const key of keys) {
    const c = cells.get(key);
    if (!c.isLand) {
      done.add(key);
      pq.push(key);
    }
  }

  while (pq.length) {
    pq.sort((a, b) => filled.get(a) - filled.get(b));
    const cKey = pq.shift();
    for (const nk of neighborTable.get(cKey) || []) {
      if (done.has(nk)) continue;
      const c = cells.get(nk);
      if (!c) continue;
      if (filled.get(nk) <= filled.get(cKey)) filled.set(nk, filled.get(cKey) + eps);
      downslope.set(nk, cKey);
      done.add(nk);
      pq.push(nk);
    }
  }

  return downslope;
}

function buildUpslope(downslope) {
  const upslope = new Map();
  for (const [key, down] of downslope) {
    if (!down) continue;
    if (!upslope.has(down)) upslope.set(down, []);
    upslope.get(down).push(key);
  }
  return upslope;
}

function isCoastalLand(key, downslope, cells) {
  const down = downslope.get(key);
  if (!down) return true;
  const nb = cells.get(down);
  return Boolean(nb && !nb.isLand);
}

function traceSourceToMouth(startKey, downslope, cells) {
  const path = [startKey];
  const seen = new Set([startKey]);
  let cur = startKey;
  while (downslope.has(cur)) {
    const next = downslope.get(cur);
    const nb = cells.get(next);
    if (!nb?.isLand || seen.has(next)) break;
    path.push(next);
    seen.add(next);
    cur = next;
    if (path.length > 500) break;
  }
  return path;
}

function estimateRiverLength(path, cells) {
  let km = 0;
  for (let i = 1; i < path.length; i++) {
    const a = cells.get(path[i - 1]);
    const b = cells.get(path[i]);
    if (a && b) km += haversineKm(a.lat, a.lon, b.lat, b.lon);
  }
  return Math.round(km);
}

function extractRiverNetwork(cells, neighborTable, options) {
  const minPathCells = options.minPathCells ?? 5;
  const minRiverFlow = options.minRiverFlow ?? 28;

  const downslope = priorityFloodRoute(cells, neighborTable);
  const upslope = buildUpslope(downslope);

  const sorted = [...cells.values()]
    .filter((c) => c.isLand)
    .sort((a, b) => b.elevation - a.elevation);

  for (const cell of cells.values()) cell.flow = 0;
  for (const cell of sorted) {
    cell.flow = Math.max(0.05, cell.runoff ?? 1);
    const key = cellKey(cell.face, cell.u, cell.v);
    const down = downslope.get(key);
    if (down) {
      const target = cells.get(down);
      if (target) target.flow += cell.flow;
    }
  }

  let maxLandFlow = 0;
  for (const cell of cells.values()) {
    if (cell.isLand) maxLandFlow = Math.max(maxLandFlow, cell.flow || 0);
  }
  const minFlow = Math.max(1.5, maxLandFlow * 0.06);

  const sources = [];
  for (const cell of cells.values()) {
    if (!cell.isLand || cell.flow < minFlow) continue;
    const key = cellKey(cell.face, cell.u, cell.v);
    let hasUp = false;
    for (const uk of upslope.get(key) || []) {
      const up = cells.get(uk);
      if (up?.isLand && up.flow >= minFlow) {
        hasUp = true;
        break;
      }
    }
    if (!hasUp) sources.push(key);
  }

  sources.sort((a, b) => (cells.get(b).flow || 0) - (cells.get(a).flow || 0));

  const candidates = [];
  for (const src of sources) {
    const path = traceSourceToMouth(src, downslope, cells);
    if (path.length < minPathCells) continue;
    const mouth = path[path.length - 1];
    if (!isCoastalLand(mouth, downslope, cells)) continue;
    candidates.push({
      path,
      source: src,
      mouth,
      sourceFlow: cells.get(src).flow,
      mouthFlow: cells.get(mouth).flow,
      length: path.length
    });
  }

  const byMouth = new Map();
  for (const c of candidates) {
    if (!byMouth.has(c.mouth)) byMouth.set(c.mouth, []);
    byMouth.get(c.mouth).push(c);
  }

  const rivers = [];
  for (const group of byMouth.values()) {
    group.sort((a, b) => b.length - a.length || b.sourceFlow - a.sourceFlow);
    group[0].kind = 'main';
    for (let i = 1; i < group.length; i++) group[i].kind = 'tributary';
    rivers.push(...group);
  }

  rivers.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'main' ? -1 : 1;
    return b.length - a.length;
  });

  for (const cell of cells.values()) cell.river = false;
  for (const r of rivers) {
    for (const k of r.path) {
      const c = cells.get(k);
      if (c) c.river = true;
    }
  }

  return rivers.map((r, idx) => ({
    id: `river-${idx + 1}`,
    kind: r.kind,
    cells: r.path,
    lengthKm: estimateRiverLength(r.path, cells),
    sourceFlow: Math.round((r.sourceFlow || 0) * 10) / 10,
    mouthFlow: Math.round((r.mouthFlow || 0) * 10) / 10
  }));
}

module.exports = {
  priorityFloodRoute,
  extractRiverNetwork,
  traceSourceToMouth
};
