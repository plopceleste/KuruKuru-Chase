const POSTFX_VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
vUv = aPos * 0.5 + 0.5;
gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const POSTFX_IDENTITY = `
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
vec2 uv = fragCoord / iResolution.xy;
vec4 w = texture(iChannel0, uv);
vec4 u = texture(iChannel1, uv);
fragColor = vec4(mix(w.rgb, u.rgb, u.a), 1.0);
}`;

// Flattens world + UI into the emulated signal grid. Everything the tube shows
// goes through here, so the UI is part of the signal rather than something
// pasted on after the glass.
//
// Each output texel is an area average of the source region it covers -- two
// bilinear taps per axis approximate that box -- so shrinking the picture loses
// detail smoothly instead of point-sampling art pixels away. After this the CRT
// pass reads a buffer whose texels *are* its phosphor cells, so its own
// sampling is exact by construction (and a lot more cache-friendly).
const POSTFX_RESOLVE = `
vec4 layers(vec2 uv) {
vec4 w = texture(iChannel0, uv);
vec4 u = texture(iChannel1, uv);
return vec4(mix(w.rgb, u.rgb, u.a), 1.0);
}
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
vec2 src = iChannelResolution[0].xy;
vec2 k = src / iResolution.xy;
vec2 o = (k * 0.25) / src;
vec2 uv = fragCoord / iResolution.xy;
vec4 c = layers(uv + vec2(-o.x, -o.y))
       + layers(uv + vec2( o.x, -o.y))
       + layers(uv + vec2(-o.x,  o.y))
       + layers(uv + vec2( o.x,  o.y));
fragColor = c * 0.25;
}`;

function postfxWrap(body) {
return `
precision highp float;
#define texture texture2D
uniform sampler2D iChannel0;
uniform sampler2D iChannel1;
uniform vec3 iResolution;
uniform vec2 iSignalRes;
uniform vec3 iChannelResolution[4];
uniform float iTime;
uniform int iFrame;
uniform vec4 iMouse;
varying vec2 vUv;
${body}
void main() {
vec4 fragColor = vec4(0.0);
mainImage(fragColor, vUv * iResolution.xy);
gl_FragColor = vec4(fragColor.rgb, 1.0);
}`;
}

