/**
 * Post-river surface features: lakes, landmasses (islands), vegetation.
 */
(function (global) {
  const VEG = {
    DESERT: 'desert',
    GRASSLAND: 'grassland',
    SHRUBLAND: 'shrubland',
    FOREST: 'forest',
    RAINFOREST: 'rainforest',
    TUNDRA: 'tundra',
    WETLAND: 'wetland',
    SPARSE: 'sparseland'
  };

  const VEG_COLORS = {
    desert: [0.78, 0.68, 0.42],
    grassland: [0.42, 0.68, 0.34],
    shrubland: [0.55, 0.62, 0.36],
    forest: [0.16, 0.46, 0.22],
    rainforest: [0.08, 0.38, 0.16],
    tundra: [0.58, 0.64, 0.52],
    wetland: [0.24, 0.48, 0.38],
    sparseland: [0.68, 0.66, 0.58]
  };

  const LAKE_COLOR = [0.14, 0.36, 0.68];

  function mixRgb(a, b, t) {
    return [
      a[0] * (1 - t) + b[0] * t,
      a[1] * (1 - t) + b[1] * t,
      a[2] * (1 - t) + b[2] * t
    ];
  }

  function strictLandDownslope(heights, isLand, neighbors, n) {
    const downslope = new Int32Array(n).fill(-1);
    for (let i = 0; i < n; i++) {
      if (!isLand[i]) continue;
      let best = -1;
      let bestElev = heights[i];
      for (const j of neighbors[i]) {
        if (!isLand[j] || heights[j] >= bestElev) continue;
        bestElev = heights[j];
        best = j;
      }
      downslope[i] = best;
    }
    return downslope;
  }

  function buildUpslope(downslope, n) {
    const upslope = Array.from({ length: n }, () => []);
    for (let i = 0; i < n; i++) {
      const d = downslope[i];
      if (d >= 0) upslope[d].push(i);
    }
    return upslope;
  }

  function collectUpslopeBasin(sink, upslope, isLand) {
    const basin = [sink];
    const seen = new Set([sink]);
    const stack = [sink];
    while (stack.length) {
      const cur = stack.pop();
      for (const j of upslope[cur]) {
        if (!isLand[j] || seen.has(j)) continue;
        seen.add(j);
        basin.push(j);
        stack.push(j);
      }
    }
    return basin;
  }

  function basinTouchesOcean(basin, isLand, neighbors) {
    const inBasin = new Set(basin);
    for (const i of basin) {
      for (const j of neighbors[i]) {
        if (!isLand[j] && !inBasin.has(j)) return true;
      }
    }
    return false;
  }

  function computeSpillLevel(basin, heights, isLand, neighbors) {
    const inBasin = new Set(basin);
    let spill = Infinity;
    for (const i of basin) {
      for (const j of neighbors[i]) {
        if (inBasin.has(j)) continue;
        if (isLand[j]) spill = Math.min(spill, heights[j]);
      }
    }
    if (spill === Infinity) {
      spill = Math.max(...basin.map((i) => heights[i])) + 30;
    }
    return spill - 0.5;
  }

  function detectLakes(mesh, heights, isLand, planet) {
    const n = mesh.vertexCount;
    const neighbors = mesh.neighbors;
    const strictDown = strictLandDownslope(heights, isLand, neighbors, n);
    const upslope = buildUpslope(strictDown, n);
    const isLake = new Uint8Array(n);
    const lakes = [];
    const claimed = new Set();
    const minBasin = n > 20000 ? 6 : 4;

    for (let sink = 0; sink < n; sink++) {
      if (!isLand[sink] || strictDown[sink] >= 0 || claimed.has(sink)) continue;

      const basin = collectUpslopeBasin(sink, upslope, isLand);
      if (basin.length < minBasin) continue;
      if (basinTouchesOcean(basin, isLand, neighbors)) continue;

      const spill = computeSpillLevel(basin, heights, isLand, neighbors);
      const sinkElev = heights[sink];
      if (spill <= sinkElev + 0.01) continue;
      if (sinkElev > planet.seaLevelM + 2800) continue;

      const cells = [];
      for (const i of basin) {
        if (heights[i] <= spill) {
          isLake[i] = 1;
          cells.push(i);
          claimed.add(i);
        }
      }
      if (cells.length < minBasin) {
        for (const i of cells) isLake[i] = 0;
        continue;
      }

      lakes.push({
        id: `lake-${lakes.length + 1}`,
        sink,
        waterLevelM: Math.round(spill),
        cellCount: cells.length,
        minElevationM: Math.round(Math.min(...cells.map((i) => heights[i])))
      });
    }

    return { isLake, lakes };
  }

  function labelLandmasses(isLand, isLake, neighbors, n) {
    const landmassId = new Int32Array(n).fill(-1);
    const landmasses = [];

    for (let i = 0; i < n; i++) {
      if (!isLand[i] || isLake[i] || landmassId[i] >= 0) continue;

      const queue = [i];
      landmassId[i] = landmasses.length;
      let count = 0;
      let touchesOcean = false;

      while (queue.length) {
        const cur = queue.pop();
        count++;
        for (const j of neighbors[cur]) {
          if (!isLand[j] || isLake[j]) {
            if (!isLand[j] && !isLake[j]) touchesOcean = true;
            continue;
          }
          if (landmassId[j] >= 0) continue;
          landmassId[j] = landmassId[i];
          queue.push(j);
        }
      }

      landmasses.push({
        id: landmassId[i],
        cellCount: count,
        touchesOcean,
        isMainland: false,
        isIsland: false
      });
    }

    const oceanLinked = landmasses
      .filter((m) => m.touchesOcean)
      .sort((a, b) => b.cellCount - a.cellCount);

    if (oceanLinked.length) {
      oceanLinked[0].isMainland = true;
      for (let k = 1; k < oceanLinked.length; k++) {
        oceanLinked[k].isIsland = true;
      }
    }

    const islands = landmasses.filter((m) => m.isIsland);
    return { landmassId, landmasses, islands };
  }

  function nearLakeOrRiver(i, isLake, flow, minFlow, neighbors) {
    if (flow[i] >= minFlow * 0.25) return true;
    for (const j of neighbors[i]) {
      if (isLake[j]) return true;
    }
    return false;
  }

  function assignVegetationType(i, ctx) {
    const { climate, soilMoisture, flow, minFlow, elev, planet, geography, isLake, neighbors } = ctx;
    if (isLake[i]) return null;

    const c = climate;
    const moist = Math.min(1.2, soilMoisture / 180);
    const riverWet = nearLakeOrRiver(i, isLake, flow, minFlow, neighbors) && elev < planet.seaLevelM + 500;

    if (c.zone === 'snow') return VEG.SPARSE;
    if (c.zone === 'polar') return VEG.TUNDRA;
    if (c.zone === 'cold') return moist > 0.45 ? VEG.TUNDRA : VEG.SPARSE;
    if (riverWet && moist > 0.35) return VEG.WETLAND;

    if (c.zone === 'arid' || c.aridScore > 0.58) {
      if (geography === 'forest' && moist > 0.28) return VEG.SHRUBLAND;
      return VEG.DESERT;
    }

    if (c.zone === 'tropical') {
      if (moist > 0.7) return VEG.RAINFOREST;
      if (moist > 0.42) return geography === 'desert' ? VEG.GRASSLAND : VEG.FOREST;
      return VEG.GRASSLAND;
    }

    if (c.zone === 'subtropical') {
      if (moist > 0.55) return geography === 'desert' ? VEG.SHRUBLAND : VEG.FOREST;
      return moist > 0.3 ? VEG.GRASSLAND : VEG.SHRUBLAND;
    }

    if (c.zone === 'temperate') {
      if (moist > 0.58) return VEG.FOREST;
      if (moist > 0.34) return VEG.GRASSLAND;
      return geography === 'forest' ? VEG.SHRUBLAND : VEG.GRASSLAND;
    }

    return VEG.GRASSLAND;
  }

  function assignVegetation(mesh, isLand, isLake, climates, hydrology, waterCycle, planet, geography, heights) {
    const n = mesh.vertexCount;
    const vegetation = new Array(n);
    const minFlow = hydrology.minFlowThreshold || 1.5;
    const flow = hydrology.flow;
    const soil = waterCycle.soilMoisture;

    for (let i = 0; i < n; i++) {
      if (!isLand[i] || isLake[i]) {
        vegetation[i] = null;
        continue;
      }
      vegetation[i] = assignVegetationType(i, {
        climate: climates[i],
        soilMoisture: soil[i],
        flow,
        minFlow,
        elev: heights[i],
        planet,
        geography: geography || 'mixed',
        isLake,
        neighbors: mesh.neighbors
      });
    }

    const counts = {};
    for (const v of vegetation) {
      if (!v) continue;
      counts[v] = (counts[v] || 0) + 1;
    }

    return { vegetation, counts };
  }

  function applySurfaceColors(colors, n, baseLandColors, isLand, isLake, vegetation, mixStrength) {
    mixStrength = mixStrength ?? 0.62;
    for (let i = 0; i < n; i++) {
      if (isLake[i]) {
        colors[i * 3] = LAKE_COLOR[0];
        colors[i * 3 + 1] = LAKE_COLOR[1];
        colors[i * 3 + 2] = LAKE_COLOR[2];
        continue;
      }
      if (!isLand[i]) continue;
      const veg = vegetation[i];
      if (!veg || !VEG_COLORS[veg]) continue;
      const base = [
        baseLandColors[i * 3],
        baseLandColors[i * 3 + 1],
        baseLandColors[i * 3 + 2]
      ];
      const rgb = mixRgb(base, VEG_COLORS[veg], mixStrength);
      colors[i * 3] = rgb[0];
      colors[i * 3 + 1] = rgb[1];
      colors[i * 3 + 2] = rgb[2];
    }
  }

  function runOnMesh(mesh, heights, isLand, climates, hydrology, waterCycle, planet, options) {
    const n = mesh.vertexCount;
    const geography = options?.geography || 'mixed';

    const { isLake, lakes } = detectLakes(mesh, heights, isLand, planet);
    const { landmassId, landmasses, islands } = labelLandmasses(isLand, isLake, mesh.neighbors, n);
    const veg = assignVegetation(mesh, isLand, isLake, climates, hydrology, waterCycle, planet, geography, heights);

    return {
      isLake,
      lakes,
      landmassId,
      landmasses,
      islands,
      vegetation: veg.vegetation,
      vegetationCounts: veg.counts,
      lakeCount: lakes.length,
      islandCount: islands.length,
      landmassCount: landmasses.length
    };
  }

  global.SurfaceFeatures = {
    VEG,
    VEG_COLORS,
    LAKE_COLOR,
    runOnMesh,
    applySurfaceColors,
    detectLakes,
    labelLandmasses,
    assignVegetation
  };
})(window);
