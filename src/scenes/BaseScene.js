import Phaser from 'phaser';
import { THEMES } from '../core/themes.js';
import { save } from '../core/save.js';
import { applyCrt, registerCrt } from '../fx/crt.js';
import { hex } from '../ui/widgets.js';

/**
 * Shared plumbing for every screen.
 *
 * The CRT runs as a filter on a camera, and a filter only ever sees what its
 * own camera drew. So each screen owns exactly one full-size camera and only
 * one screen is ever on show -- that is what keeps the whole picture, interface
 * included, behind a single sheet of glass.
 */
export class BaseScene extends Phaser.Scene {
  get run() {
    return this.registry.get('run');
  }

  get colors() {
    return THEMES[this.run.themeIndex].colors;
  }

  create(data) {
    this.cameras.main.setBackgroundColor(hex(this.colors.bg));
    registerCrt(this.game);
    applyCrt(this, save.crt);
    this.build(data || {});
  }

  /** Screens implement this instead of `create`. */
  build() {}
}
