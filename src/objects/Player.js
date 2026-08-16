import Phaser from 'phaser';
import { TILE, MAZE_W, MAZE_H, WALL, TURN_SLACK, PALETTE } from '../core/constants.js';
import { TEX, PAC_DIRS, PAC_STEPS } from '../gfx/textures.js';
import { audio } from '../core/audio.js';

const BASE_SPEED = 4.5;
const DASH_INVULN = 0.5;
const HIT_INVULN = 1.5;
const DASH_STUN_RADIUS_SQ = 0.64;

/** The animation cycle a mouth runs through, in frames per second. */
const CHOMP_FPS = 19;

export function createPlayerAnimations(scene) {
  for (const dir of PAC_DIRS) {
    const key = `pac-${dir}`;
    if (scene.anims.exists(key)) continue;
    scene.anims.create({
      key,
      frames: scene.anims.generateFrameNames(TEX.pac, {
        prefix: `${dir}-`, start: 0, end: PAC_STEPS - 1
      }),
      frameRate: CHOMP_FPS,
      yoyo: true,
      repeat: -1
    });
  }
}

/**
 * The player. Position is kept in floating point tile coordinates because every
 * rule in the game -- walls, pickups, ghost targeting -- is written in tiles;
 * the sprite's pixel position is derived from that once per frame.
 */
export class Player extends Phaser.GameObjects.Sprite {
  constructor(scene, tileX, tileY) {
    super(scene, 0, 0, TEX.pac, `${PAC_DIRS[0]}-0`);

    this.gs = scene;
    this.tx = tileX;
    this.ty = tileY;
    this.dirX = 0;
    this.dirY = 0;

    this.surgeTimer = 0;
    this.invulnTimer = 0;
    this.dashCooldown = 0;
    this.activeCooldown = 0;
    this.intangible = 0;
    this.anchor = null;

    this.setDepth(20);
    this.syncPosition();
    scene.add.existing(this);
  }

  get stats() {
    return this.gs.run.stats;
  }

  syncPosition() {
    this.x = this.tx * TILE + TILE / 2;
    this.y = this.ty * TILE + TILE / 2;
  }

  /** True when the player may stand on this tile -- burrowing ignores walls. */
  walkable(x, y) {
    if (x < 0 || x >= MAZE_W || y < 0 || y >= MAZE_H) return false;
    return this.gs.maze[y][x] !== WALL || this.intangible > 0;
  }

  burrow(seconds) {
    this.intangible = seconds;
    this.setTint(0xffffff);
  }

  /**
   * A short hop in the facing direction, one tile at a time so walls still
   * stop it. Invulnerable for the duration, which is what makes it an escape.
   */
  dash() {
    if (this.dashCooldown > 0) return;

    if (this.dirX === 0 && this.dirY === 0) {
      const want = this.gs.desiredDir();
      if (!want) return;
      this.dirX = want.x;
      this.dirY = want.y;
    }

    this.dashCooldown = this.stats.dashCd;
    this.invulnTimer = DASH_INVULN;
    audio.dash();

    const steps = 3 + this.stats.dashDist;
    for (let i = 0; i < steps; i++) {
      const nx = this.tx + this.dirX;
      const ny = this.ty + this.dirY;
      const inside = nx > 0 && nx < MAZE_W - 1 && ny > 0 && ny < MAZE_H - 1;
      if (!inside || !this.walkable(Math.round(nx), Math.round(ny))) break;

      this.tx = nx;
      this.ty = ny;
      if (this.stats.dashStun) this.gs.stunGhostsNear(nx, ny, DASH_STUN_RADIUS_SQ);
      this.gs.burst(nx * TILE + TILE / 2, ny * TILE + TILE / 2, 1, PALETTE.rose);
    }
    this.syncPosition();
  }

  hurt() {
    this.invulnTimer = HIT_INVULN;
  }

