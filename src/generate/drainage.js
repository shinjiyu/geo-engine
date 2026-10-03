'use strict';

const { haversineKm } = require('../topology/cube-sphere');

const DEFAULTS = {
  minDepressionDepthM: 40,
  minLakeAreaKm2: 3000,
  minRiverAreaKm2: 25000,
  // ~30 m3/s: below this a channel is dry for part of most years.
  minRiverDischargeKm3: 1,
  minRiverLengthKm: 150
};

/** Undirected, de-duplicated 8-neighbourhood derived from the 4-neighbour cube-sphere table. */
function buildD8Neighbors(neighborTable) {
  const n4 = new Map();
  const link = (a, b) => {
    if (a === b) return;
    if (!n4.has(a)) n4.set(a, new Set());
    n4.get(a).add(b);
  };
  for (const [key, list] of neighborTable) {
    if (!n4.has(key)) n4.set(key, new Set());
    for (const nk of list) {
      link(key, nk);
      link(nk, key);
    }
  }

  const d8 = new Map();
  for (const [key, set4] of n4) {
    const counts = new Map();
    for (const a of set4) {
      for (const b of n4.get(a) || []) {
        if (b === key || set4.has(b)) continue;
        counts.set(b, (counts.get(b) || 0) + 1);
      }
    }
    const diagonals = [...counts].filter(([, c]) => c >= 2).map(([k]) => k);
    d8.set(key, [...set4, ...diagonals]);
  }
  return d8;
}

class MinHeap {
  constructor() {
    this.pri = [];
    this.seq = [];
    this.val = [];
    this.counter = 0;
  }

  get size() {
    return this.val.length;
  }

  less(i, j) {
    return this.pri[i] < this.pri[j] || (this.pri[i] === this.pri[j] && this.seq[i] < this.seq[j]);
  }

  swap(i, j) {
    [this.pri[i], this.pri[j]] = [this.pri[j], this.pri[i]];
    [this.seq[i], this.seq[j]] = [this.seq[j], this.seq[i]];
    [this.val[i], this.val[j]] = [this.val[j], this.val[i]];
  }

  push(priority, value) {
    this.pri.push(priority);
    this.seq.push(this.counter++);
    this.val.push(value);
    let i = this.val.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(i, p)) break;
      this.swap(i, p);
      i = p;
    }
  }

  pop() {
    const top = this.val[0];
    const last = this.val.length - 1;
    this.swap(0, last);
    this.pri.pop();
    this.seq.pop();
    this.val.pop();
    let i = 0;
    for (;;) {
      const l = 2 * i + 1;
      const r = l + 1;
      let m = i;
      if (l < this.val.length && this.less(l, m)) m = l;
      if (r < this.val.length && this.less(r, m)) m = r;
      if (m === i) break;
      this.swap(i, m);
      i = m;
    }
    return top;
  }
}

/**
 * Priority-flood depression filling (Barnes et al. 2014, no epsilon).
 * Receivers follow flood order, so every land cell drains to the ocean (or the
 * terminal seed of an ocean-less world) through a directed tree; `order` is a
 * topological order with receivers always before their donors.
 */
function priorityFlood(graph) {
  const { count, elevation, isOcean, adj } = graph;
  const filled = Float64Array.from(elevation);
  const receiver = new Int32Array(count).fill(-1);
  const done = new Uint8Array(count);
  const order = [];
  const heap = new MinHeap();

  let seeded = false;
  for (let i = 0; i < count; i++) {
    if (!isOcean[i]) continue;
    done[i] = 1;
    heap.push(elevation[i], i);
    seeded = true;
  }
  let terminalSeed = -1;
  if (!seeded && count > 0) {
    let lowest = 0;
    for (let i = 1; i < count; i++) if (elevation[i] < elevation[lowest]) lowest = i;
    terminalSeed = lowest;
    done[lowest] = 1;
    heap.push(elevation[lowest], lowest);
    order.push(lowest);
  }

  while (heap.size) {
    const c = heap.pop();
    for (const nb of adj[c]) {
      if (done[nb]) continue;
      done[nb] = 1;
      filled[nb] = Math.max(elevation[nb], filled[c]);
      receiver[nb] = c;
      order.push(nb);
      heap.push(filled[nb], nb);
    }
  }
  return { filled, receiver, order, terminalSeed };
}

