const UI = {
clicks: [],
pointer: {x: -1, y: -1},
hoverAny: false,
cursor: null,
f: 16,
pad: 10
};

const UI_FONTS = new Map();
const UI_WIDTHS = new Map();
const UI_FITS = new Map();

function uiFont(size) {
const px = Math.max(6, Math.round(size));
let f = UI_FONTS.get(px);
if (f === undefined) { f = `${px}px "Press Start 2P"`; UI_FONTS.set(px, f); }
return f;
}

function uiSetFont(c, size) {
const f = uiFont(size);
if (c.__uiFont !== f) { c.font = f; c.__uiFont = f; }
}

function uiTextWidth(c, text, size) {
const px = Math.max(6, Math.round(size));
const key = px + '|' + text;
let w = UI_WIDTHS.get(key);
if (w === undefined) {
uiSetFont(c, px);
w = c.measureText(text).width;
if (UI_WIDTHS.size > 2048) UI_WIDTHS.clear();
UI_WIDTHS.set(key, w);
}
return w;
}

function uiText(c, text, x, y, size, color, align) {
const w = uiTextWidth(c, text, size);
uiSetFont(c, size);
c.textBaseline = 'top';
c.fillStyle = color;
let px = x;
if (align === 'center') px = x - w / 2;
else if (align === 'right') px = x - w;
c.fillText(text, Math.round(px), Math.round(y));
return w;
}

function uiFitSize(c, text, room, max) {
const key = max + '|' + room + '|' + text;
const hit = UI_FITS.get(key);
if (hit !== undefined) return hit;
let s = max;
while (s > 6 && uiTextWidth(c, text, s) > room) s -= 1;
if (UI_FITS.size > 1024) UI_FITS.clear();
UI_FITS.set(key, s);
return s;
}

function uiFlushTextCache() {
UI_WIDTHS.clear();
UI_FITS.clear();
if (typeof uictx !== 'undefined') uictx.__uiFont = null;
}
if (document.fonts && document.fonts.addEventListener) {
document.fonts.addEventListener('loadingdone', uiFlushTextCache);
}
UI.flushTextCache = uiFlushTextCache;

