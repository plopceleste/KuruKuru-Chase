import Phaser from 'phaser';
import {
  VIEW_W, VIEW_H, TILE, MAZE_W, MAZE_H, WALL, FAST, MUD,
  INPUT_BUFFER, DIR_VECTORS, PALETTE
} from '../core/constants.js';
import { generateFloor } from '../core/maze.js';
import { CARDS } from '../core/cards.js';
import { audio } from '../core/audio.js';
import { TEX, paintMaze } from '../gfx/textures.js';
import { Player } from '../objects/Player.js';
import { Ghost } from '../objects/Ghost.js';
import { Warden } from '../objects/Warden.js';
import { Hud, HUD_H } from '../ui/Hud.js';
import { TouchControls, isTouchDevice } from '../ui/TouchControls.js';
import { text, hex, F, PAD } from '../ui/widgets.js';
import { BaseScene } from './BaseScene.js';

const CAMERA_LERP = 0.1;
const PICKUP_RANGE = 0.5;
const CATCH_RANGE_SQ = 0.36;
const MAGNET_RANGE_SQ = 64;
const MAGNET_SPEED = 10;
const BANNER_MS = 1400;
const ORB_PULSE_MS = 250;
const GATE_PULSE_MS = 250;
const ANCHOR_BLINK_MS = 300;
const SURGE_BLINK_MS = 120;
const BASE_CURFEW = 92;
const MIN_CURFEW = 50;
const CHAIN_CAP = 800;

export class GameScene extends BaseScene {
  constructor() {
    super('Game');
  }

  get now() {
    return this.time.now;
  }

  build() {
    const run = this.run;

    this.gameTime = 0;
    this.paused = false;
    this.finished = false;
    this.timeStop = 0;
    this.veilTimer = 0;
    this.magnetPulse = 0;
    this.chain = 0;
    this.bait = null;
    this.warden = null;
    this.heldDirs = [];
    this.dirBuffer = null;

    const floor = generateFloor(run.floor, run.rng, run.stats.quotaRate);
    this.maze = floor.maze;
    this.gate = floor.gate;
    this.totalCoins = floor.totalCoins;
    this.quota = floor.quota;
    this.coinsTaken = 0;
    this.curfew = Math.max(MIN_CURFEW, BASE_CURFEW - run.floor * 2) + run.stats.curfewPlus;
    this.bubbleUp = run.stats.bubble;

    this.buildWorld(floor);
    this.buildInput();

    this.hud = new Hud(this);
    this.touch = isTouchDevice() ? new TouchControls(this) : null;
    this.buildOverlays();

    audio.setMood('full');
  }

  // -- construction ---------------------------------------------------------

