'use strict';

const SPECIES_PROFILES = {
  human: {
    label: '人类',
    baseDensity: 8,
    suitable: (cell) => cell.isLand && !cell.isLake && cell.terrain !== 'ice'
  },
  elf: {
    label: '精灵',
    baseDensity: 6,
    suitable: (cell) => cell.isLand && ['forest', 'rainforest'].includes(cell.vegetation)
  },
  dwarf: {
    label: '矮人',
    baseDensity: 5,
    suitable: (cell) => cell.isLand && ['mountain', 'hill', 'snow'].includes(cell.terrain)
  },
  orc: {
    label: '兽人',
    baseDensity: 6,
    suitable: (cell) => cell.isLand && ['shrubland', 'grassland', 'sparseland'].includes(cell.vegetation)
  },
  halfling: {
    label: '半身人',
    baseDensity: 7,
    suitable: (cell) => cell.isLand && ['wetland', 'grassland'].includes(cell.vegetation)
  },
  dragonborn: {
    label: '龙裔',
    baseDensity: 3,
    suitable: (cell) => cell.isLand && (cell.magicFlux || 0) >= 0.35
  },
  freshwater_fishfolk: {
    label: '淡水鱼人',
    baseDensity: 12,
    minFreshwaterLakeAreaKm2: 25000,
    aquatic: true,
    suitable: (cell) => Boolean(cell.isLake)
  }
};

function meanCellAreaKm2(cells, planet) {
  return 4 * Math.PI * planet.radiusKm * planet.radiusKm / Math.max(1, cells.size);
}

function evaluateWorldCarryingCapacity(cells, lakes, planet, neighborTable) {
  const cellAreaKm2 = meanCellAreaKm2(cells, planet);
  const freshwaterLakes = (lakes || [])
    .filter((lake) => lake.freshwater !== false)
    .sort((a, b) => (b.areaKm2 || 0) - (a.areaKm2 || 0));
  const largestFreshwaterLake = freshwaterLakes[0] || null;
  const result = {
    metrics: {
      cellAreaKm2: Math.round(cellAreaKm2),
      landAreaKm2: 0,
      freshwaterLakeAreaKm2: freshwaterLakes.reduce((sum, lake) => sum + (lake.areaKm2 || 0), 0),
      largestFreshwaterLakeAreaKm2: largestFreshwaterLake?.areaKm2 || 0,
      lakeCount: (lakes || []).length
    },
    species: {},
    supportedSpecies: [],
    unsupportedSpecies: []
  };

  for (const cell of cells.values()) {
    if (cell.isLand && !cell.isLake) {
      result.metrics.landAreaKm2 += cellAreaKm2 * (cell.areaWeight || 1);
    }
  }
  result.metrics.landAreaKm2 = Math.round(result.metrics.landAreaKm2);

  for (const [id, profile] of Object.entries(SPECIES_PROFILES)) {
    const reasons = [];
    let anchorFeatureId = null;
    if (profile.minFreshwaterLakeAreaKm2) {
      if (!largestFreshwaterLake
        || (largestFreshwaterLake.areaKm2 || 0) < profile.minFreshwaterLakeAreaKm2) {
        reasons.push(
          `requires freshwater lake >= ${profile.minFreshwaterLakeAreaKm2} km2`
        );
      } else {
        anchorFeatureId = largestFreshwaterLake.id;
      }
    }

    const habitat = new Set();
    if (!profile.aquatic) {
      for (const [key, cell] of cells) {
        if (profile.suitable(cell)) habitat.add(key);
      }
    }
    if (profile.aquatic && anchorFeatureId) {
      const qualifyingLakes = freshwaterLakes.filter(
        (lake) => (lake.areaKm2 || 0) >= profile.minFreshwaterLakeAreaKm2
      );
      for (const lake of qualifyingLakes) {
        for (const key of lake.cells || []) {
          habitat.add(key);
          for (const neighbor of neighborTable?.get(key) || []) {
            const cell = cells.get(neighbor);
            if (cell?.isLand && (cell.vegetation === 'wetland' || cell.terrain === 'coast')) {
              habitat.add(neighbor);
            }
          }
        }
      }
    }
    if (habitat.size === 0 && !profile.aquatic) {
      for (const [key, cell] of cells) {
        if (cell.isLand && !cell.isLake && cell.terrain !== 'ice') habitat.add(key);
      }
    }
    if (habitat.size === 0) reasons.push('no suitable habitat cells');

    const capacity = reasons.length
      ? 0
      : Math.round([...habitat].reduce((sum, key) => {
        const cell = cells.get(key);
        return sum + cellAreaKm2 * (cell?.areaWeight || 1) * profile.baseDensity;
      }, 0));
    const assessment = {
      speciesId: id,
      label: profile.label,
      supported: reasons.length === 0,
      reasons,
      capacity,
      habitatCellCount: habitat.size,
      habitatCells: [...habitat],
      anchorFeatureId
    };
    result.species[id] = assessment;
    (assessment.supported ? result.supportedSpecies : result.unsupportedSpecies).push(id);
  }

  return result;
}

function filterSupportedSpecies(species, carryingCapacity) {
  const supported = [];
  const unsupported = [];
  for (const id of species || []) {
    if (carryingCapacity.species[id]?.supported) supported.push(id);
    else unsupported.push(id);
  }
  return { supported, unsupported };
}

function summarizeCarryingCapacity(carryingCapacity) {
  return {
    metrics: carryingCapacity.metrics,
    supportedSpecies: carryingCapacity.supportedSpecies,
    unsupportedSpecies: carryingCapacity.unsupportedSpecies,
    species: Object.fromEntries(Object.entries(carryingCapacity.species).map(([id, assessment]) => [
      id,
      {
        speciesId: assessment.speciesId,
        label: assessment.label,
        supported: assessment.supported,
        reasons: assessment.reasons,
        capacity: assessment.capacity,
        habitatCellCount: assessment.habitatCellCount,
        anchorFeatureId: assessment.anchorFeatureId
      }
    ]))
  };
}

module.exports = {
  SPECIES_PROFILES,
  evaluateWorldCarryingCapacity,
  filterSupportedSpecies,
  summarizeCarryingCapacity
};
