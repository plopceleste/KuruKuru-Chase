const SHADERS = {};

SHADERS.lottes = {
name: 'lottes',
source: `
// The resolution of the signal this tube is displaying. Channel 0 is the whole
// picture -- world and UI both -- resolved to exactly this grid beforehand, so
// one texel is one phosphor cell and every fetch below lands dead centre on a
// texel. Nothing bypasses the glass.
//
// This used to be iResolution.xy/3.0 -- a third of the *window*. That tied the
// emulated grid to the browser window and the device pixel ratio rather than to
// the picture: it drifted with every resize, doubled on a retina display, and
// on anything smaller than a ~1440x810 viewport it fell below the resolution of
// the art itself, at which point the point sampling in Fetch() was throwing
// whole art pixels on the floor. That is what crushed the image.
#define res (iSignalRes)

// Beam tuning, in emulated pixels. Halfway between a soft, bloomy tube (-4/-3,
// which smears pixel art) and a hard one (-10/-8, which is so tight the
// scanlines read as a stencil laid over the picture).
float hardScan=-6.0;
float hardPix=-4.5;
vec2 warp=vec2(1.0/100.0,1.0/100.0);
float maskDark=0.85;
float maskLight=1.15;
float scanDepth=0.18;

// Thinnest scanline worth drawing, in device pixels. Below roughly two the
// pattern cannot be rendered at all, so the tube drops to one scanline per two
// signal rows, then three, rather than fading the effect out.
const float MIN_SCAN=2.0;

const float LOG2=0.69314718;

float ToLinear1(float c){return(c<=0.04045)?c/12.92:pow((c+0.055)/1.055,2.4);}
vec3 ToLinear(vec3 c){return vec3(ToLinear1(c.r),ToLinear1(c.g),ToLinear1(c.b));}

float ToSrgb1(float c){return(c<0.0031308?c*12.92:1.055*pow(c,0.41666)-0.055);}
vec3 ToSrgb(vec3 c){return vec3(ToSrgb1(c.r),ToSrgb1(c.g),ToSrgb1(c.b));}

// exp2(s*x*x) is a gaussian of variance -1/(2*ln2*s), measured in emulated
// pixels. Widening that variance by the footprint of one output pixel (a box
// of width fp, variance fp*fp/12) band-limits the beam to what the display can
// actually resolve. When the viewport has pixels to spare the spot stays tight
// and the art stays sharp; when it does not the spot broadens into a clean
// low-pass, so an undersized window goes soft instead of aliasing, and the
// scanlines flatten out on their own. No thresholds, no branches.
float Band(float hard,float fp){
  float v=-1.0/(2.0*LOG2*hard)+fp*fp*(1.0/12.0);
  return -1.0/(2.0*LOG2*v);}

// Scanlines, locked to the signal grid so they ride the warp with the picture
// rather than sliding across it. The period is a whole number of signal rows,
// widened until it clears MIN_SCAN device pixels: one line per row where the
// display has room, one per two rows or three where it does not.
//
// This is deliberately not folded into the beam reconstruction below. Driving
// the scanlines off the 360-row grid meant a window shorter than ~720 device
// pixels had under a pixel per row, and band-limiting then flattened the whole
// effect to nothing -- turning the shader on changed the picture by about 2%,
// which reads as the toggle being broken. The cosine averages to one, so depth
// costs no brightness.
float Scanlines(vec2 pos,vec2 r){
  float rows=max(1.0,ceil(MIN_SCAN/(iResolution.y/r.y)));
  return 1.0+scanDepth*cos(6.28318531*(pos.y*r.y/rows));}

vec3 Fetch(vec2 pos,vec2 off,vec2 r){
  // Sample the centre of the emulated pixel. The old edge-snapped
  // floor(pos*r)/r landed on the seam between two texels, so with a linear
  // sampler every fetch came back a 50/50 blend of neighbours -- a half-pixel
  // smear layered on top of the crush.
  pos=(floor(pos*r+off)+0.5)/r;
  if(max(abs(pos.x-0.5),abs(pos.y-0.5))>0.5)return vec3(0.0,0.0,0.0);
  return ToLinear(texture(iChannel0,pos.xy).rgb);}

vec2 Dist(vec2 pos,vec2 r){pos=pos*r;return -((pos-floor(pos))-vec2(0.5));}

float Gaus(float pos,float scale){return exp2(scale*pos*pos);}

vec3 Horz3(vec2 pos,float off,vec2 r,float scale){
  vec3 b=Fetch(pos,vec2(-1.0,off),r);
  vec3 c=Fetch(pos,vec2( 0.0,off),r);
  vec3 d=Fetch(pos,vec2( 1.0,off),r);
  float dst=Dist(pos,r).x;
  float wb=Gaus(dst-1.0,scale);
  float wc=Gaus(dst+0.0,scale);
  float wd=Gaus(dst+1.0,scale);
  return (b*wb+c*wc+d*wd)/(wb+wc+wd);}

vec3 Horz5(vec2 pos,float off,vec2 r,float scale){
  vec3 a=Fetch(pos,vec2(-2.0,off),r);
  vec3 b=Fetch(pos,vec2(-1.0,off),r);
  vec3 c=Fetch(pos,vec2( 0.0,off),r);
  vec3 d=Fetch(pos,vec2( 1.0,off),r);
  vec3 e=Fetch(pos,vec2( 2.0,off),r);
  float dst=Dist(pos,r).x;
  float wa=Gaus(dst-2.0,scale);
  float wb=Gaus(dst-1.0,scale);
  float wc=Gaus(dst+0.0,scale);
  float wd=Gaus(dst+1.0,scale);
  float we=Gaus(dst+2.0,scale);
  return (a*wa+b*wb+c*wc+d*wd+e*we)/(wa+wb+wc+wd+we);}

// Beam reconstruction: three signal rows through the vertical spot, each row
// resolved horizontally through Horz3/Horz5. Normalised by the weight sum, so
// this is purely a resampling filter -- brightness in equals brightness out,
// and the scanline shaping is applied separately above.
vec3 Tri(vec2 pos,vec2 r,vec2 fp){
  float sx=Band(hardPix,fp.x);
  float sy=Band(hardScan,fp.y);
  vec3 a=Horz3(pos,-1.0,r,sx);
  vec3 b=Horz5(pos, 0.0,r,sx);
  vec3 c=Horz3(pos, 1.0,r,sx);
  float dst=Dist(pos,r).y;
  float wa=Gaus(dst-1.0,sy);
  float wb=Gaus(dst+0.0,sy);
  float wc=Gaus(dst+1.0,sy);
  return (a*wa+b*wb+c*wc)/(wa+wb+wc);}

vec2 Warp(vec2 pos){
  pos=pos*2.0-1.0;
  pos*=vec2(1.0+(pos.y*pos.y)*warp.x,1.0+(pos.x*pos.x)*warp.y);
  return pos*0.5+0.5;}

// One RGB triad per emulated pixel -- an aperture grille is a property of the
// tube's pitch, not of however many device pixels the browser happened to give
// us. The old version stepped every 6 device pixels, so it changed physical
// size with the device pixel ratio and beat against the art grid. Below three
// device pixels per triad the phosphors cannot be drawn without inventing
// colour fringes, so the mask fades out instead.
vec3 Mask(vec2 pos,vec2 r,float amt){
  vec2 e=pos*(r/iResolution.xy);
  float x=fract(e.x+floor(e.y)*0.5);
  vec3 mask=vec3(maskDark,maskDark,maskDark);
  if(x<0.333)mask.r=maskLight;
  else if(x<0.666)mask.g=maskLight;
  else mask.b=maskLight;
  return mix(vec3(1.0,1.0,1.0),mask,amt);}

void mainImage( out vec4 fragColor, in vec2 fragCoord ){
  vec2 uv=fragCoord.xy/iResolution.xy;
  vec2 r=max(res,vec2(1.0,1.0));
  vec2 fp=r/iResolution.xy;              // one output pixel, in emulated pixels
  vec2 pos=Warp(uv);
  float maskAmt=smoothstep(2.0,3.0,1.0/fp.x);
  vec3 col=Tri(pos,r,fp)*Scanlines(pos,r)*Mask(fragCoord.xy,r,maskAmt);
  fragColor=vec4(ToSrgb(col),1.0);}
`
};

const DEFAULT_SHADER = 'lottes';
const SHADER_ORDER = ['off', 'lottes'];
window.SHADERS = SHADERS;
window.DEFAULT_SHADER = DEFAULT_SHADER;
window.SHADER_ORDER = SHADER_ORDER;
