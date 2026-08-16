import { VIEW_W, PALETTE } from '../core/constants.js';
import { CARDS } from '../core/cards.js';
import { audio } from '../core/audio.js';
import { text, hex, Meter, F, PAD } from './widgets.js';

export const HUD_H = 62;

const BAR_W = 156;
const BAR_H = 12;
const SPEAKER_UNIT = 6;
const SPEAKER_W = SPEAKER_UNIT * 8;

/**
 * The status bar and the line of run state under it.
 *
 * Labels are only pushed when their value actually changes: a Phaser Text
 * rebuilds its backing canvas on every `setText`, so writing the same string
 * sixty times a second is pure waste.
 */
export class Hud {
  constructor(scene) {
    this.scene = scene;
    this.cached = {};
    const colors = scene.colors;

    scene.add.rectangle(0, 0, VIEW_W, HUD_H, hex(colors.bg)).setOrigin(0, 0).setDepth(100);
    scene.add.rectangle(0, HUD_H - 2, VIEW_W, 2, hex(colors.ui)).setOrigin(0, 0).setDepth(100);

    this.left = text(scene, PAD, HUD_H / 2, '', {
      size: F, color: colors.ui, originX: 0
    }).setDepth(101);

    this.speaker = scene.add.graphics().setDepth(101);
    this.speakerX = VIEW_W - PAD - SPEAKER_W;
    this.speakerY = Math.round(HUD_H / 2 - SPEAKER_UNIT * 3);
    this.drawSpeaker();

    const hitPad = Math.round(F * 0.5);
    scene.add.zone(
      this.speakerX - hitPad, this.speakerY - hitPad,
      SPEAKER_W + hitPad * 2, SPEAKER_UNIT * 6 + hitPad * 2
    )
      .setOrigin(0, 0)
      .setDepth(101)
      .setInteractive({useHandCursor: true})
      .on('pointerup', () => {
        audio.toggle();
        this.drawSpeaker();
      });

    const barX = this.speakerX - Math.round(F * 0.8) - BAR_W;
    const barY = Math.round(HUD_H / 2 - (BAR_H + 2 + BAR_H * 0.6) / 2);

    this.hp = text(scene, barX - Math.round(F * 0.5), HUD_H / 2, '', {
      size: F, color: colors.ui, originX: 1
    }).setDepth(101);

    this.healthMeter = new Meter(scene, barX, barY, BAR_W, BAR_H, colors.pellet, colors.text)
      .setDepth(101);
    this.dashMeter = new Meter(
      scene, barX, barY + BAR_H + 2, BAR_W, Math.max(3, Math.round(BAR_H * 0.6)),
      PALETTE.rose, PALETTE.slate
    ).setDepth(101);

    this.status = text(scene, VIEW_W / 2, HUD_H + PAD, '', {
      size: Math.round(F * 0.85), color: PALETTE.dim
    }).setDepth(101);

    this.item = text(scene, VIEW_W / 2, HUD_H + PAD + Math.round(F * 1.3), '', {
      size: Math.round(F * 0.85), color: PALETTE.dim
    }).setDepth(101);
  }

  drawSpeaker() {
    const s = SPEAKER_UNIT;
    const x = this.speakerX;
    const y = this.speakerY;
    const color = hex(this.scene.colors.accent);

    this.speaker.clear();
    this.speaker.fillStyle(color, 1);
    this.speaker.fillRect(x + s, y + s * 2, s, s * 2);
    this.speaker.fillRect(x + s * 2, y + s, s, s * 4);
    this.speaker.fillRect(x + s * 3, y, s, s * 6);

    if (audio.enabled) {
      this.speaker.fillRect(x + s * 5, y + s * 2, s, s * 2);
      this.speaker.fillRect(x + s * 6, y + s, s, s * 4);
    } else {
      // Muted: the waves break up into a cross.
      this.speaker.fillRect(x + s * 5, y + s * 2, s, s);
      this.speaker.fillRect(x + s * 5, y + s * 3, s, s);
      this.speaker.fillRect(x + s * 6, y + s, s, s);
      this.speaker.fillRect(x + s * 6, y + s * 3, s, s);
    }
  }

  update() {
    const scene = this.scene;
    const run = scene.run;
    const player = scene.player;
    const colors = scene.colors;

    this.write('left', this.left, `floor ${run.floor}   score ${run.score}`);
    this.write('hp', this.hp, `hp ${Math.ceil(run.health)}/${run.maxHealth}`);

    this.healthMeter.setValue(run.health / run.maxHealth);
    this.dashMeter.setValue(1 - player.dashCooldown / run.stats.dashCd);

    const bits = [];
    if (!scene.gate.open) bits.push(`coins ${scene.coinsTaken}/${scene.quota}`);
    else bits.push(`gate open  coins x${run.stats.overtimeRate}`);
    if (run.streak > 1) bits.push(`streak ${run.streak}`);
    if (scene.warden) bits.push('the warden is loose');
    else bits.push(`curfew ${Math.max(0, Math.ceil(scene.curfew))}s`);

    this.write('status', this.status, bits.join('   '));

    let statusColor = PALETTE.dim;
    if (scene.warden) statusColor = Math.floor(scene.now / 300) % 2 ? PALETTE.danger : PALETTE.dim;
    else if (scene.gate.open) statusColor = colors.accent;
    if (this.cached.statusColor !== statusColor) {
      this.cached.statusColor = statusColor;
      this.status.setColor(statusColor);
    }

    const card = run.activeItem ? CARDS[run.activeItem] : null;
    if (!card) {
      this.write('item', this.item, '');
      return;
    }

    const ready = player.activeCooldown <= 0;
    let label = `${card.name}  ${ready ? '[e]' : `${Math.ceil(player.activeCooldown)}s`}`;
    if (run.activeItem === 'anchor' && player.anchor && ready) label = 'warp anchor  [e] jump';
    this.write('item', this.item, label);

    const itemColor = ready ? colors.accent : PALETTE.muted;
    if (this.cached.itemColor !== itemColor) {
      this.cached.itemColor = itemColor;
      this.item.setColor(itemColor);
    }
  }

  write(key, label, value) {
    if (this.cached[key] === value) return;
    this.cached[key] = value;
    label.setText(value);
  }
}
