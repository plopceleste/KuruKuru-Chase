import Phaser from 'phaser';
import { SIGNAL_W, SIGNAL_H } from '../core/constants.js';

const { BaseFilterShader } = Phaser.Renderer.WebGL.RenderNodes;

const RESOLVE_NODE = 'FilterCrtResolve';
const CRT_NODE = 'FilterCrt';

// Filters never grow the picture, so every pass runs with no padding.
const NO_PADDING = new Phaser.Geom.Rectangle(0, 0, 0, 0);

/**
 * Pass one: flatten the finished frame onto the emulated signal grid.
 *
 * Everything the tube shows goes through here -- world and UI alike -- so the
 * interface is part of the signal rather than something pasted on after the
 * glass. Each output texel averages a 3x3 spread of taps across the source
 * region it covers, so shrinking the picture loses detail smoothly instead of
 * point-sampling art pixels away. The game runs with `pixelArt` on, which means
 * framebuffers sample NEAREST, so the box has to be built from real taps rather
 * than leaned on the hardware's bilinear filter.
 *
 * After this the CRT pass reads a buffer whose texels *are* its phosphor cells,
 * so its own sampling is exact by construction, and a lot more cache friendly.
 */
const RESOLVE_FRAG = `
#pragma phaserTemplate(shaderName)

precision highp float;

uniform sampler2D uMainSampler;
uniform vec2 uSourceRes;
uniform vec2 uTargetRes;

varying vec2 outTexCoord;

#pragma phaserTemplate(fragmentHeader)

void main ()
{
    // The footprint of one signal texel, measured in source texels, sampled at
    // three evenly spread points per axis.
    vec2 spread = (uSourceRes / uTargetRes / 3.0) / uSourceRes;

    vec3 sum = vec3(0.0);
    for (int y = -1; y <= 1; y++)
    {
        for (int x = -1; x <= 1; x++)
        {
            sum += texture2D(uMainSampler, outTexCoord + vec2(float(x), float(y)) * spread).rgb;
        }
    }

    gl_FragColor = vec4(sum / 9.0, 1.0);
}
`;

/**
 * Pass two: Timothy Lottes' CRT, reading the resolved signal.
 *
 * `uSignalRes` is a fixed property of the machine being emulated, not of the
 * browser window. Deriving it from the window would let the emulated grid drift
 * with every resize and device pixel ratio, and on a small viewport it would
 * fall below the resolution of the art itself -- at which point the point
 * sampling in Fetch() throws whole art pixels on the floor.
 */