  buildWorld(floor) {
    // The play area is what is left once the status bar has taken its cut.
    this.area = {
      x: 0,
      y: HUD_H + PAD,
      w: VIEW_W,
      h: VIEW_H - HUD_H - PAD * 2
    };

    const mapW = MAZE_W * TILE;
    const mapH = MAZE_H * TILE;

    // A whole-number zoom, so art pixels stay square.
    this.zoom = Phaser.Math.Clamp(
      Math.floor(Math.min(this.area.w / mapW, this.area.h * 1.03 / mapH)), 1, 4
    );
    this.mapW = mapW * this.zoom;
    this.mapH = mapH * this.zoom;

    this.world = this.add.container(0, 0).setScale(this.zoom);

    paintMaze(this, this.maze, this.colors);
    this.world.add(this.add.image(0, 0, TEX.maze).setOrigin(0, 0).setDepth(0));

    this.coins = floor.coins.map((spot) => {
      const sprite = this.add.image(spot.x * TILE + TILE / 2, spot.y * TILE + TILE / 2, TEX.coin)
        .setDepth(5);
      sprite.tileX = spot.x;
      sprite.tileY = spot.y;
      this.world.add(sprite);
      return sprite;
    });

    this.orbs = floor.orbs.map((spot) => {
      const sprite = this.add.image(spot.x * TILE + TILE / 2, spot.y * TILE + TILE / 2, TEX.orb, 'big')
        .setDepth(5);
      sprite.tileX = spot.x;
      sprite.tileY = spot.y;
      this.world.add(sprite);
      return sprite;
    });

    this.gateSprite = this.add
      .image(this.gate.x * TILE + TILE / 2, this.gate.y * TILE + TILE / 2, TEX.gate, 'closed')
      .setDepth(6);
    this.world.add(this.gateSprite);

    this.anchorSprite = this.add.image(0, 0, TEX.anchor, 'f0').setDepth(7).setVisible(false);
    this.world.add(this.anchorSprite);

    this.baitSprite = this.add.image(0, 0, TEX.bait).setDepth(7).setVisible(false);
    this.world.add(this.baitSprite);

    this.player = new Player(this, floor.start.x, floor.start.y);
    this.world.add(this.player);

    // Rings that mark a surge and a spare bubble. Squares, because everything
    // in this game is drawn on a grid.
    const ringSize = TILE + 6;
    this.surgeRing = this.add.rectangle(0, 0, ringSize, ringSize)
      .setStrokeStyle(2, hex(this.colors.pellet)).setDepth(21).setVisible(false);
    this.bubbleRing = this.add.rectangle(0, 0, ringSize, ringSize)
      .setStrokeStyle(2, hex(this.colors.ui)).setDepth(19).setVisible(false);
    this.world.add([this.surgeRing, this.bubbleRing]);

    this.ghosts = floor.ghosts.map((spot, i) => {
      const ghost = new Ghost(this, spot.x, spot.y, i, this.run.floor);
      this.world.add(ghost);
      return ghost;
    });

    this.sparks = this.add.particles(0, 0, TEX.pixel, {
      lifespan: 500,
      speed: {min: 20, max: 150},
      angle: {min: 0, max: 360},
      alpha: {start: 1, end: 0},
      emitting: false
    }).setDepth(30);
    this.world.add(this.sparks);

    this.positionWorld(true);

    // Pickups pulse on a shared clock so they all flash together.
    this.time.addEvent({
      delay: ORB_PULSE_MS,
      loop: true,
      callback: () => {
        const big = Math.floor(this.now / ORB_PULSE_MS) % 2 === 1;
        for (const orb of this.orbs) orb.setFrame(big ? 'big' : 'small');
        if (this.gate.open) {
          this.gateSprite.setFrame(Math.floor(this.now / GATE_PULSE_MS) % 2 ? 'open-1' : 'open-0');
        }
      }
    });
  }

  buildInput() {
    const keyboard = this.input.keyboard;

    const bind = (name, ...codes) => {
      for (const code of codes) {
        const key = keyboard.addKey(code);
        key.on('down', () => this.pressDir(name));
        key.on('up', () => this.releaseDir(name));
      }
    };

    bind('up', 'UP', 'W');
    bind('down', 'DOWN', 'S');
    bind('left', 'LEFT', 'A');
    bind('right', 'RIGHT', 'D');

    keyboard.addKey('SPACE').on('down', () => {
      if (!this.paused) this.player.dash();
    });
    keyboard.addKey('E').on('down', () => {
      if (!this.paused) this.useActive();
    });
    keyboard.addKey('P').on('down', () => this.togglePause());
    keyboard.addKey('ESC').on('down', () => this.togglePause());

    // Losing focus mid-run should not leave a direction stuck down.
    this.game.events.on('blur', this.clearInput, this);
    this.events.once('shutdown', () => {
      this.game.events.off('blur', this.clearInput, this);
    });
  }

  buildOverlays() {
    this.banner = text(this, VIEW_W / 2, HUD_H + VIEW_H * 0.16, `floor ${this.run.floor}`, {
      size: Math.round(F * 1.8), color: this.colors.text
    }).setDepth(150);

    this.tweens.add({
      targets: this.banner,
      alpha: 0,
      delay: BANNER_MS * 0.7,
      duration: BANNER_MS * 0.3,
      onComplete: () => this.banner.destroy()
    });

    this.pauseLayer = this.add.container(0, 0).setDepth(200).setVisible(false);
    this.pauseLayer.add([
      this.add.rectangle(0, 0, VIEW_W, VIEW_H, hex(PALETTE.ink), 0.72).setOrigin(0, 0),
      text(this, VIEW_W / 2, VIEW_H * 0.45, 'paused', {size: Math.round(F * 1.6), color: this.colors.text}),
      text(this, VIEW_W / 2, VIEW_H * 0.45 + F * 2.6, 'press p to keep going', {
        size: Math.round(F * 0.8), color: PALETTE.dim
      })
    ]);
  }

  // -- input ----------------------------------------------------------------

  pressDir(name) {
    const at = this.heldDirs.indexOf(name);
    if (at >= 0) this.heldDirs.splice(at, 1);
    this.heldDirs.push(name);
    this.queueDir(name);
  }

