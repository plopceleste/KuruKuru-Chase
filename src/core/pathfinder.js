import { DIRS, MAZE_W, MAZE_H, WALL } from './constants.js';

// A* over the maze grid, with every buffer allocated once and reused. Ghosts
// call this several times a second, so it must not produce garbage.
const openList = [];
const openAt = new Array(MAZE_W * MAZE_H).fill(null);
const closed = new Uint8Array(MAZE_W * MAZE_H);
const nodePool = [];
const stepPool = [];
const path = [];
let used = 0;

const MAX_ITERATIONS = 250;

function node(x, y, g, h, parent) {
  let n = nodePool[used];
  if (!n) {
    n = {x: 0, y: 0, g: 0, h: 0, f: 0, parent: null};
    nodePool[used] = n;
  }
  used++;
  n.x = x; n.y = y; n.g = g; n.h = h; n.f = g + h; n.parent = parent;
  return n;
}

/**
 * Finds a route from (sx, sy) to (ex, ey).
 *
 * @returns {?Array<{x: number, y: number}>} The steps to walk, nearest first, or
 * null when the target is unreachable within the iteration budget. The array is
 * reused between calls: read it before calling again.
 */
export function findPath(sx, sy, ex, ey, maze) {
  if (ex < 0 || ex >= MAZE_W || ey < 0 || ey >= MAZE_H || maze[ey][ex] === WALL) return null;

  used = 0;
  for (let i = 0; i < openList.length; i++) {
    openAt[openList[i].y * MAZE_W + openList[i].x] = null;
  }
  openList.length = 0;
  closed.fill(0);

  const start = node(sx, sy, 0, 0, null);
  openList.push(start);
  openAt[sy * MAZE_W + sx] = start;

  for (let iterations = 0; openList.length > 0 && iterations < MAX_ITERATIONS; iterations++) {
    let low = 0;
    for (let i = 1; i < openList.length; i++) {
      if (openList[i].f < openList[low].f) low = i;
    }
    let current = openList[low];

    if (current.x === ex && current.y === ey) {
      let n = 0;
      while (current.parent) {
        let step = stepPool[n];
        if (!step) { step = {x: 0, y: 0}; stepPool[n] = step; }
        step.x = current.x; step.y = current.y;
        n++;
        current = current.parent;
      }
      path.length = n;
      for (let i = 0; i < n; i++) path[i] = stepPool[n - 1 - i];
      return path;
    }

    openList.splice(low, 1);
    openAt[current.y * MAZE_W + current.x] = null;
    closed[current.y * MAZE_W + current.x] = 1;

    for (let d = 0; d < DIRS.length; d++) {
      const nx = current.x + DIRS[d].x;
      const ny = current.y + DIRS[d].y;
      if (nx < 0 || nx >= MAZE_W || ny < 0 || ny >= MAZE_H) continue;
      const cell = ny * MAZE_W + nx;
      if (maze[ny][nx] === WALL || closed[cell]) continue;

      const g = current.g + 1;
      const existing = openAt[cell];
      if (!existing) {
        const fresh = node(nx, ny, g, Math.abs(nx - ex) + Math.abs(ny - ey), current);
        openList.push(fresh);
        openAt[cell] = fresh;
      } else if (g < existing.g) {
        existing.g = g;
        existing.f = g + existing.h;
        existing.parent = current;
      }
    }
  }

  return null;
}
