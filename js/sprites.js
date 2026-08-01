const SHADE_CACHE = new Map();
function shade(hex, amt) {
const key = hex + '|' + amt;
const hit = SHADE_CACHE.get(key);
if (hit !== undefined) return hit;
let h = (hex || '#181425').replace('#', '');
if (h.length === 3) h = h.split('').map(c => c + c).join('');
let r = parseInt(h.substr(0, 2), 16);
let g = parseInt(h.substr(2, 2), 16);
let b = parseInt(h.substr(4, 2), 16);
r = Math.max(0, Math.min(255, r + amt));
g = Math.max(0, Math.min(255, g + amt));
b = Math.max(0, Math.min(255, b + amt));
const out = `rgb(${r},${g},${b})`;
if (SHADE_CACHE.size > 64) SHADE_CACHE.clear();
SHADE_CACHE.set(key, out);
return out;
}

function pxBlock(ctx, dx, dy, cw, ch, c0, r0, cSpan, rSpan, color) {
const x0 = dx + Math.floor(c0 * cw);
const y0 = dy + Math.floor(r0 * ch);
const x1 = dx + Math.floor((c0 + cSpan) * cw);
const y1 = dy + Math.floor((r0 + rSpan) * ch);
ctx.fillStyle = color;
ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
}

function drawBitmap(ctx, bmp, palette, dx, dy, dw, dh) {
const rows = bmp.length, cols = bmp[0].length;
const cw = dw / cols, ch = dh / rows;
dx = Math.round(dx); dy = Math.round(dy);
for (let r = 0; r < rows; r++) {
const line = bmp[r];
const y0 = dy + Math.floor(r * ch);
const y1 = dy + Math.floor((r + 1) * ch);
let c = 0;
while (c < cols) {
const key = line[c];
const color = (key === '.' || key === ' ') ? null : palette[key];
if (!color) { c++; continue; }
let e = c + 1;
while (e < cols && line[e] === key) e++;
const x0 = dx + Math.floor(c * cw);
ctx.fillStyle = color;
ctx.fillRect(x0, y0, dx + Math.floor(e * cw) - x0, y1 - y0);
c = e;
}
}
}

function pxSquare(ctx, cx, cy, s, color) {
const x = Math.round(cx - s / 2), y = Math.round(cy - s / 2);
ctx.fillStyle = color;
ctx.fillRect(x, y, s, s);
}

function pxRing(ctx, cx, cy, r, color) {
const x = Math.round(cx - r), y = Math.round(cy - r), s = Math.round(r * 2);
ctx.fillStyle = color;
ctx.fillRect(x, y, s, 2);
ctx.fillRect(x, y + s - 2, s, 2);
ctx.fillRect(x, y, 2, s);
ctx.fillRect(x + s - 2, y, 2, s);
}

function drawWall(ctx, sx, sy, ts, color) {
sx = Math.round(sx); sy = Math.round(sy);
const s = Math.round(ts);
ctx.fillStyle = color;
ctx.fillRect(sx, sy, s, s);
ctx.fillStyle = shade(color, 45);
ctx.fillRect(sx, sy, s, 2);
ctx.fillRect(sx, sy, 2, s);
ctx.fillStyle = shade(color, -55);
ctx.fillRect(sx, sy + s - 2, s, 2);
ctx.fillRect(sx + s - 2, sy, 2, s);
}

const DITHER_CACHE = new Map();
function ditherTile(w, h, color, cell) {
const key = w + '|' + h + '|' + color + '|' + cell;
let tile = DITHER_CACHE.get(key);
if (tile) return tile;
tile = document.createElement('canvas');
tile.width = w; tile.height = h;
const tc = tile.getContext('2d');
tc.imageSmoothingEnabled = false;
tc.fillStyle = color;
for (let y = 0; y < h; y += cell) {
for (let x = 0; x < w; x += cell) {
if (((x / cell) + (y / cell)) % 2 === 0) {
tc.fillRect(x, y, Math.min(cell, w - x), Math.min(cell, h - y));
}
}
}
if (DITHER_CACHE.size > 48) DITHER_CACHE.clear();
DITHER_CACHE.set(key, tile);
return tile;
}

