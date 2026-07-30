/**
 * Icosphere mesh — filled faces + optional wireframe, climate colors, overlays.
 */
(function (global) {
  const DISP_SCALE = 0.035;
  /** Max vertex radius after displacement — must match shader uMaxRadius */
  const MAX_VERTEX_RADIUS = 1 + DISP_SCALE + 0.02;
  const PROJ_BASE = 0.50;
  const ZOOM_MIN = 0.55;
  const ZOOM_MAX = 1.45;
  const ZOOM_DEFAULT = 1.0;

  const VS = `
attribute vec3 aPos;
attribute vec3 aColor;
uniform mat3 uRot;
uniform float uRadius;
uniform float uMaxRadius;
varying vec3 vColor;
varying vec3 vLitNormal;
void main() {
  vec3 p = uRot * aPos;
  vec3 n = normalize(aPos);
  vLitNormal = normalize(uRot * n);
  vColor = aColor;
  float depth = clamp(-p.z / uMaxRadius, -1.0, 1.0);
  gl_Position = vec4(p.xy * uRadius, depth, 1.0);
}
`;

  const FS = `
precision mediump float;
varying vec3 vColor;
varying vec3 vLitNormal;
void main() {
  vec3 lightDir = normalize(vec3(0.15, 0.55, 0.82));
  float diff = max(dot(vLitNormal, lightDir), 0.0);
  float shade = 0.52 + diff * 0.48;
  gl_FragColor = vec4(vColor * shade, 1.0);
}
`;

  function compileShader(gl, type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(sh) || 'shader compile failed');
    }
    return sh;
  }

  function linkProgram(gl, vs, fs) {
    const p = gl.createProgram();
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(p) || 'program link failed');
    }
    return p;
  }

  function rotatePoint(x, y, z, rx, ry) {
    const cy = Math.cos(ry); const sy = Math.sin(ry);
    const cx = Math.cos(rx); const sx = Math.sin(rx);
    const x1 = x * cy + z * sy;
    const y1 = y;
    const z1 = -x * sy + z * cy;
    return { x: x1, y: y1 * cx - z1 * sx, z: y1 * sx + z1 * cx };
  }

  function rotMat3(rx, ry) {
    const c0 = rotatePoint(1, 0, 0, rx, ry);
    const c1 = rotatePoint(0, 1, 0, rx, ry);
    const c2 = rotatePoint(0, 0, 1, rx, ry);
    return new Float32Array([
      c0.x, c0.y, c0.z, c1.x, c1.y, c1.z, c2.x, c2.y, c2.z
    ]);
  }

  function buildFaceIndices(faces) {
    const idx = new Uint16Array(faces.length * 3);
    for (let i = 0; i < faces.length; i++) {
      idx[i * 3] = faces[i][0];
      idx[i * 3 + 1] = faces[i][1];
      idx[i * 3 + 2] = faces[i][2];
    }
    return idx;
  }

  function buildWireIndices(faces) {
    const seen = new Set();
    const lines = [];
    for (const [a, b, c] of faces) {
      for (const [i, j] of [[a, b], [b, c], [c, a]]) {
        const key = i < j ? `${i},${j}` : `${j},${i}`;
        if (seen.has(key)) continue;
        seen.add(key);
        lines.push(i, j);
      }
    }
    return new Uint16Array(lines);
  }

  function buildNeighborGraph(faces, vertCount) {
    const sets = Array.from({ length: vertCount }, () => new Set());
    for (const [a, b, c] of faces) {
      sets[a].add(b); sets[a].add(c);
      sets[b].add(a); sets[b].add(c);
      sets[c].add(a); sets[c].add(b);
    }
    return sets.map((s) => [...s]);
  }

  function smoothHeights(heights, neighbors, iterations) {
    let h = Float64Array.from(heights);
    for (let it = 0; it < iterations; it++) {
      const next = new Float64Array(h.length);
      for (let i = 0; i < h.length; i++) {
        const nb = neighbors[i];
        if (!nb.length) { next[i] = h[i]; continue; }
        let sum = 0;
        for (const j of nb) sum += h[j];
        next[i] = h[i] * 0.55 + (sum / nb.length) * 0.45;
      }
      h = next;
    }
    return h;
  }

  function buildMesh(subdivisions) {
    const ico = global.IcoSphere.createIcosphere(subdivisions);
    const base = [];
    for (const v of ico.vertices) base.push(v[0], v[1], v[2]);
    const n = ico.vertices.length;
    return {
      subdivisions,
      vertexCount: n,
      faceCount: ico.faces.length,
      base: new Float32Array(base),
      positions: new Float32Array(base),
      colors: new Float32Array(n * 3),
      heights: new Float64Array(n),
      neighbors: buildNeighborGraph(ico.faces, n),
      faceIndices: buildFaceIndices(ico.faces),
      wireIndices: buildWireIndices(ico.faces)
    };
  }

  function displaceMesh(mesh, heights, minE, maxE) {
    const span = maxE - minE || 1;
    const n = mesh.vertexCount;
    for (let i = 0; i < n; i++) {
      mesh.heights[i] = heights[i];
      const t = (heights[i] - minE) / span;
      const s = 1 + t * DISP_SCALE;
      mesh.positions[i * 3] = mesh.base[i * 3] * s;
      mesh.positions[i * 3 + 1] = mesh.base[i * 3 + 1] * s;
      mesh.positions[i * 3 + 2] = mesh.base[i * 3 + 2] * s;
    }
  }

  function sampleHeights(mesh, seed) {
    const sample = global.TerrainSampler.createElevationField(seed);
    const n = mesh.vertexCount;
    const raw = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      raw[i] = sample(mesh.base[i * 3], mesh.base[i * 3 + 1], mesh.base[i * 3 + 2]);
    }
    return smoothHeights(raw, mesh.neighbors, 3);
  }

  function buildGraticule(planet) {
    const PP = global.PlanetParams;
    const lines = [
      { lat: 0, color: PP.GRATICULE_COLORS.equator },
      { lat: planet.tropicLat, color: PP.GRATICULE_COLORS.tropic },
      { lat: -planet.tropicLat, color: PP.GRATICULE_COLORS.tropic },
      { lat: planet.polarCircleLat, color: PP.GRATICULE_COLORS.polar },
      { lat: -planet.polarCircleLat, color: PP.GRATICULE_COLORS.polar }
    ];
    const pos = [];
    const col = [];
    for (const line of lines) {
      const pts = PP.buildLatCircle(line.lat, 128, 1.018);
      for (let i = 0; i < pts.length - 3; i += 3) {
        pos.push(pts[i], pts[i + 1], pts[i + 2], pts[i + 3], pts[i + 4], pts[i + 5]);
        col.push(
          line.color[0], line.color[1], line.color[2],
          line.color[0], line.color[1], line.color[2]
        );
      }
    }
    const rotPts = PP.buildRotationArrow(planet, 1.022);
    const rc = PP.GRATICULE_COLORS.rotation;
    for (let i = 0; i < rotPts.length - 3; i += 3) {
      pos.push(rotPts[i], rotPts[i + 1], rotPts[i + 2], rotPts[i + 3], rotPts[i + 4], rotPts[i + 5]);
      col.push(rc[0], rc[1], rc[2], rc[0], rc[1], rc[2]);
    }
    return {
      positions: new Float32Array(pos),
      colors: new Float32Array(col),
      vertexCount: pos.length / 3
    };
  }

  function liftOnSphere(x, y, z, lift) {
    const len = Math.hypot(x, y, z) || 1;
    const s = (len + lift) / len;
    return [x * s, y * s, z * s];
  }

  function buildRiverGeometry(mesh, riverEdgeIndices, flow, maxFlow, riverEdgeKinds, isLand, isLake) {
    const pos = [];
    const colors = [];
    const widthBase = 0.004;
    const widthScale = 0.016;
    const lift = 0.012;
    const peak = Math.max(1, maxFlow || 1);

    for (let e = 0, ei = 0; e < riverEdgeIndices.length; e += 2, ei++) {
      const isTrib = riverEdgeKinds && riverEdgeKinds[ei];
      const a = riverEdgeIndices[e];
      const b = riverEdgeIndices[e + 1];
      if (isLand && (!isLand[a] || !isLand[b])) continue;
      if (isLake && (isLake[a] || isLake[b])) continue;
      const ax = mesh.positions[a * 3];
      const ay = mesh.positions[a * 3 + 1];
      const az = mesh.positions[a * 3 + 2];
      const bx = mesh.positions[b * 3];
      const by = mesh.positions[b * 3 + 1];
      const bz = mesh.positions[b * 3 + 2];
      const [pax, pay, paz] = liftOnSphere(ax, ay, az, lift);
      const [pbx, pby, pbz] = liftOnSphere(bx, by, bz, lift);
      const mx = (pax + pbx) * 0.5;
      const my = (pay + pby) * 0.5;
      const mz = (paz + pbz) * 0.5;
      const mlen = Math.hypot(mx, my, mz) || 1;
      const nx = mx / mlen;
      const ny = my / mlen;
      const nz = mz / mlen;
      let tx = pbx - pax;
      let ty = pby - pay;
      let tz = pbz - paz;
      let tlen = Math.hypot(tx, ty, tz);
      if (tlen < 1e-8) continue;
      tx /= tlen; ty /= tlen; tz /= tlen;
      const edgeFlow = flow ? Math.max(flow[a] || 0, flow[b] || 0) : peak * 0.5;
      const t = Math.min(1, edgeFlow / peak);
      const width = (widthBase + widthScale * t) * (isTrib ? 0.55 : 1);
      let rx = ny * tz - nz * ty;
      let ry = nz * tx - nx * tz;
      let rz = nx * ty - ny * tx;
      const rlen = Math.hypot(rx, ry, rz) || 1;
      rx = (rx / rlen) * width;
      ry = (ry / rlen) * width;
      rz = (rz / rlen) * width;

      const rgb = isTrib
        ? [0.12 + t * 0.06, 0.38 + t * 0.28, 0.62 + t * 0.18]
        : [0.04 + t * 0.08, 0.28 + t * 0.45, 0.72 + t * 0.24];

      const v0 = [pax + rx, pay + ry, paz + rz];
      const v1 = [pax - rx, pay - ry, paz - rz];
      const v2 = [pbx + rx, pby + ry, pbz + rz];
      const v3 = [pbx - rx, pby - ry, pbz - rz];
      for (const v of [v0, v1, v2, v0, v2, v3]) {
        pos.push(v[0], v[1], v[2]);
        colors.push(rgb[0], rgb[1], rgb[2]);
      }
    }
    return {
      positions: new Float32Array(pos),
      colors: new Float32Array(colors),
      vertexCount: pos.length / 3,
      edgeCount: pos.length / 18
    };
  }

  function runGeneration(mesh, seed, planetInput) {
    const planet = global.PlanetParams.normalizePlanet(planetInput);
    const heights = sampleHeights(mesh, seed);
    let minE = Infinity;
    let maxE = -Infinity;
    for (let i = 0; i < heights.length; i++) {
      minE = Math.min(minE, heights[i]);
      maxE = Math.max(maxE, heights[i]);
    }
    displaceMesh(mesh, heights, minE, maxE);
    const sim = global.ClimateSim.runMeshSimulation(mesh, heights, planet, seed);
    mesh.colors.set(sim.colors);
    const graticule = buildGraticule(planet);
    const rivers = buildRiverGeometry(
      mesh,
      sim.hydrology.riverEdgeIndices,
      sim.hydrology.flow,
      sim.hydrology.maxLandFlow,
      sim.hydrology.riverEdgeKinds,
      sim.isLand,
      sim.surfaceFeatures?.isLake
    );
    return {
      seed,
      planet,
      minElevation: minE,
      maxElevation: maxE,
      landFraction: (() => {
        let land = 0;
        for (let i = 0; i < mesh.vertexCount; i++) {
          if (sim.isLand[i] && !(sim.surfaceFeatures?.isLake?.[i])) land++;
        }
        return land / mesh.vertexCount;
      })(),
      riverCount: sim.hydrology.riverCount,
      mainRiverCount: sim.hydrology.mainRiverCount,
      tributaryCount: sim.hydrology.tributaryCount,
      riverEdges: sim.hydrology.riverEdgeCount,
      riverMinFlow: sim.hydrology.minFlowThreshold,
      longestRiver: sim.hydrology.longestRiverSegments,
      basinsFilled: sim.ocean ? sim.ocean.basinsFilled : 0,
      lakeCount: sim.surfaceFeatures?.lakeCount ?? 0,
      islandCount: sim.surfaceFeatures?.islandCount ?? 0,
      vegetationCounts: sim.surfaceFeatures?.vegetationCounts ?? {},
      graticule,
      rivers
    };
  }

  function createMeshViewer(canvas, subdivisions) {
    subdivisions = subdivisions ?? 5;
    const gl = canvas.getContext('webgl', { alpha: false, antialias: true });
    if (!gl) throw new Error('WebGL not available');

    const mesh = buildMesh(subdivisions);
    const prog = linkProgram(
      gl,
      compileShader(gl, gl.VERTEX_SHADER, VS),
      compileShader(gl, gl.FRAGMENT_SHADER, FS)
    );

    const posBuf = gl.createBuffer();
    const colBuf = gl.createBuffer();
    const faceBuf = gl.createBuffer();
    const wireBuf = gl.createBuffer();
    const graticulePosBuf = gl.createBuffer();
    const graticuleColBuf = gl.createBuffer();
    const riverPosBuf = gl.createBuffer();
    const riverColBuf = gl.createBuffer();

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, faceBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.faceIndices, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, wireBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.wireIndices, gl.STATIC_DRAW);

    let rotX = 0;
    let rotY = 0;
    let zoom = ZOOM_DEFAULT;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let raf = 0;
    let genStats = null;
    const uRotLoc = gl.getUniformLocation(prog, 'uRot');
    const uRadiusLoc = gl.getUniformLocation(prog, 'uRadius');
    const uMaxRadiusLoc = gl.getUniformLocation(prog, 'uMaxRadius');
    let showGraticule = true;
    let showRivers = true;
    let showWireframe = false;

    function uploadMesh() {
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
      gl.bufferData(gl.ARRAY_BUFFER, mesh.positions, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, colBuf);
      gl.bufferData(gl.ARRAY_BUFFER, mesh.colors, gl.STATIC_DRAW);
    }

    function uploadOverlay(graticule, rivers) {
      if (graticule && graticule.vertexCount) {
        gl.bindBuffer(gl.ARRAY_BUFFER, graticulePosBuf);
        gl.bufferData(gl.ARRAY_BUFFER, graticule.positions, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, graticuleColBuf);
        gl.bufferData(gl.ARRAY_BUFFER, graticule.colors, gl.STATIC_DRAW);
      }
      if (rivers && rivers.vertexCount) {
        gl.bindBuffer(gl.ARRAY_BUFFER, riverPosBuf);
        gl.bufferData(gl.ARRAY_BUFFER, rivers.positions, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, riverColBuf);
        gl.bufferData(gl.ARRAY_BUFFER, rivers.colors, gl.STATIC_DRAW);
      }
    }

    function bindAttribs(posBuffer, colBuffer) {
      const aPos = gl.getAttribLocation(prog, 'aPos');
      const aColor = gl.getAttribLocation(prog, 'aColor');
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, colBuffer);
      gl.enableVertexAttribArray(aColor);
      gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, 0, 0);
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.parentElement.getBoundingClientRect();
      const cssSide = Math.max(1, Math.min(rect.width, rect.height));
      const side = Math.max(1, Math.round(cssSide * dpr));
      canvas.width = side;
      canvas.height = side;
      canvas.style.width = cssSide + 'px';
      canvas.style.height = cssSide + 'px';
      gl.viewport(0, 0, side, side);
    }

    function render() {
      resize();
      gl.clearColor(0.04, 0.06, 0.09, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);

      gl.useProgram(prog);
      gl.uniformMatrix3fv(uRotLoc, false, rotMat3(rotX, rotY));
      gl.uniform1f(uRadiusLoc, PROJ_BASE * zoom);
      gl.uniform1f(uMaxRadiusLoc, MAX_VERTEX_RADIUS);

      bindAttribs(posBuf, colBuf);

      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.BACK);
      gl.frontFace(gl.CCW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, faceBuf);
      gl.drawElements(gl.TRIANGLES, mesh.faceIndices.length, gl.UNSIGNED_SHORT, 0);
      gl.disable(gl.CULL_FACE);

      if (showWireframe) {
        gl.enable(gl.POLYGON_OFFSET_FILL);
        gl.polygonOffset(-1, -1);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, wireBuf);
        gl.drawElements(gl.LINES, mesh.wireIndices.length, gl.UNSIGNED_SHORT, 0);
        gl.disable(gl.POLYGON_OFFSET_FILL);
      }

      if (showRivers && genStats && genStats.rivers.vertexCount > 0) {
        bindAttribs(riverPosBuf, riverColBuf);
        gl.enable(gl.POLYGON_OFFSET_FILL);
        gl.polygonOffset(-2, -2);
        gl.drawArrays(gl.TRIANGLES, 0, genStats.rivers.vertexCount);
        gl.disable(gl.POLYGON_OFFSET_FILL);
      }

      if (showGraticule && genStats && genStats.graticule.vertexCount > 0) {
        bindAttribs(graticulePosBuf, graticuleColBuf);
        gl.drawArrays(gl.LINES, 0, genStats.graticule.vertexCount);
      }
    }

    new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(render);
    }).observe(canvas.parentElement);

    canvas.addEventListener('mousedown', (ev) => {
      dragging = true;
      lastX = ev.clientX;
      lastY = ev.clientY;
      canvas.style.cursor = 'grabbing';
    });
    window.addEventListener('mouseup', () => {
      dragging = false;
      canvas.style.cursor = 'grab';
    });
    canvas.addEventListener('mousemove', (ev) => {
      if (!dragging) return;
      rotY += (ev.clientX - lastX) * 0.008;
      rotX += (ev.clientY - lastY) * 0.008;
      rotX = Math.max(-1.2, Math.min(1.2, rotX));
      lastX = ev.clientX;
      lastY = ev.clientY;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(render);
    });
    canvas.addEventListener('wheel', (ev) => {
      ev.preventDefault();
      zoom *= ev.deltaY > 0 ? 0.94 : 1.06;
      zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom));
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(render);
    }, { passive: false });

    function loadMeshGeometry(newMesh) {
      Object.assign(mesh, newMesh);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, faceBuf);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.faceIndices, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, wireBuf);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.wireIndices, gl.STATIC_DRAW);
      uploadMesh();
    }

    function generate(seed, planetInput) {
      genStats = runGeneration(mesh, seed, planetInput);
      uploadMesh();
      uploadOverlay(genStats.graticule, genStats.rivers);
      render();
      return genStats;
    }

    function rebuildMesh(subdivisions, seed, planetInput) {
      loadMeshGeometry(buildMesh(subdivisions));
      if (seed != null && planetInput) {
        return generate(seed, planetInput);
      }
      render();
      return {
        subdivisions: mesh.subdivisions,
        vertices: mesh.vertexCount,
        faces: mesh.faceCount
      };
    }

    function setDisplayOptions(opts) {
      if (opts.showGraticule !== undefined) showGraticule = !!opts.showGraticule;
      if (opts.showRivers !== undefined) showRivers = !!opts.showRivers;
      if (opts.showWireframe !== undefined) showWireframe = !!opts.showWireframe;
      render();
    }

    uploadMesh();
    render();

    return {
      stats: () => ({
        subdivisions: mesh.subdivisions,
        vertices: mesh.vertexCount,
        faces: mesh.faceCount
      }),
      generate,
      rebuildMesh,
      setDisplayOptions,
      setZoom(value) {
        zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, value));
        render();
        return zoom;
      },
      getZoom: () => zoom,
      getStats: () => genStats,
      render
    };
  }

  global.MeshViewer = { createMeshViewer, buildRiverGeometry };
})(window);