function uiRect(c, x, y, w, h, color) {
c.fillStyle = color;
c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function uiBorder(c, x, y, w, h, color, t) {
t = Math.max(2, Math.round(t || 2));
x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
c.fillStyle = color;
c.fillRect(x, y, w, t);
c.fillRect(x, y + h - t, w, t);
c.fillRect(x, y, t, h);
c.fillRect(x + w - t, y, t, h);
}

function uiPanel(c, x, y, w, h, fill, light, dark, t) {
t = Math.max(2, Math.round(t || 2));
uiRect(c, x, y, w, h, fill);
c.fillStyle = light;
c.fillRect(Math.round(x), Math.round(y), Math.round(w), t);
c.fillRect(Math.round(x), Math.round(y), t, Math.round(h));
c.fillStyle = dark;
c.fillRect(Math.round(x), Math.round(y + h - t), Math.round(w), t);
c.fillRect(Math.round(x + w - t), Math.round(y), t, Math.round(h));
}

function uiBar(c, x, y, w, h, pct, fill, empty, border) {
w = Math.max(8, Math.round(w)); h = Math.max(4, Math.round(h));
uiRect(c, x, y, w, h, empty);
const inner = w - 4;
const seg = Math.max(3, Math.round(h * 0.7));
const cells = Math.max(1, Math.floor(inner / seg));
const cw = inner / cells;
const on = Math.round(cells * Math.max(0, Math.min(1, pct)));
if (on > 0) {
const cy = Math.round(y + 2), cellW = Math.round(Math.max(1, cw - 1)), cellH = Math.round(h - 4);
c.fillStyle = fill;
for (let i = 0; i < on; i++) c.fillRect(Math.round(x + 2 + i * cw), cy, cellW, cellH);
}
uiBorder(c, x, y, w, h, border, 2);
}

function uiHit(x, y, w, h) {
const p = UI.pointer;
return p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h;
}
function uiClicked(x, y, w, h) {
const list = UI.clicks;
for (let i = 0; i < list.length; i++) {
const cl = list[i];
if (!cl.used && cl.x >= x && cl.x <= x + w && cl.y >= y && cl.y <= y + h) {
cl.used = true;
return true;
}
}
return false;
}
UI.queueClick = function (p) {
if (UI.clicks.length > 8) UI.clicks.shift();
UI.clicks.push({x: p.x, y: p.y, used: false});
};
UI.clearClicks = function () { UI.clicks.length = 0; };

function uiButton(c, label, x, y, w, h, opts) {
opts = opts || {};
const g = game.colors;
const hot = uiHit(x, y, w, h);
if (hot) UI.hoverAny = true;
const col = opts.active ? g.accent : (opts.dim ? '#5a6988' : (hot ? g.text : g.ui));
uiRect(c, x, y, w, h, hot ? 'rgba(58, 68, 102, 0.55)' : 'rgba(24, 20, 37, 0.8)');
uiBorder(c, x, y, w, h, col, 2);
const size = uiFitSize(c, label, w - UI.pad * 2, opts.size || UI.f);
uiText(c, label, x + w / 2, y + (h - size) / 2, size, col, 'center');
return uiClicked(x, y, w, h);
}

UI.metrics = function () {
UI.f = 24;
UI.pad = 18;
};
UI.btnH = function (f) { return Math.round(Math.max(58, (f || UI.f) * 2.4)); };
UI.btnW = function () { return Math.min(VIRTUAL_W - UI.pad * 2, 420); };

function uiPlan(rows, f, W) {
const gap = Math.round(f * 0.5);
const sum = (arr) => arr.reduce((a, r) => a + r.h, 0) + Math.max(0, arr.length - 1) * gap;
return {gap, rows, total: sum(rows)};
}

function uiStack(c, build, top, bottom) {
const W = canvas.width;
const avail = Math.max(40, bottom - top);
let f = UI.f, rows, plan;
for (let attempt = 0; attempt < 10; attempt++) {
rows = build(f);
plan = uiPlan(rows, f, W);
if (plan.total <= avail || f <= 8) break;
f = Math.max(8, Math.round(f * 0.9));
}
const colW = Math.min(W - UI.pad * 2, UI.btnW());
let y = top + Math.max(0, (avail - plan.total) / 2);
plan.rows.forEach(r => {
r.draw(Math.round(y), f, W / 2, r.full ? W - UI.pad * 2 : colW);
y += r.h + plan.gap;
});
}

function uiSpeaker(c, x, y, s, on, color) {
uiRect(c, x + s, y + s * 2, s, s * 2, color);
uiRect(c, x + s * 2, y + s, s, s * 4, color);
uiRect(c, x + s * 3, y, s, s * 6, color);
if (on) {
uiRect(c, x + s * 5, y + s * 2, s, s * 2, color);
uiRect(c, x + s * 6, y + s, s, s * 4, color);
} else {
uiRect(c, x + s * 5, y + s * 2, s, s, color);
uiRect(c, x + s * 5, y + s * 3, s, s, color);
uiRect(c, x + s * 6, y + s, s, s, color);
uiRect(c, x + s * 6, y + s * 3, s, s, color);
}
}

UI.hudLayout = function (g) {
const c = uictx, f = UI.f, W = canvas.width, pad = UI.pad;
const left = `floor ${g.floor}   score ${g.score}`;
const hp = `hp ${Math.ceil(g.player.health)}/${g.player.maxHealth}`;
const sp = Math.max(2, Math.round(f / 4));
const spW = sp * 8;
const barW = Math.round(f * 6.5);
const leftW = uiTextWidth(c, left, f);
const rightW = uiTextWidth(c, hp, f) + Math.round(f * 0.5) + barW;
const two = leftW + rightW + spW + pad * 4 > W;
const rowH = Math.round(f * 1.35);
const barH = Math.max(4, Math.round(f * 0.5));
const h = two ? Math.round(rowH + barH * 2 + pad * 2.2) : Math.round(Math.max(rowH, barH * 2 + 4) + pad * 1.6);
return {two, left, hp, sp, spW, barW, barH, leftW, rowH, height: h};
};
UI.hudHeight = function () { return UI.hudLayout(game).height; };

UI.hud = function (g, c) {
const f = UI.f, W = canvas.width, pad = UI.pad;
const L = UI.hudLayout(g), H = L.height, col = g.colors;
uiRect(c, 0, 0, W, H, col.bg);
uiRect(c, 0, H - 2, W, 2, col.ui);

uiText(c, L.left, pad, Math.round(pad * 0.7), f, col.ui);

const spX = W - pad - L.spW, spY = Math.round(pad * 0.7);
const pd = Math.round(f * 0.5);
if (uiClicked(spX - pd, spY - pd, L.spW + pd * 2, L.sp * 6 + pd * 2)) audio.toggle();
if (uiHit(spX - pd, spY - pd, L.spW + pd * 2, L.sp * 6 + pd * 2)) UI.hoverAny = true;
uiSpeaker(c, spX, spY, L.sp, audio.enabled, col.accent);

let mx, my;
if (L.two) {
mx = pad;
my = Math.round(pad * 0.7 + L.rowH + pad * 0.4);
uiText(c, L.hp, mx, my, f, col.ui);
my += Math.round(f * 1.2);
} else {
mx = W - pad - L.spW - Math.round(f * 0.8) - L.barW;
my = Math.round(pad * 0.7);
uiText(c, L.hp, mx - Math.round(f * 0.5), my, f, col.ui, 'right');
}
const bw = L.two ? Math.min(L.barW * 2, W - pad * 2) : L.barW;
uiBar(c, mx, my, bw, L.barH, g.player.health / g.player.maxHealth, col.pellet, '#262b44', col.text);
uiBar(c, mx, my + L.barH + 2, bw, Math.max(3, Math.round(L.barH * 0.6)),
Math.min(1, 1 - g.player.dashCooldown / g.player.stats.dashCd), '#b55088', '#262b44', '#3a4466');
};

UI.status = function (g, c) {
if (g.screen !== 'play' || !g.gate) return;
const f = UI.f, W = canvas.width, pad = UI.pad;
const bits = [];
if (!g.gate.open) bits.push(`coins ${g.coinsTaken}/${g.quota}`);
else bits.push(`gate open  coins x${g.player.stats.overtimeRate}`);
if (g.streak > 1) bits.push(`streak ${g.streak}`);
if (g.warden) bits.push('the warden is loose');
else bits.push(`curfew ${Math.max(0, Math.ceil(g.curfew))}s`);
const txt = bits.join('   ');
let color = '#8b9bb4';
if (g.warden) color = Math.floor(Date.now() / 300) % 2 ? '#ff0044' : '#8b9bb4';
else if (g.gate.open) color = g.colors.accent;
let y = UI.hudHeight() + pad * 0.4;
const s = uiFitSize(c, txt, W - pad * 2, f * 0.85);
uiText(c, txt, W / 2, y, s, color, 'center');
const card = g.player.activeItem ? CARDS[g.player.activeItem] : null;
if (card) {
const ready = g.player.activeCooldown <= 0;
let label = `${card.name}  ${ready ? '[e]' : Math.ceil(g.player.activeCooldown) + 's'}`;
if (card.name === 'warp anchor' && g.player.anchor && ready) label = 'warp anchor  [e] jump';
const s2 = uiFitSize(c, label, W - pad * 2, f * 0.85);
uiText(c, label, W / 2, y + s * 1.5, s2, ready ? g.colors.accent : '#5a6988', 'center');
}
};

UI.touchZones = function () {
const W = canvas.width, H = canvas.height, f = UI.f, pad = UI.pad;
const k = 92;
const bs = Math.round(k * 1.3);
const ox = pad, oy = H - pad - k * 3;
const arcX = bs + Math.round(pad * 0.5), arcY = Math.round(bs * 0.62);
return {
up: {x: ox + k, y: oy, w: k, h: k},
left: {x: ox, y: oy + k, w: k, h: k},
mid: {x: ox + k, y: oy + k, w: k, h: k},
right: {x: ox + k * 2, y: oy + k, w: k, h: k},
down: {x: ox + k, y: oy + k * 2, w: k, h: k},
dash: {x: W - pad - bs, y: H - pad - bs, w: bs, h: bs},
ult: {x: W - pad - bs - arcX, y: H - pad - bs - arcY, w: bs, h: bs},
height: k * 3 + pad * 2
};
};
UI.landscape = function () { return canvas.width > canvas.height * 1.2; };
UI.controlsHeight = function (g) {
if (!(isMobile && g.screen === 'play')) return 0;
return UI.landscape() ? 0 : UI.touchZones().height;
};
UI.playArea = function (g) {
const top = UI.hudHeight() + UI.pad;
return {
x: 0, y: top, w: canvas.width,
h: Math.max(80, canvas.height - top - UI.controlsHeight(g) - UI.pad)
};
};

UI.touch = function (g, c) {
const z = UI.touchZones(), col = g.colors;
const overlay = UI.landscape();
if (overlay) c.globalAlpha = 0.62;
['up', 'left', 'mid', 'right', 'down'].forEach(k => {
const r = z[k], held = g.held === k;
uiPanel(c, r.x, r.y, r.w, r.h, held ? '#181425' : '#262b44',
held ? '#181425' : '#3a4466', held ? '#3a4466' : '#181425', 3);
});
const A = (r, dx, dy) => {
const cx = r.x + r.w / 2, cy = r.y + r.h / 2, s = Math.max(2, Math.round(r.w / 11));
for (let i = 0; i < 3; i++) {
const len = (3 - i) * 2;
if (dy) uiRect(c, cx - len * s / 2, cy + dy * (i - 1) * s, len * s, s, col.accent);
else uiRect(c, cx + dx * (i - 1) * s, cy - len * s / 2, s, len * s, col.accent);
}
};
A(z.up, 0, -1); A(z.down, 0, 1); A(z.left, -1, 0); A(z.right, 1, 0);
const md = Math.max(3, Math.round(z.mid.w * 0.16));
uiRect(c, z.mid.x + z.mid.w / 2 - md, z.mid.y + z.mid.h / 2 - md, md * 2, md * 2, '#181425');

const btn = (r, label, color, ready) => {
uiRect(c, r.x, r.y, r.w, r.h, 'rgba(24, 20, 37, 0.8)');
uiBorder(c, r.x, r.y, r.w, r.h, ready ? color : '#5a6988', 3);
const s = uiFitSize(c, label, r.w - 8, Math.round(r.w * 0.28));
uiText(c, label, r.x + r.w / 2, r.y + r.h / 2 - s / 2, s, ready ? color : '#5a6988', 'center');
};
btn(z.dash, 'dash', col.accent, g.player.dashCooldown <= 0);
btn(z.ult, 'item', '#b55088', !!g.player.activeItem && g.player.activeCooldown <= 0);
if (overlay) c.globalAlpha = 1;
};

function uiDim(c) { uiRect(c, 0, 0, canvas.width, canvas.height, 'rgba(24, 20, 37, 0.95)'); }

function titleRow(f, g) {
const c = uictx;
return {
full: true,
h: Math.round(f * 2.1),
draw: (y, ff, cx, cw) => {
const s = uiFitSize(c, 'KuruKuru Chase!!', cw, ff * 2);
uiText(c, 'KuruKuru Chase!!', cx, y, s, g.colors.text, 'center');
}
};
}
function textRow(f, text, color, mult, notFull) {
const c = uictx;
return {
full: !notFull,
h: Math.round(f * (mult || 1) * 1.25),
draw: (y, ff, cx, cw) => {
const s = uiFitSize(c, text, cw, ff * (mult || 1));
uiText(c, text, cx, y, s, color, 'center');
}
};
}
function buttonRow(f, label, onClick, opts) {
const c = uictx;
return {
h: UI.btnH(f),
draw: (y, ff, cx, cw) => {
const h = UI.btnH(ff);
if (uiButton(c, label, cx - cw / 2, y, cw, h, opts)) onClick();
}
};
}

UI.loading = function (g, c) {
const W = canvas.width, H = canvas.height;
uiRect(c, 0, 0, W, H, g.colors.bg);
uiStack(c, (f) => {
const rows = [titleRow(f, g)];
rows.push({
full: true,
h: Math.round(f * 1.2),
draw: (y, ff, cx, cw) => {
const pw = Math.min(cw, ff * 20);
uiBar(c, cx - pw / 2, y, pw, Math.round(ff * 1.1), g.loadProgress, g.colors.accent, '#262b44', g.colors.ui);
}
});
rows.push(textRow(f, g.loadLabel, '#8b9bb4'));
if (g.loadProgress >= 1) {
rows.push(buttonRow(f, 'start', () => g.finishBoot(), {active: true}));
rows.push(buttonRow(f, `shaders: ${g.shaderId === 'off' ? 'off' : 'on'}`,
() => g.setShader(g.shaderId === 'off' ? (g.lastShader || DEFAULT_SHADER) : 'off'),
{dim: g.shaderId === 'off'}));
}
return rows;
}, UI.pad, H - UI.pad);
};

UI.menu = function (g, c) {
const H = canvas.height;
uiDim(c);
uiStack(c, (f) => {
const rows = [titleRow(f, g), textRow(f, `high score ${g.highScore}`, '#8b9bb4', 0.85)];
rows.push(buttonRow(f, `seed: ${g.randomSeed ? 'random' : 'custom'}`, () => {
g.randomSeed = !g.randomSeed;
g.seedFocus = !g.randomSeed;
}));
if (!g.randomSeed) {
rows.push({
h: UI.btnH(f),
draw: (y, ff, cx, cw) => {
const h = UI.btnH(ff), x = cx - cw / 2;
if (uiClicked(x, y, cw, h)) g.seedFocus = true;
if (uiHit(x, y, cw, h)) UI.hoverAny = true;
uiRect(c, x, y, cw, h, '#181425');
uiBorder(c, x, y, cw, h, g.seedFocus ? g.colors.text : g.colors.accent, 2);
const txt = g.seedText || 'type a seed';
const s = uiFitSize(c, txt, cw - UI.pad * 2, ff);
uiText(c, txt, cx, y + (h - s) / 2, s, g.seedText ? g.colors.text : '#5a6988', 'center');
if (g.seedFocus && Math.floor(Date.now() / 400) % 2) {
uiRect(c, cx + uiTextWidth(c, txt, s) / 2 + 4, y + (h - s) / 2, Math.max(2, s / 8), s, g.colors.text);
}
}
});
}
rows.push(buttonRow(f, 'start run', () => g.startGame(), {active: true}));
rows.push(buttonRow(f, 'themes', () => { g.screen = 'themes'; }));
rows.push(buttonRow(f, 'options', () => { g.screen = 'options'; }));
if (!isMobile) rows.push(textRow(f, 'space dash    e item    p pause', '#5a6988', 0.85));
return rows;
}, UI.hudHeight(), H - UI.pad);
};

UI.themes = function (g, c) {
const W = canvas.width, H = canvas.height;
uiDim(c);
uiStack(c, (f) => {
const rows = [titleRow(f, g), textRow(f, 'select theme', g.colors.text, 0.9)];
const cols = W > 900 ? 6 : (W > 620 ? 3 : 2);
const gap = Math.round(f * 0.5);
const lines = Math.ceil(THEMES.length / cols);
const th = Math.round(f * 3.4);
rows.push({
full: true,
h: lines * th + (lines - 1) * gap,
draw: (y, ff, cx, cw) => {
const tw = Math.min((cw - gap * (cols - 1)) / cols, ff * 12);
const total = tw * cols + gap * (cols - 1);
const x0 = cx - total / 2;
THEMES.forEach((t, i) => {
const locked = g.highScore < t.score;
const bx = x0 + (i % cols) * (tw + gap);
const by = y + Math.floor(i / cols) * (th + gap);
const on = i === g.currentThemeIndex;
if (!locked && uiClicked(bx, by, tw, th)) g.applyTheme(i);
if (uiHit(bx, by, tw, th)) UI.hoverAny = true;
uiRect(c, bx, by, tw, th, locked ? 'rgba(24,20,37,0.9)' : '#181425');
uiBorder(c, bx, by, tw, th, on ? g.colors.accent : (locked ? '#3a4466' : g.colors.ui), 2);
uiText(c, t.name, bx + tw / 2, by + th * 0.22, uiFitSize(c, t.name, tw - 8, ff * 0.9),
locked ? '#5a6988' : t.colors.ui, 'center');
const sub = locked ? `${t.score / 1000}k` : 'ok';
uiText(c, sub, bx + tw / 2, by + th * 0.6, uiFitSize(c, sub, tw - 8, ff * 0.8), '#8b9bb4', 'center');
});
}
});
rows.push(buttonRow(f, 'back', () => { g.screen = 'menu'; }));
return rows;
}, UI.hudHeight(), H - UI.pad);
};

UI.options = function (g, c) {
const H = canvas.height;
uiDim(c);
uiStack(c, (f) => {
const rows = [titleRow(f, g), textRow(f, 'shader', '#8b9bb4', 0.9)];
SHADER_ORDER.forEach(id => {
rows.push(buttonRow(f, id === 'off' ? 'off' : SHADERS[id].name,
() => { g.setShader(id); },
{active: g.shaderId === id}));
});
rows.push(textRow(f, 'frame limit', '#8b9bb4', 0.9));
rows.push({
h: UI.btnH(f),
draw: (y, ff, cx, cw) => {
const h = UI.btnH(ff);
const bw = (cw - UI.pad * 2) / 3;
[30, 60, 120].forEach((v, i) => {
const x = cx - cw / 2 + i * (bw + UI.pad);
if (uiButton(c, String(v), x, y, bw, h, {active: g.fpsCap === v})) g.setFps(v);
});
}
});
rows.push({
h: UI.btnH(),
draw: (y, ff, cx, cw) => {
const w = cw, h = UI.btnH(ff), x = cx - w / 2;
UI.fsRect = {x, y, w, h};
uiButton(c, document.fullscreenElement ? 'exit fullscreen' : 'fullscreen', x, y, w, h);
}
});
rows.push(buttonRow(f, 'back', () => { g.screen = 'menu'; }));
return rows;
}, UI.hudHeight(), H - UI.pad);
};

const RARITY_COLORS = { common: '#8b9bb4', rare: '#2ce8f5', epic: '#fee761' };
const RARITY_DITHER = {
common: 'rgba(139, 155, 180, 0.10)',
rare: 'rgba(44, 232, 245, 0.12)',
epic: 'rgba(254, 231, 97, 0.14)'
};

UI.upgrade = function (g, c) {
const W = canvas.width, H = canvas.height;
uiDim(c);
uiStack(c, (f) => {
const rows = [textRow(f, `floor ${g.floor - 1} banked`, g.colors.accent)];
rows.push(textRow(f, 'pick a card', '#8b9bb4', 0.8));
const ch = Math.round(f * 3.6);
const wide = canvas.height < 600 && W > canvas.height * 1.3;
g.upgradeChoices.forEach((k, i) => {
rows.push({
full: !wide,
h: ch,
draw: (y, ff, cx, cw) => {
const card = CARDS[k];
const w = Math.min(cw, ff * 30), x = cx - w / 2;
const t = (Date.now() - g.upgradeTime) / 1000 - i * 0.12;
if (t <= 0) return;
const pop = 1 - Math.pow(1 - Math.min(1, t / 0.3), 3);
const yy = y + Math.round((1 - pop) * 50);
const hot = pop >= 1 && uiHit(x, y, w, ch);
if (hot) UI.hoverAny = true;
if (pop >= 1 && uiClicked(x, y, w, ch)) { g.pickUpgrade(k); return; }
c.globalAlpha = pop;
const rc = RARITY_COLORS[card.rarity] || '#8b9bb4';
let bc = hot ? g.colors.text : rc;
if (card.rarity === 'epic' && !hot && Math.floor(Date.now() / 250) % 2) bc = '#ffffff';
uiRect(c, x, yy, w, ch, hot ? 'rgba(58, 68, 102, 0.55)' : 'rgba(24, 20, 37, 0.85)');
drawDither(c, x + 2, yy + 2, w - 4, ch - 4, RARITY_DITHER[card.rarity] || RARITY_DITHER.common, Math.max(3, Math.round(ff * 0.25)));
uiBorder(c, x, yy, w, ch, bc, 2);
const icon = Math.round(ch * 0.6);
const bob = hot ? Math.round(Math.sin(Date.now() / 130) * 3) : 0;
drawCardIcon(c, card.rarity, x + UI.pad, yy + Math.round((ch - icon) / 2) + bob, icon, rc);
const tx = x + UI.pad * 2 + icon;
const tag = card.type === 'active' ? `${card.rarity} · active` : card.rarity;
const tp = uiFitSize(c, tag, w * 0.35, ff * 0.75);
const nameRoom = w - (tx - x) - UI.pad * 2 - uiTextWidth(c, tag, tp);
uiText(c, card.name, tx, yy + ch * 0.18, uiFitSize(c, card.name, nameRoom, ff), g.colors.ui);
uiText(c, tag, x + w - UI.pad, yy + ch * 0.18, tp, rc, 'right');
uiText(c, card.desc, tx, yy + ch * 0.58, uiFitSize(c, card.desc, w - (tx - x) - UI.pad, ff * 0.85), '#8b9bb4');
c.globalAlpha = 1;
}
});
});
if (g.upgradeChoices.length === 0) rows.push(buttonRow(f, 'onward', () => g.pickUpgrade(null), {active: true}));
return rows;
}, UI.hudHeight(), H - UI.pad);
};

UI.gameover = function (g, c) {
const H = canvas.height;
uiDim(c);
uiStack(c, (f) => {
const rows = [textRow(f, 'game over', '#ff0044', 1.6)];
const stats = [
['score', String(g.bank), g.colors.ui],
['floor', String(g.floor), g.colors.accent],
['time', g.finalTime, g.colors.text],
['best streak', String(g.bestStreak), '#8b9bb4']
];
if (g.lostCarry > 0) stats.splice(1, 0, ['left behind', String(g.lostCarry), '#b55088']);
stats.forEach(r => {
rows.push(textRow(f, `${r[0]} ${r[1]}`, r[2], 0.9, true));
});
rows.push({
h: UI.btnH(f),
draw: (y, ff, cx, cw) => {
const h = UI.btnH(ff), x = cx - cw / 2;
const hw = (cw - UI.pad) / 2;
if (uiButton(c, 'share', x, y, hw, h)) g.shareResults();
if (uiButton(c, 'save', x + hw + UI.pad, y, hw, h)) g.downloadResults();
}
});
rows.push(buttonRow(f, 'main menu', () => { g.screen = 'menu'; }, {dim: true}));
return rows;
}, UI.hudHeight(), H - UI.pad);
};

UI.paused = function (g, c) {
uiRect(c, 0, 0, canvas.width, canvas.height, 'rgba(24, 20, 37, 0.72)');
uiText(c, 'paused', canvas.width / 2, canvas.height * 0.42, UI.f * 1.6, g.colors.text, 'center');
uiText(c, 'press p to keep going', canvas.width / 2, canvas.height * 0.42 + UI.f * 2.6, UI.f * 0.8, '#8b9bb4', 'center');
};

UI.banner = function (g, c) {
const t = (Date.now() - g.bannerTime) / 1400;
const a = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
c.globalAlpha = Math.max(0, Math.min(1, a));
uiText(c, `floor ${g.floor}`, canvas.width / 2, UI.hudHeight() + canvas.height * 0.16, UI.f * 1.8, g.colors.text, 'center');
c.globalAlpha = 1;
};

UI.rotate = function (g, c) {
const W = canvas.width, H = canvas.height, f = UI.f;
uiRect(c, 0, 0, W, H, g.colors.bg);
const u = Math.max(3, Math.round(f * 0.5));
const pw = u * 16, ph = u * 9;
const px = Math.round(W / 2 - pw / 2), py = Math.round(H / 2 - ph / 2 - f * 2);
uiBorder(c, px, py, pw, ph, g.colors.ui, u);
uiRect(c, px + u * 14, py + ph / 2 - u, u, u * 2, g.colors.ui);
const blink = Math.floor(Date.now() / 500) % 2;
uiRect(c, px + u * 2, py + u * 2, pw - u * 5, ph - u * 4, blink ? g.colors.accent : '#3a4466');
uiText(c, 'rotate your device', W / 2, H / 2 + f * 2, uiFitSize(c, 'rotate your device', W - f * 2, f), g.colors.text, 'center');
uiText(c, 'hold it sideways', W / 2, H / 2 + f * 3.8, uiFitSize(c, 'hold it sideways', W - f * 2, f * 0.85), '#8b9bb4', 'center');
};

UI.draw = function (g) {
const c = uictx;
uictx.clearRect(0, 0, uiCanvas.width, uiCanvas.height);
UI.metrics();
UI.hoverAny = false;
if (g.screen === 'loading') { UI.loading(g, c); UI.clearClicks(); return; }
if (needsRotate()) { UI.rotate(g, c); UI.clearClicks(); return; }
if (g.screen === 'menu') UI.menu(g, c);
else if (g.screen === 'themes') UI.themes(g, c);
else if (g.screen === 'options') UI.options(g, c);
else if (g.screen === 'upgrade') UI.upgrade(g, c);
else if (g.screen === 'gameover') UI.gameover(g, c);
else if (g.screen === 'play' && isMobile) UI.touch(g, c);
UI.hud(g, c);
UI.status(g, c);
if (g.screen === 'play' && g.state === 'paused') UI.paused(g, c);
else if (g.screen === 'play' && g.bannerTime && Date.now() - g.bannerTime < 1400) UI.banner(g, c);
UI.clearClicks();
if (!isMobile) {
const cursor = UI.hoverAny ? 'pointer' : 'default';
if (UI.cursor !== cursor) { displayCanvas.style.cursor = cursor; UI.cursor = cursor; }
}
};

window.UI = UI;