function findDepressions(graph, flood, minDepthM) {
  const { count, elevation, adj } = graph;
  const { filled, order } = flood;
  const popIndex = new Int32Array(count).fill(-1);
  order.forEach((cell, i) => { popIndex[cell] = i; });

  const compId = new Int32Array(count).fill(-1);
  const depressions = [];
  for (const start of order) {
    if (compId[start] >= 0 || filled[start] - elevation[start] <= 0.5) continue;
    const id = depressions.length;
    const cells = [];
    const stack = [start];
    compId[start] = id;
    while (stack.length) {
      const c = stack.pop();
      cells.push(c);
      for (const nb of adj[c]) {
        if (compId[nb] >= 0 || popIndex[nb] < 0) continue;
        if (filled[nb] - elevation[nb] <= 0.5) continue;
        compId[nb] = id;
        stack.push(nb);
      }
    }
    let exit = cells[0];
    let floor = cells[0];
    for (const c of cells) {
      if (popIndex[c] < popIndex[exit]) exit = c;
      if (elevation[c] < elevation[floor]) floor = c;
    }
    const spillLevel = filled[exit];
    depressions.push({
      id,
      cells,
      exit,
      floor,
      spillLevel,
      depthM: spillLevel - elevation[floor],
      significant: spillLevel - elevation[floor] >= minDepthM
    });
  }

  // Secondary exits (ties at the spill level) are folded into the primary exit,
  // which has the smallest pop index, so the drainage graph stays acyclic.
  for (const dep of depressions) {
    for (const c of dep.cells) {
      if (c === dep.exit) continue;
      const r = flood.receiver[c];
      if (r < 0 || compId[r] !== dep.id) flood.receiver[c] = dep.exit;
    }
  }
  return { depressions, compId };
}

/** Grow a connected lake from the basin floor, lowest cells first, while evaporation can be balanced. */
function growTerminalLake(dep, graph, inflowKm3, netLossKm3) {
  const inDep = new Set(dep.cells);
  const heap = new MinHeap();
  const seen = new Set([dep.floor]);
  heap.push(graph.elevation[dep.floor], dep.floor);
  const lake = [];
  let loss = 0;
  while (heap.size) {
    const c = heap.pop();
    if (loss + netLossKm3[c] > inflowKm3) break;
    loss += netLossKm3[c];
    lake.push(c);
    for (const nb of graph.adj[c]) {
      if (!inDep.has(nb) || seen.has(nb)) continue;
      seen.add(nb);
      heap.push(graph.elevation[nb], nb);
    }
  }
  return { lake, evaporatedKm3: loss };
}

/** Route every depression cell towards its terminal water body instead of the spill point. */
function rerouteToSink(dep, sinkCells, graph, receiver) {
  const inDep = new Set(dep.cells);
  const heap = new MinHeap();
  const done = new Set(sinkCells);
  for (const c of sinkCells) {
    receiver[c] = -1;
    heap.push(graph.elevation[c], c);
  }
  const localOrder = [];
  while (heap.size) {
    const c = heap.pop();
    for (const nb of graph.adj[c]) {
      if (!inDep.has(nb) || done.has(nb)) continue;
      done.add(nb);
      receiver[nb] = c;
      localOrder.push(nb);
      heap.push(Math.max(graph.elevation[nb], graph.elevation[c]), nb);
    }
  }
  return localOrder;
}

/**
 * Open-water evaporation (mm/yr): the climate stage's Priestley-Taylor potential
 * evaporation, or a temperature fit to observed lake evaporation when it is absent.
 */
function defaultLakeEvaporationMm(cell) {
  if (Number.isFinite(cell.pet)) return cell.pet;
  return Math.max(100, 400 + 60 * (cell.tempC ?? 15));
}

/**
 * Monthly share of each cell's upstream runoff (12 per cell), accumulated down the receiver
 * tree. Lake losses are ignored, so this gives the seasonal shape, not the volume.
 */
