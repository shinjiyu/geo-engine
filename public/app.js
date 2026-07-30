(function () {
  const canvas = document.getElementById('globeCanvas');
  const previewRoute = window.PreviewRoute.parsePreviewRoute(window.location.search);
  const persistedPreview = Boolean(previewRoute.worldId);
  let subdiv = Number(document.getElementById('meshSubdiv').value) || 6;
  let viewer = persistedPreview
    ? null
    : window.MeshViewer.createMeshViewer(canvas, subdiv);
  let archiveViewer = null;
  let archiveWorld = null;

  const dom = {
    seed: document.getElementById('seed'),
    meshSubdiv: document.getElementById('meshSubdiv'),
    btnGenerate: document.getElementById('btnGenerate'),
    btnRebuildMesh: document.getElementById('btnRebuildMesh'),
    btnRandomSeed: document.getElementById('btnRandomSeed'),
    btnApplyParams: document.getElementById('btnApplyParams'),
    btnRegenOverlay: document.getElementById('btnRegenOverlay'),
    btnOpenRegion: document.getElementById('btnOpenRegion'),
    regionMapDialog: document.getElementById('regionMapDialog'),
    regionMapCanvas: document.getElementById('regionMapCanvas'),
    regionMapLocation: document.getElementById('regionMapLocation'),
    regionMapStatus: document.getElementById('regionMapStatus'),
    regionSpan: document.getElementById('regionSpan'),
    regionLayer: document.getElementById('regionLayer'),
    btnRefreshRegion: document.getElementById('btnRefreshRegion'),
    btnSaveRegion: document.getElementById('btnSaveRegion'),
    btnCloseRegion: document.getElementById('btnCloseRegion'),
    genStatus: document.getElementById('genStatus'),
    statSubdiv: document.getElementById('statSubdiv'),
    statVerts: document.getElementById('statVerts'),
    statFaces: document.getElementById('statFaces'),
    statMin: document.getElementById('statMin'),
    statMax: document.getElementById('statMax'),
    statLand: document.getElementById('statLand'),
    statRivers: document.getElementById('statRivers'),
    statLakes: document.getElementById('statLakes'),
    statIslands: document.getElementById('statIslands'),
    statVegetation: document.getElementById('statVegetation'),
    statBasins: document.getElementById('statBasins'),
    statTropic: document.getElementById('statTropic'),
    statPolar: document.getElementById('statPolar'),
    seaLevel: document.getElementById('seaLevel'),
    seaLevelVal: document.getElementById('seaLevelVal'),
    obliquity: document.getElementById('obliquity'),
    obliquityVal: document.getElementById('obliquityVal'),
    rotation: document.getElementById('rotation'),
    showGraticule: document.getElementById('showGraticule'),
    showRivers: document.getElementById('showRivers'),
    showWireframe: document.getElementById('showWireframe'),
    zoomSlider: document.getElementById('zoomSlider'),
    generationPanel: document.getElementById('generationPanel'),
    previewWorldPanel: document.getElementById('previewWorldPanel'),
    previewWorldId: document.getElementById('previewWorldId'),
    selectedMapLocation: document.getElementById('selectedMapLocation'),
    previewLayer: document.getElementById('previewLayer'),
    planetPanel: document.getElementById('planetPanel'),
    displayPanel: document.getElementById('displayPanel'),
    meshPanel: document.getElementById('meshPanel')
  };
  let regionCenter = null;

  function handleGlobePick(lat, lon) {
    regionCenter = { lat, lon };
    archiveViewer.setMarker(lat, lon);
    dom.selectedMapLocation.textContent =
      `定位点：${lat.toFixed(3)}°, ${lon.toFixed(3)}°`;
    dom.btnOpenRegion.disabled = false;
  }

  if (persistedPreview) {
    archiveViewer = window.GlobeViewer.createGlobeViewer(canvas, handleGlobePick);
  }

  function syncMeshStats() {
    if (!viewer) return;
    const s = viewer.stats();
    dom.statSubdiv.textContent = String(s.subdivisions);
    dom.statVerts.textContent = s.vertices.toLocaleString();
    dom.statFaces.textContent = s.faces.toLocaleString();
  }

  function planetFromUI() {
    return window.PlanetParams.normalizePlanet({
      seaLevelM: Number(dom.seaLevel.value),
      obliquity: Number(dom.obliquity.value),
      rotationDirection: dom.rotation.value === 'retrograde' ? -1 : 1
    });
  }

  function syncLabels(planet) {
    dom.seaLevelVal.textContent = `${planet.seaLevelM} m`;
    dom.obliquityVal.textContent = `${planet.obliquity.toFixed(1)}°`;
    dom.statTropic.textContent = `±${planet.tropicLat.toFixed(1)}°`;
    dom.statPolar.textContent = `±${planet.polarCircleLat.toFixed(1)}°`;
  }

  function syncZoomSlider() {
    if (!viewer) return;
    dom.zoomSlider.value = String(Math.round(viewer.getZoom() * 100));
  }

  function setBusy(busy, msg) {
    dom.btnGenerate.disabled = busy || persistedPreview;
    dom.btnRebuildMesh.disabled = busy || persistedPreview;
    dom.btnApplyParams.disabled = busy || persistedPreview;
    dom.btnRandomSeed.disabled = busy || persistedPreview;
    if (dom.previewLayer) dom.previewLayer.disabled = busy;
    if (msg != null) {
      dom.genStatus.textContent = msg;
      dom.genStatus.className = busy ? 'status' : 'status ok';
    }
  }

  function showGenStats(stats) {
    if (!stats) {
      dom.statMin.textContent = '—';
      dom.statMax.textContent = '—';
      dom.statLand.textContent = '—';
      dom.statRivers.textContent = '—';
      dom.statLakes.textContent = '—';
      dom.statIslands.textContent = '—';
      dom.statVegetation.textContent = '—';
      dom.statBasins.textContent = '—';
      return;
    }
    dom.statMin.textContent = `${stats.minElevation.toFixed(0)} m`;
    dom.statMax.textContent = `${stats.maxElevation.toFixed(0)} m`;
    dom.statLand.textContent = `${(stats.landFraction * 100).toFixed(1)}%`;
    dom.statRivers.textContent = `${stats.mainRiverCount ?? stats.riverCount} 干 · ${stats.tributaryCount ?? 0} 支`;
    dom.statLakes.textContent = `${stats.lakeCount ?? 0} 个`;
    dom.statIslands.textContent = `${stats.islandCount ?? 0} 个`;
    dom.statVegetation.textContent = formatVegetation(stats.vegetationCounts);
    dom.statBasins.textContent = stats.basinsFilled != null
      ? `${stats.basinsFilled} 格`
      : '—';
    syncLabels(stats.planet);
    syncMeshStats();
  }

  function showArchiveStats(world) {
    const meta = world.meta || {};
    dom.statMin.textContent = '—';
    dom.statMax.textContent = '—';
    dom.statLand.textContent = meta.totalCells
      ? `${(meta.landCells / meta.totalCells * 100).toFixed(1)}%`
      : '—';
    dom.statRivers.textContent = `${meta.mainRiverCount || 0} 干 · ${meta.tributaryCount || 0} 支`;
    dom.statLakes.textContent = `${meta.lakeCount || 0} 个`;
    dom.statIslands.textContent = `${meta.islandCount || 0} 个`;
    dom.statVegetation.textContent = '见地图图层';
    dom.statBasins.textContent = '—';
    dom.statSubdiv.textContent = `Cube ${meta.cellsPerFaceEdge || '?'}² × 6`;
    dom.statVerts.textContent = Number(meta.totalCells || 0).toLocaleString();
    dom.statFaces.textContent = '存档栅格';
    syncLabels(window.PlanetParams.normalizePlanet(world.planet || {}));
  }

  async function loadArchiveWorld(layerName) {
    const layer = layerName || previewRoute.layer;
    setBusy(true, '正在加载编年史世界地图…');
    try {
      if (!archiveWorld) {
        const response = await fetch(`/worlds/${encodeURIComponent(previewRoute.worldId)}`);
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || response.statusText);
        archiveWorld = body;
        dom.seed.value = body.seed || '';
        dom.previewWorldId.textContent = `World ${body.worldId} · Seed ${body.seed || '—'}`;
        showArchiveStats(body);
      }
      await archiveViewer.setWorld(
        archiveWorld.seed,
        archiveWorld.planet,
        layer,
        (progress) => {
          dom.genStatus.textContent = `加载地图 ${Math.round(progress * 100)}%`;
        },
        archiveWorld.worldId
      );
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.set('world', archiveWorld.worldId);
      nextUrl.searchParams.set('layer', layer);
      window.history.replaceState(null, '', nextUrl);
      dom.genStatus.textContent = `已加载 · ${layer} · ${archiveWorld.worldId}`;
      dom.genStatus.className = 'status ok';
    } catch (err) {
      dom.genStatus.textContent = `加载失败: ${err.message}`;
      dom.genStatus.className = 'status err';
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  function drawRaster(canvasEl, raster) {
    const binary = atob(raster.rgba);
    const pixels = new Uint8ClampedArray(raster.width * raster.height * 4);
    for (let i = 0; i < pixels.length; i++) pixels[i] = binary.charCodeAt(i);
    canvasEl.width = raster.width;
    canvasEl.height = raster.height;
    const ctx = canvasEl.getContext('2d');
    ctx.putImageData(
      new ImageData(pixels, raster.width, raster.height),
      0,
      0
    );
    ctx.save();
    ctx.strokeStyle = 'rgba(38, 43, 42, 0.35)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 6; i++) {
      const x = Math.round(raster.width * i / 6);
      const y = Math.round(raster.height * i / 6);
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, raster.height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(raster.width, y); ctx.stroke();
    }
    ctx.strokeStyle = '#ffe05c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(raster.width / 2, raster.height / 2, 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#17212a';
    ctx.font = 'bold 18px Segoe UI, sans-serif';
    ctx.fillText('N', raster.width - 42, 32);
    ctx.beginPath();
    ctx.moveTo(raster.width - 34, 42);
    ctx.lineTo(raster.width - 34, 72);
    ctx.lineTo(raster.width - 41, 58);
    ctx.moveTo(raster.width - 34, 72);
    ctx.lineTo(raster.width - 27, 58);
    ctx.strokeStyle = '#17212a';
    ctx.stroke();
    const targetKm = raster.scaleKmPerPixel * 140;
    const choices = [10, 20, 50, 100, 200, 500, 1000, 2000];
    const scaleKm = choices.filter((value) => value <= targetKm).pop() || 10;
    const scalePx = scaleKm / raster.scaleKmPerPixel;
    const sx = 28;
    const sy = raster.height - 30;
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + scalePx, sy); ctx.stroke();
    ctx.font = '14px Segoe UI, sans-serif';
    ctx.fillText(`${scaleKm} km`, sx, sy - 9);
    ctx.restore();
  }

  async function loadRegionMap() {
    if (!regionCenter || !previewRoute.worldId) return;
    const span = Number(dom.regionSpan.value) || 10;
    const layer = dom.regionLayer.value || 'terrain';
    dom.regionMapStatus.textContent = '正在展开局部地图…';
    dom.btnRefreshRegion.disabled = true;
    try {
      const query = new URLSearchParams({
        centerLat: regionCenter.lat.toFixed(6),
        centerLon: regionCenter.lon.toFixed(6),
        span: String(span),
        layer,
        width: '960',
        height: '640'
      });
      const response = await fetch(
        `/worlds/${encodeURIComponent(previewRoute.worldId)}/map/region?${query}`
      );
      const raster = await response.json();
      if (!response.ok) throw new Error(raster.error || response.statusText);
      drawRaster(dom.regionMapCanvas, raster);
      dom.regionMapLocation.textContent =
        `定位点 ${regionCenter.lat.toFixed(3)}°, ${regionCenter.lon.toFixed(3)}° · 跨度 ${span}°`;
      dom.regionMapStatus.textContent =
        `方位等距投影 · ${layer} · ${raster.scaleKmPerPixel} km/px`;
    } catch (err) {
      dom.regionMapStatus.textContent = `生成失败: ${err.message}`;
      console.error(err);
    } finally {
      dom.btnRefreshRegion.disabled = false;
    }
  }

  function openRegionMap() {
    if (!archiveViewer || !regionCenter) return;
    dom.regionLayer.value = previewRoute.layer === 'magic' || previewRoute.layer === 'elevation'
      ? previewRoute.layer
      : 'terrain';
    dom.regionMapDialog.showModal();
    loadRegionMap();
  }

  function saveRegionMap() {
    dom.regionMapCanvas.toBlob((blob) => {
      if (!blob) return;
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `region-${previewRoute.worldId}-${Date.now()}.png`;
      link.click();
      URL.revokeObjectURL(link.href);
    }, 'image/png');
  }

  function formatVegetation(counts) {
    if (!counts || !Object.keys(counts).length) return '—';
    const order = ['rainforest', 'forest', 'grassland', 'wetland', 'shrubland', 'desert', 'tundra'];
    const parts = order
      .filter((k) => counts[k])
      .slice(0, 3)
      .map((k) => `${k} ${counts[k]}`);
    return parts.join(' · ') || '—';
  }

  function runDeferred(fn) {
    setBusy(true, '生成中…（地形 + 水循环 + 河湖植被）');
    setTimeout(() => {
      try {
        const stats = fn();
        showGenStats(stats);
        dom.genStatus.textContent = `完成 · 河 ${stats.mainRiverCount ?? 0} 干 ${stats.tributaryCount ?? 0} 支 · 湖 ${stats.lakeCount ?? 0} · 岛 ${stats.islandCount ?? 0}`;
        dom.genStatus.className = 'status ok';
      } catch (err) {
        dom.genStatus.textContent = `失败: ${err.message}`;
        dom.genStatus.className = 'status err';
        console.error(err);
      }
      setBusy(false);
    }, 16);
  }

  async function generateWorld() {
    const seed = dom.seed.value.trim() || 'mesh-demo';
    const planet = planetFromUI();
    const n = 16 + Math.max(0, subdiv - 4) * 8;
    setBusy(true, 'World Orogen 生成中…（板块 + 造山 + 水循环）');
    try {
      const response = await fetch('/worlds', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          seed,
          grid: { cellsPerFaceEdge: n },
          planet,
          terrain: { backend: 'orogen' }
        })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || response.statusText);
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.set('world', body.worldId);
      nextUrl.searchParams.set('layer', 'terrain');
      window.location.assign(nextUrl);
    } catch (err) {
      dom.genStatus.textContent = `失败: ${err.message}`;
      dom.genStatus.className = 'status err';
      console.error(err);
      setBusy(false);
    }
  }

  function rebuildMeshOnly() {
    subdiv = Number(dom.meshSubdiv.value) || 6;
    generateWorld();
  }

  function applyParamsOnly() {
    generateWorld();
  }

  function randomSeed() {
    dom.seed.value = `w-${Date.now().toString(36)}`;
    generateWorld();
  }

  dom.zoomSlider.addEventListener('input', () => {
    viewer.setZoom(Number(dom.zoomSlider.value) / 100);
  });

  ['seaLevel', 'obliquity'].forEach((id) => {
    dom[id].addEventListener('input', () => syncLabels(planetFromUI()));
  });

  function syncDisplay() {
    if (!viewer) return;
    viewer.setDisplayOptions({
      showGraticule: dom.showGraticule.checked,
      showRivers: dom.showRivers.checked,
      showWireframe: dom.showWireframe.checked
    });
  }

  dom.showGraticule.addEventListener('change', syncDisplay);
  dom.showRivers.addEventListener('change', syncDisplay);
  dom.showWireframe.addEventListener('change', syncDisplay);

  dom.btnGenerate.addEventListener('click', generateWorld);
  dom.btnRebuildMesh.addEventListener('click', rebuildMeshOnly);
  dom.btnApplyParams.addEventListener('click', applyParamsOnly);
  dom.btnRandomSeed.addEventListener('click', randomSeed);
  if (dom.btnRegenOverlay) {
    dom.btnRegenOverlay.addEventListener('click', generateWorld);
  }
  if (dom.previewLayer) {
    dom.previewLayer.addEventListener('change', () => loadArchiveWorld(dom.previewLayer.value));
  }
  dom.btnOpenRegion.addEventListener('click', openRegionMap);
  dom.btnRefreshRegion.addEventListener('click', loadRegionMap);
  dom.btnSaveRegion.addEventListener('click', saveRegionMap);
  dom.btnCloseRegion.addEventListener('click', () => dom.regionMapDialog.close());
  dom.regionSpan.addEventListener('change', loadRegionMap);
  dom.regionLayer.addEventListener('change', loadRegionMap);

  syncLabels(planetFromUI());
  if (persistedPreview) {
    dom.generationPanel.hidden = true;
    dom.previewWorldPanel.hidden = false;
    dom.planetPanel.hidden = true;
    dom.displayPanel.hidden = true;
    dom.meshPanel.hidden = true;
    if (dom.btnRegenOverlay) dom.btnRegenOverlay.hidden = true;
    dom.btnOpenRegion.hidden = false;
    dom.previewLayer.value = previewRoute.layer;
    loadArchiveWorld(previewRoute.layer);
  } else {
    syncMeshStats();
    syncZoomSlider();
    canvas.addEventListener('wheel', () => requestAnimationFrame(syncZoomSlider));
    generateWorld();
  }

  fetch('/health')
    .then((r) => r.json())
    .then((h) => {
      document.getElementById('appVersion').textContent =
        h.version ? `server v${h.version}` : 'server v?';
    })
    .catch(() => {
      document.getElementById('appVersion').textContent = 'server 离线';
      document.getElementById('appVersion').classList.add('outdated');
    });
})();
