import { VIEW_W, VIEW_H, PALETTE } from '../core/constants.js';
import { save } from '../core/save.js';
import { applyCrt } from '../fx/crt.js';
import { Button, text, layoutColumn, F, PAD, BTN_H, BTN_W } from '../ui/widgets.js';
import { BaseScene } from './BaseScene.js';

// 0 means "no limit": run at whatever the display refreshes at. Capping above
// the refresh rate was never possible, so the old 120 option was a fiction.
const FRAME_LIMITS = [
  {label: '30', value: 30},
  {label: '60', value: 60},
  {label: 'max', value: 0}
];

export class OptionsScene extends BaseScene {
  constructor() {
    super('Options');
  }

  build() {
    const rows = [
      Math.round(F * 2.1),
      Math.round(F * 1.2), BTN_H,
      Math.round(F * 1.2), BTN_H,
      BTN_H, BTN_H
    ];
    const ys = layoutColumn(PAD, VIEW_H - PAD, rows);

    text(this, VIEW_W / 2, ys[0], 'KuruKuru Chase!!', {
      size: F * 2, color: this.colors.text, maxWidth: VIEW_W - PAD * 2
    });

    text(this, VIEW_W / 2, ys[1], 'crt filter', {size: Math.round(F * 0.9), color: PALETTE.dim});
    this.crtButton = new Button(this, VIEW_W / 2, ys[2], this.crtLabel(), () => {
      save.crt = !save.crt;
      applyCrt(this, save.crt);
      this.crtButton.setLabel(this.crtLabel());
      this.crtButton.setHot(false);
    }, {active: save.crt});

    text(this, VIEW_W / 2, ys[3], 'frame limit', {size: Math.round(F * 0.9), color: PALETTE.dim});
    this.buildFrameLimits(ys[4]);

    this.fullscreenButton = new Button(this, VIEW_W / 2, ys[5], this.fullscreenLabel(), () => {
      this.scale.toggleFullscreen();
      this.fullscreenButton.setLabel(this.fullscreenLabel());
    });

    new Button(this, VIEW_W / 2, ys[6], 'back', () => this.scene.start('Menu'));
  }

  buildFrameLimits(y) {
    const width = (BTN_W - PAD * 2) / 3;
    FRAME_LIMITS.forEach((option, i) => {
      const x = VIEW_W / 2 - BTN_W / 2 + width / 2 + i * (width + PAD);
      new Button(this, x, y, option.label, () => {
        save.fpsLimit = option.value;
        this.game.loop.setFPSLimit(option.value);
        this.scene.restart();
      }, {width, active: save.fpsLimit === option.value});
    });
  }

  crtLabel() {
    return save.crt ? 'on' : 'off';
  }

  fullscreenLabel() {
    return this.scale.isFullscreen ? 'exit fullscreen' : 'fullscreen';
  }
}