function catchmentMonthlyShares(cellList, receiver, isOcean, areaKm2) {
  if (!cellList.some((c) => Array.isArray(c.runoffMonthlyMm))) return null;
  const count = cellList.length;
  const up = new Float64Array(count * 12);
  const indegree = new Int32Array(count);
  for (let i = 0; i < count; i++) {
    if (isOcean[i]) continue;
    const monthly = cellList[i].runoffMonthlyMm;
    if (monthly) for (let m = 0; m < 12; m++) up[i * 12 + m] = Math.max(0, monthly[m]) * areaKm2[i];
    const r = receiver[i];
    if (r >= 0 && !isOcean[r]) indegree[r]++;
  }
  const queue = [];
  for (let i = 0; i < count; i++) if (!isOcean[i] && indegree[i] === 0) queue.push(i);
  for (let head = 0; head < queue.length; head++) {
    const i = queue[head];
    const r = receiver[i];
    if (r < 0 || isOcean[r]) continue;
    for (let m = 0; m < 12; m++) up[r * 12 + m] += up[i * 12 + m];
    if (--indegree[r] === 0) queue.push(r);
  }
  for (let i = 0; i < count; i++) {
    let total = 0;
    for (let m = 0; m < 12; m++) total += up[i * 12 + m];
    for (let m = 0; m < 12; m++) up[i * 12 + m] = total > 0 ? up[i * 12 + m] / total : 1 / 12;
  }
  return up;
}

