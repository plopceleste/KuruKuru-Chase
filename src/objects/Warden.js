import { MAZE_W, MAZE_H } from '../core/constants.js';
import { findPath } from '../core/pathfinder.js';
import { TEX } from '../gfx/textures.js';
import { Walker, openDirs, greedyStep } from './Walker.js';

const START_SPEED = 3.2;
const TOP_SPEED = 6;
const RAMP_PER_SECOND = 0.03;
const FLICKER_MS = 120;

const CORNERS = [
  {x: 1, y: 1},
  {x: MAZE_W - 2, y: 1},
  {x: 1, y: MAZE_H - 2},
  {x: MAZE_W - 2, y: MAZE_H - 2}
];

/**
 * What shows up when the curfew runs out. It does not scatter, it does not get
 * frightened, and it never stops pathfinding straight at you -- it only gets
 * faster. The floor is meant to be left, not cleared.
 */
export class Warden extends Walker {
  constructor(scene, tileX, tileY) {
    super(scene, TEX.warden, 'f0', tileX, tileY);
    this.speed = START_SPEED;
    this.setDepth(16);
    scene.add.existing(this);
  }

  /** Spawns in whichever corner is furthest from the player. */
  static spawnFurthestFrom(scene, player) {
    let best = CORNERS[0];
    let bestDist = -1;
    for (const corner of CORNERS) {
      const dist = Math.hypot(corner.x - player.tx, corner.y - player.ty);
      if (dist > bestDist) { bestDist = dist; best = corner; }
    }
    return new Warden(scene, best.x, best.y);
  }

  update(dt) {
    this.speed = Math.min(TOP_SPEED, this.speed + dt * RAMP_PER_SECOND);
    this.advance(this.speed * this.gs.run.stats.wardenSlow * dt);
    this.setFrame(`f${Math.floor(this.gs.now / FLICKER_MS) % 2}`);
  }

  decideNext() {
    const cx = Math.round(this.tx);
    const cy = Math.round(this.ty);
    const player = this.gs.player;
    const path = findPath(cx, cy, Math.round(player.tx), Math.round(player.ty), this.gs.maze);

    this.dir = path && path.length > 0
      ? {x: path[0].x - cx, y: path[0].y - cy}
      : greedyStep(openDirs(this.gs.maze, cx, cy, null), cx, cy, player.tx, player.ty);

    this.nextTile = {x: cx + this.dir.x, y: cy + this.dir.y};
  }
}