const CRT_FRAG = `
#pragma phaserTemplate(shaderName)

precision highp float;

uniform sampler2D uMainSampler;
uniform vec2 uSignalRes;
uniform vec2 uOutputRes;

varying vec2 outTexCoord;

#pragma phaserTemplate(fragmentHeader)

// Beam tuning, in emulated pixels. Halfway between a soft, bloomy tube
// (-4/-3, which smears pixel art) and a hard one (-10/-8, so tight that the
// scanlines read as a stencil laid over the picture).
const float hardScan = -6.0;
const float hardPix = -4.5;
const vec2 warp = vec2(1.0 / 100.0, 1.0 / 100.0);
const float maskDark = 0.85;
const float maskLight = 1.15;
const float scanDepth = 0.18;

// Thinnest scanline worth drawing, in device pixels. Below roughly two the
// pattern cannot be rendered at all, so the tube drops to one scanline per two
// signal rows, then three, rather than fading the effect out.
const float MIN_SCAN = 2.0;

const float LOG2 = 0.69314718;

float ToLinear1 (float c) { return (c <= 0.04045) ? c / 12.92 : pow((c + 0.055) / 1.055, 2.4); }
vec3 ToLinear (vec3 c) { return vec3(ToLinear1(c.r), ToLinear1(c.g), ToLinear1(c.b)); }

float ToSrgb1 (float c) { return (c < 0.0031308) ? c * 12.92 : 1.055 * pow(c, 0.41666) - 0.055; }
vec3 ToSrgb (vec3 c) { return vec3(ToSrgb1(c.r), ToSrgb1(c.g), ToSrgb1(c.b)); }

// exp2(s*x*x) is a gaussian of variance -1/(2*ln2*s), measured in emulated
// pixels. Widening that variance by the footprint of one output pixel (a box of
// width fp, variance fp*fp/12) band-limits the beam to what the display can
// actually resolve. When the viewport has pixels to spare the spot stays tight
// and the art stays sharp; when it does not the spot broadens into a clean low
// pass, so an undersized window goes soft instead of aliasing. No thresholds,
// no branches.
float Band (float hard, float fp)
{
    float v = -1.0 / (2.0 * LOG2 * hard) + fp * fp * (1.0 / 12.0);
    return -1.0 / (2.0 * LOG2 * v);
}

// Scanlines, locked to the signal grid so they ride the warp with the picture
// rather than sliding across it. The period is a whole number of signal rows,
// widened until it clears MIN_SCAN device pixels.
//
// This is deliberately not folded into the beam reconstruction below. Driving
// the scanlines off the 360-row grid meant a window shorter than ~720 device
// pixels had under a pixel per row, and band-limiting then flattened the whole
// effect to nothing -- turning the shader on changed the picture by about 2%,
// which reads as the toggle being broken. The cosine averages to one, so depth
// costs no brightness.
float Scanlines (vec2 pos, vec2 r)
{
    float rows = max(1.0, ceil(MIN_SCAN / (uOutputRes.y / r.y)));
    return 1.0 + scanDepth * cos(6.28318531 * (pos.y * r.y / rows));
}

// Sample the centre of the emulated pixel. Snapping to the edge would land on
// the seam between two texels, which costs a half-pixel smear under any filter
// wider than a point.
vec3 Fetch (vec2 pos, vec2 off, vec2 r)
{
    pos = (floor(pos * r + off) + 0.5) / r;
    if (max(abs(pos.x - 0.5), abs(pos.y - 0.5)) > 0.5) return vec3(0.0);
    return ToLinear(texture2D(uMainSampler, pos).rgb);
}

vec2 Dist (vec2 pos, vec2 r) { pos = pos * r; return -((pos - floor(pos)) - vec2(0.5)); }

float Gaus (float pos, float scale) { return exp2(scale * pos * pos); }

vec3 Horz3 (vec2 pos, float off, vec2 r, float scale)
{
    vec3 b = Fetch(pos, vec2(-1.0, off), r);
    vec3 c = Fetch(pos, vec2(0.0, off), r);
    vec3 d = Fetch(pos, vec2(1.0, off), r);
    float dst = Dist(pos, r).x;
    float wb = Gaus(dst - 1.0, scale);
    float wc = Gaus(dst, scale);
    float wd = Gaus(dst + 1.0, scale);
    return (b * wb + c * wc + d * wd) / (wb + wc + wd);
}

vec3 Horz5 (vec2 pos, float off, vec2 r, float scale)
{
    vec3 a = Fetch(pos, vec2(-2.0, off), r);
    vec3 b = Fetch(pos, vec2(-1.0, off), r);
    vec3 c = Fetch(pos, vec2(0.0, off), r);
    vec3 d = Fetch(pos, vec2(1.0, off), r);
    vec3 e = Fetch(pos, vec2(2.0, off), r);
    float dst = Dist(pos, r).x;
    float wa = Gaus(dst - 2.0, scale);
    float wb = Gaus(dst - 1.0, scale);
    float wc = Gaus(dst, scale);
    float wd = Gaus(dst + 1.0, scale);
    float we = Gaus(dst + 2.0, scale);
    return (a * wa + b * wb + c * wc + d * wd + e * we) / (wa + wb + wc + wd + we);
}

// Beam reconstruction: three signal rows through the vertical spot, each row
// resolved horizontally. Normalised by the weight sum, so this is purely a
// resampling filter -- brightness in equals brightness out, and the scanline
// shaping is applied separately above.
vec3 Tri (vec2 pos, vec2 r, vec2 fp)
{
    float sx = Band(hardPix, fp.x);
    float sy = Band(hardScan, fp.y);
    vec3 a = Horz3(pos, -1.0, r, sx);
    vec3 b = Horz5(pos, 0.0, r, sx);
    vec3 c = Horz3(pos, 1.0, r, sx);
    float dst = Dist(pos, r).y;
    float wa = Gaus(dst - 1.0, sy);
    float wb = Gaus(dst, sy);
    float wc = Gaus(dst + 1.0, sy);
    return (a * wa + b * wb + c * wc) / (wa + wb + wc);
}

vec2 Warp (vec2 pos)
{
    pos = pos * 2.0 - 1.0;
    pos *= vec2(1.0 + (pos.y * pos.y) * warp.x, 1.0 + (pos.x * pos.x) * warp.y);
    return pos * 0.5 + 0.5;
}

// One RGB triad per emulated pixel -- an aperture grille is a property of the
// tube's pitch, not of however many device pixels the browser happened to hand
// us. Below three device pixels per triad the phosphors cannot be drawn without
// inventing colour fringes, so the mask fades out instead.
vec3 Mask (vec2 fragCoord, vec2 r, float amount)
{
    vec2 e = fragCoord * (r / uOutputRes);
    float x = fract(e.x + floor(e.y) * 0.5);
    vec3 mask = vec3(maskDark);
    if (x < 0.333) mask.r = maskLight;
    else if (x < 0.666) mask.g = maskLight;
    else mask.b = maskLight;
    return mix(vec3(1.0), mask, amount);
}

void main ()
{
    vec2 r = max(uSignalRes, vec2(1.0));
    vec2 fp = r / uOutputRes;              // one output pixel, in emulated pixels
    vec2 pos = Warp(outTexCoord);
    float maskAmount = smoothstep(2.0, 3.0, 1.0 / fp.x);
    vec3 col = Tri(pos, r, fp) * Scanlines(pos, r) * Mask(outTexCoord * uOutputRes, r, maskAmount);
    gl_FragColor = vec4(ToSrgb(col), 1.0);
}
`;

