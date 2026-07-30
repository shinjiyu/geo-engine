/**
 * Icosphere — geodesic triangle mesh on unit sphere (no cube-face seams).
 */
(function (global) {
  const ICOSAHEDRON_FACES = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
  ];

  function normalize(x, y, z) {
    const l = Math.hypot(x, y, z) || 1;
    return [x / l, y / l, z / l];
  }

  function createIcosphere(subdivisions) {
    const t = (1 + Math.sqrt(5)) / 2;
    const verts = [
      normalize(-1, t, 0), normalize(1, t, 0), normalize(-1, -t, 0), normalize(1, -t, 0),
      normalize(0, -1, t), normalize(0, 1, t), normalize(0, -1, -t), normalize(0, 1, -t),
      normalize(t, 0, -1), normalize(t, 0, 1), normalize(-t, 0, -1), normalize(-t, 0, 1)
    ];
    let faces = ICOSAHEDRON_FACES.map((f) => f.slice());
    const midCache = new Map();

    function midpoint(i, j) {
      const key = i < j ? `${i},${j}` : `${j},${i}`;
      if (midCache.has(key)) return midCache.get(key);
      const a = verts[i];
      const b = verts[j];
      const m = normalize(a[0] + b[0], a[1] + b[1], a[2] + b[2]);
      const idx = verts.length;
      verts.push(m);
      midCache.set(key, idx);
      return idx;
    }

    for (let s = 0; s < subdivisions; s++) {
      const next = [];
      for (const [a, b, c] of faces) {
        const ab = midpoint(a, b);
        const bc = midpoint(b, c);
        const ca = midpoint(c, a);
        next.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
      }
      faces = next;
    }

    faces = fixOutwardWinding(verts, faces);

    return { vertices: verts, faces };
  }

  /** Flip winding when face normal points inward — fixes culling holes. */
  function fixOutwardWinding(verts, faces) {
    return faces.map(([a, b, c]) => {
      const va = verts[a];
      const vb = verts[b];
      const vc = verts[c];
      const cx = (va[0] + vb[0] + vc[0]) / 3;
      const cy = (va[1] + vb[1] + vc[1]) / 3;
      const cz = (va[2] + vb[2] + vc[2]) / 3;
      const e1x = vb[0] - va[0];
      const e1y = vb[1] - va[1];
      const e1z = vb[2] - va[2];
      const e2x = vc[0] - va[0];
      const e2y = vc[1] - va[1];
      const e2z = vc[2] - va[2];
      const nx = e1y * e2z - e1z * e2y;
      const ny = e1z * e2x - e1x * e2z;
      const nz = e1x * e2y - e1y * e2x;
      if (nx * cx + ny * cy + nz * cz >= 0) return [a, b, c];
      return [a, c, b];
    });
  }

  global.IcoSphere = { createIcosphere };
})(window);
