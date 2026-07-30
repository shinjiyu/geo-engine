'use strict';

const TERRAIN_COLORS = {
  deep_ocean: [12, 28, 58, 255],
  ocean: [28, 72, 120, 255],
  lake: [46, 112, 176, 255],
  coast: [196, 178, 128, 255],
  plain: [96, 148, 72, 255],
  hill: [72, 108, 56, 255],
  mountain: [120, 108, 96, 255],
  snow: [232, 236, 244, 255],
  ice: [200, 220, 236, 255]
};

const REALM_HUES = {
  human: 28,
  elf: 130,
  dwarf: 38,
  orc: 8,
  halfling: 48,
  dragonborn: 350,
  gnome: 280,
  beastfolk: 170
};

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0; let g = 0; let b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
    255
  ];
}

function realmColor(realmId, race) {
  const hue = REALM_HUES[race] ?? (realmId.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360);
  return hslToRgb(hue, 55, 48);
}

function elevationColor(elevation, isLand) {
  if (!isLand) {
    const depth = Math.max(0, Math.min(1, (-elevation + 500) / 4500));
    return [Math.round(20 + depth * 30), Math.round(50 + depth * 80), Math.round(100 + depth * 100), 255];
  }
  const t = Math.max(0, Math.min(1, elevation / 4000));
  const r = Math.round(40 + t * 180);
  const g = Math.round(90 + t * 80);
  const b = Math.round(50 + t * 40);
  return [r, g, b, 255];
}

function magicColor(flux, isLand) {
  if (!isLand || !flux) return TERRAIN_COLORS.deep_ocean;
  const t = Math.max(0, Math.min(1, flux));
  return [
    Math.round(40 + t * 120),
    Math.round(30 + t * 40),
    Math.round(80 + t * 160),
    255
  ];
}

function riverOverlay(base, isRiver) {
  if (!isRiver) return base;
  return [
    Math.round(base[0] * 0.4 + 40),
    Math.round(base[1] * 0.4 + 120),
    Math.round(base[2] * 0.4 + 220),
    255
  ];
}

module.exports = {
  TERRAIN_COLORS,
  realmColor,
  elevationColor,
  magicColor,
  riverOverlay
};
