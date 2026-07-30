'use strict';

const { createRng } = require('../core/seed-rng');
const { haversineKm } = require('../topology/cube-sphere');

const MAGIC_BUDGET = {
  none: { nodes: 0, base: 0, diffusion: 0 },
  low: { nodes: 3, base: 0.04, diffusion: 2 },
  mid: { nodes: 6, base: 0.09, diffusion: 3 },
  high: { nodes: 10, base: 0.16, diffusion: 5 }
};

function shortestPath(start, target, neighborTable) {
  if (start === target) return [start];
  const queue = [start];
  const previous = new Map([[start, null]]);
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const current = queue[cursor];
    for (const neighbor of neighborTable.get(current) || []) {
      if (previous.has(neighbor)) continue;
      previous.set(neighbor, current);
      if (neighbor === target) {
        const path = [target];
        let step = current;
        while (step != null) {
          path.push(step);
          step = previous.get(step);
        }
        return path.reverse();
      }
      queue.push(neighbor);
    }
  }
  return [start, target];
}

function nodeKind(key, cell, featureSets) {
  if (featureSets.lakes.has(key)) return 'lake_spring';
  if (featureSets.mountains.has(key) || ['mountain', 'snow'].includes(cell.terrain)) {
    return 'mountain_well';
  }
  if (cell.plateBoundary) return 'tectonic_nexus';
  if (featureSets.rivers.has(key) || cell.river) return 'river_confluence';
  return 'ambient';
}

function structuralScore(key, cell, featureSets, jitter) {
  let score = jitter * 0.18;
  if (cell.plateBoundary) score += 0.48;
  if (featureSets.mountains.has(key) || ['mountain', 'snow'].includes(cell.terrain)) score += 0.38;
  if (featureSets.lakes.has(key)) score += 0.34;
  if (featureSets.rivers.has(key) || cell.river) score += 0.22;
  score += Math.max(0, Math.min(0.18, (cell.elevation || 0) / 30000));
  return score;
}

function generateMagicGeography(seed, cells, neighborTable, options = {}) {
  const tier = options.magic || 'low';
  const budget = MAGIC_BUDGET[tier] || MAGIC_BUDGET.low;
  for (const cell of cells.values()) {
    cell.magicFlux = 0;
    delete cell.magicNodeId;
    delete cell.leyLineIds;
  }
  if (budget.nodes === 0) return { magicNodes: [], leyLines: [], tier };

  const featureSets = {
    lakes: new Set((options.lakes || []).flatMap((feature) => feature.cells || [])),
    mountains: new Set((options.mountains || []).flatMap((feature) => feature.cells || [])),
    rivers: new Set((options.rivers || []).flatMap((feature) => feature.cells || []))
  };
  const rng = createRng(`${seed}:magic-geography`);
  const candidates = [...cells.entries()]
    .filter(([, cell]) => cell.isLand || cell.isLake)
    .map(([key, cell]) => ({
      key,
      cell,
      kind: nodeKind(key, cell, featureSets),
      score: structuralScore(key, cell, featureSets, rng.next())
    }))
    .sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));

  const targetCount = Math.min(budget.nodes, candidates.length);
  const selected = [];
  for (const candidate of candidates) {
    const separated = selected.every((other) =>
      haversineKm(
        candidate.cell.lat || 0,
        candidate.cell.lon || 0,
        other.cell.lat || 0,
        other.cell.lon || 0
      ) >= 300
    );
    if (separated || candidates.length <= targetCount * 2) selected.push(candidate);
    if (selected.length >= targetCount) break;
  }
  for (const candidate of candidates) {
    if (selected.length >= targetCount) break;
    if (!selected.includes(candidate)) selected.push(candidate);
  }

  const magicNodes = selected.map((candidate, index) => {
    const strength = Math.round(Math.min(1, 0.58 + candidate.score * 0.35) * 1000) / 1000;
    const node = {
      id: `magic-node-${index + 1}`,
      kind: candidate.kind,
      cell: candidate.key,
      lat: candidate.cell.lat,
      lon: candidate.cell.lon,
      strength,
      name: `灵脉节点-${index + 1}`
    };
    candidate.cell.magicNodeId = node.id;
    return node;
  });

  const leyLines = [];
  const connected = [magicNodes[0]];
  for (let i = 1; i < magicNodes.length; i++) {
    const node = magicNodes[i];
    let nearest = connected[0];
    let nearestDistance = Infinity;
    for (const candidate of connected) {
      const distance = haversineKm(node.lat || 0, node.lon || 0, candidate.lat || 0, candidate.lon || 0);
      if (distance < nearestDistance) {
        nearest = candidate;
        nearestDistance = distance;
      }
    }
    const path = shortestPath(nearest.cell, node.cell, neighborTable);
    const line = {
      id: `ley-line-${leyLines.length + 1}`,
      from: nearest.id,
      to: node.id,
      cells: path,
      lengthKm: Math.round(nearestDistance),
      strength: Math.round(((nearest.strength + node.strength) * 0.5) * 1000) / 1000
    };
    leyLines.push(line);
    connected.push(node);
  }

  const flux = new Map();
  for (const [key, cell] of cells) {
    flux.set(key, (cell.isLand || cell.isLake) ? budget.base : 0);
  }
  for (const node of magicNodes) flux.set(node.cell, Math.max(flux.get(node.cell) || 0, node.strength));
  for (const line of leyLines) {
    for (const key of line.cells) {
      flux.set(key, Math.max(flux.get(key) || 0, line.strength * 0.72));
      const cell = cells.get(key);
      if (cell) {
        if (!cell.leyLineIds) cell.leyLineIds = [];
        cell.leyLineIds.push(line.id);
      }
    }
  }

  for (let iteration = 0; iteration < budget.diffusion; iteration++) {
    const next = new Map(flux);
    for (const [key, value] of flux) {
      for (const neighbor of neighborTable.get(key) || []) {
        const neighborCell = cells.get(neighbor);
        if (!neighborCell || (!neighborCell.isLand && !neighborCell.isLake)) continue;
        next.set(neighbor, Math.max(next.get(neighbor) || 0, value * 0.68));
      }
    }
    flux.clear();
    for (const entry of next) flux.set(...entry);
  }
  for (const [key, value] of flux) {
    const cell = cells.get(key);
    if (cell) cell.magicFlux = Math.round(Math.min(1, value) * 1000) / 1000;
  }

  return { magicNodes, leyLines, tier };
}

module.exports = { MAGIC_BUDGET, generateMagicGeography, shortestPath };
