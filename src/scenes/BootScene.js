import { VIEW_W, VIEW_H, FONT, PALETTE } from '../core/constants.js';
import { save } from '../core/save.js';
import { audio } from '../core/audio.js';
import { buildTextures } from '../gfx/textures.js';
import { createPlayerAnimations } from '../objects/Player.js';
import { applyCrt } from '../fx/crt.js';
import { Button, Meter, text, layoutColumn, F, PAD, BTN_H } from '../ui/widgets.js';
import { isTouchDevice } from '../ui/TouchControls.js';
import { BaseScene } from './BaseScene.js';

const BAR_W = F * 20;

/** Lets a frame render so the progress bar actually moves between steps. */
function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 60)));
}

export class BootScene extends BaseScene {
  constructor() {
    super('Boot');
  }

  build() {
    const rows = [Math.round(F * 2.1), Math.round(F * 1.2), Math.round(F * 1.25), BTN_H, BTN_H];
    const ys = layoutColumn(PAD, VIEW_H - PAD, rows);

    this.title = text(this, VIEW_W / 2, ys[0], 'KuruKuru Chase!!', {
      size: F * 2, color: this.colors.text, maxWidth: VIEW_W - PAD * 2
    });

    this.bar = new Meter(
      this, VIEW_W / 2 - BAR_W / 2, ys[1] - Math.round(F * 0.55),
      BAR_W, Math.round(F * 1.1), this.colors.accent, this.colors.ui
    );

    this.status = text(this, VIEW_W / 2, ys[2], 'starting', {color: PALETTE.dim});
    this.buttonY = [ys[3], ys[4]];

    this.boot();
  }

  async boot() {
    await this.step('loading font', 0.15);

    // Text bakes to a texture the moment it is created, so anything drawn
    // before the face arrives is stuck in the fallback font until it is asked
    // to lay itself out again.
    try {
      await Promise.all([
        document.fonts.load(`16px ${FONT}`),
        document.fonts.load(`32px ${FONT}`)
      ]);
      await document.fonts.ready;
    } catch {
      /* no webfont: the fallback is legible, carry on */
    }
    this.title.updateText();
    this.status.updateText();

    await this.step('building sprites', 0.55);
    buildTextures(this, this.colors);
    createPlayerAnimations(this);

    await this.step('warming the tube', 0.85);
    await this.step('tap start to begin', 1);

    this.showStart();
  }

  async step(label, progress) {
    this.status.setText(label);
    this.bar.setValue(progress);
    await nextFrame();
  }

  showStart() {
    new Button(this, VIEW_W / 2, this.buttonY[0], 'start', () => {
      // The audio context and fullscreen both need a real user gesture.
      audio.unlock();
      if (isTouchDevice()) this.goImmersive();
      this.scene.start('Menu');
    }, {active: true});

    this.crtButton = new Button(this, VIEW_W / 2, this.buttonY[1], this.crtLabel(), () => {
      save.crt = !save.crt;
      applyCrt(this, save.crt);
      this.crtButton.setLabel(this.crtLabel());
    }, {dim: !save.crt});
  }

  crtLabel() {
    return `crt: ${save.crt ? 'on' : 'off'}`;
  }

  goImmersive() {
    try {
      if (!this.scale.isFullscreen) this.scale.startFullscreen();
      this.scale.lockOrientation('landscape');
    } catch {
      /* the browser is entitled to say no */
    }
  }
}
