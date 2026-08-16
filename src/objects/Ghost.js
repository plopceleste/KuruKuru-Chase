import { MAZE_W, MAZE_H, FAST, MUD } from '../core/constants.js';
import { findPath } from '../core/pathfinder.js';
import { TEX } from '../gfx/textures.js';
import { Walker, openDirs, greedyStep } from './Walker.js';

const TYPE_SPEEDS = [1.05, 1.0, 0.95, 0.9];
const SPEED_SCALE = 4.0;
const SPEED_CAP = 7.0;
const RESPAWN_SECONDS = 5;

// Scatter for five seconds out of every twelve. The lull is what makes the
// chase readable: you learn to move during it.
const CYCLE_SECONDS = 12;
const SCATTER_SECONDS = 5;

const BLINK_MS = 200;

// Each type has a corner it retreats to when scattering.
const SCATTER_CORNERS = [
  {x: MAZE_W - 2, y: 1},
  {x: 1, y: 1},
  {x: MAZE_W - 2, y: MAZE_H - 2},
  {x: 1, y: MAZE_H - 2}
];

const AMBUSH_LEAD = 4;
const SHY_RANGE_SQ = 64;
const PATHFIND_CHANCE = 0.3;

export class Ghost extends Walker {
  constructor(scene, tileX, tileY, index, floor) {
    const type = index % 4;
    super(scene, TEX.ghost, `t${type}-0`, tileX, tileY);

    this.type = type;
    this.homeX = tileX;
    this.homeY = tileY;
    this.baseSpeed = TYPE_SPEEDS[type] * (1 + floor * 0.02);
    this.mode = 'scatter';
    this.scaredTimer = 0;
    this.dead = false;
    this.respawnTimer = 0;
    this.stun = 0;

    this.setDepth(15);
    scene.add.existing(this);
  }

  get frightened() {
    return this.mode === 'frightened';
  }

  update(dt) {
    if (this.dead) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) {
        this.dead = false;
        this.tx = this.homeX;
        this.ty = this.homeY;
        this.nextTile = {x: Math.round(this.tx), y: Math.round(this.ty)};
        this.setVisible(true);
        this.syncPosition();
      }
      return;
    }

    if (this.stun > 0) {
      this.stun -= dt;
      this.updateFrame();
      return;
    }

    if (this.scaredTimer > 0) {
      this.scaredTimer -= dt;
      this.mode = 'frightened';
    } else {
      this.mode = this.gs.gameTime % CYCLE_SECONDS < SCATTER_SECONDS ? 'scatter' : 'chase';
    }

    this.advance(this.currentSpeed() * dt);
    this.updateFrame();
  }

  currentSpeed() {
    let speed = this.baseSpeed * SPEED_SCALE * this.gs.run.stats.ghostSlow;

    if (this.frightened) speed *= 0.6;
    else if (this.gs.gate.open) speed *= 1.15;

    // The lead ghost speeds up once the floor is nearly picked clean.
    if (this.type === 0 && this.mode === 'chase' && this.gs.totalCoins > 0
      && this.gs.coinsTaken / this.gs.totalCoins > 0.7) {
      speed *= 1.1;
    }

    const tile = this.gs.tileAt(Math.round(this.tx), Math.round(this.ty));
    if (tile === FAST) speed *= 1.2;
    if (tile === MUD) speed *= 0.8;

    return Math.min(speed, SPEED_CAP);
  }

  decideNext() {
    const {maze, run} = this.gs;
    const rng = run.rng;
    const player = this.gs.player;
    const cx = Math.round(this.tx);
    const cy = Math.round(this.ty);

    const bait = this.gs.bait;
    const blind = this.gs.veilTimer > 0 && !bait;

    let tx = player.tx;
    let ty = player.ty;
    if (bait) {
      tx = bait.tileX;
      ty = bait.tileY;
    }

    if (this.frightened || blind) {
      tx = Math.floor(rng() * MAZE_W);
      ty = Math.floor(rng() * MAZE_H);
    } else if (this.mode === 'scatter' && !bait) {
      const corner = SCATTER_CORNERS[this.type];
      tx = corner.x;
      ty = corner.y;
    } else if (!bait) {
      if (this.type === 1) {
        // Cuts corners: aims where the player is going, not where they are.
        tx += player.dirX * AMBUSH_LEAD;
        ty += player.dirY * AMBUSH_LEAD;
      } else if (this.type === 3) {
        // Loses its nerve up close and backs off to its corner.
        const dx = cx - tx;
        const dy = cy - ty;
        if (dx * dx + dy * dy < SHY_RANGE_SQ) {
          tx = SCATTER_CORNERS[3].x;
          ty = SCATTER_CORNERS[3].y;
        }
      }
    }

    const options = openDirs(maze, cx, cy, this.dir);

    if (this.frightened || blind) {
      this.dir = options[Math.floor(rng() * options.length)] || {x: 0, y: 0};
    } else if (this.type === 0 && rng() < PATHFIND_CHANCE) {
      // The leader occasionally thinks properly instead of walking downhill.
      const path = findPath(cx, cy, Math.round(tx), Math.round(ty), maze);
      this.dir = path && path.length > 0
        ? {x: path[0].x - cx, y: path[0].y - cy}
        : greedyStep(options, cx, cy, tx, ty);
    } else {
      this.dir = greedyStep(options, cx, cy, tx, ty);
    }

    this.nextTile = {x: cx + this.dir.x, y: cy + this.dir.y};
  }

  updateFrame() {
    if (this.frightened) {
      this.setFrame(`fright-${Math.floor(this.gs.now / BLINK_MS) % 2 === 0 ? 1 : 0}`);
      return;
    }
    const eye = (this.dir.y > 0 ? 2 : 0) + (this.dir.x > 0 ? 1 : 0);
    this.setFrame(`t${this.type}-${eye}`);
  }

  /** Taken during a surge: gone for a few seconds, then back at its spawn. */
  catchIt() {
    this.dead = true;
    this.respawnTimer = RESPAWN_SECONDS;
    this.setVisible(false);
  }
}