  releaseDir(name) {
    const at = this.heldDirs.indexOf(name);
    if (at >= 0) this.heldDirs.splice(at, 1);
  }

  /** Remembers a direction for a moment so a turn pressed early still lands. */
  queueDir(name) {
    const vector = DIR_VECTORS[name];
    if (!vector) return;
    this.dirBuffer = {x: vector.x, y: vector.y, at: this.gameTime};
  }

  clearInput() {
    this.heldDirs.length = 0;
    this.dirBuffer = null;
    if (this.touch) this.touch.setHeld(null);
  }

  clearBuffer() {
    this.dirBuffer = null;
  }

  /** The direction the player is asking for: the buffered one, else whatever is held. */
  desiredDir() {
    if (this.dirBuffer) {
      if (this.gameTime - this.dirBuffer.at <= INPUT_BUFFER) return this.dirBuffer;
      this.dirBuffer = null;
    }
    const name = this.touch?.held || this.heldDirs[this.heldDirs.length - 1];
    return name ? DIR_VECTORS[name] : null;
  }

  togglePause() {
    if (this.finished) return;
    this.paused = !this.paused;
    this.pauseLayer.setVisible(this.paused);
    audio.setMood(this.paused ? 'calm' : 'full');
    if (this.paused) this.clearInput();
  }

  // -- world queries --------------------------------------------------------

  tileAt(x, y) {
    if (y < 0 || y >= MAZE_H || x < 0 || x >= MAZE_W) return WALL;
    return this.maze[y][x];
  }

  terrainFactor(tile) {
    if (tile === FAST) return 1.2;
    if (tile === MUD && !this.run.stats.mudProof) return 0.8;
    return 1;
  }

  // -- effects --------------------------------------------------------------

  burst(x, y, count, color) {
    this.sparks.setParticleTint(hex(color));
    this.sparks.emitParticleAt(x, y, count);
  }

  shake(duration, intensity) {
    this.cameras.main.shake(duration, intensity);
  }

  popup(label, tileX, tileY, color) {
    const note = text(this, tileX * TILE + TILE / 2, tileY * TILE, label, {
      size: 7, color
    }).setDepth(40);
    this.world.add(note);
    this.tweens.add({
      targets: note,
      y: note.y - TILE,
      alpha: 0,
      duration: 900,
      onComplete: () => note.destroy()
    });
  }

  stunGhostsNear(tileX, tileY, rangeSq) {
    for (const ghost of this.ghosts) {
      if (ghost.dead) continue;
      const dx = ghost.tx - tileX;
      const dy = ghost.ty - tileY;
      if (dx * dx + dy * dy < rangeSq) ghost.stun = Math.max(ghost.stun, 2);
    }
  }

  // -- card hooks -----------------------------------------------------------

  startSurge(duration) {
    this.player.surgeTimer = duration;
    this.chain = 0;
    for (const ghost of this.ghosts) ghost.scaredTimer = duration;
  }

  quake() {
    for (const ghost of this.ghosts) {
      if (!ghost.dead) ghost.stun = Math.max(ghost.stun, 3);
    }
    this.shake(400, 0.01);
  }

  spawnBait() {
    this.bait = {tileX: this.player.tx, tileY: this.player.ty, life: 6};
    this.baitSprite
      .setPosition(this.bait.tileX * TILE + TILE / 2, this.bait.tileY * TILE + TILE / 2)
      .setVisible(true);
  }

  /** First press drops the marker, second press warps back to it. */
  useAnchor() {
    const player = this.player;
    if (!player.anchor) {
      player.anchor = {x: player.tx, y: player.ty};
      this.anchorSprite
        .setPosition(player.tx * TILE + TILE / 2, player.ty * TILE + TILE / 2)
        .setVisible(true);
      return false;
    }

    player.tx = player.anchor.x;
    player.ty = player.anchor.y;
    player.dirX = 0;
    player.dirY = 0;
    player.syncPosition();
    this.clearBuffer();
    this.burst(player.x, player.y, 8, PALETTE.cyan);
    player.anchor = null;
    this.anchorSprite.setVisible(false);
    return true;
  }

  useActive() {
    const run = this.run;
    const player = this.player;
    if (!run.activeItem || player.activeCooldown > 0) return;

    const card = CARDS[run.activeItem];
    if (!card) return;

    const skipCooldown = card.onUse(this) === false;
    audio.skill();
    if (!skipCooldown) player.activeCooldown = card.cd;
  }

