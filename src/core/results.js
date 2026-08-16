import { FONT, PALETTE } from './constants.js';

const CARD_W = 600;
const CARD_H = 400;

function summary(run) {
  return `KuruKuru Chase!!\nscore: ${run.bank}\nfloor: ${run.floor}\ntime: ${run.finalTime}\nseed: ${run.seed}`;
}

/** Copies the run summary, falling back to showing it if the clipboard says no. */
export async function shareResults(run) {
  const report = summary(run);
  try {
    await navigator.clipboard.writeText(report);
    return true;
  } catch {
    window.alert(report);
    return false;
  }
}

/** Draws the run summary as a little card and hands it over as a download. */
export function downloadResults(run, colors) {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = CARD_H;

  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  ctx.strokeStyle = colors.ui;
  ctx.lineWidth = 5;
  ctx.strokeRect(0, 0, CARD_W, CARD_H);
  ctx.textAlign = 'center';

  ctx.font = `22px ${FONT}`;
  ctx.fillStyle = colors.accent;
  ctx.fillText('KuruKuru Chase!!', CARD_W / 2, 60);

  ctx.font = `16px ${FONT}`;
  const lines = [
    [`score: ${run.bank}`, colors.ui, 130],
    [`floor: ${run.floor}`, colors.pellet, 180],
    [`time: ${run.finalTime}`, colors.accent, 230],
    [`best streak: ${run.bestStreak}`, colors.text, 280]
  ];
  for (const [label, color, y] of lines) {
    ctx.fillStyle = color;
    ctx.fillText(label, CARD_W / 2, y);
  }

  ctx.font = `11px ${FONT}`;
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText(`seed: ${run.seed}`, CARD_W / 2, 350);

  const link = document.createElement('a');
  link.download = `kurukuru-chase-${Date.now()}.jpg`;
  link.href = canvas.toDataURL('image/jpeg');
  link.click();
}
