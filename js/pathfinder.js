class PathFinder {
static find(sx, sy, ex, ey, maze) {
if(ex<0 || ex>=MAZE_WIDTH || ey<0 || ey>=MAZE_HEIGHT || maze[ey][ex]===1) return null;
const P = PathFinder;
P.used = 0;
for(let i=0; i<P.open.length; i++) P.openAt[P.open[i].y*MAZE_WIDTH + P.open[i].x] = null;
P.open.length = 0;
P.closed.fill(0);
const start = P.node(sx, sy, 0, 0, null);
P.open.push(start);
P.openAt[sy*MAZE_WIDTH + sx] = start;
let iters = 0;
while(P.open.length > 0 && iters++ < 250) {
let low = 0;
for(let i=1; i<P.open.length; i++) if(P.open[i].f < P.open[low].f) low = i;
let cur = P.open[low];
if(cur.x === ex && cur.y === ey) {
const path = P.path, pool = P.pathPool;
let n = 0;
while(cur.p) {
let step = pool[n];
if(!step) { step = {x:0, y:0}; pool[n] = step; }
step.x = cur.x; step.y = cur.y;
n++; cur = cur.p;
}
path.length = n;
for(let i=0; i<n; i++) path[i] = pool[n-1-i];
return path;
}
P.open.splice(low, 1);
P.openAt[cur.y*MAZE_WIDTH + cur.x] = null;
P.closed[cur.y*MAZE_WIDTH + cur.x] = 1;
for(let d=0; d<DIRS4.length; d++) {
const nx = cur.x + DIRS4[d].x, ny = cur.y + DIRS4[d].y;
const cell = ny*MAZE_WIDTH + nx;
if(nx>=0 && nx<MAZE_WIDTH && ny>=0 && ny<MAZE_HEIGHT && maze[ny][nx]!==1 && !P.closed[cell]) {
const g = cur.g + 1;
const n = P.openAt[cell];
if(!n) {
const fresh = P.node(nx, ny, g, Math.abs(nx-ex)+Math.abs(ny-ey), cur);
P.open.push(fresh);
P.openAt[cell] = fresh;
}
else if(g < n.g) { n.g = g; n.f = n.g + n.h; n.p = cur; }
}
}
}
return null;
}
static node(x, y, g, h, p) {
let n = PathFinder.pool[PathFinder.used];
if(!n) { n = {x:0, y:0, g:0, h:0, f:0, p:null}; PathFinder.pool[PathFinder.used] = n; }
PathFinder.used++;
n.x = x; n.y = y; n.g = g; n.h = h; n.f = g + h; n.p = p;
return n;
}
}
PathFinder.pool = [];
PathFinder.used = 0;
PathFinder.open = [];
PathFinder.openAt = new Array(MAZE_WIDTH * MAZE_HEIGHT).fill(null);
PathFinder.path = [];
PathFinder.pathPool = [];
PathFinder.closed = new Uint8Array(MAZE_WIDTH * MAZE_HEIGHT);