  // -- scoring --------------------------------------------------------------

  collectCoin(index) {
    const coin = this.coins[index];
    this.coins.splice(index, 1);
    coin.destroy();
    this.coinsTaken++;

    const run = this.run;
    const stats = run.stats;
    let pay = 10 + stats.coinPlus;
    if (this.gate.open) pay *= stats.overtimeRate;
    pay = Math.floor(pay * (1 + run.streak * 0.02));

    if (stats.lucky > 0 && run.rng() < stats.lucky) {
      pay *= 5;
      this.popup('5x', coin.tileX, coin.tileY, PALETTE.gold);
    }

    run.carry += pay;
    run.streak += stats.streakStep;
    if (run.streak > run.bestStreak) run.bestStreak = run.streak;
    audio.coin();

    if (!this.gate.open && this.coinsTaken >= this.quota) this.openGate();
  }

  collectOrb(index) {
    const orb = this.orbs[index];
    this.orbs.splice(index, 1);
    orb.destroy();

    const stats = this.run.stats;
    this.startSurge(7 + stats.surgePlus);
    if (stats.orbPay > 0) {
      this.run.carry += stats.orbPay;
      this.popup(`+${stats.orbPay}`, orb.tileX, orb.tileY, PALETTE.gold);
    }
    audio.orb();
  }

  openGate() {
    this.gate.open = true;
    this.gateSprite.setFrame('open-0');
    this.shake(250, 0.006);
    audio.gate();
    this.burst(this.gateSprite.x, this.gateSprite.y, 12, this.colors.accent);
  }

  catchGhost(ghost) {
    ghost.catchIt();
    this.chain++;

    const pay = Math.min(CHAIN_CAP, 100 * Math.pow(2, this.chain - 1)) * this.run.stats.bounty;
    this.run.carry += pay;
    this.popup(`+${pay}`, ghost.tx, ghost.ty, PALETTE.gold);
    this.shake(300, 0.008);
    audio.catchGhost();
    this.burst(ghost.x, ghost.y, 10, this.colors.ghosts[ghost.type]);
  }

  hurt() {
    const run = this.run;

    // The bubble eats one hit per floor and costs nothing else.
    if (this.bubbleUp) {
      this.bubbleUp = false;
      this.player.hurt();
      this.shake(300, 0.008);
      audio.hurt();
      return;
    }

    run.health -= 1;
    this.player.hurt();
    this.shake(400, 0.014);
    run.streak = Math.floor(run.streak * run.stats.streakKeep);
    audio.hurt();
    this.burst(this.player.x, this.player.y, 15, PALETTE.danger);

    if (run.health > 0) return;

    if (run.stats.encore) {
      run.stats.encore = false;
      run.health = 1;
      this.player.invulnTimer = 3;
      this.shake(600, 0.02);
      for (const ghost of this.ghosts) ghost.stun = 3;
      return;
    }

    audio.die();
    this.gameOver();
  }

  exitFloor() {
    if (this.finished) return;
    this.finished = true;
    audio.clear();
    this.run.bankFloor();
    this.scene.start('Upgrade');
  }

  gameOver() {
    if (this.finished) return;
    this.finished = true;
    this.run.finish();
    this.scene.start('GameOver');
  }

  // -- frame ----------------------------------------------------------------

  update(_time, delta) {
    if (this.paused || this.finished) return;

    const dt = Math.min(delta / 1000, 0.1);
    this.gameTime += dt;

    const run = this.run;
    const player = this.player;

    if (this.timeStop > 0) this.timeStop -= dt;
    if (this.veilTimer > 0) this.veilTimer -= dt;

    if (!this.warden) {
      this.curfew -= dt;
      if (this.curfew <= 0) this.spawnWarden();
    }

    player.update(dt);

    if (this.magnetPulse > 0) {
      this.magnetPulse -= dt;
      this.pullCoins(dt);
    }

    this.checkPickups();
    if (this.finished) return;

    if (this.timeStop <= 0) this.updateGhosts(dt);
    if (this.warden) this.updateWarden(dt);
    if (this.finished) return;

    this.updateBait(dt);
    this.updateRings();
    this.positionWorld(false);

    this.hud.update();
    this.touch?.update();

    audio.setMood(player.surgeTimer > 0 || this.warden ? 'frenzy' : 'full');
  }

