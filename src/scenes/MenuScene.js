import { VIEW_W, VIEW_H, PALETTE } from '../core/constants.js';
import { audio } from '../core/audio.js';
import { isTouchDevice } from '../ui/TouchControls.js';
import { Button, text, hex, layoutColumn, F, PAD, BTN_H, BTN_W } from '../ui/widgets.js';
import { BaseScene } from './BaseScene.js';

const MAX_SEED_LENGTH = 12;

export class MenuScene extends BaseScene {
  constructor() {
    super('Menu');
  }

  build() {
    const run = this.run;
    audio.setMood('calm');

    const custom = !run.randomSeed;
    const showHint = !isTouchDevice();

    const rows = [
      Math.round(F * 2.1),
      Math.round(F * 1.1),
      BTN_H,
      ...(custom ? [BTN_H] : []),
      BTN_H, BTN_H, BTN_H,
      ...(showHint ? [Math.round(F * 1.1)] : [])
    ];
    const ys = layoutColumn(PAD, VIEW_H - PAD, rows);
    let row = 0;

    text(this, VIEW_W / 2, ys[row++], 'KuruKuru Chase!!', {
      size: F * 2, color: this.colors.text, maxWidth: VIEW_W - PAD * 2
    });

    text(this, VIEW_W / 2, ys[row++], `high score ${run.highScore}`, {
      size: Math.round(F * 0.85), color: PALETTE.dim
    });

    new Button(this, VIEW_W / 2, ys[row++], `seed: ${custom ? 'custom' : 'random'}`, () => {
      run.randomSeed = !run.randomSeed;
      this.seedFocus = !run.randomSeed;
      this.scene.restart();
    });

    if (custom) this.buildSeedField(ys[row++]);

    new Button(this, VIEW_W / 2, ys[row++], 'start run', () => {
      run.begin();
      this.scene.start('Game');
    }, {active: true});

    new Button(this, VIEW_W / 2, ys[row++], 'themes', () => this.scene.start('Themes'));
    new Button(this, VIEW_W / 2, ys[row++], 'options', () => this.scene.start('Options'));

    if (showHint) {
      text(this, VIEW_W / 2, ys[row], 'space dash    e item    p pause', {
        size: Math.round(F * 0.85), color: PALETTE.muted
      });
    }
  }

  /** A text field drawn by hand, because the game surface is a canvas. */
  buildSeedField(y) {
    const run = this.run;
    const x = VIEW_W / 2 - BTN_W / 2;

    const box = this.add.rectangle(x, y - BTN_H / 2, BTN_W, BTN_H, hex(PALETTE.ink)).setOrigin(0, 0);
    box.setStrokeStyle(2, hex(this.colors.accent));
    box.setInteractive({useHandCursor: true});
    box.on('pointerup', () => this.setFocus(true));

    this.seedLabel = text(this, VIEW_W / 2, y, run.seedText || 'type a seed', {
      color: run.seedText ? this.colors.text : PALETTE.muted,
      maxWidth: BTN_W - PAD * 2
    });

    this.caret = this.add.rectangle(0, y, Math.max(2, F / 8), F, hex(this.colors.text))
      .setVisible(false);

    this.seedBox = box;
    this.setFocus(this.seedFocus !== false);

    this.time.addEvent({
      delay: 400,
      loop: true,
      callback: () => {
        this.caret.setVisible(this.seedFocus && Math.floor(this.time.now / 400) % 2 === 0);
      }
    });

    this.input.keyboard.on('keydown', this.onSeedKey, this);
    this.events.once('shutdown', () => this.input.keyboard.off('keydown', this.onSeedKey, this));
  }

  setFocus(focused) {
    this.seedFocus = focused;
    this.seedBox.setStrokeStyle(2, hex(focused ? this.colors.text : this.colors.accent));
    if (!focused) this.caret.setVisible(false);
    this.refreshSeed();
  }

  onSeedKey(event) {
    if (!this.seedFocus || event.ctrlKey || event.metaKey) return;
    const run = this.run;

    if (event.key === 'Backspace') {
      run.seedText = run.seedText.slice(0, -1);
    } else if (event.key === 'Enter' || event.key === 'Escape') {
      this.setFocus(false);
      return;
    } else if (event.key.length === 1 && run.seedText.length < MAX_SEED_LENGTH) {
      run.seedText += event.key;
    } else {
      return;
    }

    event.preventDefault();
    this.refreshSeed();
  }

  refreshSeed() {
    const run = this.run;
    this.seedLabel.setText(run.seedText || 'type a seed');
    this.seedLabel.setColor(run.seedText ? this.colors.text : PALETTE.muted);
    this.caret.setPosition(VIEW_W / 2 + this.seedLabel.width / 2 + 6, this.seedLabel.y);
  }
}
