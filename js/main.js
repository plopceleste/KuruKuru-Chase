const game = new Game();
window.game = game;

const postfx = new PostFX(canvas, uiCanvas, displayCanvas);
window.postfx = postfx;
const display2d = postfx.ok ? null : displayCanvas.getContext('2d', {alpha: false});

function present() {
// Bypass the shader while assets are still being built, but not once the boot
// screen has finished and is sitting there waiting on a tap. That screen keeps
// the 'loading' name, so bypassing on the name alone left the shader visibly
// dead on the first -- and often only -- screen anyone looks at.
postfx.passthrough = (game.screen === 'loading' && game.loadProgress < 1);
if (postfx.ok && postfx.render()) return;
if (display2d) {
const fit = viewFit();
display2d.imageSmoothingEnabled = false;
display2d.fillStyle = '#000000';
display2d.fillRect(0, 0, displayCanvas.width, displayCanvas.height);
display2d.drawImage(canvas, fit.x, fit.y, fit.w, fit.h);
display2d.drawImage(uiCanvas, fit.x, fit.y, fit.w, fit.h);
}
}
window.present = present;

resizeCanvas();

const step = (label, progress) => new Promise(resolve => {
game.loadLabel = label;
game.loadProgress = progress;
game.draw();
present();
requestAnimationFrame(() => setTimeout(resolve, 60));
});

async function boot() {
game.screen = 'loading';
await step('loading font', 0.15);
try {
await document.fonts.load('16px "Press Start 2P"');
await document.fonts.load('32px "Press Start 2P"');
await document.fonts.ready;
} catch (e) {}
UI.flushTextCache();

await step('building sprites', 0.5);
game.rng = mulberry32(xmur3('boot')());
game.generateFloor();
game.renderMaze();

await step('preparing audio', 0.8);
game.setShader('off');

await step('ready', 1);
game.loadLabel = 'tap start to begin';
game.startLoop();
}

boot();
