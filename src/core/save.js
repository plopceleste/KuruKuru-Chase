// Persisted settings and records. localStorage throws in a few real browser
// configurations (Safari private mode, storage disabled), so every access is
// guarded -- the game runs fine without it, it just forgets.
const PREFIX = 'kurukuru';

function read(key) {
  try {
    return localStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(PREFIX + key, String(value));
  } catch {
    /* storage unavailable: settings just do not persist */
  }
}

function readInt(key, fallback) {
  const n = parseInt(read(key), 10);
  return Number.isFinite(n) ? n : fallback;
}

export const save = {
  get best() { return readInt('Best', 0); },
  set best(v) { write('Best', v); },

  get theme() { return readInt('Theme', 0); },
  set theme(v) { write('Theme', v); },

  // 0 means "no limit": run at whatever the display refreshes at.
  get fpsLimit() {
    const v = readInt('Fps', 60);
    return v === 30 || v === 60 ? v : 0;
  },
  set fpsLimit(v) { write('Fps', v); },

  get crt() { return read('Crt') !== 'off'; },
  set crt(v) { write('Crt', v ? 'on' : 'off'); }
};
