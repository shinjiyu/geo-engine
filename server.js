'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const {
  createWorld,
  loadWorld,
  listWorlds,
  buildFactPack,
  queryRealmDistance,
  queryEventContext,
  getCell,
  normalizeConfig
} = require('./src/index');
const { formatFactPackForLlm } = require('./src/facts/spatial-fact-pack');
const {
  VALID_LAYERS,
  buildEquirectRaster,
  buildMercatorRaster,
  buildRegionRaster,
  buildFaceRaster,
  pickCellAtLatLon,
  pickCellAtFaceUV
} = require('./src/map/raster');

const PORT = Number(process.env.GEO_ENGINE_PORT) || 3003;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml'
};

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body, null, 2));
}

function sendText(res, status, body, contentType) {
  res.writeHead(status, { 'Content-Type': contentType });
  res.end(body);
}

function sendStatic(res, filePath) {
  if (!fs.existsSync(filePath)) return false;
  const ext = path.extname(filePath);
  const mime = MIME[ext] || 'application/octet-stream';
  const headers = { 'Content-Type': mime };
  if (ext === '.html' || ext === '.js' || ext === '.css') {
    headers['Cache-Control'] = 'no-cache';
  }
  res.writeHead(200, headers);
  fs.createReadStream(filePath).pipe(res);
  return true;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      if (!chunks.length) return resolve(null);
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

async function handleRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const parts = url.pathname.split('/').filter(Boolean);

  try {
    if (req.method === 'GET' && url.pathname === '/health') {
      return sendJson(res, 200, {
        ok: true,
        service: 'geo-engine',
        version: '0.13.0',
        mode: 'world-orogen-cube-sphere',
        terrainBackend: 'world-orogen',
        waterCycle: 'surface-column-ca-52w',
        renderMesh: 'cube-sphere-raster-globe',
        mapLayers: VALID_LAYERS,
        projections: ['web-mercator', 'equirectangular', 'cube-face', 'globe']
      });
    }

    if (req.method === 'GET' && url.pathname === '/worlds') {
      return sendJson(res, 200, { worlds: listWorlds() });
    }

    if (req.method === 'POST' && url.pathname === '/worlds') {
      const body = await readBody(req);
      const world = createWorld(body || {});
      return sendJson(res, 201, {
        worldId: world.id,
        seed: world.seed,
        meta: world.meta,
        speciesSelection: world.speciesSelection,
        createdAt: world.createdAt
      });
    }

    if (parts[0] === 'worlds' && parts.length >= 2) {
      const worldId = parts[1];
      const world = loadWorld(worldId);
      if (!world) return sendJson(res, 404, { error: 'World not found' });

      if (req.method === 'GET' && parts.length === 2) {
        return sendJson(res, 200, {
          worldId: world.id,
          schemaVersion: world.schemaVersion,
          engineVersion: world.engineVersion,
          pipelineId: world.pipelineId,
          configFingerprint: world.configFingerprint,
          seed: world.seed,
          planet: world.config?.planet || { seaLevel: 0.02, radiusKm: 6371 },
          meta: world.meta,
          realms: world.realms,
          realmRelations: world.realmRelations,
          mountains: world.mountains,
          rivers: world.rivers.map((r) => ({ id: r.id, lengthKm: r.lengthKm, cellCount: r.cells.length })),
          lakes: (world.lakes || []).map((lake) => ({
            id: lake.id,
            areaKm2: lake.areaKm2,
            freshwater: lake.freshwater,
            waterLevelM: lake.waterLevelM,
            cellCount: lake.cellCount
          })),
          magicNodes: world.magicNodes || [],
          leyLines: world.leyLines || [],
          speciesSelection: world.speciesSelection || null,
          carryingCapacity: world.carryingCapacity || null
        });
      }

      if (req.method === 'GET' && parts[2] === 'map' && parts[3] === 'mercator') {
        const raster = buildMercatorRaster(world, {
          width: url.searchParams.get('width'),
          height: url.searchParams.get('height'),
          layer: url.searchParams.get('layer')
        });
        return sendJson(res, 200, raster);
      }

      if (req.method === 'GET' && parts[2] === 'map' && parts[3] === 'equirect') {
        const raster = buildEquirectRaster(world, {
          width: url.searchParams.get('width'),
          height: url.searchParams.get('height'),
          layer: url.searchParams.get('layer')
        });
        return sendJson(res, 200, raster);
      }

      if (req.method === 'GET' && parts[2] === 'map' && parts[3] === 'region') {
        const raster = buildRegionRaster(world, {
          centerLat: url.searchParams.get('centerLat'),
          centerLon: url.searchParams.get('centerLon'),
          span: url.searchParams.get('span'),
          spanLat: url.searchParams.get('spanLat'),
          spanLon: url.searchParams.get('spanLon'),
          width: url.searchParams.get('width'),
          height: url.searchParams.get('height'),
          layer: url.searchParams.get('layer')
        });
        return sendJson(res, 200, raster);
      }

      if (req.method === 'GET' && parts[2] === 'map' && parts[3] === 'face' && parts.length === 5) {
        const raster = buildFaceRaster(world, parts[4], {
          layer: url.searchParams.get('layer'),
          scale: url.searchParams.get('scale')
        });
        return sendJson(res, 200, raster);
      }

      if (req.method === 'GET' && parts[2] === 'map' && parts[3] === 'pick') {
        const lat = Number(url.searchParams.get('lat'));
        const lon = Number(url.searchParams.get('lon'));
        if (Number.isNaN(lat) || Number.isNaN(lon)) {
          return sendJson(res, 400, { error: 'Missing lat/lon' });
        }
        const pick = pickCellAtLatLon(world, lat, lon);
        if (!pick) return sendJson(res, 404, { error: 'Cell not found' });
        return sendJson(res, 200, pick);
      }

      if (req.method === 'GET' && parts[2] === 'map' && parts[3] === 'pick-face') {
        const face = Number(url.searchParams.get('face'));
        const u = Number(url.searchParams.get('u'));
        const v = Number(url.searchParams.get('v'));
        if ([face, u, v].some(Number.isNaN)) {
          return sendJson(res, 400, { error: 'Missing face/u/v' });
        }
        const pick = pickCellAtFaceUV(world, face, u, v);
        if (!pick) return sendJson(res, 404, { error: 'Cell not found' });
        return sendJson(res, 200, pick);
      }

      if (req.method === 'GET' && parts[2] === 'cell' && parts.length === 6) {
        const face = Number(parts[3]);
        const u = Number(parts[4]);
        const v = Number(parts[5]);
        const cell = getCell(world, face, u, v);
        if (!cell) return sendJson(res, 404, { error: 'Cell not found' });
        return sendJson(res, 200, { cell });
      }

      if (req.method === 'GET' && parts[2] === 'distance' && parts.length === 5) {
        const result = queryRealmDistance(world, parts[3], parts[4]);
        return sendJson(res, result.error ? 404 : 200, result);
      }

      if (req.method === 'GET' && parts[2] === 'context') {
        const anchor = url.searchParams.get('cell') || url.searchParams.get('anchor');
        const radius = Number(url.searchParams.get('radius') || 8);
        if (!anchor) return sendJson(res, 400, { error: 'Missing cell or anchor query param' });
        const result = queryEventContext(world, anchor, radius);
        return sendJson(res, result.error ? 404 : 200, result);
      }

      if (req.method === 'POST' && parts[2] === 'fact-pack') {
        const body = await readBody(req);
        const pack = buildFactPack(world, body || {});
        const format = url.searchParams.get('format');
        if (format === 'llm') {
          return sendText(res, 200, formatFactPackForLlm(pack), 'text/plain; charset=utf-8');
        }
        return sendJson(res, 200, pack);
      }
    }

    if (req.method === 'GET') {
      let filePath = url.pathname === '/'
        ? path.join(PUBLIC_DIR, 'index.html')
        : path.join(PUBLIC_DIR, url.pathname.replace(/^\//, ''));
      if (!filePath.startsWith(PUBLIC_DIR)) return sendJson(res, 403, { error: 'Forbidden' });
      if (sendStatic(res, filePath)) return;
    }

    sendJson(res, 404, { error: 'Not found', path: url.pathname });
  } catch (err) {
    console.error(err);
    sendJson(res, 500, { error: err.message });
  }
}

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch((err) => {
    console.error(err);
    sendJson(res, 500, { error: err.message });
  });
});

server.listen(PORT, () => {
  console.log(`geo-engine listening on http://localhost:${PORT}`);
  console.log(`Map viewer: http://localhost:${PORT}/`);
});
