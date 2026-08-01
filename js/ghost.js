class Ghost {
constructor(x, y, type, floor, colors) {
this.x = x; this.y = y;
this.startX = x; this.startY = y;
this.type = type % 4;
this.colors = colors;
const configs = [{ speed: 1.05 }, { speed: 1.0 }, { speed: 0.95 }, { speed: 0.9 }];
this.config = configs[this.type];
this.baseSpeed = this.config.speed * (1 + floor * 0.02);
this.dir = {x:0, y:0};
this.nextTile = {x: Math.round(x), y: Math.round(y)};
this.mode = 'scatter';
this.scaredTimer = 0;
this.dead = false;
this.respawnTimer = 0;
this.stun = 0;
}
update(dt, game) {
if (this.dead) {
this.respawnTimer -= dt;
if (this.respawnTimer <= 0) {
this.dead = false;
this.x = this.startX; this.y = this.startY;
this.nextTile = {x: Math.round(this.x), y: Math.round(this.y)};
}
return;
}
if (this.stun > 0) { this.stun -= dt; return; }
const offX = this.x - this.nextTile.x, offY = this.y - this.nextTile.y;
if (offX*offX + offY*offY > 2.25) {
this.nextTile.x = Math.round(this.x);
this.nextTile.y = Math.round(this.y);
}
if (this.scaredTimer > 0) { this.scaredTimer -= dt; this.mode = 'frightened'; }
else { this.mode = (game.gameTime % 12 < 5) ? 'scatter' : 'chase'; }
const maze = game.maze;
let speed = this.baseSpeed * 4.0 * game.player.stats.ghostSlow;
if (this.mode === 'frightened') speed *= 0.6;
else if (game.gate && game.gate.open) speed *= 1.15;
if (this.type === 0 && this.mode === 'chase' && game.totalCoins > 0 && game.coinsTaken / game.totalCoins > 0.7) speed *= 1.1;
const gtx = Math.round(this.x), gty = Math.round(this.y);
const tileType = (gty >= 0 && gty < MAZE_HEIGHT && gtx >= 0 && gtx < MAZE_WIDTH) ? maze[gty][gtx] : 1;
if(tileType === 2) speed *= 1.2;
if(tileType === 3) speed *= 0.8;
speed = Math.min(speed, 7.0);
const moveDist = speed * dt;
const dx = this.nextTile.x - this.x;
const dy = this.nextTile.y - this.y;
const distToNext = Math.sqrt(dx*dx + dy*dy);
if (distToNext > moveDist) {
this.x += (dx / distToNext) * moveDist;
this.y += (dy / distToNext) * moveDist;
} else {
this.x = this.nextTile.x; this.y = this.nextTile.y;
const remaining = moveDist - distToNext;
this.decideNext(game);
if (this.dir.x !== 0 || this.dir.y !== 0) {
this.x += this.dir.x * remaining;
this.y += this.dir.y * remaining;
this.nextTile.x = Math.round(this.x) + this.dir.x;
this.nextTile.y = Math.round(this.y) + this.dir.y;
}
}
}
decideNext(game) {
const maze = game.maze, rng = game.rng, player = game.player;
const cx = Math.round(this.x);
const cy = Math.round(this.y);
let tx = player.x, ty = player.y;
const ents = game.entities.items;
let bait = null;
for(let i=0; i<ents.length; i++) if(ents[i].type === 'bait') { bait = ents[i]; break; }
if(bait) { tx = bait.x; ty = bait.y; }
const blind = game.veilTimer > 0 && !bait;
if (this.mode === 'frightened' || blind) {
tx = Math.floor(rng()*MAZE_WIDTH);
ty = Math.floor(rng()*MAZE_HEIGHT);
} else if (this.mode === 'scatter' && !bait) {
if(this.type===0) { tx=MAZE_WIDTH-2; ty=1; }
if(this.type===1) { tx=1; ty=1; }
if(this.type===2) { tx=MAZE_WIDTH-2; ty=MAZE_HEIGHT-2; }
if(this.type===3) { tx=1; ty=MAZE_HEIGHT-2; }
} else if (!bait) {
if (this.type === 1) { tx += player.dirX * 4; ty += player.dirY * 4; }
else if (this.type === 3) { const ax = cx-tx, ay = cy-ty; if (ax*ax + ay*ay < 64) { tx=1; ty=MAZE_HEIGHT-2; } }
}
const valid = Ghost.openDirs(maze, cx, cy, this.dir);
let bestDir = {x:0, y:0};
if (this.mode === 'frightened' || blind) {
bestDir = valid[Math.floor(rng() * valid.length)];
} else if (this.type === 0 && rng() < 0.3) {
const path = PathFinder.find(cx, cy, Math.round(tx), Math.round(ty), maze);
if (path && path.length > 0) bestDir = {x: path[0].x - cx, y: path[0].y - cy};
else bestDir = Ghost.greedy(valid, cx, cy, tx, ty);
} else {
bestDir = Ghost.greedy(valid, cx, cy, tx, ty);
}
this.dir = bestDir || {x:0, y:0};
this.nextTile = {x: cx + this.dir.x, y: cy + this.dir.y};
}
static openDirs(maze, cx, cy, back) {
const out = Ghost.dirScratch;
out.length = 0;
for (let i = 0; i < DIRS4.length; i++) {
const d = DIRS4[i];
const ny = cy + d.y, nx = cx + d.x;
if (ny < 0 || ny >= MAZE_HEIGHT || nx < 0 || nx >= MAZE_WIDTH) continue;
if (maze[ny][nx] === 1) continue;
if (back && d.x === -back.x && d.y === -back.y) continue;
out.push(d);
}
if (out.length === 0 && back) return Ghost.openDirs(maze, cx, cy, null);
return out;
}
static greedy(valid, cx, cy, tx, ty) {
let best = {x:0, y:0}, minDist = Infinity;
for (let d of valid) {
const dist = (cx+d.x-tx)**2 + (cy+d.y-ty)**2;
if (dist < minDist) { minDist = dist; best = d; }
}
return best;
}
draw(ctx, ox, oy, ts) {
if (this.dead) return;
ts = ts || TILE_SIZE;
const cx = ox + this.x * ts + ts/2;
const cy = oy + this.y * ts + ts/2;
const frightened = this.mode === 'frightened';
const blinkWhite = frightened && Math.floor(Date.now()/200) % 2 === 0;
drawGhost(ctx, cx, cy, ts, this.dir, this.colors[this.type], frightened, blinkWhite);
}
}

