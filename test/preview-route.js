'use strict';

const assert = require('node:assert/strict');
const { parsePreviewRoute } = require('../public/preview-route');

console.log('geo-engine preview route test...');

assert.deepEqual(parsePreviewRoute(''), { worldId: null, layer: 'terrain' });
assert.deepEqual(parsePreviewRoute('?world=abc123'), { worldId: 'abc123', layer: 'terrain' });
assert.deepEqual(parsePreviewRoute('?world=abc%20123&layer=realms'), {
  worldId: 'abc 123',
  layer: 'terrain'
});
assert.deepEqual(parsePreviewRoute('?world=abc123&layer=unknown'), {
  worldId: 'abc123',
  layer: 'terrain'
});

console.log('preview route test passed');
