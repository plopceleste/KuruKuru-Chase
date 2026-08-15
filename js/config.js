const hasCoarsePointer = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
const isMobile = hasCoarsePointer
|| /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent)
|| (('ontouchstart' in window) && navigator.maxTouchPoints > 0);
const VIRTUAL_W = 1440;
const VIRTUAL_H = 810;
const displayCanvas = document.getElementById('gameCanvas');
const canvas = document.createElement('canvas');
canvas.width = VIRTUAL_W;
canvas.height = VIRTUAL_H;
const ctx = canvas.getContext('2d');
const uiCanvas = document.createElement('canvas');
uiCanvas.width = VIRTUAL_W;
uiCanvas.height = VIRTUAL_H;
const uictx = uiCanvas.getContext('2d');
uictx.imageSmoothingEnabled = false;
let PIXEL_SCALE = 1;
const MAX_BUFFER_PIXELS = 2600000;
function resizeCanvas() {
const container = document.getElementById('gameContainer');
const cw = Math.max(1, container.clientWidth), ch = Math.max(1, container.clientHeight);
let scale = Math.max(1, Math.min(2, Math.floor(window.devicePixelRatio || 1)));
while (scale > 1 && cw * scale * ch * scale > MAX_BUFFER_PIXELS) scale--;
PIXEL_SCALE = scale;
displayCanvas.width = Math.round(cw * scale);
displayCanvas.height = Math.round(ch * scale);
ctx.imageSmoothingEnabled = false;
uictx.imageSmoothingEnabled = false;
if (window.postfx) postfx.resize();
if (window.game) game.needsFrame = true;
}
function viewFit() {
const W = displayCanvas.width, H = displayCanvas.height;
const s = Math.min(W / VIRTUAL_W, H / VIRTUAL_H);
const w = Math.round(VIRTUAL_W * s), h = Math.round(VIRTUAL_H * s);
return {x: Math.round((W - w) / 2), y: Math.round((H - h) / 2), w, h, scale: s};
}
window.viewFit = viewFit;
// The true resolution of the emulated display: the world is resolved down to
// this grid once, and the CRT shader treats one texel of it as one phosphor
// cell. It is a fixed property of the virtual machine we are pretending to be,
// not of the browser window -- deriving it from the window (the shader's old
// iResolution/3) let it drift with window size and device pixel ratio.
const SIGNAL_W = 640;
const SIGNAL_H = 360;
window.SIGNAL_W = SIGNAL_W;
window.SIGNAL_H = SIGNAL_H;
ctx.imageSmoothingEnabled = false;
window.addEventListener('load', resizeCanvas);
window.addEventListener('resize', resizeCanvas);
const TILE_SIZE = 18;
const MAZE_WIDTH = 19;
const MAZE_HEIGHT = 19;

async function goImmersive() {
const el = document.documentElement;
try {
if (!document.fullscreenElement && el.requestFullscreen) {
await el.requestFullscreen({navigationUI: 'hide'});
} else if (!document.webkitFullscreenElement && el.webkitRequestFullscreen) {
el.webkitRequestFullscreen();
}
} catch (e) {}
try {
if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape');
} catch (e) {}
}
window.goImmersive = goImmersive;
async function toggleFullscreen() {
if (document.fullscreenElement || document.webkitFullscreenElement) {
try {
if (document.exitFullscreen) await document.exitFullscreen();
else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
} catch (e) {}
} else {
await goImmersive();
}
}
window.toggleFullscreen = toggleFullscreen;
function needsRotate() {
const w = window.innerWidth, h = window.innerHeight;
return isMobile && h > w && Math.min(w, h) < 520;
}
window.needsRotate = needsRotate;
window.addEventListener('orientationchange', () => setTimeout(resizeCanvas, 120));