Ghost.dirScratch = [];

class Warden {
constructor(x, y) {
this.x = x; this.y = y;
this.dir = {x: 0, y: 0};
this.nextTile = {x: Math.round(x), y: Math.round(y)};
this.speed = 3.2;
}
update(dt, game) {
this.speed = Math.min(6, this.speed + dt * 0.03);
const moveDist = this.speed * game.player.stats.wardenSlow * dt;
const offX = this.x - this.nextTile.x, offY = this.y - this.nextTile.y;
if (offX*offX + offY*offY > 2.25) {
this.nextTile.x = Math.round(this.x);
this.nextTile.y = Math.round(this.y);
}
const dx = this.nextTile.x - this.x;
const dy = this.nextTile.y - this.y;
const distToNext = Math.sqrt(dx*dx + dy*dy);
if (distToNext > moveDist) {
this.x += (dx / distToNext) * moveDist;
this.y += (dy / distToNext) * moveDist;
} else {
this.x = this.nextTile.x; this.y = this.nextTile.y;
const remaining = moveDist - distToNext;
this.decideNext(game);
if (this.dir.x !== 0 || this.dir.y !== 0) {
this.x += this.dir.x * remaining;
this.y += this.dir.y * remaining;
this.nextTile.x = Math.round(this.x) + this.dir.x;
this.nextTile.y = Math.round(this.y) + this.dir.y;
}
}
}
decideNext(game) {
const cx = Math.round(this.x), cy = Math.round(this.y);
const path = PathFinder.find(cx, cy, Math.round(game.player.x), Math.round(game.player.y), game.maze);
if (path && path.length > 0) {
this.dir = {x: path[0].x - cx, y: path[0].y - cy};
} else {
this.dir = Ghost.greedy(Ghost.openDirs(game.maze, cx, cy, null), cx, cy, game.player.x, game.player.y);
}
this.nextTile = {x: cx + this.dir.x, y: cy + this.dir.y};
}
draw(ctx, ox, oy, ts) {
const cx = ox + this.x * ts + ts/2;
const cy = oy + this.y * ts + ts/2;
drawWarden(ctx, cx, cy, ts * 1.25);
}
}