class PostFX {
constructor(source, uiSource, display) {
this.source = source;
this.uiSource = uiSource;
this.display = display;
this.gl = null;
this.ok = false;
this.frame = 0;
this.start = performance.now();
this.error = null;
this.passthrough = false;
this.chanRes = new Float32Array([0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
this.display.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.ok = false; }, false);
this.display.addEventListener('webglcontextrestored', () => { try { this.init(); } catch (e) { this.ok = false; } }, false);
try { this.init(); } catch (e) { this.ok = false; this.error = e.message; }
}
init() {
const opts = {alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false};
const gl = this.display.getContext('webgl', opts) || this.display.getContext('experimental-webgl', opts);
if (!gl) return;
this.gl = gl;
this.buf = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
this.identity = this.buildEntry(POSTFX_IDENTITY);
if (!this.identity) return;
const src = (typeof window !== 'undefined' && window.GAME_SHADER) ? window.GAME_SHADER : null;
this.user = this.buildEntry(src || POSTFX_IDENTITY) || this.identity;
this.useSignal = !!src;
this.resolve = this.buildEntry(POSTFX_RESOLVE);
const mkTex = () => {
const t = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, t);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
return t;
};
this.tex = mkTex();
this.texUI = mkTex();
this.texSize = {w: 0, h: 0};
this.texUISize = {w: 0, h: 0};
this.signalTex = mkTex();
gl.bindTexture(gl.TEXTURE_2D, this.signalTex);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, SIGNAL_W, SIGNAL_H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
this.fbo = gl.createFramebuffer();
gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.signalTex, 0);
if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) { this.fbo = null; this.resolve = null; }
gl.bindFramebuffer(gl.FRAMEBUFFER, null);
gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
this.resize();
this.ok = true;
}
upload(tex, size, src) {
const gl = this.gl;
gl.bindTexture(gl.TEXTURE_2D, tex);
if (size.w === src.width && size.h === src.height) {
gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, src);
} else {
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
size.w = src.width; size.h = src.height;
}
}
buildEntry(body) {
const gl = this.gl;
const vs = this.compile(gl.VERTEX_SHADER, POSTFX_VERT);
const fs = this.compile(gl.FRAGMENT_SHADER, postfxWrap(body));
if (!vs || !fs) return null;
const p = gl.createProgram();
gl.attachShader(p, vs); gl.attachShader(p, fs); gl.linkProgram(p);
if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { this.error = gl.getProgramInfoLog(p); return null; }
return {
prog: p,
aPos: gl.getAttribLocation(p, 'aPos'),
uRes: gl.getUniformLocation(p, 'iResolution'),
uSignal: gl.getUniformLocation(p, 'iSignalRes'),
uChanRes: gl.getUniformLocation(p, 'iChannelResolution[0]'),
uTime: gl.getUniformLocation(p, 'iTime'),
uFrame: gl.getUniformLocation(p, 'iFrame'),
uMouse: gl.getUniformLocation(p, 'iMouse'),
uChan0: gl.getUniformLocation(p, 'iChannel0'),
uChan1: gl.getUniformLocation(p, 'iChannel1')
};
}
compile(type, src) {
const gl = this.gl;
const s = gl.createShader(type);
gl.shaderSource(s, src); gl.compileShader(s);
if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { this.error = gl.getShaderInfoLog(s); return null; }
return s;
}
setShader(body) {
if (!this.gl) return false;
this.error = null;
const entry = this.buildEntry(body || POSTFX_IDENTITY);
if (!entry) {
if (body) this.error = 'shader failed to compile — using pass-through. ' + (this.error || '');
this.user = this.identity;
this.useSignal = false;
return false;
}
if (this.user && this.user !== this.identity) this.gl.deleteProgram(this.user.prog);
this.user = entry;
this.useSignal = !!body;
this.ok = true;
return true;
}
resize() {
}
quad(e) {
const gl = this.gl;
gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
gl.enableVertexAttribArray(e.aPos);
gl.vertexAttribPointer(e.aPos, 2, gl.FLOAT, false, 0, 0);
gl.drawArrays(gl.TRIANGLES, 0, 6);
}
// World buffer -> emulated signal buffer. Returns true if the signal buffer
// now holds this frame's world and can be used as channel 0.
renderSignal() {
const r = this.resolve;
if (!r || !this.fbo) return false;
const gl = this.gl;
gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
gl.viewport(0, 0, SIGNAL_W, SIGNAL_H);
gl.useProgram(r.prog);
gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, this.tex);
if (r.uChan0) gl.uniform1i(r.uChan0, 0);
gl.activeTexture(gl.TEXTURE1);
gl.bindTexture(gl.TEXTURE_2D, this.texUI);
if (r.uChan1) gl.uniform1i(r.uChan1, 1);
if (r.uRes) gl.uniform3f(r.uRes, SIGNAL_W, SIGNAL_H, 1.0);
if (r.uChanRes) {
const cr = this.chanRes;
cr[0] = this.source.width; cr[1] = this.source.height;
gl.uniform3fv(r.uChanRes, cr);
}
this.quad(r);
gl.bindFramebuffer(gl.FRAMEBUFFER, null);
return true;
}
render() {
if (!this.ok || !this.gl) return false;
const gl = this.gl;
let e = (this.passthrough || !this.user) ? this.identity : this.user;
if (!e) return false;
const fit = viewFit();
gl.activeTexture(gl.TEXTURE0);
this.upload(this.tex, this.texSize, this.source);
gl.activeTexture(gl.TEXTURE1);
this.upload(this.texUI, this.texUISize, this.uiSource);
// Only the emulating shaders want the resolved signal; pass-through and the
// plain identity blit stay on the full-resolution buffers.
const signal = (this.useSignal && !this.passthrough) ? this.renderSignal() : false;
// The emulating shaders read their UI out of the signal buffer, so without one
// they would drop the UI entirely -- blit instead.
if (this.useSignal && !this.passthrough && !signal) e = this.identity;
gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
gl.clearColor(0, 0, 0, 1);
gl.clear(gl.COLOR_BUFFER_BIT);
gl.viewport(fit.x, fit.y, fit.w, fit.h);
const w = fit.w, h = fit.h;
gl.useProgram(e.prog);
gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, signal ? this.signalTex : this.tex);
gl.uniform1i(e.uChan0, 0);
if (e.uChan1) gl.uniform1i(e.uChan1, 1);
if (e.uRes) gl.uniform3f(e.uRes, w, h, 1.0);
if (e.uSignal) gl.uniform2f(e.uSignal, SIGNAL_W, SIGNAL_H);
if (e.uChanRes) {
const cr = this.chanRes;
cr[0] = signal ? SIGNAL_W : this.source.width;
cr[1] = signal ? SIGNAL_H : this.source.height;
gl.uniform3fv(e.uChanRes, cr);
}
if (e.uTime) gl.uniform1f(e.uTime, (performance.now() - this.start) / 1000);
if (e.uFrame) gl.uniform1i(e.uFrame, this.frame++);
if (e.uMouse) gl.uniform4f(e.uMouse, 0, 0, 0, 0);
this.quad(e);
return true;
}
}
window.PostFX = PostFX;
