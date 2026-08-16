import Phaser from 'phaser';
import { TILE, MAZE_W, MAZE_H, WALL, DIRS } from '../core/constants.js';

const STILL = {x: 0, y: 0};

// Reused between calls so ghost decisions never allocate.
const openScratch = [];

/**
 * The directions leading out of a tile, optionally excluding the way the walker
 * came in. Dead ends re-allow the reverse so nothing can get stuck.
 */
export function openDirs(maze, cx, cy, back) {
  openScratch.length = 0;
  for (const dir of DIRS) {
    const nx = cx + dir.x;
    const ny = cy + dir.y;
    if (nx < 0 || nx >= MAZE_W || ny < 0 || ny >= MAZE_H) continue;
    if (maze[ny][nx] === WALL) continue;
    if (back && dir.x === -back.x && dir.y === -back.y) continue;
    openScratch.push(dir);
  }
  if (openScratch.length === 0 && back) return openDirs(maze, cx, cy, null);
  return openScratch;
}

/** Of the open directions, the one that closes the most ground on a target. */
export function greedyStep(options, cx, cy, tx, ty) {
  let best = STILL;
  let bestDist = Infinity;
  for (const dir of options) {
    const dx = cx + dir.x - tx;
    const dy = cy + dir.y - ty;
    const dist = dx * dx + dy * dy;
    if (dist < bestDist) { bestDist = dist; best = dir; }
  }
  return best;
}

/**
 * Anything that walks the maze tile by tile: it heads for `nextTile`, and the
 * moment it arrives it asks for a new direction. Subclasses supply the thinking
 * by implementing `decideNext`.
 */
export class Walker extends Phaser.GameObjects.Sprite {
  constructor(scene, texture, frame, tileX, tileY) {
    super(scene, 0, 0, texture, frame);
    this.gs = scene;
    this.tx = tileX;
    this.ty = tileY;
    this.dir = {x: 0, y: 0};
    this.nextTile = {x: Math.round(tileX), y: Math.round(tileY)};
    this.syncPosition();
  }

  syncPosition() {
    this.x = this.tx * TILE + TILE / 2;
    this.y = this.ty * TILE + TILE / 2;
  }

  /** Walks `distance` tiles along the current route, turning as tiles are reached. */
  advance(distance) {
    // A teleport (a warp anchor, a respawn) can leave the target stale.
    const offX = this.tx - this.nextTile.x;
    const offY = this.ty - this.nextTile.y;
    if (offX * offX + offY * offY > 2.25) {
      this.nextTile.x = Math.round(this.tx);
      this.nextTile.y = Math.round(this.ty);
    }

    const dx = this.nextTile.x - this.tx;
    const dy = this.nextTile.y - this.ty;
    const toNext = Math.sqrt(dx * dx + dy * dy);

    if (toNext > distance) {
      this.tx += (dx / toNext) * distance;
      this.ty += (dy / toNext) * distance;
    } else {
      this.tx = this.nextTile.x;
      this.ty = this.nextTile.y;
      const remaining = distance - toNext;
      this.decideNext();
      if (this.dir.x !== 0 || this.dir.y !== 0) {
        this.tx += this.dir.x * remaining;
        this.ty += this.dir.y * remaining;
        this.nextTile.x = Math.round(this.tx) + this.dir.x;
        this.nextTile.y = Math.round(this.ty) + this.dir.y;
      }
    }

    this.syncPosition();
  }

  decideNext() {}
}
