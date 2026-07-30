'use strict';

const { RACE_LABELS } = require('../generate/realms');

const VEG_GEO = {
  desert: 'desert',
  sparseland: 'desert',
  grassland: 'plains',
  shrubland: 'plains',
  forest: 'forest',
  rainforest: 'forest',
  tundra: 'mountain',
  wetland: 'coastal'
};

function deriveGeographyLabel(world) {
  const meta = world.meta || {};
  const veg = world.vegetationSummary || {};
  const total = Object.values(veg).reduce((a, b) => a + b, 0) || 1;
  const ocean = meta.oceanPercent ?? 50;
  const islands = meta.islandCount ?? 0;
  const lakes = meta.lakeCount ?? 0;
  const mountains = meta.mountainRangeCount ?? 0;

  const ranked = Object.entries(veg).sort((a, b) => b[1] - a[1]);
  const [topName, topCount] = ranked[0] || ['grassland', 0];
  const topPct = topCount / total;

  if (ocean >= 58 && islands >= 2) return 'archipelago';
  if (topName === 'desert' && topPct >= 0.22) return 'desert';
  if ((topName === 'forest' || topName === 'rainforest') && topPct >= 0.2) return 'forest';
  if (mountains >= 4 || topName === 'tundra') return 'mountain';
  if (ocean >= 42 || lakes >= 8) return 'coastal';
  if (topName === 'grassland' || topName === 'shrubland') return 'plains';
  if (VEG_GEO[topName]) return VEG_GEO[topName];
  return 'mixed';
}

function buildGeographyDescription(world, label) {
  const meta = world.meta || {};
  const veg = world.vegetationSummary || {};
  const vegLine = Object.entries(veg)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([k, v]) => `${k}${v}格`)
    .join('、');

  const parts = [
    `海陆比约 ${meta.oceanPercent ?? '?'}% 海洋`,
    `干流 ${meta.mainRiverCount ?? 0} / 支流 ${meta.tributaryCount ?? 0}`,
    `湖泊 ${meta.lakeCount ?? 0} · 岛屿 ${meta.islandCount ?? 0}`,
    `山脉 ${meta.mountainRangeCount ?? 0}`,
    `魔法节点 ${meta.magicNodeCount ?? 0} · 灵脉 ${meta.leyLineCount ?? 0}`
  ];
  if (vegLine) parts.push(`植被 ${vegLine}`);
  parts.push(`地形画像：${label}`);
  return parts.join('；');
}

function deriveWorldProfile(world) {
  const label = deriveGeographyLabel(world);
  const races = (world.realms || []).map((r) => r.race);
  return {
    geographyLabel: label,
    geographyDescription: buildGeographyDescription(world, label),
    vegetationSummary: world.vegetationSummary || {},
    races,
    raceLabels: races.map((r) => RACE_LABELS[r] || r),
    speciesSelection: world.speciesSelection || null,
    carryingCapacity: world.carryingCapacity || null,
    realms: (world.realms || []).map((r) => ({
      id: r.id,
      name: r.name,
      race: r.race,
      population: r.population,
      populationCap: r.populationCap,
      anchorFeatureId: r.anchorFeatureId,
      center: r.center
    }))
  };
}

module.exports = {
  deriveGeographyLabel,
  deriveWorldProfile
};