  pullCoins(dt) {
    const player = this.player;
    for (const coin of this.coins) {
      const dx = player.tx - coin.tileX;
      const dy = player.ty - coin.tileY;
      const distSq = dx * dx + dy * dy;
      if (distSq >= MAGNET_RANGE_SQ || distSq <= 0.0025) continue;
      const dist = Math.sqrt(distSq);
      coin.tileX += (dx / dist) * dt * MAGNET_SPEED;
      coin.tileY += (dy / dist) * dt * MAGNET_SPEED;
      coin.setPosition(coin.tileX * TILE + TILE / 2, coin.tileY * TILE + TILE / 2);
    }
  }

  checkPickups() {
    const player = this.player;

    for (let i = this.coins.length - 1; i >= 0; i--) {
      const coin = this.coins[i];
      if (Math.abs(coin.tileX - player.tx) < PICKUP_RANGE && Math.abs(coin.tileY - player.ty) < PICKUP_RANGE) {
        this.collectCoin(i);
      }
    }

    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const orb = this.orbs[i];
      if (Math.abs(orb.tileX - player.tx) < PICKUP_RANGE && Math.abs(orb.tileY - player.ty) < PICKUP_RANGE) {
        this.collectOrb(i);
      }
    }

    if (this.gate.open
      && Math.abs(this.gate.x - player.tx) < 0.6
      && Math.abs(this.gate.y - player.ty) < 0.6) {
      this.exitFloor();
    }
  }

  updateGhosts(dt) {
    const player = this.player;
    for (const ghost of this.ghosts) {
      ghost.update(dt);
      if (ghost.dead) continue;

      const dx = ghost.tx - player.tx;
      const dy = ghost.ty - player.ty;
      if (dx * dx + dy * dy >= CATCH_RANGE_SQ) continue;

      if (player.surgeTimer > 0 && ghost.scaredTimer > 0) this.catchGhost(ghost);
      else if (player.invulnTimer <= 0) this.hurt();
      if (this.finished) return;
    }
  }

  updateWarden(dt) {
    this.warden.update(dt);
    const dx = this.warden.tx - this.player.tx;
    const dy = this.warden.ty - this.player.ty;
    if (this.player.invulnTimer <= 0 && dx * dx + dy * dy < CATCH_RANGE_SQ) this.hurt();
  }

  spawnWarden() {
    this.warden = Warden.spawnFurthestFrom(this, this.player);
    this.world.add(this.warden);
    this.shake(600, 0.02);
    audio.warden();
  }

  updateBait(dt) {
    if (!this.bait) return;
    this.bait.life -= dt;
    if (this.bait.life <= 0) {
      this.bait = null;
      this.baitSprite.setVisible(false);
      return;
    }
    this.baitSprite.setAlpha(0.5 + 0.3 * (Math.floor(this.now / 150) % 2));
  }

  updateRings() {
    const player = this.player;

    const surging = player.surgeTimer > 0 && Math.floor(this.now / SURGE_BLINK_MS) % 2 === 1;
    this.surgeRing.setVisible(surging);
    if (surging) this.surgeRing.setPosition(player.x, player.y);

    this.bubbleRing.setVisible(this.bubbleUp);
    if (this.bubbleUp) this.bubbleRing.setPosition(player.x, player.y);

    if (this.anchorSprite.visible) {
      this.anchorSprite.setFrame(`f${Math.floor(this.now / ANCHOR_BLINK_MS) % 2}`);
    }
  }

  /**
   * Slides the world so the player stays centred, stopping at the edges of the
   * maze. When a floor fits in the play area -- which it does at this design
   * size -- it simply sits in the middle.
   */
  positionWorld(snap) {
    const area = this.area;
    const targetX = area.x + (this.mapW < area.w
      ? (area.w - this.mapW) / 2
      : Phaser.Math.Clamp(area.w / 2 - this.player.x * this.zoom, area.w - this.mapW, 0));
    const targetY = area.y + (this.mapH < area.h
      ? (area.h - this.mapH) / 2
      : Phaser.Math.Clamp(area.h / 2 - this.player.y * this.zoom, area.h - this.mapH, 0));

    if (snap) {
      this.world.setPosition(Math.round(targetX), Math.round(targetY));
      return;
    }
    this.world.setPosition(
      Math.round(this.world.x + (targetX - this.world.x) * CAMERA_LERP),
      Math.round(this.world.y + (targetY - this.world.y) * CAMERA_LERP)
    );
  }
}
