/**
 * Shaders of the TV wall. Both materials are unlit and write sRGB-looking colors that are
 * squared into linear before the output color-space step (the materials are not tone mapped,
 * like the terminal's).
 */

/** The cabinets: hand-shaded from a fixed light, lit up by the screens' own light. */
export const bodyVertex = /* glsl */ `
  attribute vec4 aTone;
  attribute vec3 aTint;
  attribute float aGlow;
  varying vec3 vBase;
  varying vec3 vNormal;
  varying float vGlow;
  varying float vDepth;

  void main() {
    mat4 m = modelViewMatrix * instanceMatrix;
    vNormal = normalize(mat3(m) * normal);
    vBase = aTone.rgb * mix(vec3(1.0), aTint, aTone.w);
    vGlow = aGlow;
    vec4 mv = m * vec4(position, 1.0);
    vDepth = clamp(-position.z * 0.5, 0.0, 1.0);
    gl_Position = projectionMatrix * mv;
  }
`

export const bodyFragment = /* glsl */ `
  varying vec3 vBase;
  varying vec3 vNormal;
  varying float vGlow;
  varying float vDepth;

  void main() {
    vec3 n = normalize(vNormal);
    float key = max(dot(n, normalize(vec3(-0.35, 0.6, 0.72))), 0.0);
    float fill = max(dot(n, normalize(vec3(0.7, -0.2, 0.4))), 0.0);
    float light = 0.34 + 0.72 * key + 0.16 * fill;
    // Farther back is darker, as in a stack lit from the front.
    light *= 1.0 - 0.55 * vDepth;
    // In the dark the room is lit only by what the screens give.
    float lit = vGlow * vGlow * (3.0 - 2.0 * vGlow);
    vec3 color = vBase * light * lit;
    color = max(color, 0.0);
    color *= color;
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`

/**
 * The glass: one convex plane per set. `aRect` is the set's slice of the picture (picture
 * pixels), `aPhos` its phosphor color, `aState` = (warm, scramble, lock, set index).
 */
export const glassVertex = /* glsl */ `
  attribute vec4 aRect;
  attribute vec3 aPhos;
  attribute vec4 aState;
  attribute float aGlow;
  uniform float uBulge;
  uniform float uZ;
  varying vec2 vUv;
  varying vec4 vRect;
  varying vec3 vPhos;
  varying vec4 vState;
  varying float vGlow;

  void main() {
    vUv = uv;
    vRect = aRect;
    vPhos = aPhos;
    vState = aState;
    vGlow = aGlow;
    vec2 c = uv * 2.0 - 1.0;
    vec3 p = position;
    p.z += uZ + uBulge * (1.0 - c.x * c.x) * (1.0 - c.y * c.y);
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(p, 1.0);
  }
`

