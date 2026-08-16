import { VIEW_W, VIEW_H, PALETTE } from '../core/constants.js';
import { THEMES } from '../core/themes.js';
import { save } from '../core/save.js';
import { buildTextures } from '../gfx/textures.js';
import { Button, text, hex, layoutColumn, F, PAD, BTN_H } from '../ui/widgets.js';
import { BaseScene } from './BaseScene.js';

const COLUMNS = 6;
const CARD_H = Math.round(F * 3.4);
const GAP = Math.round(F * 0.5);
const CARD_W = Math.min(Math.round((VIEW_W - PAD * 2 - GAP * (COLUMNS - 1)) / COLUMNS), F * 12);

export class ThemesScene extends BaseScene {
  constructor() {
    super('Themes');
  }

  build() {
    const lines = Math.ceil(THEMES.length / COLUMNS);
    const rows = [
      Math.round(F * 2.1),
      Math.round(F * 1.2),
      lines * CARD_H + (lines - 1) * GAP,
      BTN_H
    ];
    const ys = layoutColumn(PAD, VIEW_H - PAD, rows);

    text(this, VIEW_W / 2, ys[0], 'KuruKuru Chase!!', {
      size: F * 2, color: this.colors.text, maxWidth: VIEW_W - PAD * 2
    });
    text(this, VIEW_W / 2, ys[1], 'select theme', {size: Math.round(F * 0.9), color: this.colors.text});

    const gridTop = ys[2] - (lines * CARD_H + (lines - 1) * GAP) / 2;
    const totalW = CARD_W * COLUMNS + GAP * (COLUMNS - 1);
    const gridLeft = VIEW_W / 2 - totalW / 2;

    THEMES.forEach((theme, index) => {
      const locked = this.run.highScore < theme.score;
      const x = gridLeft + (index % COLUMNS) * (CARD_W + GAP);
      const y = gridTop + Math.floor(index / COLUMNS) * (CARD_H + GAP);
      this.buildCard(theme, index, locked, x, y);
    });

    new Button(this, VIEW_W / 2, ys[3], 'back', () => this.scene.start('Menu'));
  }

  buildCard(theme, index, locked, x, y) {
    const selected = index === this.run.themeIndex;
    const border = selected ? this.colors.accent : (locked ? PALETTE.slate : this.colors.ui);

    const box = this.add.rectangle(x, y, CARD_W, CARD_H, hex(PALETTE.ink), locked ? 0.9 : 1)
      .setOrigin(0, 0);
    box.setStrokeStyle(2, hex(border));

    text(this, x + CARD_W / 2, y + CARD_H * 0.32, theme.name, {
      size: Math.round(F * 0.9),
      color: locked ? PALETTE.muted : theme.colors.ui,
      maxWidth: CARD_W - 8
    });

    text(this, x + CARD_W / 2, y + CARD_H * 0.68, locked ? `${theme.score / 1000}k` : 'ok', {
      size: Math.round(F * 0.8), color: PALETTE.dim, maxWidth: CARD_W - 8
    });

    if (locked) return;

    box.setInteractive({useHandCursor: true});
    box.on('pointerup', () => this.choose(index));
  }

  choose(index) {
    this.run.themeIndex = index;
    save.theme = index;
    // Sprites are baked per theme, so the art has to be repainted before the
    // screen comes back up in the new colours.
    buildTextures(this, THEMES[index].colors);
    this.scene.restart();
  }
}
