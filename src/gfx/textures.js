import { TILE, MAZE_W, MAZE_H, WALL, FAST, MUD, PALETTE } from '../core/constants.js';

// Every sprite in the game is drawn here, once, into a canvas texture. The old
// build rasterised all of this on the CPU on every single frame; the art never
// changes except when the theme does, so it is baked instead and the renderer
// just moves quads around.

export const TEX = {
  pixel: 'px',
  coin: 'coin',
  orb: 'orb',
  gate: 'gate',
  pac: 'pac',
  ghost: 'ghost',
  warden: 'warden',
  anchor: 'anchor',
  bait: 'bait',
  cardIcon: 'card-icon',
  dither: 'dither',
  maze: 'maze'
};

const DITHER_CELL = 6;

export const PAC_DIRS = ['right', 'left', 'up', 'down'];
export const PAC_STEPS = 6;
const PAC_MAX_MOUTH = 0.6;

const WARDEN_SIZE = 24;
const ORB_CELL = 9;
const ANCHOR_SIZE = 14;
const BAIT_SIZE = 12;
const CARD_ICON_SIZE = 54;

/** Lightens or darkens a hex colour by a flat amount per channel. */
function shade(hex, amount) {
  let h = (hex || PALETTE.ink).replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const clamp = (v) => Math.max(0, Math.min(255, v + amount));
  return `rgb(${clamp(parseInt(h.slice(0, 2), 16))},${clamp(parseInt(h.slice(2, 4), 16))},${clamp(parseInt(h.slice(4, 6), 16))})`;
}

/** Fills one cell of a 9x9 sprite grid, snapped so cells never overlap or gap. */
function block(ctx, dx, dy, cw, ch, col, row, cols, rows, color) {
  const x0 = dx + Math.floor(col * cw);
  const y0 = dy + Math.floor(row * ch);
  ctx.fillStyle = color;
  ctx.fillRect(x0, y0, dx + Math.floor((col + cols) * cw) - x0, dy + Math.floor((row + rows) * ch) - y0);
}

/** Paints a string-art bitmap, merging runs of the same key into one fill. */
function bitmap(ctx, art, palette, dx, dy, dw, dh) {
  const rows = art.length;
  const cols = art[0].length;
  const cw = dw / cols;
  const ch = dh / rows;

  for (let r = 0; r < rows; r++) {
    const line = art[r];
    const y0 = dy + Math.floor(r * ch);
    const y1 = dy + Math.floor((r + 1) * ch);
    let c = 0;
    while (c < cols) {
      const key = line[c];
      const color = key === '.' || key === ' ' ? null : palette[key];
      if (!color) { c++; continue; }
      let end = c + 1;
      while (end < cols && line[end] === key) end++;
      const x0 = dx + Math.floor(c * cw);
      ctx.fillStyle = color;
      ctx.fillRect(x0, y0, dx + Math.floor(end * cw) - x0, y1 - y0);
      c = end;
    }
  }
}

function square(ctx, cx, cy, size, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(cx - size / 2), Math.round(cy - size / 2), size, size);
}

function ring(ctx, cx, cy, radius, color, thickness = 2) {
  const x = Math.round(cx - radius);
  const y = Math.round(cy - radius);
  const size = Math.round(radius * 2);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, size, thickness);
  ctx.fillRect(x, y + size - thickness, size, thickness);
  ctx.fillRect(x, y, thickness, size);
  ctx.fillRect(x + size - thickness, y, thickness, size);
}

/** A 50% checkerboard, used to mark the fast and slow floor tiles. */
function dither(ctx, x, y, w, h, color, cell = 3) {
  ctx.fillStyle = color;
  for (let dy = 0; dy < h; dy += cell) {
    for (let dx = 0; dx < w; dx += cell) {
      if (((dx / cell) + (dy / cell)) % 2 === 0) {
        ctx.fillRect(x + dx, y + dy, Math.min(cell, w - dx), Math.min(cell, h - dy));
      }
    }
  }
}

function wallTile(ctx, x, y, size, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = shade(color, 45);
  ctx.fillRect(x, y, size, 2);
  ctx.fillRect(x, y, 2, size);
  ctx.fillStyle = shade(color, -55);
  ctx.fillRect(x, y + size - 2, size, 2);
  ctx.fillRect(x + size - 2, y, 2, size);
}

