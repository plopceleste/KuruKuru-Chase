import { VIEW_W, VIEW_H, PALETTE } from '../core/constants.js';
import { audio } from '../core/audio.js';
import { shareResults, downloadResults } from '../core/results.js';
import { Button, text, layoutColumn, F, PAD, BTN_H, BTN_W } from '../ui/widgets.js';
import { BaseScene } from './BaseScene.js';

export class GameOverScene extends BaseScene {
  constructor() {
    super('GameOver');
  }

  build() {
    const run = this.run;
    audio.setMood('calm');

    const stats = [
      ['score', run.bank, this.colors.ui],
      ['floor', run.floor, this.colors.accent],
      ['time', run.finalTime, this.colors.text],
      ['best streak', run.bestStreak, PALETTE.dim]
    ];
    // Anything still in hand when the run ended never made it to the bank.
    if (run.lostCarry > 0) stats.splice(1, 0, ['left behind', run.lostCarry, PALETTE.rose]);

    const rows = [
      Math.round(F * 2),
      ...stats.map(() => Math.round(F * 1.15)),
      BTN_H,
      BTN_H
    ];
    const ys = layoutColumn(PAD, VIEW_H - PAD, rows);

    text(this, VIEW_W / 2, ys[0], 'game over', {size: Math.round(F * 1.6), color: PALETTE.danger});

    stats.forEach(([label, value, color], i) => {
      text(this, VIEW_W / 2, ys[1 + i], `${label} ${value}`, {
        size: Math.round(F * 0.9), color
      });
    });

    const half = (BTN_W - PAD) / 2;
    const buttonY = ys[1 + stats.length];

    this.shareButton = new Button(this, VIEW_W / 2 - BTN_W / 2 + half / 2, buttonY, 'share', async () => {
      const copied = await shareResults(run);
      this.shareButton.setLabel(copied ? 'copied!' : 'share');
    }, {width: half});

    new Button(this, VIEW_W / 2 + BTN_W / 2 - half / 2, buttonY, 'save', () => {
      downloadResults(run, this.colors);
    }, {width: half});

    new Button(this, VIEW_W / 2, ys[2 + stats.length], 'main menu', () => {
      this.scene.start('Menu');
    }, {dim: true});
  }
}
