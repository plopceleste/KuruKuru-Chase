import { DIRS, MAZE_W, MAZE_H, WALL, FLOOR, FAST, MUD } from './constants.js';

const CARVE_STEPS = [{x: 0, y: -2}, {x: 0, y: 2}, {x: -2, y: 0}, {x: 2, y: 0}];

const EXTRA_HOLES = 20;
const FAST_CHANCE = 0.15;
const MUD_CHANCE = 0.30;
const ORB_CHANCE = 0.02;
const MIN_ORBS = 2;
const SAFE_RADIUS = 4;
const GHOST_CLEARANCE = 10;
const MAX_GHOSTS = 8;

function shuffle(list, rng) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function carve(maze, x, y, rng) {
  maze[y][x] = FLOOR;
  for (const step of shuffle(CARVE_STEPS.slice(), rng)) {
    const nx = x + step.x;
    const ny = y + step.y;
    if (nx > 0 && nx < MAZE_W - 1 && ny > 0 && ny < MAZE_H - 1 && maze[ny][nx] === WALL) {
      maze[y + step.y / 2][x + step.x / 2] = FLOOR;
      carve(maze, nx, ny, rng);
    }
  }
}

// Breadth-first walk distances from a cell, in steps. -1 means unreachable.
function floodFill(maze, from) {
  const cells = MAZE_W * MAZE_H;
  const dist = new Int32Array(cells).fill(-1);
  const queue = new Int32Array(cells);
  let head = 0;
  let tail = 0;

  const startCell = from.y * MAZE_W + from.x;
  dist[startCell] = 0;
  queue[tail++] = startCell;

  while (head < tail) {
    const cell = queue[head++];
    const x = cell % MAZE_W;
    const y = (cell / MAZE_W) | 0;
    for (const dir of DIRS) {
      const nx = x + dir.x;
      const ny = y + dir.y;
      if (nx < 0 || nx >= MAZE_W || ny < 0 || ny >= MAZE_H) continue;
      const next = ny * MAZE_W + nx;
      if (maze[ny][nx] === WALL || dist[next] >= 0) continue;
      dist[next] = dist[cell] + 1;
      queue[tail++] = next;
    }
  }

  return dist;
}

/**
 * Builds one floor: the grid itself plus everywhere the scene needs to put
 * something. Pure -- given the same rng stream it always produces the same
 * floor, and it never touches a texture or a game object.
 */
export function generateFloor(floor, rng, quotaRate) {
  const maze = [];
  for (let y = 0; y < MAZE_H; y++) {
    maze[y] = new Array(MAZE_W).fill(WALL);
  }

  carve(maze, 1, 1, rng);

  // A perfect maze has exactly one route between any two points, which makes
  // for miserable chases. The holes give the player somewhere to dodge to.
  for (let i = 0; i < EXTRA_HOLES; i++) {
    const x = Math.floor(rng() * (MAZE_W - 2)) + 1;
    const y = Math.floor(rng() * (MAZE_H - 2)) + 1;
    if (maze[y][x] === WALL) maze[y][x] = FLOOR;
  }

  const empties = [];
  for (let y = 1; y < MAZE_H - 1; y++) {
    for (let x = 1; x < MAZE_W - 1; x++) {
      if (maze[y][x] === FLOOR) empties.push({x, y});
    }
  }

  const start = empties[Math.floor(rng() * empties.length)];
  const dist = floodFill(maze, start);
  const reachable = empties.filter((p) => dist[p.y * MAZE_W + p.x] >= 0);

  // The exit goes as far from the spawn as the floor allows.
  let gate = start;
  let gateDist = -1;
  for (const p of reachable) {
    const d = dist[p.y * MAZE_W + p.x];
    if (d > gateDist) { gateDist = d; gate = p; }
  }

  const isGate = (p) => p.x === gate.x && p.y === gate.y;

  for (const p of reachable) {
    if (isGate(p)) continue;
    const roll = rng();
    if (roll < FAST_CHANCE) maze[p.y][p.x] = FAST;
    else if (roll < MUD_CHANCE) maze[p.y][p.x] = MUD;
  }

  const coins = [];
  const orbs = [];
  for (const p of reachable) {
    if (isGate(p)) continue;
    if (Math.abs(p.x - start.x) <= SAFE_RADIUS && Math.abs(p.y - start.y) <= SAFE_RADIUS) continue;
    if (rng() < ORB_CHANCE) orbs.push({x: p.x, y: p.y});
    else coins.push({x: p.x, y: p.y});
  }

  // Promote the most distant coins until there are enough surge orbs to make
  // the floor survivable.
  while (orbs.length < MIN_ORBS && coins.length > 1) {
    let far = 0;
    let farDist = -1;
    for (let i = 0; i < coins.length; i++) {
      const d = dist[coins[i].y * MAZE_W + coins[i].x];
      if (d > farDist) { farDist = d; far = i; }
    }
    orbs.push(coins.splice(far, 1)[0]);
  }

  const ghosts = [];
  const ghostCount = Math.min(MAX_GHOSTS, 3 + Math.floor((floor - 1) / 2));
  for (let i = 0; i < ghostCount; i++) {
    let spot;
    let tries = 0;
    do {
      spot = reachable[Math.floor(rng() * reachable.length)];
      tries++;
    } while (Math.hypot(spot.x - start.x, spot.y - start.y) < GHOST_CLEARANCE && tries < 50);
    ghosts.push({x: spot.x, y: spot.y});
  }

  return {
    maze,
    start,
    gate: {x: gate.x, y: gate.y, open: false},
    coins,
    orbs,
    ghosts,
    totalCoins: coins.length,
    quota: Math.max(1, Math.ceil(coins.length * quotaRate))
  };
}
