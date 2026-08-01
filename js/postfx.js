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

function postfxWrap(body) {
return `
precision highp float;
#define texture texture2D
uniform sampler2D iChannel0;
uniform sampler2D iChannel1;
uniform vec3 iResolution;
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
const body = (typeof window !== 'undefined' && window.GAME_SHADER) ? window.GAME_SHADER : POSTFX_IDENTITY;
this.user = this.buildEntry(body) || this.identity;
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
return false;
}
if (this.user && this.user !== this.identity) this.gl.deleteProgram(this.user.prog);
this.user = entry;
this.ok = true;
return true;
}
resize() {
}
render() {
if (!this.ok || !this.gl) return false;
const gl = this.gl;
const e = (this.passthrough || !this.user) ? this.identity : this.user;
if (!e) return false;
const fit = viewFit();
gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
gl.clearColor(0, 0, 0, 1);
gl.clear(gl.COLOR_BUFFER_BIT);
gl.viewport(fit.x, fit.y, fit.w, fit.h);
const w = fit.w, h = fit.h;
gl.useProgram(e.prog);
gl.activeTexture(gl.TEXTURE0);
this.upload(this.tex, this.texSize, this.source);
gl.uniform1i(e.uChan0, 0);
gl.activeTexture(gl.TEXTURE1);
this.upload(this.texUI, this.texUISize, this.uiSource);
if (e.uChan1) gl.uniform1i(e.uChan1, 1);
if (e.uRes) gl.uniform3f(e.uRes, w, h, 1.0);
if (e.uChanRes) {
const cr = this.chanRes;
cr[0] = this.source.width; cr[1] = this.source.height;
gl.uniform3fv(e.uChanRes, cr);
}
if (e.uTime) gl.uniform1f(e.uTime, (performance.now() - this.start) / 1000);
if (e.uFrame) gl.uniform1i(e.uFrame, this.frame++);
if (e.uMouse) gl.uniform4f(e.uMouse, 0, 0, 0, 0);
gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
gl.enableVertexAttribArray(e.aPos);
gl.vertexAttribPointer(e.aPos, 2, gl.FLOAT, false, 0, 0);
gl.drawArrays(gl.TRIANGLES, 0, 6);
return true;
}
}
window.PostFX = PostFX;
