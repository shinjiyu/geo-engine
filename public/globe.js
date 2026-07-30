(function (global) {
  function createGlobeViewer(canvas, onPick) {
    const glViewer = global.GlobeGlViewer.createGlobeViewer(canvas, onPick);

    async function setWorld(seed, planetOptions, layerName, onProgress, worldId) {
      const layer = layerName || 'terrain';
      const continuous = layer === 'terrain' || layer === 'elevation';

      if (continuous && !worldId) {
        const sampler = global.TerrainSampler.createSampler(seed, planetOptions);
        const off = document.createElement('canvas');
        await sampler.renderEquirect(off, layer, 2048, 1024, onProgress);
        glViewer.setTexture(off);
        return;
      }

      if (onProgress) onProgress(0.2);
      const res = await fetch(
        `/worlds/${encodeURIComponent(worldId)}/map/equirect?layer=${encodeURIComponent(layer)}&width=1024&height=512`
      );
      const raster = await res.json();
      if (!res.ok) throw new Error(raster.error || res.statusText);
      if (onProgress) onProgress(1);
      glViewer.setTextureFromRaster(raster);
    }

    return {
      setWorld,
      render: glViewer.render,
      getCenterLatLon: glViewer.getCenterLatLon,
      setMarker: glViewer.setMarker
    };
  }

  global.GlobeViewer = { createGlobeViewer };
})(window);