export const glassFragment = /* glsl */ `
  uniform sampler2D uScreen;
  uniform sampler2D uFont;
  uniform sampler2D uPicture;
  uniform vec2 uGrid;
  uniform vec2 uFontGrid;
  uniform vec2 uGlyph;
  uniform vec2 uPic;
  uniform float uTvCount;
  uniform float uTime;
  uniform float uMotion;
  uniform float uFancy;
  varying vec2 vUv;
  varying vec4 vRect;
  varying vec3 vPhos;
  varying vec4 vState;
  varying float vGlow;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  vec3 toneColor(float t, vec3 ph) {
    if (t < 1.5) return ph * 0.38;
    if (t < 2.5) return ph * 0.85;
    if (t < 3.5) return ph * 1.1 + 0.18;
    if (t < 4.5) return mix(ph, vec3(0.5, 1.0, 0.7), 0.6) * 0.95;
    if (t < 5.5) return mix(ph, vec3(1.0, 0.82, 0.3), 0.75);
    return ph * 1.1 + 0.18;
  }

  void main() {
    float idx = vState.w;
    float warm = vState.x;
    float scramble = vState.y;
    float lock = vState.z;
    vec2 d = abs(vUv - 0.5) * 2.0;

    // The tube warms up: a point, a bright line spreading sideways, then opening to a picture.
    float bw = mix(0.04, 1.02, smoothstep(0.0, 0.42, warm));
    float bh = mix(0.012, 1.02, smoothstep(0.34, 0.95, warm));
    float open = (1.0 - smoothstep(bw - 0.08, bw, d.x)) * (1.0 - smoothstep(bh - 0.04, bh, d.y));
    open *= smoothstep(0.0, 0.06, warm);
    float lineGlow = (1.0 - smoothstep(0.3, 0.8, warm)) * open;
    float bright = smoothstep(0.28, 1.0, warm);

    // The character grid.
    vec2 g = vec2(vUv.x, 1.0 - vUv.y) * uGrid;
    vec2 cell = floor(g);
    vec2 local = fract(g);
    vec2 atlas = vec2(cell.x + 0.5, idx * uGrid.y + cell.y + 0.5) / vec2(uGrid.x, uGrid.y * uTvCount);
    vec4 data = texture2D(uScreen, atlas) * 255.0;
    float code = floor(data.r + 0.5);
    float tone = floor(data.g + 0.5);

    // Scramble: cells turn to static, then the picture takes the pixels over.
    float tq = floor(uTime * 14.0) * uMotion;
    float hn = hash(cell + idx * 17.0 + tq * 0.37);
    if (hn < scramble) {
      code = 33.0 + floor(hash(cell + idx * 3.1 + tq * 0.71) * 93.0);
      tone = 1.0 + floor(hash(cell.yx + idx + tq * 0.13) * 3.0);
    }

    float mask = 0.0;
    float glow = 0.0;
    if (code > 31.5) {
      float gi = code - 32.0;
      vec2 fc = vec2(mod(gi, uFontGrid.x), floor(gi / uFontGrid.x));
      vec2 lo = fc / uFontGrid;
      vec2 hi = (fc + 1.0) / uFontGrid;
      vec2 px = 1.0 / (uFontGrid * uGlyph);
      vec2 guv = lo + clamp(local, 0.0, 0.999) / uFontGrid;
      mask = texture2D(uFont, guv).a;
      if (uFancy > 0.5) {
        vec2 a = clamp(guv + vec2(px.x, 0.0) * 1.5, lo, hi);
        vec2 b = clamp(guv - vec2(px.x, 0.0) * 1.5, lo, hi);
        vec2 c = clamp(guv + vec2(0.0, px.y) * 1.5, lo, hi);
        vec2 e = clamp(guv - vec2(0.0, px.y) * 1.5, lo, hi);
        glow = (texture2D(uFont, a).a + texture2D(uFont, b).a +
                texture2D(uFont, c).a + texture2D(uFont, e).a) * 0.25;
      }
    }

    // Scanlines: every other pixel row a little darker.
    float scan = 1.0 - 0.24 * mod(floor(local.y * uGlyph.y), 2.0);
    float sweep = (fract(1.0 - vUv.y - uTime * 0.04 - idx * 0.13) - 0.5) * 9.0;
    float band = exp(-sweep * sweep) * 0.12 * uMotion;
    float blink = tone > 5.5 ? mix(1.0, step(0.5, fract(uTime)), uMotion) : 1.0;

    vec3 ph = vPhos;
    float ink = (mask * scan + glow * 0.45) * blink;
    vec3 text = toneColor(tone, ph) * (ink + band * (mask + glow));
    vec3 tube = ph * 0.06 * (1.0 + band * 2.0);

    // This set's slice of the picture, nearest-filtered, pixel by pixel.
    vec2 pp = mix(vRect.xy, vRect.zw, vec2(vUv.x, 1.0 - vUv.y));
    vec2 pix = clamp(floor(pp), vec2(0.0), uPic - 1.0);
    float showPic = lock > 0.0 ? step(hash(pix + idx * 3.1), lock * 1.0001) : 0.0;
    vec3 pic = texture2D(uPicture, (pix + 0.5) / uPic).rgb;
    vec2 pf = fract(pp);
    float pixelGap = 1.0 - 0.07 * (step(pf.x, 0.08) + step(pf.y, 0.08));
    pic *= pixelGap * (1.0 - 0.10 * mod(floor(local.y * uGlyph.y), 2.0));

    vec3 lit = mix(text + tube, pic * 0.96 + ph * 0.012, showPic);
    float vig = 1.0 - 0.34 * dot(d, d) * 0.5;
    lit *= vig;
    vec3 color = lit * bright * open + ph * lineGlow * 0.9;

    // Dark glass, with a soft reflection that shows the glass is convex.
    float sheen = 0.0;
    if (uFancy > 0.5) {
      vec2 s = (vUv - vec2(0.3, 0.74)) * vec2(1.0, 1.35);
      sheen = exp(-dot(s, s) * 7.0) * 0.07 + smoothstep(0.35, 1.0, d.x * d.y) * 0.025;
    }
    float room = vGlow * vGlow * (3.0 - 2.0 * vGlow);
    color += (vec3(0.012, 0.016, 0.016) + vec3(sheen)) * room;

    color = max(color, 0.0);
    color *= color;
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`

/**
 * A soft additive halo around each lit screen: its light spilling onto the cabinets. The
 * plane sits in front of the glass and only draws outside the glass rectangle.
 */
export const haloVertex = /* glsl */ `
  attribute vec3 aPhos;
  attribute vec4 aState;
  uniform vec2 uHalf;
  uniform vec2 uGlass;
  varying vec2 vPos;
  varying vec3 vPhos;
  varying float vWarm;

  void main() {
    vPos = (uv - 0.5) * 2.0 * uHalf;
    vPhos = aPhos;
    vWarm = aState.x;
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  }
`

export const haloFragment = /* glsl */ `
  uniform vec2 uHalf;
  uniform vec2 uGlass;
  varying vec2 vPos;
  varying vec3 vPhos;
  varying float vWarm;

  void main() {
    vec2 q = abs(vPos) - uGlass * 0.5;
    float dist = length(max(q, 0.0));
    float outside = smoothstep(0.0, 0.05, max(q.x, q.y));
    float fall = max(1.0 - dist / 0.6, 0.0);
    float a = fall * fall * 0.32 * outside * smoothstep(0.3, 1.0, vWarm);
    vec3 color = max(vPhos, 0.0) * a;
    color *= color;
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`
