# World Orogen source notice

This directory contains source code from
[`raguilar011095/planet_heightmap_generation`](https://github.com/raguilar011095/planet_heightmap_generation)
at commit `cc2662b4edd52231c4f65d8765f3ef12cd82d9b7`.

Upstream name: **World Orogen**  
Upstream author: Rafael Aguilar and contributors  
License: GNU General Public License v3.0 (`LICENSE`)

## Local integration changes

- Only the algorithm modules needed for plate, elevation and terrain generation are vendored.
- `runner.js` adapts Cube-sphere cell-center vectors to the upstream spherical Delaunay mesh.
- The browser worker/UI and climate modules are not included; geo-engine supplies its own climate,
  water-cycle, hydrology and rendering pipeline.
- `sphere-mesh.js` remains unmodified; the adapter constructs the same exported `SphereMesh`
  representation from externally supplied unit vectors.
- The ESM adapter and dependencies are bundled into CommonJS for geo-engine at build time.