function drawDither(ctx, sx, sy, w, h, color, cell) {
sx = Math.round(sx); sy = Math.round(sy);
w = Math.round(w); h = Math.round(h);
cell = Math.max(1, Math.round(cell || 3));
if (w <= 0 || h <= 0) return;
ctx.drawImage(ditherTile(w, h, color, cell), sx, sy);
}

function drawChecker(ctx, sx, sy, ts, color) {
drawDither(ctx, sx, sy, ts, ts, color, 3);
}

function drawOrb(ctx, cx, cy, s, color) {
cx = Math.round(cx); cy = Math.round(cy);
const h = Math.round(s / 2);
ctx.fillStyle = color;
ctx.fillRect(cx - h, cy - h + 1, s, s - 2);
ctx.fillRect(cx - h + 1, cy - h, s - 2, s);
}

function drawGate(ctx, cx, cy, ts, open, accent) {
cx = Math.round(cx); cy = Math.round(cy);
const pulse = Math.floor(Date.now() / 250) % 2;
const outer = Math.round(ts * 0.45);
const frame = open ? accent : '#5a6988';
pxRing(ctx, cx, cy, outer, frame);
if (open) {
const inner = Math.round(ts * (pulse ? 0.28 : 0.2));
pxSquare(ctx, cx, cy, inner * 2, pulse ? '#ffffff' : accent);
} else {
const t = Math.max(2, Math.round(ts * 0.08));
ctx.fillStyle = '#5a6988';
ctx.fillRect(cx - t / 2, cy - outer, t, outer * 2);
ctx.fillRect(cx - outer, cy - t / 2, outer * 2, t);
}
}

function drawAnchor(ctx, cx, cy, z, color) {
cx = Math.round(cx); cy = Math.round(cy);
const blink = Math.floor(Date.now() / 300) % 2;
pxRing(ctx, cx, cy, 6 * z, blink ? color : '#5a6988');
pxSquare(ctx, cx, cy, 4 * z, color);
}

const PAC_GRID = 9;
const PAC_DISC = new Uint8Array(PAC_GRID * PAC_GRID);
const PAC_ANGLE = new Float64Array(PAC_GRID * PAC_GRID);
const PAC_ROW = new Uint8Array(PAC_GRID);
(function () {
const n = PAC_GRID, center = (n - 1) / 2, rad = n / 2;
for (let gy = 0; gy < n; gy++) {
for (let gx = 0; gx < n; gx++) {
const ddx = gx - center, ddy = gy - center;
PAC_DISC[gy * n + gx] = Math.hypot(ddx, ddy) > rad - 0.15 ? 0 : 1;
PAC_ANGLE[gy * n + gx] = Math.atan2(ddy, ddx);
}
}
})();
function drawPac(ctx, cx, cy, radius, dirX, dirY, mouth, color) {
const n = PAC_GRID;
const box = radius * 2;
const dx = Math.round(cx - radius);
const dy = Math.round(cy - radius);
const cw = box / n, ch = box / n;
const biting = (dirX || dirY) && mouth > 0.01;
const facing = (dirX || dirY) ? Math.atan2(dirY, dirX) : 0;
ctx.fillStyle = color;
for (let gy = 0; gy < n; gy++) {
const row = gy * n;
for (let gx = 0; gx < n; gx++) {
let on = PAC_DISC[row + gx];
if (on && biting) {
let da = PAC_ANGLE[row + gx] - facing;
while (da > Math.PI) da -= Math.PI * 2;
while (da < -Math.PI) da += Math.PI * 2;
if (Math.abs(da) < mouth) on = 0;
}
PAC_ROW[gx] = on;
}
const y0 = dy + Math.floor(gy * ch);
const y1 = dy + Math.floor((gy + 1) * ch);
let gx = 0;
while (gx < n) {
if (!PAC_ROW[gx]) { gx++; continue; }
let e = gx + 1;
while (e < n && PAC_ROW[e]) e++;
const x0 = dx + Math.floor(gx * cw);
ctx.fillRect(x0, y0, dx + Math.floor(e * cw) - x0, y1 - y0);
gx = e;
}
}
let ex = 4, ey = 2;
if (dirY !== 0) { ex = 2; ey = 4; }
pxBlock(ctx, dx, dy, cw, ch, ex, ey, 1, 1, '#181425');
}