function runDrainage(cells, neighborTable, planet, options = {}) {
  const opts = { ...DEFAULTS, ...options };
  const lakeEvaporationMm = opts.lakeEvaporationMm || defaultLakeEvaporationMm;
  const keys = [...cells.keys()];
  const index = new Map(keys.map((k, i) => [k, i]));
  const count = keys.length;
  const d8 = buildD8Neighbors(neighborTable);
  const adj = keys.map((k) => (d8.get(k) || []).map((nk) => index.get(nk)).filter((j) => j !== undefined));
  const cellList = keys.map((k) => cells.get(k));
  const elevation = Float64Array.from(cellList, (c) => c.elevation);
  const isOcean = Uint8Array.from(cellList, (c) => (!c.isLand && !c.isLake ? 1 : 0));
  const meanCellAreaKm2 = 4 * Math.PI * planet.radiusKm * planet.radiusKm / count;
  const areaKm2 = Float64Array.from(cellList, (c) => meanCellAreaKm2 * (c.areaWeight || 1));
  const graph = { count, elevation, isOcean, adj };

  const flood = priorityFlood(graph);
  const { depressions, compId } = findDepressions(graph, flood, opts.minDepressionDepthM);
  const receiver = flood.receiver;
  const exitOf = new Map(depressions.map((d) => [d.exit, d]));

  const ownKm3 = new Float64Array(count);
  const netLossKm3 = new Float64Array(count);
  for (let i = 0; i < count; i++) {
    if (isOcean[i]) continue;
    const c = cellList[i];
    ownKm3[i] = Math.max(0, c.runoff || 0) * 1e-6 * areaKm2[i];
    netLossKm3[i] = Math.max(0, lakeEvaporationMm(c) - (c.precip || 0)) * 1e-6 * areaKm2[i];
  }

  const flux = Float64Array.from(ownKm3);
  const drainArea = Float64Array.from(areaKm2, (a, i) => (isOcean[i] ? 0 : a));
  const extFlux = Float64Array.from(ownKm3);
  const extArea = Float64Array.from(drainArea);
  const isLakeCell = new Uint8Array(count);
  const lakeIdOf = new Int32Array(count).fill(-1);
  const sinkCell = new Uint8Array(count);
  const lakes = [];
  const closedDepressions = new Set();

  for (let k = flood.order.length - 1; k >= 0; k--) {
    const i = flood.order[k];
    const dep = exitOf.get(i);
    let blocked = false;
    if (dep && dep.significant) {
      const inflow = flux[i];
      const fullLoss = dep.cells.reduce((s, c) => s + netLossKm3[c], 0);
      let lakeCells;
      let open;
      let evaporated;
      if (inflow >= fullLoss) {
        open = true;
        lakeCells = dep.cells;
        evaporated = fullLoss;
        flux[i] = inflow - fullLoss;
      } else {
        open = false;
        const grown = growTerminalLake(dep, graph, inflow, netLossKm3);
        lakeCells = grown.lake;
        evaporated = inflow;
        blocked = true;
        closedDepressions.add(dep.id);
      }

      const lakeArea = lakeCells.reduce((s, c) => s + areaKm2[c], 0);
      const isLake = lakeCells.length > 0 && lakeArea >= opts.minLakeAreaKm2;
      if (!open) {
        const sinks = isLake ? lakeCells : [dep.floor];
        for (const c of sinks) sinkCell[c] = 1;
        const localOrder = rerouteToSink(dep, sinks, graph, receiver);
        for (const c of [...sinks, ...localOrder]) {
          flux[c] = extFlux[c];
          drainArea[c] = extArea[c];
        }
        for (let m = localOrder.length - 1; m >= 0; m--) {
          const c = localOrder[m];
          const r = receiver[c];
          flux[r] += flux[c];
          drainArea[r] += drainArea[c];
        }
      }

      if (isLake) {
        const lakeId = lakes.length;
        let maxElev = -Infinity;
        for (const c of lakeCells) {
          isLakeCell[c] = 1;
          lakeIdOf[c] = lakeId;
          maxElev = Math.max(maxElev, elevation[c]);
        }
        const level = open ? dep.spillLevel : maxElev;
        lakes.push({
          index: lakeId,
          cells: lakeCells,
          open,
          level,
          depthM: level - elevation[dep.floor],
          areaKm2: lakeArea,
          inflowKm3: inflow,
          evaporationKm3: evaporated,
          outflowKm3: open ? flux[i] : 0,
          exit: i,
          outlet: open ? receiver[i] : -1,
          belowSeaLevel: elevation[dep.floor] < planet.seaLevelM
        });
      }
    }

    const r = receiver[i];
    if (blocked || r < 0 || isOcean[r]) continue;
    flux[r] += flux[i];
    drainArea[r] += drainArea[i];
    if (compId[i] < 0 || compId[i] !== compId[r]) {
      extFlux[r] += flux[i];
      extArea[r] += drainArea[i];
    }
  }

  // Channels drain a large enough basin; perennial rivers also carry enough water to flow all
  // year. Weaker channels are intermittent (wadis): dry beds that run only after rain.
  const isChannel = new Uint8Array(count);
  const isRiver = new Uint8Array(count);
  for (let i = 0; i < count; i++) {
    if (isOcean[i] || isLakeCell[i] || drainArea[i] < opts.minRiverAreaKm2) continue;
    isChannel[i] = 1;
    if (flux[i] >= opts.minRiverDischargeKm3) isRiver[i] = 1;
  }
  // Ice sheets carry their meltwater under the ice, not in dry beds.
  const iceCap = (c) => c.terrain === 'snow' || c.koppen === 'EF';
  const isWadi = Uint8Array.from(isChannel, (v, i) => (v && !isRiver[i] && !iceCap(cellList[i]) ? 1 : 0));

  const cellDistanceKm = (a, b) => haversineKm(cellList[a].lat, cellList[a].lon, cellList[b].lat, cellList[b].lon);
  const pathLengthKm = (path) => {
    let km = 0;
    for (let m = 1; m < path.length; m++) km += cellDistanceKm(path[m - 1], path[m]);
    return km;
  };
  const strongestUpstream = (ups) => ups.reduce((best, u) => (
    flux[u] > flux[best] || (flux[u] === flux[best] && drainArea[u] > drainArea[best]) ? u : best
  ), ups[0]);

  /** Main stems and tributaries of the channel network `mask`, with Strahler orders. */
  function extractNetwork(mask) {
    const up = new Map();
    for (let i = 0; i < count; i++) {
      if (!mask[i]) continue;
      const r = receiver[i];
      if (r >= 0 && mask[r]) {
        if (!up.has(r)) up.set(r, []);
        up.get(r).push(i);
      }
    }

    const pending = new Int32Array(count);
    for (let i = 0; i < count; i++) if (mask[i]) pending[i] = (up.get(i) || []).length;
    const topo = [];
    for (let i = 0; i < count; i++) if (mask[i] && pending[i] === 0) topo.push(i);
    for (let h = 0; h < topo.length; h++) {
      const r = receiver[topo[h]];
      if (r >= 0 && mask[r] && --pending[r] === 0) topo.push(r);
    }
    const order = new Int32Array(count);
    for (const i of topo) {
      const ups = up.get(i) || [];
      if (!ups.length) {
        order[i] = 1;
        continue;
      }
      let best = 0;
      let ties = 0;
      for (const u of ups) {
        if (order[u] > best) {
          best = order[u];
          ties = 1;
        } else if (order[u] === best) {
          ties++;
        }
      }
      order[i] = ties >= 2 ? best + 1 : best;
    }

    const raw = [];
    const queue = [];
    for (let i = 0; i < count; i++) {
      if (!mask[i]) continue;
      const r = receiver[i];
      if (r >= 0 && mask[r]) continue;
      let mouth;
      let junction = -1;
      if (r < 0) mouth = { type: 'sink' };
      else if (isOcean[r]) mouth = { type: 'ocean' };
      else if (isLakeCell[r]) mouth = { type: 'lake', lakeIndex: lakeIdOf[r] };
      else if (isRiver[r]) {
        mouth = { type: 'river', riverCell: r };
        junction = r;
      } else mouth = { type: 'sink' };
      queue.push({ start: i, parent: -1, junction, mouth });
    }
    for (let head = 0; head < queue.length; head++) {
      const item = queue[head];
      const upstreamFirst = [];
      let cur = item.start;
      for (;;) {
        upstreamFirst.push(cur);
        const ups = up.get(cur);
        if (!ups || !ups.length) break;
        const main = strongestUpstream(ups);
        for (const u of ups) {
          if (u !== main) queue.push({ start: u, parent: raw.length, junction: cur, mouth: null });
        }
        cur = main;
      }
      const path = upstreamFirst.reverse();
      if (item.junction >= 0) path.push(item.junction);
      raw.push({
        path,
        parent: item.parent,
        mouth: item.mouth || { type: 'confluence' },
        mouthCell: item.start,
        lengthKm: pathLengthKm(path)
      });
    }

    const keep = raw.map((r) => r.lengthKm >= opts.minRiverLengthKm);
    for (let m = 0; m < raw.length; m++) {
      if (raw[m].parent >= 0 && !keep[raw[m].parent]) keep[m] = false;
    }
    return {
      order,
      kept: raw.map((r, m) => ({ ...r, rawIndex: m })).filter((r) => keep[r.rawIndex])
    };
  }

  const { order: strahler, kept } = extractNetwork(isRiver);
  const discharge = (r) => flux[r.mouthCell];
  kept.sort((a, b) => {
    const am = a.parent < 0 ? 0 : 1;
    const bm = b.parent < 0 ? 0 : 1;
    return am - bm || discharge(b) - discharge(a);
  });
  const idOfRaw = new Map(kept.map((r, m) => [r.rawIndex, `river-${m + 1}`]));

  const monthShare = catchmentMonthlyShares(cellList, receiver, isOcean, areaKm2);
  function seasonalRegime(cell, annualKm3) {
    if (!monthShare) return {};
    const shares = monthShare.subarray(cell * 12, cell * 12 + 12);
    const monthlyFlowKm3 = Array.from(shares, (s) => Math.round(s * annualKm3 * 10000) / 10000);
    let flood = 0;
    let low = 0;
    for (let m = 1; m < 12; m++) {
      if (shares[m] > shares[flood]) flood = m;
      if (shares[m] < shares[low]) low = m;
    }
    return { monthlyFlowKm3, floodMonth: flood + 1, lowFlowMonth: low + 1 };
  }

  const lakeIds = lakes.map((lake, m) => `lake-${m + 1}`);
  const riverCells = new Uint8Array(count);
  const rivers = kept.map((r) => {
    const own = r.parent >= 0 ? r.path.slice(0, -1) : r.path;
    for (const c of own) riverCells[c] = 1;
    const mouth = { ...r.mouth };
    if (mouth.type === 'lake') {
      mouth.lakeId = lakeIds[mouth.lakeIndex];
      delete mouth.lakeIndex;
    }
    if (r.parent >= 0) mouth.riverId = idOfRaw.get(r.parent);
    const source = r.path[0];
    return {
      id: idOfRaw.get(r.rawIndex),
      kind: r.parent < 0 ? 'main' : 'tributary',
      parentId: r.parent >= 0 ? idOfRaw.get(r.parent) : null,
      cells: r.path.map((c) => keys[c]),
      lengthKm: Math.round(r.lengthKm),
      order: strahler[r.mouthCell],
      mouth,
      sourceFlow: Math.round(flux[source] * 1000) / 1000,
      mouthFlow: Math.round(flux[r.mouthCell] * 1000) / 1000,
      dischargeKm3: Math.round(flux[r.mouthCell] * 1000) / 1000,
      drainageAreaKm2: Math.round(drainArea[r.mouthCell]),
      ...seasonalRegime(r.mouthCell, flux[r.mouthCell])
    };
  });

  const riverOfCell = new Map();
  for (const river of rivers) {
    const own = river.parentId ? river.cells.slice(0, -1) : river.cells;
    for (const k of own) riverOfCell.set(k, river.id);
  }

  const wadiNet = extractNetwork(isWadi);
  wadiNet.kept.sort((a, b) => (a.parent < 0 ? 0 : 1) - (b.parent < 0 ? 0 : 1) || discharge(b) - discharge(a));
  const wadiIdOfRaw = new Map(wadiNet.kept.map((r, m) => [r.rawIndex, `wadi-${m + 1}`]));
  const wadiCells = new Uint8Array(count);
  const wadis = wadiNet.kept.map((r) => {
    const own = r.parent >= 0 || r.mouth.type === 'river' ? r.path.slice(0, -1) : r.path;
    for (const c of own) wadiCells[c] = 1;
    const mouth = { ...r.mouth };
    if (mouth.type === 'lake') {
      mouth.lakeId = lakeIds[mouth.lakeIndex];
      delete mouth.lakeIndex;
    }
    if (mouth.type === 'river') {
      mouth.riverId = riverOfCell.get(keys[mouth.riverCell]) || null;
      delete mouth.riverCell;
    }
    if (r.parent >= 0) mouth.wadiId = wadiIdOfRaw.get(r.parent);
    return {
      id: wadiIdOfRaw.get(r.rawIndex),
      kind: r.parent < 0 ? 'main' : 'tributary',
      parentId: r.parent >= 0 ? wadiIdOfRaw.get(r.parent) : null,
      cells: r.path.map((c) => keys[c]),
      lengthKm: Math.round(r.lengthKm),
      order: wadiNet.order[r.mouthCell],
      mouth,
      dischargeKm3: Math.round(flux[r.mouthCell] * 1000) / 1000,
      drainageAreaKm2: Math.round(drainArea[r.mouthCell]),
      ...seasonalRegime(r.mouthCell, flux[r.mouthCell])
    };
  });

  const lakeRecords = lakes.map((lake, m) => {
    const id = lakeIds[m];
    const inflowRiverIds = rivers
      .filter((r) => r.mouth.type === 'lake' && r.mouth.lakeId === id)
      .map((r) => r.id);
    const outletKey = lake.outlet >= 0 ? keys[lake.outlet] : null;
    return {
      id,
      cells: lake.cells.map((c) => keys[c]),
      waterLevelM: Math.round(lake.level),
      cellCount: lake.cells.length,
      areaKm2: Math.round(lake.areaKm2),
      depthM: Math.round(lake.depthM),
      freshwater: lake.open,
      outflow: lake.open ? 'open' : 'closed',
      origin: lake.open ? 'overflowing_basin' : 'terminal_basin',
      belowSeaLevel: lake.belowSeaLevel,
      inflowKm3: Math.round(lake.inflowKm3 * 1000) / 1000,
      evaporationKm3: Math.round(lake.evaporationKm3 * 1000) / 1000,
      outflowKm3: Math.round(lake.outflowKm3 * 1000) / 1000,
      outletCell: outletKey,
      outflowRiverId: outletKey ? riverOfCell.get(outletKey) || null : null,
      inflowRiverIds
    };
  });

  for (let i = 0; i < count; i++) {
    const c = cellList[i];
    if (isOcean[i]) {
      c.flow = 0;
      c.river = false;
      c.wadi = false;
      continue;
    }
    c.flow = Math.round(flux[i] * 1000) / 1000;
    c.drainageAreaKm2 = Math.round(drainArea[i]);
    c.downslope = receiver[i] >= 0 ? keys[receiver[i]] : null;
    c.river = Boolean(riverCells[i]);
    c.wadi = Boolean(wadiCells[i]);
    c.endorheic = false;
    if (isLakeCell[i]) {
      const lake = lakeRecords[lakeIdOf[i]];
      c.isLake = true;
      c.isLand = false;
      c.terrain = 'lake';
      c.waterLevelM = lake.waterLevelM;
      c.vegetation = null;
      c.river = false;
      c.wadi = false;
    }
  }
  let conditionedCells = 0;
  for (const dep of depressions) {
    if (!dep.significant) {
      for (const c of dep.cells) {
        cellList[c].elevation = flood.filled[c];
        conditionedCells++;
      }
      continue;
    }
    if (!closedDepressions.has(dep.id)) continue;
    for (const c of dep.cells) cellList[c].endorheic = true;
  }

  return {
    rivers,
    wadis,
    lakes: lakeRecords,
    stats: {
      depressions: depressions.length,
      significantDepressions: depressions.filter((d) => d.significant).length,
      terminalBasins: closedDepressions.size,
      conditionedCells,
      riverCells: riverCells.reduce((s, v) => s + v, 0),
      wadiCells: wadiCells.reduce((s, v) => s + v, 0)
    }
  };
}

module.exports = { DEFAULTS, buildD8Neighbors, priorityFlood, runDrainage, defaultLakeEvaporationMm };
