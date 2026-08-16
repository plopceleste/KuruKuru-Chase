import Phaser from 'phaser';
import { VIEW_W, VIEW_H } from './core/constants.js';
import { RunState } from './core/RunState.js';
import { save } from './core/save.js';
import { THEMES } from './core/themes.js';
import { hex } from './ui/widgets.js';
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { ThemesScene } from './scenes/ThemesScene.js';
import { OptionsScene } from './scenes/OptionsScene.js';
import { GameScene } from './scenes/GameScene.js';
import { UpgradeScene } from './scenes/UpgradeScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';

const run = new RunState();

const game = new Phaser.Game({
  type: Phaser.WEBGL,
  parent: 'game',
  width: VIEW_W,
  height: VIEW_H,
  backgroundColor: hex(THEMES[run.themeIndex].colors.bg),

  // Nearest-neighbour sampling everywhere: the art is drawn on a grid and the
  // whole-number camera zoom keeps it there.
  pixelArt: true,

  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    autoRound: true
  },

  // Every sound is synthesised through the Web Audio API in core/audio.js, so
  // Phaser's sample-playback sound manager has nothing to do.
  audio: {noAudio: true},

  fps: {limit: save.fpsLimit},

  scene: [BootScene, MenuScene, ThemesScene, OptionsScene, GameScene, UpgradeScene, GameOverScene]
});

// One run object, shared by every scene, so the purse survives the floor.
game.registry.set('run', run);

// A handle for poking at the game from the console. Stripped from the build.
if (import.meta.env.DEV) window.game = game;
