(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PreviewRoute = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  var VALID_LAYERS = ['terrain', 'elevation', 'magic'];

  function parsePreviewRoute(search) {
    var params = new URLSearchParams(search || '');
    var worldId = (params.get('world') || '').trim() || null;
    var requestedLayer = (params.get('layer') || 'terrain').trim();
    return {
      worldId: worldId,
      layer: VALID_LAYERS.indexOf(requestedLayer) >= 0 ? requestedLayer : 'terrain'
    };
  }

  return {
    VALID_LAYERS: VALID_LAYERS,
    parsePreviewRoute: parsePreviewRoute
  };
});