const GHOST_BODY = [
"..BBBBB..",
".BBBBBBB.",
"BBBBBBBBB",
"BBBBBBBBB",
"BBBBBBBBB",
"BBBBBBBBB",
"BBBBBBBBB",
"BBBBBBBBB",
"B.BB.BB.B"
];
function drawGhost(ctx, cx, cy, box, dir, bodyColor, frightened, blinkWhite) {
const n = 9;
const dx = Math.round(cx - box / 2);
const dy = Math.round(cy - box / 2);
const cw = box / n, ch = box / n;
const body = frightened ? (blinkWhite ? '#ffffff' : '#68386c') : bodyColor;
drawBitmap(ctx, GHOST_BODY, { B: body }, dx, dy, box, box);
if (frightened) {
const face = blinkWhite ? '#68386c' : '#ffffff';
pxBlock(ctx, dx, dy, cw, ch, 2, 3, 1, 2, face);
pxBlock(ctx, dx, dy, cw, ch, 6, 3, 1, 2, face);
pxBlock(ctx, dx, dy, cw, ch, 1, 6, 1, 1, face);
pxBlock(ctx, dx, dy, cw, ch, 3, 6, 1, 1, face);
pxBlock(ctx, dx, dy, cw, ch, 5, 6, 1, 1, face);
pxBlock(ctx, dx, dy, cw, ch, 7, 6, 1, 1, face);
} else {
const ox = dir.x > 0 ? 1 : 0;
const oy = dir.y > 0 ? 1 : 0;
pxBlock(ctx, dx, dy, cw, ch, 2, 2, 2, 2, '#ffffff');
pxBlock(ctx, dx, dy, cw, ch, 5, 2, 2, 2, '#ffffff');
pxBlock(ctx, dx, dy, cw, ch, 2 + ox, 2 + oy, 1, 1, '#181425');
pxBlock(ctx, dx, dy, cw, ch, 5 + ox, 2 + oy, 1, 1, '#181425');
}
}

const CARD_ICONS = {
common: [
".........",
"...###...",
"..#####..",
".#######.",
".#######.",
".#######.",
"..#####..",
"...###...",
"........."
],
rare: [
"....#....",
"...###...",
"..#####..",
".#######.",
"#########",
".#######.",
"..#####..",
"...###...",
"....#...."
],
epic: [
"....#....",
"...###...",
"...###...",
"#########",
".#######.",
"..#####..",
"..#####..",
".##...##.",
".#.....#."
]
};
function drawCardIcon(ctx, rarity, x, y, size, color) {
const bmp = CARD_ICONS[rarity] || CARD_ICONS.common;
drawBitmap(ctx, bmp, { '#': color }, x, y, size, size);
}

function drawWarden(ctx, cx, cy, box) {
const n = 9;
const dx = Math.round(cx - box / 2);
const dy = Math.round(cy - box / 2);
const cw = box / n, ch = box / n;
const flick = Math.floor(Date.now() / 120) % 2;
drawBitmap(ctx, GHOST_BODY, { B: flick ? '#3a4466' : '#262b44' }, dx, dy, box, box);
pxBlock(ctx, dx, dy, cw, ch, 2, 2, 2, 2, '#ff0044');
pxBlock(ctx, dx, dy, cw, ch, 5, 2, 2, 2, '#ff0044');
}
