const MUSIC_CHORDS = {
Am: { root: 57, triad: [57, 60, 64] },
F: { root: 53, triad: [53, 57, 60] },
C: { root: 48, triad: [48, 52, 55] },
G: { root: 55, triad: [55, 59, 62] },
Dm: { root: 50, triad: [50, 53, 57] },
E: { root: 52, triad: [52, 56, 59] }
};
const MUSIC_A = {
chords: [MUSIC_CHORDS.Am, MUSIC_CHORDS.Am, MUSIC_CHORDS.F, MUSIC_CHORDS.G, MUSIC_CHORDS.Am, MUSIC_CHORDS.Am, MUSIC_CHORDS.F, MUSIC_CHORDS.E],
drums: ['full', 'full', 'full', 'full', 'full', 'full', 'full', 'full'],
bass: 'drive', bassWalk: -1, arp: true, stabs: false, pad: 0.05,
lead: [
[[0, 69, 2], [2, 72, 2], [4, 76, 2], [6, 74, 2], [8, 72, 2], [10, 76, 2], [12, 81, 4]],
[[0, 79, 2], [2, 76, 2], [4, 72, 2], [6, 74, 2], [8, 76, 4], [12, 74, 2], [14, 71, 2]],
[[0, 72, 2], [2, 69, 2], [4, 72, 2], [6, 74, 2], [8, 77, 2], [10, 76, 2], [12, 74, 2], [14, 76, 2]],
[[0, 74, 4], [4, 71, 2], [6, 72, 2], [8, 74, 2], [10, 76, 2], [12, 79, 2], [14, 77, 1], [15, 76, 1]],
[[0, 69, 2], [2, 72, 2], [4, 76, 2], [6, 74, 2], [8, 72, 2], [10, 76, 2], [12, 81, 4]],
[[0, 79, 2], [2, 76, 2], [4, 72, 2], [6, 74, 2], [8, 76, 4], [12, 79, 2], [14, 81, 2]],
[[0, 81, 2], [2, 79, 2], [4, 77, 2], [6, 79, 2], [8, 81, 4], [12, 81, 2], [14, 83, 2]],
[[0, 83, 4], [4, 80, 2], [6, 76, 2], [8, 80, 2], [10, 83, 2], [12, 80, 2], [14, 76, 2]]
],
counter: [
[[0, 60, 4], [4, 64, 4], [8, 67, 4], [12, 72, 4]],
[[0, 64, 4], [4, 67, 4], [8, 64, 4], [12, 59, 4]],
[[0, 60, 4], [4, 65, 4], [8, 69, 4], [12, 65, 4]],
[[0, 62, 4], [4, 59, 4], [8, 55, 4], [12, 62, 4]],
[[0, 60, 4], [4, 64, 4], [8, 67, 4], [12, 72, 4]],
[[0, 64, 4], [4, 67, 4], [8, 72, 4], [12, 71, 4]],
[[0, 72, 4], [4, 69, 4], [8, 65, 4], [12, 69, 4]],
[[0, 68, 4], [4, 64, 4], [8, 71, 4], [12, 68, 4]]
]
};
const MUSIC_B = {
chords: [MUSIC_CHORDS.Dm, MUSIC_CHORDS.F, MUSIC_CHORDS.Am, MUSIC_CHORDS.G, MUSIC_CHORDS.Dm, MUSIC_CHORDS.F, MUSIC_CHORDS.E, MUSIC_CHORDS.E],
drums: ['full', 'full', 'full', 'full', 'full', 'full', 'full', 'fill'],
bass: 'drive', bassWalk: 7, arp: true, stabs: true, pad: 0.06,
lead: [
[[0, 77, 6], [6, 76, 2], [8, 74, 4], [12, 81, 4]],
[[0, 81, 6], [6, 79, 2], [8, 77, 4], [12, 79, 4]],
[[0, 76, 6], [6, 74, 2], [8, 72, 4], [12, 76, 4]],
[[0, 74, 8], [8, 71, 4], [12, 74, 4]],
[[0, 77, 6], [6, 79, 2], [8, 81, 4], [12, 79, 2], [14, 77, 2]],
[[0, 84, 6], [6, 81, 2], [8, 79, 4], [12, 81, 4]],
[[0, 83, 6], [6, 81, 2], [8, 80, 4], [12, 76, 4]],
[]
],
counter: [
[[8, 65, 2], [10, 67, 2], [12, 69, 4]],
[[8, 69, 2], [10, 67, 2], [12, 65, 4]],
[[8, 64, 2], [10, 62, 2], [12, 60, 4]],
[[8, 62, 2], [10, 64, 2], [12, 67, 4]],
[[8, 65, 2], [10, 67, 2], [12, 69, 4]],
[[8, 69, 2], [10, 71, 2], [12, 72, 4]],
[[8, 71, 2], [10, 68, 2], [12, 64, 4]],
[]
]
};
const MUSIC_C = {
chords: [MUSIC_CHORDS.Am, MUSIC_CHORDS.F, MUSIC_CHORDS.C, MUSIC_CHORDS.G, MUSIC_CHORDS.Am, MUSIC_CHORDS.F, MUSIC_CHORDS.E, MUSIC_CHORDS.E],
drums: ['sparse', 'sparse', 'sparse', 'sparse', 'sparse', 'sparse', 'sparse', 'fill'],
bass: 'half', bassWalk: 7, arp: false, stabs: false, pad: 0.085,
lead: [
[[0, 69, 2], [2, 72, 2], [4, 76, 4]],
[[8, 77, 2], [10, 76, 2], [12, 72, 4]],
[],
[[8, 74, 2], [10, 76, 2], [12, 79, 4]],
[[0, 69, 2], [2, 72, 2], [4, 76, 2], [6, 81, 6]],
[[8, 81, 2], [10, 79, 2], [12, 77, 4]],
[[0, 80, 4], [4, 83, 4]],
[]
],
counter: [
[],
[],
[[0, 64, 2], [2, 67, 2], [4, 72, 4]],
[],
[],
[[8, 72, 2], [10, 74, 2], [12, 76, 4]],
[[8, 68, 2], [10, 71, 2], [12, 76, 4]],
[]
]
};
const MUSIC_FORM = [MUSIC_A, MUSIC_A, MUSIC_B, MUSIC_A, MUSIC_C, MUSIC_A, MUSIC_B, MUSIC_A];
const MUSIC_STEP = 60 / 160 / 4;
const MUSIC_STEPS = MUSIC_FORM.length * 128;
const NOISE_SECONDS = 2;
class AudioController {
constructor() {
this.ctx = null;
this.master = null;
this.musicBus = null;
this.leadBus = null;
this.sfxBus = null;
this.enabled = true;
this.eatUp = false;
this.musicStarted = false;
this.musicTimer = null;
this.nextNoteTime = 0;
this.step = 0;
this.noiseBuf = null;
document.addEventListener('visibilitychange', () => {
if (!this.ctx || !this.enabled) return;
if (document.hidden) {
clearTimeout(this.musicTimer);
this.ctx.suspend();
} else {
this.ctx.resume();
if (this.musicStarted) { this.nextNoteTime = this.ctx.currentTime + 0.08; this.scheduleMusic(); }
}
});
}
init() {
if (this.ctx) return;
try {
const AudioContext = window.AudioContext || window.webkitAudioContext;
if (!AudioContext) return;
this.ctx = new AudioContext();
const comp = this.ctx.createDynamicsCompressor();
comp.threshold.value = -14; comp.knee.value = 24; comp.ratio.value = 6;
comp.attack.value = 0.003; comp.release.value = 0.2;
this.master = this.ctx.createGain(); this.master.gain.value = 0.8;
this.musicBus = this.ctx.createGain(); this.musicBus.gain.value = 0.55;
this.sfxBus = this.ctx.createGain(); this.sfxBus.gain.value = 0.85;
const muffle = this.ctx.createBiquadFilter();
muffle.type = 'lowpass'; muffle.frequency.value = 1200; muffle.Q.value = 0.7;
this.musicBus.connect(muffle);
muffle.connect(this.master);
this.sfxBus.connect(this.master);
this.master.connect(comp);
comp.connect(this.ctx.destination);
this.leadBus = this.ctx.createGain(); this.leadBus.gain.value = 1;
this.leadBus.connect(this.musicBus);
const dly = this.ctx.createDelay(1); dly.delayTime.value = MUSIC_STEP * 3;
const fb = this.ctx.createGain(); fb.gain.value = 0.32;
const dlp = this.ctx.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 2200;
const wet = this.ctx.createGain(); wet.gain.value = 0.35;
this.leadBus.connect(dly);
dly.connect(dlp);
dlp.connect(fb); fb.connect(dly);
dlp.connect(wet); wet.connect(this.musicBus);
} catch (e) {
this.ctx = null;
}
}
toggle() {
this.enabled = !this.enabled;
if (this.ctx) {
if (this.enabled) {
if (this.ctx.state === 'suspended') this.ctx.resume();
if (this.musicStarted) { this.nextNoteTime = this.ctx.currentTime + 0.08; this.scheduleMusic(); }
} else {
this.ctx.suspend();
clearTimeout(this.musicTimer);
}
}
}
mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
startMusic() {
this.musicStarted = true;
if (!this.ctx || !this.enabled) return;
if (this.ctx.state === 'suspended') this.ctx.resume();
this.step = 0;
this.nextNoteTime = this.ctx.currentTime + 0.08;
this.scheduleMusic();
}
scheduleMusic() {
clearTimeout(this.musicTimer);
if (!this.enabled || !this.ctx || !this.musicStarted) return;
while (this.nextNoteTime < this.ctx.currentTime + 0.18) {
this.playStep(this.step, this.nextNoteTime, MUSIC_STEP);
this.step = (this.step + 1) % MUSIC_STEPS;
this.nextNoteTime += MUSIC_STEP;
}
this.musicTimer = setTimeout(() => this.scheduleMusic(), 25);
}
vibe() {
const g = window.game;
if (!g) return 'full';
if (g.state === 'upgrade' || g.state === 'gameover' || g.state === 'paused') return 'calm';
if (g.state === 'playing' && (g.player.surgeTimer > 0 || g.warden)) return 'frenzy';
return 'full';
}
playStep(step, t, stepDur) {
const globalBar = Math.floor(step / 16);
const section = MUSIC_FORM[Math.floor(globalBar / 8)];
const bar = globalBar % 8;
const s = step % 16;
const chord = section.chords[bar];
const nextBar = (globalBar + 1) % (MUSIC_FORM.length * 8);
const nextChord = MUSIC_FORM[Math.floor(nextBar / 8)].chords[nextBar % 8];
const vibe = this.vibe();
const style = vibe === 'calm' ? 'calm' : section.drums[bar];
if (style === 'full') {
if (s % 4 === 0) this.dKick(t);
if (s === 4 || s === 12) this.dSnare(t);
if (s % (vibe === 'frenzy' ? 1 : 2) === 0) this.dHat(t, s === 14);
} else if (style === 'fill') {
if (s % 4 === 0 && s < 8) this.dKick(t);
if (s === 4) this.dSnare(t);
if (s < 8 && s % 2 === 0) this.dHat(t, false);
if (s >= 8 && (s >= 12 || s % 2 === 0)) this.dSnare(t, 0.16 + (s - 8) * 0.035);
} else if (style === 'sparse') {
if (s === 0 || s === 8) this.dKick(t);
if (s % 2 === 0) this.dHat(t, false, 0.09);
} else if (s % 4 === 0) {
this.dHat(t, false, 0.05);
}
const root = chord.root - 12;
if (vibe === 'calm' || (section.bass === 'half' && style !== 'fill')) {
if (s === 0 || s === 8) this.synth(t, { freq: this.mtof(root), type: 'sawtooth', dur: stepDur * 7.5, vol: 0.24, a: 0.008, d: 0.08, s: 0.8, r: 0.2, filterFreq: 380, filterQ: 2, bus: this.musicBus });
} else if (section.bassWalk === bar) {
if (s % 2 === 0) this.synth(t, { freq: this.mtof(root + [0, 0, 0, 0, 2, 2, 4, 4][s / 2]), type: 'sawtooth', dur: stepDur * 1.9, vol: 0.32, a: 0.005, d: 0.05, s: 0.7, r: 0.05, filterFreq: 560, filterEnv: 200, filterQ: 4, bus: this.musicBus });
} else if (s % 2 === 0) {
let m = (s === 4 || s === 12) ? chord.root : root;
if (s === 14 && nextChord.root !== chord.root) m = nextChord.root - 13;
this.synth(t, { freq: this.mtof(m), type: 'sawtooth', dur: stepDur * 1.9, vol: 0.32, a: 0.005, d: 0.05, s: 0.7, r: 0.05, filterFreq: vibe === 'frenzy' ? 950 : 540, filterEnv: 200, filterQ: 4, bus: this.musicBus });
}
this.melodyVoice(t, section.lead[bar], s, stepDur, vibe === 'calm' ? 0.1 : 0.16);
this.melodyVoice(t, section.counter[bar], s, stepDur, vibe === 'calm' ? 0.07 : 0.11);
if (section.arp && vibe !== 'calm') {
this.synth(t, { freq: this.mtof(chord.triad[[0, 1, 2, 1][s % 4]] + 12), type: 'square', dur: stepDur * 0.8, vol: vibe === 'frenzy' ? 0.1 : 0.05, a: 0.002, d: 0.02, s: 0.3, r: 0.02, filterFreq: 2600, filterQ: 1, bus: this.musicBus });
}
if ((section.stabs || vibe === 'frenzy') && s % 4 === 2 && style !== 'fill') {
for (const m of chord.triad) this.synth(t, { freq: this.mtof(m + 12), type: 'square', dur: 0.08, vol: 0.04, a: 0.002, d: 0.03, s: 0.2, r: 0.02, bus: this.musicBus });
}
if (s === 0) {
const padVol = vibe === 'calm' ? 0.1 : section.pad;
chord.triad.forEach(m => this.synth(t, { freq: this.mtof(m), type: 'sawtooth', dur: stepDur * 15, vol: padVol, a: 0.06, d: 0.2, s: 0.85, r: 0.35, filterFreq: 900, filterQ: 1, bus: this.musicBus }));
}
}
melodyVoice(t, notes, s, stepDur, vol) {
for (let i = 0; i < notes.length; i++) {
if (notes[i][0] !== s) continue;
this.synth(t, { freq: this.mtof(notes[i][1]), type: 'square', dur: notes[i][2] * stepDur * 0.92, vol: vol, a: 0.003, d: 0.03, s: 0.55, r: 0.04, unison: 6, filterFreq: 3400, filterQ: 0.8, bus: this.leadBus });
}
}
dKick(t) {
this.synth(t, { freq: 150, glideTo: 45, type: 'sine', dur: 0.16, vol: 0.95, a: 0.001, d: 0.06, s: 0.2, r: 0.05, bus: this.musicBus });
this.synth(t, { freq: 900, glideTo: 200, type: 'triangle', dur: 0.03, vol: 0.3, a: 0.001, d: 0.02, s: 0.01, r: 0.01, bus: this.musicBus });
}
dSnare(t, vol) {
const v = vol != null ? vol : 0.45;
this.noiseAt(t, 0.14, v, 'highpass', 1400, 900, this.musicBus);
this.synth(t, { freq: 190, type: 'triangle', dur: 0.12, vol: v * 0.6, a: 0.001, d: 0.05, s: 0.1, r: 0.05, bus: this.musicBus });
}
dHat(t, open, vol) {
this.noiseAt(t, open ? 0.11 : 0.04, vol != null ? vol : (open ? 0.16 : 0.13), 'highpass', 8000, 6000, this.musicBus);
}
synth(t, o) {
if (!this.enabled || !this.ctx) return;
const type = o.type || 'square';
const dur = o.dur || 0.2;
const vol = o.vol != null ? o.vol : 0.3;
const bus = o.bus || this.sfxBus;
const g = this.ctx.createGain();
this.env(g, t, vol, dur, o.a, o.d, o.s, o.r);
let dest = g;
if (o.filterFreq) {
const f = this.ctx.createBiquadFilter();
f.type = o.filterType || 'lowpass';
f.frequency.setValueAtTime(o.filterFreq, t);
if (o.filterEnv) f.frequency.exponentialRampToValueAtTime(Math.max(60, o.filterEnv), t + dur);
f.Q.value = o.filterQ != null ? o.filterQ : 1;
f.connect(g);
dest = f;
}
g.connect(bus);
const mkOsc = (detune) => {
const osc = this.ctx.createOscillator();
osc.type = type;
osc.frequency.setValueAtTime(o.freq, t);
if (o.glideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.glideTo), t + dur);
if (detune) osc.detune.value = detune;
osc.connect(dest);
osc.start(t);
osc.stop(t + dur + 0.05);
};
mkOsc(o.detune || 0);
if (o.unison) mkOsc(o.unison);
}
env(g, t, vol, dur, a, d, s, r) {
a = a != null ? a : 0.004;
d = d != null ? d : 0.04;
s = s != null ? s : 0.6;
r = r != null ? r : 0.06;
const peak = Math.max(0.0001, vol);
const sus = Math.max(0.0001, vol * s);
g.gain.setValueAtTime(0.0001, t);
g.gain.exponentialRampToValueAtTime(peak, t + a);
g.gain.exponentialRampToValueAtTime(sus, t + a + d);
g.gain.setValueAtTime(sus, Math.max(t + a + d, t + dur - r));
g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
}
noiseTable() {
if (!this.noiseBuf) {
const len = Math.max(1, Math.floor(this.ctx.sampleRate * NOISE_SECONDS));
this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
const data = this.noiseBuf.getChannelData(0);
for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
}
return this.noiseBuf;
}
noiseAt(t, dur, vol, ftype, fstart, fend, bus) {
if (!this.enabled || !this.ctx) return;
const buffer = this.noiseTable();
const offset = Math.random() * Math.max(0, NOISE_SECONDS - dur - 0.05);
const src = this.ctx.createBufferSource();
src.buffer = buffer;
const g = this.ctx.createGain();
g.gain.setValueAtTime(vol, t);
g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
if (ftype) {
const f = this.ctx.createBiquadFilter();
f.type = ftype;
f.frequency.setValueAtTime(fstart || 1000, t);
if (fend) f.frequency.exponentialRampToValueAtTime(Math.max(60, fend), t + dur);
src.connect(f); f.connect(g);
} else {
src.connect(g);
}
g.connect(bus || this.sfxBus);
src.start(t, offset);
src.stop(t + dur + 0.02);
}
sfxCoin() {
if (!this.enabled || !this.ctx) return;
this.eatUp = !this.eatUp;
const base = this.eatUp ? 520 : 380;
this.synth(this.ctx.currentTime, { freq: base, glideTo: base * 0.72, type: 'square', dur: 0.075, vol: 0.22, a: 0.001, d: 0.03, s: 0.25, r: 0.02 });
}
sfxOrb() {
if (!this.enabled || !this.ctx) return;
const t = this.ctx.currentTime;
this.synth(t, { freq: 200, glideTo: 900, type: 'sawtooth', dur: 0.5, vol: 0.3, a: 0.01, d: 0.1, s: 0.6, r: 0.15, filterFreq: 400, filterEnv: 3200, filterQ: 6, unison: 8 });
[0, 4, 7, 12].forEach((iv, i) => this.synth(t + 0.06 * i, { freq: this.mtof(69 + iv), type: 'square', dur: 0.12, vol: 0.16, a: 0.001, d: 0.04, s: 0.3, r: 0.03 }));
}
sfxCatch() {
if (!this.enabled || !this.ctx) return;
const t = this.ctx.currentTime;
[0, 4, 7, 12].forEach((iv, i) => this.synth(t + i * 0.05, { freq: this.mtof(72 + iv), type: 'square', dur: 0.12, vol: 0.26, a: 0.001, d: 0.04, s: 0.35, r: 0.04, unison: 5 }));
this.noiseAt(t, 0.06, 0.15, 'highpass', 6000, 3000);
}
sfxHurt() {
if (!this.enabled || !this.ctx) return;
const t = this.ctx.currentTime;
this.synth(t, { freq: 240, glideTo: 55, type: 'sawtooth', dur: 0.3, vol: 0.4, a: 0.001, d: 0.1, s: 0.4, r: 0.12, filterFreq: 1400, filterEnv: 180, filterQ: 3 });
this.synth(t, { freq: 254, glideTo: 62, type: 'square', dur: 0.26, vol: 0.2, a: 0.001, d: 0.08, s: 0.3, r: 0.1 });
this.noiseAt(t, 0.18, 0.3, 'lowpass', 900, 300);
}
sfxDie() {
if (!this.enabled || !this.ctx) return;
const t = this.ctx.currentTime;
const run = [72, 70, 67, 65, 62, 60, 57, 53];
run.forEach((m, i) => this.synth(t + i * 0.09, { freq: this.mtof(m), type: 'square', dur: 0.12, vol: 0.3, a: 0.001, d: 0.05, s: 0.35, r: 0.05 }));
this.synth(t + run.length * 0.09, { freq: this.mtof(45), glideTo: this.mtof(31), type: 'sawtooth', dur: 0.7, vol: 0.4, a: 0.005, d: 0.2, s: 0.6, r: 0.3, filterFreq: 1000, filterEnv: 120, unison: 9 });
}
sfxDash() {
if (!this.enabled || !this.ctx) return;
const t = this.ctx.currentTime;
this.noiseAt(t, 0.22, 0.3, 'lowpass', 5200, 320);
this.synth(t, { freq: 720, glideTo: 190, type: 'sawtooth', dur: 0.18, vol: 0.18, a: 0.001, d: 0.06, s: 0.3, r: 0.05, filterFreq: 2200, filterEnv: 320 });
}
sfxSkill() {
if (!this.enabled || !this.ctx) return;
const t = this.ctx.currentTime;
this.synth(t, { freq: 110, glideTo: 880, type: 'sawtooth', dur: 0.25, vol: 0.3, a: 0.01, d: 0.1, s: 0.7, r: 0.05, filterFreq: 300, filterEnv: 4200, filterQ: 5, unison: 10 });
[0, 7, 12].forEach(iv => this.synth(t + 0.2, { freq: this.mtof(69 + iv), type: 'square', dur: 0.4, vol: 0.22, a: 0.002, d: 0.08, s: 0.5, r: 0.12, unison: 7 }));
this.noiseAt(t + 0.2, 0.3, 0.25, 'lowpass', 2200, 200);
}
sfxGate() {
if (!this.enabled || !this.ctx) return;
const t = this.ctx.currentTime;
[57, 64, 69, 76].forEach((m, i) => this.synth(t + i * 0.07, { freq: this.mtof(m), type: 'square', dur: 0.16, vol: 0.24, a: 0.002, d: 0.05, s: 0.45, r: 0.06, unison: 6 }));
this.noiseAt(t + 0.2, 0.25, 0.12, 'highpass', 5000, 8000);
}
sfxWarden() {
if (!this.enabled || !this.ctx) return;
const t = this.ctx.currentTime;
[0, 1, 2, 3].forEach(i => this.synth(t + i * 0.16, { freq: i % 2 ? 311 : 415, type: 'sawtooth', dur: 0.15, vol: 0.32, a: 0.002, d: 0.04, s: 0.6, r: 0.04, filterFreq: 1600, filterQ: 3, unison: 8 }));
this.synth(t + 0.66, { freq: 415, glideTo: 92, type: 'sawtooth', dur: 0.5, vol: 0.3, a: 0.004, d: 0.1, s: 0.5, r: 0.2, filterFreq: 1200, filterEnv: 150, unison: 9 });
}
sfxClear() {
if (!this.enabled || !this.ctx) return;
const t = this.ctx.currentTime;
[60, 64, 67, 72].forEach((m, i) => this.synth(t + i * 0.1, { freq: this.mtof(m), type: 'square', dur: 0.18, vol: 0.3, a: 0.002, d: 0.05, s: 0.5, r: 0.06, unison: 5 }));
[72, 76, 79].forEach(m => this.synth(t + 0.42, { freq: this.mtof(m), type: 'square', dur: 0.6, vol: 0.24, a: 0.004, d: 0.1, s: 0.6, r: 0.2, unison: 6 }));
}
sfxPick() {
if (!this.enabled || !this.ctx) return;
const t = this.ctx.currentTime;
[67, 74].forEach((m, i) => this.synth(t + i * 0.08, { freq: this.mtof(m), type: 'square', dur: 0.16, vol: 0.24, a: 0.002, d: 0.05, s: 0.4, r: 0.06, unison: 6, filterFreq: 3000, filterQ: 1 }));
this.noiseAt(t, 0.05, 0.1, 'highpass', 7000, 5000);
}
}
const audio = new AudioController();
window.audio = audio;
