class Game {
constructor() {
this.state = 'menu';
this.floor = 1;
this.bank = 0;
this.carry = 0;
this.lostCarry = 0;
this.streak = 0;
this.bestStreak = 0;
this.chain = 0;
this.camera = {x: 0, y: 0};
this.gameTime = 0;
this.startTime = 0;
this.hitsTaken = 0;
this.rng = Math.random;
this.seed = '';
this.shake = 0;
this.highScore = parseInt(localStorage.getItem('kurukuruBest')) || 0;
this.currentThemeIndex = parseInt(localStorage.getItem('kurukuruTheme')) || 0;
this.shaderId = 'off';
this.colors = THEMES[this.currentThemeIndex].colors;
this.player = this.freshPlayer();
this.heldDirs = [];
this.dirBuffer = null;
this.touchRoles = new Map();
this.needsFrame = true;
this.particles = new PooledList(
() => ({x: 0, y: 0, vx: 0, vy: 0, life: 0, color: '#ffffff'}), null, 128);
this.entities = new PooledList(
() => ({type: '', x: 0, y: 0, life: 0}), null, 8);
this.timeStop = 0;
this.veilTimer = 0;
this.magnetPulse = 0;
this.warden = null;
this.curfew = 90;
const fps = parseInt(localStorage.getItem('kurukuruFps'));
this.fpsCap = (fps === 30 || fps === 120) ? fps : 60;
this.upgradeTime = 0;
this.bannerTime = 0;
this.popups = new PooledList(
() => ({x: 0, y: 0, text: '', life: 0, color: '#ffffff'}), null, 16);
this.animationFrameId = null;
this.screen = 'loading';
this.loadProgress = 0;
this.loadLabel = 'starting';
this.lastShader = DEFAULT_SHADER;
this.randomSeed = true;
this.seedText = '';
this.seedFocus = false;
this.upgradeChoices = [];
this.finalTime = '0:00';
this.held = null;
this.loopFrame = () => this.loop();
this.setupInput();
this.applyTheme(this.currentThemeIndex);
}
get score() { return this.bank + this.carry; }
freshPlayer() {
return {
x: 10, y: 10, dirX: 0, dirY: 0,
health: 5, maxHealth: 5,
surgeTimer: 0, invulnTimer: 0, dashCooldown: 0,
activeItem: null, activeCooldown: 0,
intangible: 0, anchor: null, colorOverride: null,
stats: {
speed: 1, mudProof: false, dashDist: 0, dashCd: 3, dashStun: false,
ghostSlow: 1, surgePlus: 0, curfewPlus: 0, wardenSlow: 1,
bubble: false, encore: false,
coinPlus: 0, streakStep: 1, streakKeep: 0, overtimeRate: 2,
quotaRate: 0.7, bankBonus: 0, bounty: 1, orbPay: 0, gateHeal: 1, lucky: 0
},
cards: []
};
}
applyTheme(index) {
this.currentThemeIndex = index;
this.colors = THEMES[index].colors;
localStorage.setItem('kurukuruTheme', index);
document.documentElement.style.setProperty('--bg-color', this.colors.bg);
this.mazeDirty = true;
}
finishBoot() {
this.screen = 'menu';
}
setFps(v) {
if (v !== 30 && v !== 60 && v !== 120) v = 60;
this.fpsCap = v;
localStorage.setItem('kurukuruFps', v);
}
setShader(id) {
if (id !== 'off' && !SHADERS[id]) id = 'off';
this.shaderId = id;
if (id !== 'off') this.lastShader = id;
const src = id === 'off' ? null : SHADERS[id].source;
window.GAME_SHADER = src;
if (window.postfx) postfx.setShader(src);
}
pressDir(name) {
const i = this.heldDirs.indexOf(name);
if (i >= 0) this.heldDirs.splice(i, 1);
this.heldDirs.push(name);
this.queueDir(name);
}
releaseDir(name) {
const i = this.heldDirs.indexOf(name);
if (i >= 0) this.heldDirs.splice(i, 1);
}
queueDir(name) {
const v = DIR_VECTORS[name];
if (!v) return;
this.dirBuffer = {x: v[0], y: v[1], t: this.gameTime};
this.needsFrame = true;
}
desiredDir() {
const b = this.dirBuffer;
if (b) {
if (this.gameTime - b.t <= INPUT_BUFFER) return b;
this.dirBuffer = null;
}
const name = this.held || this.heldDirs[this.heldDirs.length - 1];
const v = name ? DIR_VECTORS[name] : null;
return v ? {x: v[0], y: v[1], t: this.gameTime} : null;
}
clearInput() {
this.heldDirs.length = 0;
this.dirBuffer = null;
this.held = null;
this.touchRoles.clear();
}
setupInput() {
const dirKey = (e) => KEY_DIRS[e.code] || KEY_DIRS[e.key] || KEY_DIRS[(e.key || '').toLowerCase()] || null;
window.addEventListener('keydown', e => {
if (e.ctrlKey || e.metaKey) return;
if (this.seedFocus && this.screen === 'menu') {
if (this.handleSeedKey(e)) { e.preventDefault(); this.needsFrame = true; return; }
}
const dir = dirKey(e);
const space = e.code === 'Space' || e.key === ' ';
if (dir || space) e.preventDefault();
if ((e.key === 'p' || e.key === 'P' || e.key === 'Escape') && (this.state === 'playing' || this.state === 'paused')) {
if (!e.repeat) this.state = this.state === 'playing' ? 'paused' : 'playing';
this.needsFrame = true;
return;
}
if (dir) { if (!e.repeat) this.pressDir(dir); return; }
if (this.state !== 'playing' || e.repeat) return;
if (space) this.dash();
else if (e.code === 'KeyE' || e.key === 'e' || e.key === 'E') this.useActive();
});
window.addEventListener('keyup', e => {
const dir = dirKey(e);
if (dir) this.releaseDir(dir);
});
window.addEventListener('blur', () => this.clearInput());
document.addEventListener('visibilitychange', () => {
if (document.hidden) this.clearInput();
else { this.lastTime = performance.now(); this.needsFrame = true; }
});
const toScene = (clientX, clientY) => {
const r = displayCanvas.getBoundingClientRect();
const fit = viewFit();
const bx = (clientX - r.left) / Math.max(1, r.width) * displayCanvas.width;
const by = (clientY - r.top) / Math.max(1, r.height) * displayCanvas.height;
return {
x: (bx - fit.x) / Math.max(1, fit.w) * VIRTUAL_W,
y: (by - fit.y) / Math.max(1, fit.h) * VIRTUAL_H
};
};
const inRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
const dirFromZone = (p) => {
const z = UI.touchZones();
for (const k of ['up', 'down', 'left', 'right']) if (inRect(p, z[k])) return k;
return null;
};
const press = (p) => {
UI.pointer = p;
this.needsFrame = true;
if (isMobile && !this.immersiveTried) {
this.immersiveTried = true;
try { goImmersive(); } catch (e) {}
}
if (this.screen === 'options' && UI.fsRect && inRect(p, UI.fsRect)) {
try { toggleFullscreen(); } catch (e) {}
return 'ui';
}
if (isMobile && this.screen === 'play') {
const z = UI.touchZones();
const d = dirFromZone(p);
if (d) { this.held = d; this.queueDir(d); return 'dpad'; }
if (inRect(p, z.dash)) { this.dash(); return 'action'; }
if (inRect(p, z.ult)) { this.useActive(); return 'action'; }
}
UI.queueClick(p);
return 'ui';
};
displayCanvas.addEventListener('mousemove', e => { UI.pointer = toScene(e.clientX, e.clientY); });
displayCanvas.addEventListener('mouseleave', () => { UI.pointer = {x: -1, y: -1}; this.held = null; });
displayCanvas.addEventListener('mousedown', e => { e.preventDefault(); press(toScene(e.clientX, e.clientY)); });
window.addEventListener('mouseup', () => { this.held = null; });
let swipeId = null, sx = 0, sy = 0, swiped = false;
displayCanvas.addEventListener('touchstart', e => {
e.preventDefault();
for (let i = 0; i < e.changedTouches.length; i++) {
const t = e.changedTouches[i];
const role = press(toScene(t.clientX, t.clientY));
this.touchRoles.set(t.identifier, role);
if (role === 'ui' && this.screen === 'play' && swipeId === null) {
swipeId = t.identifier; sx = t.clientX; sy = t.clientY; swiped = false;
}
}
}, {passive: false});
displayCanvas.addEventListener('touchmove', e => {
e.preventDefault();
for (let i = 0; i < e.changedTouches.length; i++) {
const t = e.changedTouches[i];
if (this.touchRoles.get(t.identifier) === 'dpad') {
const d = dirFromZone(toScene(t.clientX, t.clientY));
if (d && d !== this.held) { this.held = d; this.queueDir(d); }
continue;
}
if (t.identifier === swipeId && !swiped && this.screen === 'play') {
const dx = t.clientX - sx, dy = t.clientY - sy;
if (Math.abs(dx) > 30 || Math.abs(dy) > 30) {
swiped = true;
this.queueDir(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
}
}
}
}, {passive: false});
const endTouch = e => {
e.preventDefault();
for (let i = 0; i < e.changedTouches.length; i++) {
const t = e.changedTouches[i];
if (this.touchRoles.get(t.identifier) === 'dpad') this.held = null;
this.touchRoles.delete(t.identifier);
if (t.identifier === swipeId) swipeId = null;
}
if (e.touches.length === 0) {
this.held = null;
this.touchRoles.clear();
UI.pointer = {x: -1, y: -1};
}
this.needsFrame = true;
};
displayCanvas.addEventListener('touchend', endTouch, {passive: false});
displayCanvas.addEventListener('touchcancel', endTouch, {passive: false});
}
handleSeedKey(e) {
if (e.key === 'Backspace') { this.seedText = this.seedText.slice(0, -1); return true; }
if (e.key === 'Enter' || e.key === 'Escape') { this.seedFocus = false; return true; }
if (e.key.length === 1 && this.seedText.length < 12) { this.seedText += e.key; return true; }
return false;
}
dash() {
const p = this.player;
if(p.dashCooldown > 0) return;
if(p.dirX === 0 && p.dirY === 0) {
const want = this.desiredDir();
if(!want) return;
p.dirX = want.x; p.dirY = want.y;
}
p.dashCooldown = p.stats.dashCd;
p.invulnTimer = 0.5;
audio.sfxDash();
const steps = 3 + p.stats.dashDist;
for(let i=0; i<steps; i++) {
const nx = p.x + p.dirX;
const ny = p.y + p.dirY;
if(nx > 0 && nx < MAZE_WIDTH-1 && ny > 0 && ny < MAZE_HEIGHT-1 && (this.maze[Math.round(ny)][Math.round(nx)] !== 1 || p.intangible > 0)) {
p.x = nx; p.y = ny;
if(p.stats.dashStun) {
for(let gi=0; gi<this.ghosts.length; gi++) {
const g = this.ghosts[gi];
const gdx = g.x - nx, gdy = g.y - ny;
if(!g.dead && gdx*gdx + gdy*gdy < 0.64) g.stun = Math.max(g.stun, 2);
}
}
this.spawnParticle(nx*TILE_SIZE, ny*TILE_SIZE, 0, 0, 0.5, '#b55088');
} else break;
}
}
useActive() {
const p = this.player;
if(!p.activeItem || p.activeCooldown > 0) return;
const card = CARDS[p.activeItem];
if(!card) return;
const skip = card.onUse(this) === false;
audio.sfxSkill();
if(!skip) p.activeCooldown = card.cd;
}
startSurge(duration) {
this.player.surgeTimer = duration;
this.chain = 0;
this.ghosts.forEach(g => g.scaredTimer = duration);
}
startGame() {
try {
audio.init();
if(audio.ctx && audio.ctx.state === 'suspended') audio.ctx.resume();
audio.startMusic();
} catch (e) {}
this.seed = this.randomSeed ? Math.random().toString(36).substring(7) : (this.seedText || 'maze');
this.seedFocus = false;
const seedHash = xmur3(this.seed);
this.rng = mulberry32(seedHash());
this.floor = 1;
this.bank = 0;
this.carry = 0;
this.lostCarry = 0;
this.streak = 0;
this.bestStreak = 0;
this.hitsTaken = 0;
this.startTime = Date.now();
this.player = this.freshPlayer();
this.generateFloor();
this.bannerTime = Date.now();
this.state = 'playing';
this.screen = 'play';
this.lastTime = performance.now();
}
startLoop() {
if(this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
this.lastTime = performance.now();
this.loop();
}
generateFloor() {
this.maze = [];
for(let y=0; y<MAZE_HEIGHT; y++) { this.maze[y] = []; for(let x=0; x<MAZE_WIDTH; x++) this.maze[y][x] = 1; }
const carve = (x, y) => {
this.maze[y][x] = 0;
const dirs = CARVE_STEPS.slice().sort(()=>this.rng()-0.5);
for(let [dx,dy] of dirs) {
const nx=x+dx, ny=y+dy;
if(nx>0 && nx<MAZE_WIDTH-1 && ny>0 && ny<MAZE_HEIGHT-1 && this.maze[ny][nx]===1) {
this.maze[y+dy/2][x+dx/2] = 0;
carve(nx, ny);
}
}
};
carve(1, 1);
for(let i=0; i<20; i++) {
const x = Math.floor(this.rng()*(MAZE_WIDTH-2))+1;
const y = Math.floor(this.rng()*(MAZE_HEIGHT-2))+1;
if(this.maze[y][x]===1) this.maze[y][x]=0;
}
const empties = [];
for(let y=1; y<MAZE_HEIGHT-1; y++) for(let x=1; x<MAZE_WIDTH-1; x++) if(this.maze[y][x]===0) empties.push({x,y});
const start = empties[Math.floor(this.rng()*empties.length)];
this.player.x = start.x; this.player.y = start.y;
this.player.dirX = 0; this.player.dirY = 0;
this.dirBuffer = null;
this.player.anchor = null;
this.player.surgeTimer = 0;
const CELLS = MAZE_WIDTH * MAZE_HEIGHT;
const dist = new Int32Array(CELLS).fill(-1);
const queue = new Int32Array(CELLS);
let head = 0, tail = 0;
dist[start.y*MAZE_WIDTH + start.x] = 0;
queue[tail++] = start.y*MAZE_WIDTH + start.x;
while(head < tail) {
const cell = queue[head++];
const x = cell % MAZE_WIDTH, y = (cell / MAZE_WIDTH) | 0;
const d = dist[cell];
for(let i=0; i<DIRS4_XY.length; i++) {
const nx = x+DIRS4_XY[i][0], ny = y+DIRS4_XY[i][1];
if(nx>=0 && nx<MAZE_WIDTH && ny>=0 && ny<MAZE_HEIGHT && this.maze[ny][nx]!==1 && dist[ny*MAZE_WIDTH+nx] < 0) {
dist[ny*MAZE_WIDTH+nx] = d+1;
queue[tail++] = ny*MAZE_WIDTH+nx;
}
}
}
const validEmpties = empties.filter(p => dist[p.y*MAZE_WIDTH + p.x] >= 0);
let gateCell = start, gateDist = -1;
validEmpties.forEach(p => {
const d = dist[p.y*MAZE_WIDTH + p.x];
if(d > gateDist) { gateDist = d; gateCell = p; }
});
this.gate = {x: gateCell.x, y: gateCell.y, open: false};
validEmpties.forEach(p => {
if(p.x === gateCell.x && p.y === gateCell.y) return;
const r = this.rng();
if(r < 0.15) this.maze[p.y][p.x] = 2;
else if(r < 0.3) this.maze[p.y][p.x] = 3;
});
this.coins = []; this.orbs = [];
validEmpties.forEach(p => {
if(p.x === gateCell.x && p.y === gateCell.y) return;
if(Math.abs(p.x-start.x)>4 || Math.abs(p.y-start.y)>4) {
if(this.rng() < 0.02) this.orbs.push({x: p.x, y: p.y});
else this.coins.push({x: p.x, y: p.y});
}
});
while(this.orbs.length < 2 && this.coins.length > 1) {
let far = 0, fd = -1;
for(let i=0; i<this.coins.length; i++) {
const d = dist[this.coins[i].y*MAZE_WIDTH + this.coins[i].x];
if(d > fd) { fd = d; far = i; }
}
this.orbs.push(this.coins.splice(far, 1)[0]);
}
this.totalCoins = this.coins.length;
this.coinsTaken = 0;
this.quota = Math.max(1, Math.ceil(this.totalCoins * this.player.stats.quotaRate));
this.ghosts = [];
const count = Math.min(8, 3 + Math.floor((this.floor - 1) / 2));
for(let i=0; i<count; i++) {
let pos, tries = 0;
do { pos = validEmpties[Math.floor(this.rng()*validEmpties.length)]; tries++; }
while(Math.hypot(pos.x-start.x, pos.y-start.y) < 10 && tries < 50);
this.ghosts.push(new Ghost(pos.x, pos.y, i, this.floor, this.colors.ghosts));
}
this.warden = null;
this.curfew = Math.max(50, 92 - this.floor * 2) + this.player.stats.curfewPlus;
this.bubbleUp = this.player.stats.bubble;
this.chain = 0;
this.timeStop = 0;
this.veilTimer = 0;
this.magnetPulse = 0;
this.particles.clear();
this.entities.clear();
this.popups.clear();
this.mazeDirty = true;
}
tileAt(x, y) {
if(y < 0 || y >= MAZE_HEIGHT || x < 0 || x >= MAZE_WIDTH) return 1;
return this.maze[y][x];
}
spawnWarden() {
const corners = [[1, 1], [MAZE_WIDTH-2, 1], [1, MAZE_HEIGHT-2], [MAZE_WIDTH-2, MAZE_HEIGHT-2]];
let best = corners[0], bd = -1;
for(const [x, y] of corners) {
const d = Math.hypot(x - this.player.x, y - this.player.y);
if(d > bd) { bd = d; best = [x, y]; }
}
this.warden = new Warden(best[0], best[1]);
this.shake = 1;
audio.sfxWarden();
}
openGate() {
this.gate.open = true;
this.shake = Math.max(this.shake, 0.3);
audio.sfxGate();
for(let k=0; k<12; k++) this.spawnParticle(this.gate.x*TILE_SIZE, this.gate.y*TILE_SIZE, (this.rng()-0.5)*4, (this.rng()-0.5)*4, 1, this.colors.accent);
}
collectCoin(i) {
const coin = this.coins[i];
this.coins.splice(i, 1);
this.coinsTaken++;
const s = this.player.stats;
let pay = 10 + s.coinPlus;
if(this.gate.open) pay *= s.overtimeRate;
pay = Math.floor(pay * (1 + this.streak * 0.02));
if(s.lucky > 0 && this.rng() < s.lucky) {
pay *= 5;
this.spawnPopup('5x', coin.x, coin.y, '#fee761');
}
this.carry += pay;
this.streak += s.streakStep;
if(this.streak > this.bestStreak) this.bestStreak = this.streak;
audio.sfxCoin();
if(!this.gate.open && this.coinsTaken >= this.quota) this.openGate();
}
collectOrb(i) {
const orb = this.orbs[i];
this.orbs.splice(i, 1);
const s = this.player.stats;
this.startSurge(7 + s.surgePlus);
if(s.orbPay > 0) {
this.carry += s.orbPay;
this.spawnPopup('+' + s.orbPay, orb.x, orb.y, '#fee761');
}
audio.sfxOrb();
}
catchGhost(g) {
g.dead = true;
g.respawnTimer = 5;
this.chain++;
const pay = Math.min(800, 100 * Math.pow(2, this.chain - 1)) * this.player.stats.bounty;
this.carry += pay;
this.spawnPopup('+' + pay, g.x, g.y, '#fee761');
this.shake = 0.5;
audio.sfxCatch();
for(let k=0; k<10; k++) this.spawnParticle(g.x*TILE_SIZE, g.y*TILE_SIZE, (this.rng()-0.5)*5, (this.rng()-0.5)*5, 1, g.colors[g.type]);
}
hurt() {
const p = this.player;
if(this.bubbleUp) {
this.bubbleUp = false;
p.invulnTimer = 1.5;
this.shake = 0.5;
audio.sfxHurt();
return;
}
p.health -= 1;
this.hitsTaken++;
p.invulnTimer = 1.5;
this.shake = 1.0;
this.streak = Math.floor(this.streak * p.stats.streakKeep);
audio.sfxHurt();
for(let k=0; k<15; k++) this.spawnParticle(p.x*TILE_SIZE, p.y*TILE_SIZE, (this.rng()-0.5)*5, (this.rng()-0.5)*5, 1, '#ff0044');
if(p.health <= 0) {
if(p.stats.encore) {
p.stats.encore = false;
p.health = 1;
p.invulnTimer = 3;
this.shake = 2;
this.ghosts.forEach(g => g.stun = 3);
} else {
audio.sfxDie();
this.gameOver();
}
}
}
walkableFor(p, x, y) {
if(x < 0 || x >= MAZE_WIDTH || y < 0 || y >= MAZE_HEIGHT) return false;
return this.maze[y][x] !== 1 || p.intangible > 0;
}
stepPlayer(p, step) {
let want = this.desiredDir();
if(want) {
if(want.x === p.dirX && want.y === p.dirY) {
this.dirBuffer = null;
want = null;
} else if(p.dirX === 0 && p.dirY === 0) {
const cx = Math.round(p.x), cy = Math.round(p.y);
if(this.walkableFor(p, cx + want.x, cy + want.y)) {
p.x = cx; p.y = cy;
p.dirX = want.x; p.dirY = want.y;
this.dirBuffer = null;
want = null;
}
} else if(want.x === -p.dirX && want.y === -p.dirY) {
p.dirX = want.x; p.dirY = want.y;
this.dirBuffer = null;
want = null;
}
}
let remaining = step;
if(want && (p.dirX !== 0 || p.dirY !== 0)) {
const cx = Math.round(p.x), cy = Math.round(p.y);
const toCenter = p.dirX !== 0 ? (cx - p.x) * p.dirX : (cy - p.y) * p.dirY;
if(toCenter <= remaining && toCenter >= -TURN_SLACK && this.walkableFor(p, cx + want.x, cy + want.y)) {
p.x = cx; p.y = cy;
remaining -= Math.max(0, toCenter);
p.dirX = want.x; p.dirY = want.y;
this.dirBuffer = null;
}
}
if(p.dirX === 0 && p.dirY === 0) return;
const cx = Math.round(p.x), cy = Math.round(p.y);
const nx = p.x + p.dirX * remaining;
const ny = p.y + p.dirY * remaining;
if(this.walkableFor(p, cx + p.dirX, cy + p.dirY)) {
p.x = nx; p.y = ny;
} else {
if(p.dirX > 0) p.x = Math.min(nx, cx);
else if(p.dirX < 0) p.x = Math.max(nx, cx);
if(p.dirY > 0) p.y = Math.min(ny, cy);
else if(p.dirY < 0) p.y = Math.max(ny, cy);
}
p.x = Math.max(0, Math.min(MAZE_WIDTH-1, p.x));
p.y = Math.max(0, Math.min(MAZE_HEIGHT-1, p.y));
}
update(dt) {
if(this.state !== 'playing') return;
this.gameTime += dt;
if(this.shake > 0) this.shake -= dt * 5;
const p = this.player;
if(p.dashCooldown > 0) p.dashCooldown -= dt;
if(p.activeCooldown > 0) p.activeCooldown -= dt;
if(p.intangible > 0) { p.intangible -= dt; if(p.intangible <= 0) p.colorOverride = null; }
if(p.surgeTimer > 0) p.surgeTimer -= dt;
if(p.invulnTimer > 0) p.invulnTimer -= dt;
if(this.timeStop > 0) this.timeStop -= dt;
if(this.veilTimer > 0) this.veilTimer -= dt;
if(!this.warden) {
this.curfew -= dt;
if(this.curfew <= 0) this.spawnWarden();
}
const tileType = this.tileAt(Math.round(p.x), Math.round(p.y));
let terrainMod = 1.0;
if(tileType === 2) terrainMod = 1.2;
if(tileType === 3 && !p.stats.mudProof) terrainMod = 0.8;
this.stepPlayer(p, 4.5 * p.stats.speed * terrainMod * dt);
if(this.magnetPulse > 0) {
this.magnetPulse -= dt;
for(let i=0; i<this.coins.length; i++) {
const c = this.coins[i];
const dx = p.x - c.x, dy = p.y - c.y;
const d2 = dx*dx + dy*dy;
if(d2 < 64 && d2 > 0.0025) {
const d = Math.sqrt(d2);
c.x += dx / d * dt * 10;
c.y += dy / d * dt * 10;
}
}
}
for(let i=this.coins.length-1; i>=0; i--) {
const c = this.coins[i];
if(c.x - p.x < 0.5 && p.x - c.x < 0.5 && c.y - p.y < 0.5 && p.y - c.y < 0.5) this.collectCoin(i);
}
for(let i=this.orbs.length-1; i>=0; i--) {
const o = this.orbs[i];
if(o.x - p.x < 0.5 && p.x - o.x < 0.5 && o.y - p.y < 0.5 && p.y - o.y < 0.5) this.collectOrb(i);
}
if(this.gate.open && Math.abs(this.gate.x - p.x) < 0.6 && Math.abs(this.gate.y - p.y) < 0.6) {
this.exitFloor();
return;
}
if(this.timeStop <= 0) {
for(let i=0; i<this.ghosts.length; i++) {
const g = this.ghosts[i];
g.update(dt, this);
if(g.dead) continue;
const dx = g.x - p.x, dy = g.y - p.y;
if(dx*dx + dy*dy < 0.36) {
if(p.surgeTimer > 0 && g.scaredTimer > 0) this.catchGhost(g);
else if(p.invulnTimer <= 0) this.hurt();
}
}
}
if(this.warden && this.state === 'playing') {
this.warden.update(dt, this);
const wdx = this.warden.x - p.x, wdy = this.warden.y - p.y;
if(p.invulnTimer <= 0 && wdx*wdx + wdy*wdy < 0.36) this.hurt();
}
const parts = this.particles.items;
for(let i=parts.length-1; i>=0; i--) {
const pt = parts[i];
pt.x += pt.vx; pt.y += pt.vy; pt.life -= dt * 2;
if(pt.life <= 0) this.particles.releaseAt(i);
}
const ents = this.entities.items;
for(let i=ents.length-1; i>=0; i--) {
ents[i].life -= dt;
if(ents[i].life <= 0) this.entities.releaseAt(i);
}
const pops = this.popups.items;
for(let i=pops.length-1; i>=0; i--) {
const pp = pops[i];
pp.y -= dt * 1.4;
pp.life -= dt;
if(pp.life <= 0) this.popups.releaseAt(i);
}
}
spawnParticle(x, y, vx, vy, life, color) {
const pt = this.particles.obtain();
pt.x = x; pt.y = y; pt.vx = vx; pt.vy = vy; pt.life = life; pt.color = color;
return pt;
}
spawnEntity(type, x, y, life) {
const e = this.entities.obtain();
e.type = type; e.x = x; e.y = y; e.life = life;
return e;
}
spawnPopup(text, x, y, color) {
const pp = this.popups.obtain();
pp.text = text; pp.x = x; pp.y = y; pp.life = 0.9; pp.color = color;
return pp;
}
exitFloor() {
audio.sfxClear();
const s = this.player.stats;
let gain = this.carry;
if(s.bankBonus > 0) gain = Math.floor(gain * (1 + s.bankBonus));
this.bank += gain;
this.carry = 0;
this.player.health = Math.min(this.player.maxHealth, this.player.health + s.gateHeal);
this.floor++;
this.state = 'upgrade';
this.screen = 'upgrade';
this.upgradeTime = Date.now();
this.upgradeChoices = this.draftChoices();
}
draftChoices() {
const owned = new Set(this.player.cards);
const pool = Object.keys(CARDS).filter(k => {
if(CARDS[k].type === 'active') return this.player.activeItem !== k;
return !owned.has(k);
});
const weight = (k) => {
const r = CARDS[k].rarity;
if(r === 'epic') return 8 + Math.min(12, this.floor);
if(r === 'rare') return 26;
return 52;
};
const picks = [];
while(picks.length < 3 && pool.length > 0) {
let total = 0;
for(const k of pool) total += weight(k);
let roll = this.rng() * total;
let idx = pool.length - 1;
for(let i=0; i<pool.length; i++) {
roll -= weight(pool[i]);
if(roll <= 0) { idx = i; break; }
}
picks.push(pool.splice(idx, 1)[0]);
}
return picks;
}
pickUpgrade(key) {
if(key) {
const card = CARDS[key];
if(card.type === 'active') {
this.player.activeItem = key;
this.player.activeCooldown = 0;
} else {
card.apply(this.player);
}
this.player.cards.push(key);
audio.sfxPick();
}
this.generateFloor();
this.bannerTime = Date.now();
this.state = 'playing';
this.screen = 'play';
}
gameOver() {
this.state = 'gameover';
this.lostCarry = this.carry;
this.carry = 0;
if(this.bank > this.highScore) {
this.highScore = this.bank;
localStorage.setItem('kurukuruBest', this.highScore);
}
const timeMs = Date.now() - this.startTime;
const mins = Math.floor(timeMs / 60000);
const secs = Math.floor((timeMs % 60000) / 1000);
this.finalTime = `${mins}:${secs.toString().padStart(2, '0')}`;
this.screen = 'gameover';
}
shareResults() {
const text = `KuruKuru Chase!!\nscore: ${this.bank}\nfloor: ${this.floor}\ntime: ${this.finalTime}\nseed: ${this.seed}`;
if(navigator.clipboard && navigator.clipboard.writeText) {
navigator.clipboard.writeText(text).then(() => alert('results copied to clipboard!')).catch(() => alert(text));
} else {
alert(text);
}
}
downloadResults() {
const tempCanvas = document.createElement('canvas');
tempCanvas.width = 600;
tempCanvas.height = 400;
const tCtx = tempCanvas.getContext('2d');
tCtx.fillStyle = this.colors.bg;
tCtx.fillRect(0, 0, 600, 400);
tCtx.strokeStyle = this.colors.ui;
tCtx.lineWidth = 5;
tCtx.strokeRect(0, 0, 600, 400);
tCtx.imageSmoothingEnabled = false;
tCtx.font = '22px "Press Start 2P"';
tCtx.fillStyle = this.colors.accent;
tCtx.textAlign = 'center';
tCtx.fillText('KuruKuru Chase!!', 300, 60);
tCtx.font = '16px "Press Start 2P"';
tCtx.fillStyle = this.colors.ui;
tCtx.fillText(`score: ${this.bank}`, 300, 130);
tCtx.fillStyle = this.colors.pellet;
tCtx.fillText(`floor: ${this.floor}`, 300, 180);
tCtx.fillStyle = this.colors.accent;
tCtx.fillText(`time: ${this.finalTime}`, 300, 230);
tCtx.fillStyle = this.colors.text;
tCtx.fillText(`best streak: ${this.bestStreak}`, 300, 280);
tCtx.fillStyle = '#8b9bb4';
tCtx.font = '11px "Press Start 2P"';
tCtx.fillText(`seed: ${this.seed}`, 300, 350);
const link = document.createElement('a');
link.download = `kurukuru-chase-${Date.now()}.jpg`;
link.href = tempCanvas.toDataURL('image/jpeg');
link.click();
}
renderMaze() {
if(!this.mazeCanvas) {
this.mazeCanvas = document.createElement('canvas');
this.mazeCanvas.width = MAZE_WIDTH * TILE_SIZE;
this.mazeCanvas.height = MAZE_HEIGHT * TILE_SIZE;
this.mazeCtx = this.mazeCanvas.getContext('2d');
this.mazeCtx.imageSmoothingEnabled = false;
}
const mc = this.mazeCtx;
mc.clearRect(0, 0, this.mazeCanvas.width, this.mazeCanvas.height);
for(let y=0; y<MAZE_HEIGHT; y++) {
for(let x=0; x<MAZE_WIDTH; x++) {
const sx = x*TILE_SIZE, sy = y*TILE_SIZE;
const tile = this.maze[y][x];
if(tile === 1) drawWall(mc, sx, sy, TILE_SIZE, this.colors.wall);
else if(tile === 2) drawChecker(mc, sx, sy, TILE_SIZE, 'rgba(44, 232, 245, 0.2)');
else if(tile === 3) drawChecker(mc, sx, sy, TILE_SIZE, 'rgba(228, 166, 114, 0.2)');
}
}
this.mazeDirty = false;
}
draw() {
ctx.fillStyle = this.colors.bg; ctx.fillRect(0, 0, canvas.width, canvas.height);
if(this.screen === 'loading') { UI.draw(this); return; }
const inRun = this.screen === 'play' || this.screen === 'upgrade' || this.screen === 'gameover';
if(this.maze && inRun) this.drawWorld();
UI.draw(this);
}
drawWorld() {
UI.metrics();
const area = UI.playArea(this);
const viewTop = area.y, viewH = area.h;
const baseW = MAZE_WIDTH * TILE_SIZE, baseH = MAZE_HEIGHT * TILE_SIZE;
const zoom = Math.max(1, Math.min(4, Math.floor(Math.min(
area.w / baseW, area.h * 1.03 / baseH))));
const TS = TILE_SIZE * zoom;
this.zoom = zoom;
const mapPixelWidth = baseW * zoom;
const mapPixelHeight = baseH * zoom;
const tx = this.player.x * TS - area.w/2;
const ty = this.player.y * TS - viewH/2;
this.camera.x += (tx - this.camera.x) * 0.1;
this.camera.y += (ty - this.camera.y) * 0.1;
let ox, oy;
if (mapPixelWidth < area.w) ox = area.x + (area.w - mapPixelWidth) / 2;
else ox = area.x - Math.max(0, Math.min(this.camera.x, mapPixelWidth - area.w));
if (mapPixelHeight < viewH) oy = viewTop + (viewH - mapPixelHeight) / 2;
else oy = viewTop - Math.max(0, Math.min(this.camera.y, mapPixelHeight - viewH));
if(this.shake > 0) {
ox += (Math.random() - 0.5) * this.shake * 20;
oy += (Math.random() - 0.5) * this.shake * 20;
}
ox = Math.round(ox); oy = Math.round(oy);
if(this.mazeDirty) this.renderMaze();
ctx.drawImage(this.mazeCanvas, ox, oy, mapPixelWidth, mapPixelHeight);
const coinSize = 3*zoom, coinW = canvas.width + 10, coinH = canvas.height + 10;
ctx.fillStyle = this.colors.pellet;
for(let i=0; i<this.coins.length; i++) {
const c = this.coins[i];
const sx = ox + c.x*TS + TS/2, sy = oy + c.y*TS + TS/2;
if(sx>-10 && sx<coinW && sy>-10 && sy<coinH) {
ctx.fillRect(Math.round(sx - coinSize/2), Math.round(sy - coinSize/2), coinSize, coinSize);
}
}
const orbPulse = Math.floor(Date.now()/250) % 2;
for(let i=0; i<this.orbs.length; i++) {
const o = this.orbs[i];
drawOrb(ctx, ox + o.x*TS + TS/2, oy + o.y*TS + TS/2, (orbPulse ? 9 : 7) * zoom, this.colors.power);
}
drawGate(ctx, ox + this.gate.x*TS + TS/2, oy + this.gate.y*TS + TS/2, TS, this.gate.open, this.colors.accent);
const ents = this.entities.items;
for(let i=0; i<ents.length; i++) {
const e = ents[i];
if(e.type === 'bait') {
ctx.globalAlpha = 0.5 + 0.3 * (Math.floor(Date.now()/150) % 2);
drawPac(ctx, ox + e.x*TS + TS/2, oy + e.y*TS + TS/2, TS/3, 1, 0, 0.4, '#2ce8f5');
ctx.globalAlpha = 1;
}
}
if(this.player.anchor) drawAnchor(ctx, ox + this.player.anchor.x*TS + TS/2, oy + this.player.anchor.y*TS + TS/2, zoom, this.colors.accent);
for(let i=0; i<this.ghosts.length; i++) this.ghosts[i].draw(ctx, ox, oy, TS);
if(this.warden) this.warden.draw(ctx, ox, oy, TS);
const px = ox + this.player.x*TS + TS/2;
const py = oy + this.player.y*TS + TS/2;
if(this.player.invulnTimer > 0 && Math.floor(Date.now()/100)%2) ctx.globalAlpha = 0.5;
if(this.player.intangible > 0) ctx.globalAlpha = 0.3;
const size = TS/2;
const mouth = Math.abs(Math.sin(Date.now()/100))*0.6;
const pColor = this.player.colorOverride || this.colors.pellet;
if(this.player.surgeTimer > 0 && Math.floor(Date.now()/120)%2) pxRing(ctx, px, py, size + 3*zoom, this.colors.pellet);
drawPac(ctx, px, py, size, this.player.dirX, this.player.dirY, mouth, pColor);
if(this.bubbleUp) pxRing(ctx, px, py, size + 3*zoom, this.colors.ui);
ctx.globalAlpha = 1;
const parts = this.particles.items;
for(let i=0; i<parts.length; i++) {
const pt = parts[i];
ctx.globalAlpha = Math.max(0, pt.life);
pxSquare(ctx, ox+pt.x*zoom, oy+pt.y*zoom, 3*zoom, pt.color);
}
const pops = this.popups.items;
if(pops.length) {
ctx.font = `${Math.max(8, 7 * zoom)}px "Press Start 2P"`;
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
for(let i=0; i<pops.length; i++) {
const pp = pops[i];
ctx.globalAlpha = Math.max(0, Math.min(1, pp.life * 2.2));
ctx.fillStyle = pp.color;
ctx.fillText(pp.text, ox + pp.x*TS + TS/2, oy + pp.y*TS);
}
}
ctx.globalAlpha = 1;
ctx.textAlign = 'left';
}
loop() {
this.animationFrameId = requestAnimationFrame(this.loopFrame);
const now = performance.now();
const elapsed = now - this.lastTime;
if(elapsed < 1000 / this.fpsCap - 1.5 && !this.needsFrame) return;
this.needsFrame = false;
const dt = Math.min(elapsed / 1000, 0.1);
this.lastTime = now;
this.update(dt);
this.draw();
present();
}
}
