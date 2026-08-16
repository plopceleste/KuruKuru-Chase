import { VIEW_W, VIEW_H, PALETTE } from '../core/constants.js';
import { bevel, text, hex, PAD } from './widgets.js';

const KEY = 92;
const BTN = 120;
const PAD_X = PAD;
const PAD_Y = VIEW_H - PAD - KEY * 3;
const ARC_X = BTN + Math.round(PAD * 0.5);
const ARC_Y = Math.round(BTN * 0.62);

const OVERLAY_ALPHA = 0.62;

/** True on anything driven by a finger rather than a mouse. */
export function isTouchDevice() {
  return typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
}

const ZONES = {
  up: {x: PAD_X + KEY, y: PAD_Y, w: KEY, h: KEY},
  left: {x: PAD_X, y: PAD_Y + KEY, w: KEY, h: KEY},
  mid: {x: PAD_X + KEY, y: PAD_Y + KEY, w: KEY, h: KEY},
  right: {x: PAD_X + KEY * 2, y: PAD_Y + KEY, w: KEY, h: KEY},
  down: {x: PAD_X + KEY, y: PAD_Y + KEY * 2, w: KEY, h: KEY},
  dash: {x: VIEW_W - PAD - BTN, y: VIEW_H - PAD - BTN, w: BTN, h: BTN},
  item: {x: VIEW_W - PAD - BTN - ARC_X, y: VIEW_H - PAD - BTN - ARC_Y, w: BTN, h: BTN}
};

const DIR_KEYS = ['up', 'down', 'left', 'right'];

function inside(zone, x, y) {
  return x >= zone.x && x <= zone.x + zone.w && y >= zone.y && y <= zone.y + zone.h;
}

/**
 * The on-screen pad. Hit testing is done against fixed rectangles rather than
 * per-object handlers so that sliding a thumb from one key to the next changes
 * direction, which is how a real d-pad behaves.
 */
export class TouchControls {
  constructor(scene) {
    this.scene = scene;
    this.held = null;
    this.pointers = new Map();

    const colors = scene.colors;
    const layer = scene.add.container(0, 0).setDepth(120).setAlpha(OVERLAY_ALPHA);

    this.keyFaces = {};
    for (const key of [...DIR_KEYS, 'mid']) {
      const zone = ZONES[key];
      const face = bevel(scene, zone.x, zone.y, zone.w, zone.h, PALETTE.shadow, PALETTE.slate, PALETTE.ink);
      layer.add(face);
      this.keyFaces[key] = face;
    }

    const arrows = scene.add.graphics();
    arrows.fillStyle(hex(colors.accent), 1);
    for (const key of DIR_KEYS) {
      const zone = ZONES[key];
      const cx = zone.x + zone.w / 2;
      const cy = zone.y + zone.h / 2;
      const unit = Math.max(2, Math.round(zone.w / 11));
      const dx = key === 'left' ? -1 : key === 'right' ? 1 : 0;
      const dy = key === 'up' ? -1 : key === 'down' ? 1 : 0;
      // Three stacked bars, longest first, make an arrowhead.
      for (let i = 0; i < 3; i++) {
        const len = (3 - i) * 2;
        if (dy) arrows.fillRect(cx - len * unit / 2, cy + dy * (i - 1) * unit, len * unit, unit);
        else arrows.fillRect(cx + dx * (i - 1) * unit, cy - len * unit / 2, unit, len * unit);
      }
    }

    const midDot = Math.max(3, Math.round(ZONES.mid.w * 0.16));
    arrows.fillStyle(hex(PALETTE.ink), 1);
    arrows.fillRect(
      ZONES.mid.x + ZONES.mid.w / 2 - midDot, ZONES.mid.y + ZONES.mid.h / 2 - midDot,
      midDot * 2, midDot * 2
    );
    layer.add(arrows);

    this.dash = this.actionButton(scene, layer, ZONES.dash, 'dash', colors.accent);
    this.item = this.actionButton(scene, layer, ZONES.item, 'item', PALETTE.rose);

    scene.input.on('pointerdown', this.onDown, this);
    scene.input.on('pointermove', this.onMove, this);
    scene.input.on('pointerup', this.onUp, this);
    scene.input.on('pointerupoutside', this.onUp, this);
    scene.events.once('shutdown', () => {
      scene.input.off('pointerdown', this.onDown, this);
      scene.input.off('pointermove', this.onMove, this);
      scene.input.off('pointerup', this.onUp, this);
      scene.input.off('pointerupoutside', this.onUp, this);
    });
  }

  actionButton(scene, layer, zone, label, color) {
    const box = scene.add.rectangle(zone.x, zone.y, zone.w, zone.h, hex(PALETTE.ink), 0.8).setOrigin(0, 0);
    box.setStrokeStyle(3, hex(color));
    const caption = text(scene, zone.x + zone.w / 2, zone.y + zone.h / 2, label, {
      size: Math.round(zone.w * 0.28), color, maxWidth: zone.w - 8
    });
    layer.add([box, caption]);
    return {box, caption, color, ready: true};
  }

  /** Greys a button out while its cooldown is running. */
  setReady(button, ready) {
    if (button.ready === ready) return;
    button.ready = ready;
    const color = ready ? button.color : PALETTE.muted;
    button.box.setStrokeStyle(3, hex(color));
    button.caption.setColor(color);
  }

  dirAt(x, y) {
    for (const key of DIR_KEYS) {
      if (inside(ZONES[key], x, y)) return key;
    }
    return null;
  }

  onDown(pointer) {
    const dir = this.dirAt(pointer.x, pointer.y);
    if (dir) {
      this.pointers.set(pointer.id, 'pad');
      this.setHeld(dir);
      return;
    }
    if (inside(ZONES.dash, pointer.x, pointer.y)) {
      this.pointers.set(pointer.id, 'action');
      this.scene.player.dash();
      return;
    }
    if (inside(ZONES.item, pointer.x, pointer.y)) {
      this.pointers.set(pointer.id, 'action');
      this.scene.useActive();
      return;
    }
    this.pointers.set(pointer.id, 'swipe');
    this.swipeFrom = {x: pointer.x, y: pointer.y, done: false};
  }

  onMove(pointer) {
    const role = this.pointers.get(pointer.id);
    if (role === 'pad') {
      const dir = this.dirAt(pointer.x, pointer.y);
      if (dir && dir !== this.held) this.setHeld(dir);
      return;
    }
    if (role !== 'swipe' || !this.swipeFrom || this.swipeFrom.done) return;

    const dx = pointer.x - this.swipeFrom.x;
    const dy = pointer.y - this.swipeFrom.y;
    if (Math.abs(dx) > 40 || Math.abs(dy) > 40) {
      this.swipeFrom.done = true;
      this.scene.queueDir(
        Math.abs(dx) > Math.abs(dy)
          ? (dx > 0 ? 'right' : 'left')
          : (dy > 0 ? 'down' : 'up')
      );
    }
  }

  onUp(pointer) {
    if (this.pointers.get(pointer.id) === 'pad') this.setHeld(null);
    this.pointers.delete(pointer.id);
  }

  setHeld(dir) {
    if (this.held && this.keyFaces[this.held]) this.keyFaces[this.held].setAlpha(1);
    this.held = dir;
    if (dir) {
      this.keyFaces[dir].setAlpha(0.7);
      this.scene.queueDir(dir);
    }
  }

  update() {
    const scene = this.scene;
    this.setReady(this.dash, scene.player.dashCooldown <= 0);
    this.setReady(this.item, !!scene.run.activeItem && scene.player.activeCooldown <= 0);
  }
}
