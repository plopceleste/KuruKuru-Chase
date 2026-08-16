import { VIEW_W, VIEW_H, PALETTE } from '../core/constants.js';
import { CARDS, RARITY_COLORS } from '../core/cards.js';
import { audio } from '../core/audio.js';
import { TEX } from '../gfx/textures.js';
import { Button, text, hex, layoutColumn, F, PAD, BTN_H } from '../ui/widgets.js';
import { BaseScene } from './BaseScene.js';

const CARD_W = Math.min(VIEW_W - PAD * 2, F * 30);
const CARD_H = Math.round(F * 3.6);
const ICON = Math.round(CARD_H * 0.6);

const POP_MS = 300;
const POP_STAGGER = 120;
const POP_RISE = 50;

const EPIC_FLASH_MS = 250;

export class UpgradeScene extends BaseScene {
  constructor() {
    super('Upgrade');
  }

  build() {
    const run = this.run;
    audio.setMood('calm');

    this.choices = run.draftChoices();

    const rows = [
      Math.round(F * 1.25),
      Math.round(F * 1.0),
      ...this.choices.map(() => CARD_H),
      ...(this.choices.length === 0 ? [BTN_H] : [])
    ];
    const ys = layoutColumn(PAD, VIEW_H - PAD, rows);

    text(this, VIEW_W / 2, ys[0], `floor ${run.floor - 1} banked`, {color: this.colors.accent});
    text(this, VIEW_W / 2, ys[1], 'pick a card', {size: Math.round(F * 0.8), color: PALETTE.dim});

    this.choices.forEach((key, i) => this.buildCard(key, i, ys[2 + i]));

    if (this.choices.length === 0) {
      new Button(this, VIEW_W / 2, ys[2], 'onward', () => this.pick(null), {active: true});
    }
  }

  buildCard(key, index, y) {
    const card = CARDS[key];
    const rarity = RARITY_COLORS[card.rarity] || PALETTE.dim;
    const left = VIEW_W / 2 - CARD_W / 2;

    const group = this.add.container(0, POP_RISE).setAlpha(0);

    const box = this.add.rectangle(left, y - CARD_H / 2, CARD_W, CARD_H, hex(PALETTE.ink), 0.85)
      .setOrigin(0, 0);
    box.setStrokeStyle(2, hex(rarity));

    const texture = this.add.tileSprite(left + 2, y - CARD_H / 2 + 2, CARD_W - 4, CARD_H - 4, TEX.dither)
      .setOrigin(0, 0)
      .setTint(hex(rarity))
      .setAlpha(0.12);

    const icon = this.add.image(left + PAD, y, TEX.cardIcon, card.rarity)
      .setOrigin(0, 0.5)
      .setDisplaySize(ICON, ICON)
      .setTint(hex(rarity));

    const textLeft = left + PAD * 2 + ICON;
    const tag = card.type === 'active' ? `${card.rarity} · active` : card.rarity;

    const tagLabel = text(this, left + CARD_W - PAD, y - CARD_H * 0.18, tag, {
      size: Math.round(F * 0.75), color: rarity, originX: 1, maxWidth: CARD_W * 0.35
    });

    const nameLabel = text(this, textLeft, y - CARD_H * 0.18, card.name, {
      size: F, color: this.colors.ui, originX: 0,
      maxWidth: CARD_W - (textLeft - left) - PAD * 2 - tagLabel.width
    });

    const descLabel = text(this, textLeft, y + CARD_H * 0.22, card.desc, {
      size: Math.round(F * 0.85), color: PALETTE.dim, originX: 0,
      maxWidth: CARD_W - (textLeft - left) - PAD
    });

    group.add([box, texture, icon, nameLabel, tagLabel, descLabel]);

    const hover = {hot: false};

    this.tweens.add({
      targets: group,
      y: 0,
      alpha: 1,
      delay: index * POP_STAGGER,
      duration: POP_MS,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        box.setInteractive({useHandCursor: true});
        box.on('pointerover', () => {
          hover.hot = true;
          box.setFillStyle(hex(PALETTE.slate), 0.55);
          box.setStrokeStyle(2, hex(this.colors.text));
          this.tweens.add({targets: icon, y: y - 3, duration: 130, yoyo: true, repeat: -1});
        });
        box.on('pointerout', () => {
          hover.hot = false;
          box.setFillStyle(hex(PALETTE.ink), 0.85);
          box.setStrokeStyle(2, hex(rarity));
          this.tweens.killTweensOf(icon);
          icon.setY(y);
        });
        box.on('pointerup', () => this.pick(key));
      }
    });

    // Epics announce themselves, unless the pointer is already on them.
    if (card.rarity === 'epic') {
      this.time.addEvent({
        delay: EPIC_FLASH_MS,
        loop: true,
        callback: () => {
          if (hover.hot) return;
          const lit = Math.floor(this.time.now / EPIC_FLASH_MS) % 2 === 1;
          box.setStrokeStyle(2, hex(lit ? PALETTE.white : rarity));
        }
      });
    }
  }

  pick(key) {
    if (this.picked) return;
    this.picked = true;
    if (key) {
      this.run.takeCard(key);
      audio.pick();
    }
    this.scene.start('Game');
  }
}