class FilterCrtResolve extends BaseFilterShader {
  constructor(manager) {
    super(RESOLVE_NODE, manager, null, RESOLVE_FRAG);
    this.sourceWidth = 1;
    this.sourceHeight = 1;
  }

  setupUniforms(controller, drawingContext) {
    this.programManager.setUniform('uSourceRes', [this.sourceWidth, this.sourceHeight]);
    this.programManager.setUniform('uTargetRes', [drawingContext.width, drawingContext.height]);
  }
}

class FilterCrt extends BaseFilterShader {
  constructor(manager) {
    super(CRT_NODE, manager, null, CRT_FRAG);
    this.resolveNode = manager.getNode(RESOLVE_NODE);
  }

  run(controller, inputDrawingContext, outputDrawingContext, padding) {
    const renderer = this.manager.renderer;

    if (!outputDrawingContext) {
      outputDrawingContext = renderer.drawingContextPool.get(
        inputDrawingContext.width,
        inputDrawingContext.height
      );
    }

    // Pass one hands the full-resolution frame down to the signal grid; it
    // releases the frame on the way out. Pass two blows that signal back up to
    // the display, which is where the beam and the mask have room to live.
    const signal = renderer.drawingContextPool.get(SIGNAL_W, SIGNAL_H);
    this.resolveNode.sourceWidth = inputDrawingContext.width;
    this.resolveNode.sourceHeight = inputDrawingContext.height;
    this.resolveNode.run(controller, inputDrawingContext, signal, NO_PADDING);

    return super.run(controller, signal, outputDrawingContext, NO_PADDING);
  }

  setupUniforms(controller, drawingContext) {
    this.programManager.setUniform('uSignalRes', [SIGNAL_W, SIGNAL_H]);
    this.programManager.setUniform('uOutputRes', [drawingContext.width, drawingContext.height]);
  }
}

/** The controller a camera holds on to. It has no knobs: the tube is the tube. */
export class CrtFilter extends Phaser.Filters.Controller {
  constructor(camera) {
    super(camera, CRT_NODE);
  }
}

let registered = false;

/** Teaches the renderer about the two CRT passes. Safe to call more than once. */
export function registerCrt(game) {
  if (registered || !game.renderer?.renderNodes) return;
  game.renderer.renderNodes.addNodeConstructor(RESOLVE_NODE, FilterCrtResolve);
  game.renderer.renderNodes.addNodeConstructor(CRT_NODE, FilterCrt);
  registered = true;
}

/**
 * Puts the scene's camera behind the glass, or takes it out again. Called on
 * every scene so that the picture looks the same whichever screen is up.
 */
export function applyCrt(scene, enabled) {
  const camera = scene.cameras.main;
  if (!camera?.filters) return;

  const list = camera.filters.internal;
  const existing = list.list.find((filter) => filter instanceof CrtFilter);

  if (enabled && !existing) list.add(new CrtFilter(camera));
  else if (!enabled && existing) list.remove(existing);
}