// A disc on a 9x9 grid, with the bite carved out by angle. Precomputed once:
// the membership and the angle of each cell never change.
const PAC_GRID = 9;
const PAC_DISC = new Uint8Array(PAC_GRID * PAC_GRID);
const PAC_ANGLE = new Float64Array(PAC_GRID * PAC_GRID);
{
  const centre = (PAC_GRID - 1) / 2;
  const radius = PAC_GRID / 2;
  for (let gy = 0; gy < PAC_GRID; gy++) {
    for (let gx = 0; gx < PAC_GRID; gx++) {
      const dx = gx - centre;
      const dy = gy - centre;
      PAC_DISC[gy * PAC_GRID + gx] = Math.hypot(dx, dy) > radius - 0.15 ? 0 : 1;
      PAC_ANGLE[gy * PAC_GRID + gx] = Math.atan2(dy, dx);
    }
  }
}

function pac(ctx, x, y, size, dirX, dirY, mouth, color) {
  const cell = size / PAC_GRID;
  const biting = (dirX || dirY) && mouth > 0.01;
  const facing = (dirX || dirY) ? Math.atan2(dirY, dirX) : 0;
  const row = new Uint8Array(PAC_GRID);

  ctx.fillStyle = color;
  for (let gy = 0; gy < PAC_GRID; gy++) {
    for (let gx = 0; gx < PAC_GRID; gx++) {
      let on = PAC_DISC[gy * PAC_GRID + gx];
      if (on && biting) {
        let delta = PAC_ANGLE[gy * PAC_GRID + gx] - facing;
        while (delta > Math.PI) delta -= Math.PI * 2;
        while (delta < -Math.PI) delta += Math.PI * 2;
        if (Math.abs(delta) < mouth) on = 0;
      }
      row[gx] = on;
    }

    const y0 = y + Math.floor(gy * cell);
    const y1 = y + Math.floor((gy + 1) * cell);
    let gx = 0;
    while (gx < PAC_GRID) {
      if (!row[gx]) { gx++; continue; }
      let end = gx + 1;
      while (end < PAC_GRID && row[end]) end++;
      const x0 = x + Math.floor(gx * cell);
      ctx.fillRect(x0, y0, x + Math.floor(end * cell) - x0, y1 - y0);
      gx = end;
    }
  }

  // The eye sits to one side when running flat, and higher up when climbing.
  const eyeX = dirY !== 0 ? 2 : 4;
  const eyeY = dirY !== 0 ? 4 : 2;
  block(ctx, x, y, cell, cell, eyeX, eyeY, 1, 1, PALETTE.ink);
}

const GHOST_BODY = [
  '..BBBBB..',
  '.BBBBBBB.',
  'BBBBBBBBB',
  'BBBBBBBBB',
  'BBBBBBBBB',
  'BBBBBBBBB',
  'BBBBBBBBB',
  'BBBBBBBBB',
  'B.BB.BB.B'
];

function ghost(ctx, x, y, size, bodyColor, eyeX, eyeY) {
  const cell = size / 9;
  bitmap(ctx, GHOST_BODY, {B: bodyColor}, x, y, size, size);
  block(ctx, x, y, cell, cell, 2, 2, 2, 2, PALETTE.white);
  block(ctx, x, y, cell, cell, 5, 2, 2, 2, PALETTE.white);
  block(ctx, x, y, cell, cell, 2 + eyeX, 2 + eyeY, 1, 1, PALETTE.ink);
  block(ctx, x, y, cell, cell, 5 + eyeX, 2 + eyeY, 1, 1, PALETTE.ink);
}

function frightenedGhost(ctx, x, y, size, blinkWhite) {
  const cell = size / 9;
  const body = blinkWhite ? PALETTE.white : '#68386c';
  const face = blinkWhite ? '#68386c' : PALETTE.white;
  bitmap(ctx, GHOST_BODY, {B: body}, x, y, size, size);
  block(ctx, x, y, cell, cell, 2, 3, 1, 2, face);
  block(ctx, x, y, cell, cell, 6, 3, 1, 2, face);
  for (const col of [1, 3, 5, 7]) block(ctx, x, y, cell, cell, col, 6, 1, 1, face);
}

