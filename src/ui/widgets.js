import Phaser from 'phaser';
import { FONT, PALETTE, VIEW_W } from '../core/constants.js';

// The design surface is a fixed 1440x810 and the Scale Manager fits it to the
// window, so these are real numbers rather than fractions of an unknown canvas.
export const F = 24;
export const PAD = 18;
export const BTN_H = 58;
export const BTN_W = Math.min(VIEW_W - PAD * 2, 420);

const hexCache = new Map();

/** '#2ce8f5' -> 0x2ce8f5, which is what Phaser's colour arguments want. */
export function hex(color) {
  let value = hexCache.get(color);
  if (value === undefined) {
    value = Phaser.Display.Color.HexStringToColor(color).color;
    hexCache.set(color, value);
  }
  return value;
}

/**
 * A line of text in the game's font. `origin` follows Phaser's convention, so
 * 0.5 centres on the given point.
 */
export function text(scene, x, y, content, options = {}) {
  const label = scene.add.text(Math.round(x), Math.round(y), content, {
    fontFamily: FONT,
    fontSize: `${Math.round(options.size || F)}px`,
    color: options.color || PALETTE.paper,
    align: options.align || 'center'
  });
  label.setOrigin(options.originX ?? 0.5, options.originY ?? 0.5);
  if (options.maxWidth) fitText(label, options.maxWidth);
  return label;
}

/** Shrinks a label until it fits the space it was given. Runs once, on build. */
export function fitText(label, maxWidth) {
  let size = parseInt(label.style.fontSize, 10);
  while (size > 6 && label.width > maxWidth) {
    size -= 1;
    label.setFontSize(size);
  }
  return label;
}

/**
 * A rectangle with a bevel: light on the top and left, dark on the bottom and
 * right. Used for the touch pad keys.
 */
export function bevel(scene, x, y, w, h, fill, light, dark, thickness = 3) {
  const parts = [
    scene.add.rectangle(x, y, w, h, hex(fill)).setOrigin(0, 0),
    scene.add.rectangle(x, y, w, thickness, hex(light)).setOrigin(0, 0),
    scene.add.rectangle(x, y, thickness, h, hex(light)).setOrigin(0, 0),
    scene.add.rectangle(x, y + h - thickness, w, thickness, hex(dark)).setOrigin(0, 0),
    scene.add.rectangle(x + w - thickness, y, thickness, h, hex(dark)).setOrigin(0, 0)
  ];
  return scene.add.container(0, 0, parts);
}

/**
 * A clickable button. Hover and press states are driven by Phaser's input
 * system, including the pointer cursor -- the old build tracked hover itself
 * and set `canvas.style.cursor` by hand every frame.
 */
export class Button extends Phaser.GameObjects.Container {
  constructor(scene, x, y, label, onClick, options = {}) {
    super(scene, Math.round(x), Math.round(y));

    const width = options.width || BTN_W;
    const height = options.height || BTN_H;
    const colors = scene.colors;

    this.idleColor = options.active ? colors.accent
      : options.dim ? PALETTE.muted
        : colors.ui;
    this.hoverColor = options.active ? colors.accent : colors.text;
    this.enabledState = options.enabled !== false;

    this.bg = scene.add.rectangle(0, 0, width, height, hex(PALETTE.ink), 0.8);
    this.bg.setStrokeStyle(2, hex(this.idleColor));

    this.label = text(scene, 0, 1, label, {
      size: options.size || F,
      color: this.idleColor,
      maxWidth: width - PAD * 2
    });

    this.add([this.bg, this.label]);
    scene.add.existing(this);

    this.bg.setInteractive({useHandCursor: this.enabledState});
    this.bg.on('pointerover', () => this.setHot(true));
    this.bg.on('pointerout', () => this.setHot(false));
    this.bg.on('pointerup', () => {
      if (!this.enabledState) return;
      this.setHot(false);
      onClick();
    });
  }

  setHot(hot) {
    const color = hot && this.enabledState ? this.hoverColor : this.idleColor;
    this.bg.setFillStyle(hex(hot && this.enabledState ? PALETTE.slate : PALETTE.ink), hot ? 0.55 : 0.8);
    this.bg.setStrokeStyle(2, hex(color));
    this.label.setColor(color);
  }

  setLabel(value) {
    this.label.setText(value);
    return this;
  }
}

/**
 * A segmented meter, the kind a machine of this vintage would have. Redrawn
 * only when the value actually changes.
 */
export class Meter extends Phaser.GameObjects.Graphics {
  constructor(scene, x, y, width, height, fill, border) {
    super(scene, {x: Math.round(x), y: Math.round(y)});
    this.barWidth = Math.max(8, Math.round(width));
    this.barHeight = Math.max(4, Math.round(height));
    this.fillColor = hex(fill);
    this.borderColor = hex(border);
    this.value = -1;
    scene.add.existing(this);
    this.setValue(0);
  }

  setValue(pct) {
    const clamped = Math.max(0, Math.min(1, pct || 0));
    const segment = Math.max(3, Math.round(this.barHeight * 0.7));
    const inner = this.barWidth - 4;
    const cells = Math.max(1, Math.floor(inner / segment));
    const lit = Math.round(cells * clamped);
    if (lit === this.value) return this;
    this.value = lit;

    const cellWidth = inner / cells;
    this.clear();
    this.fillStyle(hex(PALETTE.shadow), 1);
    this.fillRect(0, 0, this.barWidth, this.barHeight);

    this.fillStyle(this.fillColor, 1);
    for (let i = 0; i < lit; i++) {
      this.fillRect(
        Math.round(2 + i * cellWidth), 2,
        Math.round(Math.max(1, cellWidth - 1)), this.barHeight - 4
      );
    }

    this.lineStyle(2, this.borderColor, 1);
    this.strokeRect(1, 1, this.barWidth - 2, this.barHeight - 2);
    return this;
  }
}

/**
 * Stacks rows down the middle of a vertical band. Each row declares its height;
 * the whole stack ends up centred in the space between `top` and `bottom`.
 */
export function layoutColumn(top, bottom, heights, gap = Math.round(F * 0.5)) {
  const total = heights.reduce((sum, h) => sum + h, 0) + Math.max(0, heights.length - 1) * gap;
  let y = top + Math.max(0, (bottom - top - total) / 2);
  return heights.map((height) => {
    const centre = Math.round(y + height / 2);
    y += height + gap;
    return centre;
  });
}
