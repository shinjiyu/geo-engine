/**
 * Ocean connectivity — sync with src/generate/ocean-connectivity.js
 */
(function (global) {
  function findOceanComponents(isOcean, neighbors, n) {
    const compId = new Int32Array(n).fill(-1);
    const components = [];

    for (let i = 0; i < n; i++) {
      if (!isOcean[i] || compId[i] >= 0) continue;
      const comp = [];
      const stack = [i];
      compId[i] = components.length;
      while (stack.length) {
        const u = stack.pop();
        comp.push(u);
        for (const v of neighbors[u]) {
          if (isOcean[v] && compId[v] < 0) {
            compId[v] = components.length;
            stack.push(v);
          }
        }
      }
      components.push(comp);
    }
    return components;
  }

  function resolveOceanMask(isLand, neighbors) {
    const n = isLand.length;
    const land = Uint8Array.from(isLand, (v) => (v ? 1 : 0));
    const isOcean = new Array(n);
    for (let i = 0; i < n; i++) isOcean[i] = !land[i];

    const components = findOceanComponents(isOcean, neighbors, n);
    if (components.length === 0) {
      return { isLand: land, mainOceanCells: 0, basinsFilled: 0, oceanComponents: 0 };
    }

    let mainIdx = 0;
    for (let c = 1; c < components.length; c++) {
      if (components[c].length > components[mainIdx].length) mainIdx = c;
    }

    let basinsFilled = 0;
    for (let c = 0; c < components.length; c++) {
      if (c === mainIdx) continue;
      for (let k = 0; k < components[c].length; k++) {
        land[components[c][k]] = 1;
        basinsFilled++;
      }
    }

    return {
      isLand: land,
      mainOceanCells: components[mainIdx].length,
      basinsFilled,
      oceanComponents: components.length
    };
  }

  global.OceanConnectivity = { resolveOceanMask };
})(window);