const CARD_ICONS = {
  common: [
    '.........', '...###...', '..#####..', '.#######.', '.#######.',
    '.#######.', '..#####..', '...###...', '.........'
  ],
  rare: [
    '....#....', '...###...', '..#####..', '.#######.', '#########',
    '.#######.', '..#####..', '...###...', '....#....'
  ],
  epic: [
    '....#....', '...###...', '...###...', '#########', '.#######.',
    '..#####..', '..#####..', '.##...##.', '.#.....#.'
  ]
};

export const CARD_RARITIES = ['common', 'rare', 'epic'];

/**
 * Creates the texture if it is new, then redraws it. Redrawing in place means
 * sprites already on screen pick up a theme change without being rebuilt.
 */
function paint(scene, key, width, height, draw) {
  const isNew = !scene.textures.exists(key);
  const texture = isNew
    ? scene.textures.createCanvas(key, width, height)
    : scene.textures.get(key);

  const ctx = texture.getContext();
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, texture.width, texture.height);
  draw(ctx, texture, isNew);
  texture.refresh();
  return texture;
}

/**
 * Bakes every sprite in the game for the given theme. Called at boot and again
 * whenever the player picks a new theme.
 */
export function buildTextures(scene, colors) {
  paint(scene, TEX.pixel, 3, 3, (ctx) => {
    ctx.fillStyle = PALETTE.white;
    ctx.fillRect(0, 0, 3, 3);
  });

  // Tiled behind the draft cards and tinted per rarity.
  paint(scene, TEX.dither, DITHER_CELL * 2, DITHER_CELL * 2, (ctx) => {
    dither(ctx, 0, 0, DITHER_CELL * 2, DITHER_CELL * 2, PALETTE.white, DITHER_CELL);
  });

  paint(scene, TEX.coin, 3, 3, (ctx) => {
    ctx.fillStyle = colors.pellet;
    ctx.fillRect(0, 0, 3, 3);
  });

  // Two sizes, flipped on a timer, is the whole "pulse".
  paint(scene, TEX.orb, ORB_CELL * 2, ORB_CELL, (ctx, texture, isNew) => {
    [7, 9].forEach((size, i) => {
      const cx = i * ORB_CELL + ORB_CELL / 2;
      const cy = ORB_CELL / 2;
      const half = Math.round(size / 2);
      ctx.fillStyle = colors.power;
      ctx.fillRect(cx - half, cy - half + 1, size, size - 2);
      ctx.fillRect(cx - half + 1, cy - half, size - 2, size);
    });
    if (isNew) {
      texture.add('small', 0, 0, 0, ORB_CELL, ORB_CELL);
      texture.add('big', 0, ORB_CELL, 0, ORB_CELL, ORB_CELL);
    }
  });

  // Frame 0 is the locked gate, frames 1 and 2 alternate once it opens.
  paint(scene, TEX.gate, TILE * 3, TILE, (ctx, texture, isNew) => {
    const outer = Math.round(TILE * 0.45);
    for (let frame = 0; frame < 3; frame++) {
      const cx = frame * TILE + TILE / 2;
      const cy = TILE / 2;
      if (frame === 0) {
        ring(ctx, cx, cy, outer, PALETTE.muted);
        const bar = Math.max(2, Math.round(TILE * 0.08));
        ctx.fillStyle = PALETTE.muted;
        ctx.fillRect(cx - bar / 2, cy - outer, bar, outer * 2);
        ctx.fillRect(cx - outer, cy - bar / 2, outer * 2, bar);
      } else {
        const lit = frame === 2;
        ring(ctx, cx, cy, outer, colors.accent);
        square(ctx, cx, cy, Math.round(TILE * (lit ? 0.28 : 0.2)) * 2, lit ? PALETTE.white : colors.accent);
      }
    }
    if (isNew) {
      texture.add('closed', 0, 0, 0, TILE, TILE);
      texture.add('open-0', 0, TILE, 0, TILE, TILE);
      texture.add('open-1', 0, TILE * 2, 0, TILE, TILE);
    }
  });

  paint(scene, TEX.pac, TILE * PAC_STEPS, TILE * PAC_DIRS.length, (ctx, texture, isNew) => {
    PAC_DIRS.forEach((dir, row) => {
      const vector = {
        right: [1, 0], left: [-1, 0], up: [0, -1], down: [0, 1]
      }[dir];
      for (let step = 0; step < PAC_STEPS; step++) {
        const mouth = (step / (PAC_STEPS - 1)) * PAC_MAX_MOUTH;
        pac(ctx, step * TILE, row * TILE, TILE, vector[0], vector[1], mouth, colors.pellet);
        if (isNew) texture.add(`${dir}-${step}`, 0, step * TILE, row * TILE, TILE, TILE);
      }
    });
  });

  // Four eye directions per ghost type, plus the two frightened blink frames.
  paint(scene, TEX.ghost, TILE * 4, TILE * 6, (ctx, texture, isNew) => {
    for (let type = 0; type < 4; type++) {
      for (let eye = 0; eye < 4; eye++) {
        const x = eye * TILE;
        const y = type * TILE;
        ghost(ctx, x, y, TILE, colors.ghosts[type], eye % 2, (eye / 2) | 0);
        if (isNew) texture.add(`t${type}-${eye}`, 0, x, y, TILE, TILE);
      }
    }
    for (let blink = 0; blink < 2; blink++) {
      const y = (4 + blink) * TILE;
      frightenedGhost(ctx, 0, y, TILE, blink === 1);
      if (isNew) texture.add(`fright-${blink}`, 0, 0, y, TILE, TILE);
    }
  });

  paint(scene, TEX.warden, WARDEN_SIZE * 2, WARDEN_SIZE, (ctx, texture, isNew) => {
    for (let frame = 0; frame < 2; frame++) {
      const x = frame * WARDEN_SIZE;
      const cell = WARDEN_SIZE / 9;
      bitmap(ctx, GHOST_BODY, {B: frame ? PALETTE.slate : PALETTE.shadow}, x, 0, WARDEN_SIZE, WARDEN_SIZE);
      block(ctx, x, 0, cell, cell, 2, 2, 2, 2, PALETTE.danger);
      block(ctx, x, 0, cell, cell, 5, 2, 2, 2, PALETTE.danger);
      if (isNew) texture.add(`f${frame}`, 0, x, 0, WARDEN_SIZE, WARDEN_SIZE);
    }
  });

  paint(scene, TEX.anchor, ANCHOR_SIZE * 2, ANCHOR_SIZE, (ctx, texture, isNew) => {
    for (let frame = 0; frame < 2; frame++) {
      const cx = frame * ANCHOR_SIZE + ANCHOR_SIZE / 2;
      const cy = ANCHOR_SIZE / 2;
      ring(ctx, cx, cy, 6, frame ? colors.accent : PALETTE.muted);
      square(ctx, cx, cy, 4, colors.accent);
      if (isNew) texture.add(`f${frame}`, 0, frame * ANCHOR_SIZE, 0, ANCHOR_SIZE, ANCHOR_SIZE);
    }
  });

  paint(scene, TEX.bait, BAIT_SIZE, BAIT_SIZE, (ctx) => {
    pac(ctx, 0, 0, BAIT_SIZE, 1, 0, 0.4, PALETTE.cyan);
  });

  paint(scene, TEX.cardIcon, CARD_ICON_SIZE * 3, CARD_ICON_SIZE, (ctx, texture, isNew) => {
    CARD_RARITIES.forEach((rarity, i) => {
      const x = i * CARD_ICON_SIZE;
      bitmap(ctx, CARD_ICONS[rarity], {'#': PALETTE.white}, x, 0, CARD_ICON_SIZE, CARD_ICON_SIZE);
      if (isNew) texture.add(rarity, 0, x, 0, CARD_ICON_SIZE, CARD_ICON_SIZE);
    });
  });
}

/**
 * Redraws the whole maze into one texture. It is a single quad on screen, which
 * is the entire reason the floor costs nothing to draw.
 */
export function paintMaze(scene, maze, colors) {
  paint(scene, TEX.maze, MAZE_W * TILE, MAZE_H * TILE, (ctx) => {
    for (let y = 0; y < MAZE_H; y++) {
      for (let x = 0; x < MAZE_W; x++) {
        const px = x * TILE;
        const py = y * TILE;
        const tile = maze[y][x];
        if (tile === WALL) wallTile(ctx, px, py, TILE, colors.wall);
        else if (tile === FAST) dither(ctx, px, py, TILE, TILE, 'rgba(44, 232, 245, 0.2)');
        else if (tile === MUD) dither(ctx, px, py, TILE, TILE, 'rgba(228, 166, 114, 0.2)');
      }
    }
  });
}
