/**
 * WebGL globe — icosphere mesh, fragment samples world-space equirect texture.
 * Vertex positions interpolate on the sphere; color is NOT interpolated from vertex RGB.
 */
(function (global) {
  const VS = `
attribute vec3 aPos;
uniform mat3 uRot;
uniform float uAspect;
uniform float uRadius;
varying vec3 vWorld;
varying vec3 vViewN;
void main() {
  vWorld = aPos;
  vec3 p = uRot * aPos;
  vViewN = p;
  vec2 ndc = uAspect >= 1.0
    ? vec2(p.x / uAspect, p.y) * uRadius
    : vec2(p.x, p.y * uAspect) * uRadius;
  gl_Position = vec4(ndc, -p.z, 1.0);
}
`;

  const FS = `
precision mediump float;
varying vec3 vWorld;
varying vec3 vViewN;
uniform sampler2D uTex;
uniform vec3 uLight;
uniform vec3 uMarker;
uniform float uHasMarker;
void main() {
  vec3 w = normalize(vWorld);
  float lat = asin(clamp(w.y, -1.0, 1.0));
  float lon = atan(w.x, w.z);
  float u = (lon + 3.14159265) / (2.0 * 3.14159265);
  float vTex = 0.5 - lat / 3.14159265;
  vec3 c = texture2D(uTex, vec2(u, vTex)).rgb;
  float markerHit = step(0.99935, dot(w, normalize(uMarker))) * uHasMarker;
  c = mix(c, vec3(1.0, 0.22, 0.16), markerHit);
  vec3 n = normalize(vViewN);
  float shade = max(0.22, dot(n, uLight));
  gl_FragColor = vec4(c * shade, 1.0);
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

  /** Column-major mat3: p = Rx(rx) * Ry(ry) * v (matches legacy globe.js). */
  function rotMat3(rx, ry) {
    const cx = Math.cos(rx); const sx = Math.sin(rx);
    const cy = Math.cos(ry); const sy = Math.sin(ry);
    return new Float32Array([
      cy, sx * sy, -cx * sy,
      0, cx, sx,
      sy, -sx * cy, cx * cy
    ]);
  }

  function mulMat3Vec(m, x, y, z) {
    return {
      x: m[0] * x + m[3] * y + m[6] * z,
      y: m[1] * x + m[4] * y + m[7] * z,
      z: m[2] * x + m[5] * y + m[8] * z
    };
  }

  function invRotMat3(rx, ry) {
    const cx = Math.cos(rx); const sx = Math.sin(rx);
    const cy = Math.cos(ry); const sy = Math.sin(ry);
    return new Float32Array([
      cy, 0, sy,
      sx * sy, cx, -sx * cy,
      -cx * sy, sx, cx * cy
    ]);
  }

  function buildMesh(subdivisions) {
    const ico = global.IcoSphere.createIcosphere(subdivisions);
    const positions = [];
    const indices = [];
    for (const v of ico.vertices) positions.push(v[0], v[1], v[2]);
    for (const [a, b, c] of ico.faces) indices.push(a, b, c);
    return { positions: new Float32Array(positions), indices: new Uint16Array(indices) };
  }

  function createGlobeViewer(canvas, onPick) {
    const gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: true,
      preserveDrawingBuffer: true
    });
    if (!gl) throw new Error('WebGL not available');

    const mesh = buildMesh(5);
    let program = null;
    let posBuf = null;
    let idxBuf = null;
    let tex = null;
    let rotX = 0.35;
    let rotY = 0.6;
    let dragging = false;
    let dragDistance = 0;
    let lastX = 0;
    let lastY = 0;
    let raf = 0;
    let width = 0;
    let height = 0;
    const marker = new Float32Array([0, 0, 1]);
    let hasMarker = false;

    const light = new Float32Array([-0.35, 0.3, 0.88]);
    const ll = Math.hypot(light[0], light[1], light[2]);
    light[0] /= ll; light[1] /= ll; light[2] /= ll;

    function initGl() {
      const vs = compileShader(gl, gl.VERTEX_SHADER, VS);
      const fs = compileShader(gl, gl.FRAGMENT_SHADER, FS);
      program = gl.createProgram();
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program) || 'program link failed');
      }

      posBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
      gl.bufferData(gl.ARRAY_BUFFER, mesh.positions, gl.STATIC_DRAW);

      idxBuf = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);

      tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        1,
        1,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        new Uint8Array([18, 42, 62, 255])
      );
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, Math.round(rect.width * dpr));
      height = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, width, height);
    }

    function uploadTexture(sourceCanvas) {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceCanvas);
    }

    function uploadRaster(raster) {
      const binary = atob(raster.rgba);
      const expected = raster.width * raster.height * 4;
      const buf = new Uint8ClampedArray(expected);
      for (let i = 0; i < expected; i++) buf[i] = binary.charCodeAt(i);
      const img = new ImageData(buf, raster.width, raster.height);
      const c = document.createElement('canvas');
      c.width = raster.width;
      c.height = raster.height;
      c.getContext('2d').putImageData(img, 0, 0);
      uploadTexture(c);
    }

    function render() {
      resize();
      gl.clearColor(0.06, 0.08, 0.1, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.BACK);

      gl.useProgram(program);
      const aPos = gl.getAttribLocation(program, 'aPos');
      const uRot = gl.getUniformLocation(program, 'uRot');
      const uAspect = gl.getUniformLocation(program, 'uAspect');
      const uRadius = gl.getUniformLocation(program, 'uRadius');
      const uTex = gl.getUniformLocation(program, 'uTex');
      const uLight = gl.getUniformLocation(program, 'uLight');
      const uMarker = gl.getUniformLocation(program, 'uMarker');
      const uHasMarker = gl.getUniformLocation(program, 'uHasMarker');

      gl.uniformMatrix3fv(uRot, false, rotMat3(rotX, rotY));
      gl.uniform1f(uAspect, width / height);
      gl.uniform1f(uRadius, 0.88);
      gl.uniform3fv(uLight, light);
      gl.uniform3fv(uMarker, marker);
      gl.uniform1f(uHasMarker, hasMarker ? 1 : 0);
      gl.uniform1i(uTex, 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);

      gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
      gl.drawElements(gl.TRIANGLES, mesh.indices.length, gl.UNSIGNED_SHORT, 0);
    }

    function pickAt(clientX, clientY) {
      if (!onPick) return;
      const rect = canvas.getBoundingClientRect();
      const px = (clientX - rect.left) * (canvas.width / rect.width);
      const py = (clientY - rect.top) * (canvas.height / rect.height);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const R = Math.min(canvas.width, canvas.height) * 0.44;
      const nx = (px - cx) / R;
      const ny = (cy - py) / R;
      const r2 = nx * nx + ny * ny;
      if (r2 > 1) return;
      const nz = Math.sqrt(1 - r2);
      const world = mulMat3Vec(invRotMat3(rotX, rotY), nx, ny, nz);
      const { lat, lon } = global.TerrainSampler.vectorToLatLon(world.x, world.y, world.z);
      onPick(lat, lon);
    }

    function getCenterLatLon() {
      const world = mulMat3Vec(invRotMat3(rotX, rotY), 0, 0, 1);
      return {
        lat: Math.asin(Math.max(-1, Math.min(1, world.y))) * 180 / Math.PI,
        lon: Math.atan2(world.x, world.z) * 180 / Math.PI
      };
    }

    function setMarker(lat, lon) {
      const latR = lat * Math.PI / 180;
      const lonR = lon * Math.PI / 180;
      const cosLat = Math.cos(latR);
      marker[0] = Math.sin(lonR) * cosLat;
      marker[1] = Math.sin(latR);
      marker[2] = Math.cos(lonR) * cosLat;
      hasMarker = true;
      render();
    }

    initGl();
    render();
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(render);
    });
    ro.observe(canvas);

    canvas.addEventListener('mousedown', (ev) => {
      dragging = true;
      dragDistance = 0;
      lastX = ev.clientX;
      lastY = ev.clientY;
    });
    window.addEventListener('mouseup', () => { dragging = false; });
    canvas.addEventListener('mousemove', (ev) => {
      if (dragging) {
        const dx = ev.clientX - lastX;
        const dy = ev.clientY - lastY;
        dragDistance += Math.hypot(dx, dy);
        rotY += dx * 0.008;
        rotX += dy * 0.008;
        rotX = Math.max(-1.2, Math.min(1.2, rotX));
        lastX = ev.clientX;
        lastY = ev.clientY;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(render);
      }
    });
    canvas.addEventListener('click', (ev) => {
      if (dragDistance < 4) pickAt(ev.clientX, ev.clientY);
    });
    canvas.addEventListener('mouseleave', () => { dragging = false; });

    return {
      setTexture(sourceCanvas) {
        uploadTexture(sourceCanvas);
        render();
      },
      setTextureFromRaster(raster) {
        uploadRaster(raster);
        render();
      },
      getCenterLatLon,
      setMarker,
      render
    };
  }

  global.GlobeGlViewer = {
    createGlobeViewer,
    _test: { rotMat3, invRotMat3, mulMat3Vec }
  };
})(window);