  update(dt) {
    if (this.dashCooldown > 0) this.dashCooldown -= dt;
    if (this.activeCooldown > 0) this.activeCooldown -= dt;
    if (this.surgeTimer > 0) this.surgeTimer -= dt;
    if (this.invulnTimer > 0) this.invulnTimer -= dt;
    if (this.intangible > 0) {
      this.intangible -= dt;
      if (this.intangible <= 0) this.clearTint();
    }

    const tile = this.gs.tileAt(Math.round(this.tx), Math.round(this.ty));
    this.step(BASE_SPEED * this.stats.speed * this.gs.terrainFactor(tile) * dt);
    this.syncPosition();
    this.updateVisuals();
  }

  /**
   * Grid movement with a turn window. A direction is taken immediately when it
   * reverses or when standing still; otherwise it waits until the player is
   * within reach of a tile centre with an opening the requested way, which is
   * what stops a turn pressed a fraction early from being dropped.
   */
  step(distance) {
    let want = this.gs.desiredDir();

    if (want) {
      if (want.x === this.dirX && want.y === this.dirY) {
        this.gs.clearBuffer();
        want = null;
      } else if (this.dirX === 0 && this.dirY === 0) {
        const cx = Math.round(this.tx);
        const cy = Math.round(this.ty);
        if (this.walkable(cx + want.x, cy + want.y)) {
          this.tx = cx;
          this.ty = cy;
          this.dirX = want.x;
          this.dirY = want.y;
          this.gs.clearBuffer();
          want = null;
        }
      } else if (want.x === -this.dirX && want.y === -this.dirY) {
        this.dirX = want.x;
        this.dirY = want.y;
        this.gs.clearBuffer();
        want = null;
      }
    }

    let remaining = distance;

    if (want && (this.dirX !== 0 || this.dirY !== 0)) {
      const cx = Math.round(this.tx);
      const cy = Math.round(this.ty);
      const toCentre = this.dirX !== 0 ? (cx - this.tx) * this.dirX : (cy - this.ty) * this.dirY;
      if (toCentre <= remaining && toCentre >= -TURN_SLACK && this.walkable(cx + want.x, cy + want.y)) {
        this.tx = cx;
        this.ty = cy;
        remaining -= Math.max(0, toCentre);
        this.dirX = want.x;
        this.dirY = want.y;
        this.gs.clearBuffer();
      }
    }

    if (this.dirX === 0 && this.dirY === 0) return;

    const cx = Math.round(this.tx);
    const cy = Math.round(this.ty);
    const nx = this.tx + this.dirX * remaining;
    const ny = this.ty + this.dirY * remaining;

    if (this.walkable(cx + this.dirX, cy + this.dirY)) {
      this.tx = nx;
      this.ty = ny;
    } else {
      // Blocked: slide up to the centre of the current tile and stop there.
      if (this.dirX > 0) this.tx = Math.min(nx, cx);
      else if (this.dirX < 0) this.tx = Math.max(nx, cx);
      if (this.dirY > 0) this.ty = Math.min(ny, cy);
      else if (this.dirY < 0) this.ty = Math.max(ny, cy);
    }

    this.tx = Phaser.Math.Clamp(this.tx, 0, MAZE_W - 1);
    this.ty = Phaser.Math.Clamp(this.ty, 0, MAZE_H - 1);
  }

  updateVisuals() {
    const moving = this.dirX !== 0 || this.dirY !== 0;
    if (moving) {
      const dir = this.dirY !== 0 ? (this.dirY > 0 ? 'down' : 'up') : (this.dirX > 0 ? 'right' : 'left');
      const key = `pac-${dir}`;
      if (this.anims.currentAnim?.key !== key) this.play(key);
    } else if (this.anims.isPlaying) {
      this.anims.stop();
      this.setFrame(`${PAC_DIRS[0]}-0`);
    }

    // Flicker while the hit is still soaking, and fade out while burrowing.
    let alpha = 1;
    if (this.intangible > 0) alpha = 0.3;
    else if (this.invulnTimer > 0 && Math.floor(this.gs.now / 100) % 2) alpha = 0.5;
    this.setAlpha(alpha);
  }
}
