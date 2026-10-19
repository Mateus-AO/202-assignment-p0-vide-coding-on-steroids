export const screenVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

/**
 * Draws the character grid. `uScreen` holds one texel per cell (red: glyph code, green: tone),
 * `uFont` the glyph atlas. Scanlines and a slow sweeping band give the CRT look; the glow
 * (`uFancy`) is skipped on the low quality tier. Colors are written as sRGB, so they are
 * converted to linear before the output color-space step.
 */
export const screenFragment = /* glsl */ `
  uniform sampler2D uScreen;
  uniform sampler2D uFont;
  uniform vec2 uGrid;
  uniform vec2 uFontGrid;
  uniform vec2 uGlyph;
  uniform float uTime;
  uniform float uFade;
  uniform float uBlink;
  uniform float uFancy;
  varying vec2 vUv;

  vec3 toneColor(float t) {
    if (t < 1.5) return vec3(0.17, 0.50, 0.55);
    if (t < 2.5) return vec3(0.49, 0.96, 1.00);
    if (t < 3.5) return vec3(0.92, 1.00, 1.00);
    if (t < 4.5) return vec3(0.48, 1.00, 0.69);
    if (t < 5.5) return vec3(1.00, 0.85, 0.30);
    return vec3(0.92, 1.00, 1.00);
  }

  void main() {
    vec2 g = vec2(vUv.x, 1.0 - vUv.y) * uGrid;
    vec2 cell = floor(g);
    vec2 local = fract(g);
    vec4 d = texture2D(uScreen, (cell + 0.5) / uGrid) * 255.0;
    float code = floor(d.r + 0.5);
    float tone = floor(d.g + 0.5);

    float mask = 0.0;
    float glow = 0.0;
    if (code > 31.5) {
      float idx = code - 32.0;
      vec2 fc = vec2(mod(idx, uFontGrid.x), floor(idx / uFontGrid.x));
      vec2 lo = fc / uFontGrid;
      vec2 hi = (fc + 1.0) / uFontGrid;
      vec2 px = 1.0 / (uFontGrid * uGlyph);
      vec2 uv = lo + clamp(local, 0.0, 0.999) / uFontGrid;
      mask = texture2D(uFont, uv).a;
      if (uFancy > 0.5) {
        vec2 a = clamp(uv + vec2(px.x, 0.0) * 1.5, lo, hi);
        vec2 b = clamp(uv - vec2(px.x, 0.0) * 1.5, lo, hi);
        vec2 c = clamp(uv + vec2(0.0, px.y) * 1.5, lo, hi);
        vec2 e = clamp(uv - vec2(0.0, px.y) * 1.5, lo, hi);
        glow = (texture2D(uFont, a).a + texture2D(uFont, b).a +
                texture2D(uFont, c).a + texture2D(uFont, e).a) * 0.25;
      }
    }

    // Every other pixel row is a little darker, like scanlines.
    float scan = 1.0 - 0.22 * mod(floor(local.y * uGlyph.y), 2.0);
    // A faint band drifts down the screen.
    float sweep = (fract(1.0 - vUv.y - uTime * 0.05) - 0.5) * 9.0;
    float band = exp(-sweep * sweep) * 0.16;

    float blink = tone > 5.5 ? mix(1.0, step(0.5, fract(uTime)), uBlink) : 1.0;
    float ink = (mask * scan + glow * 0.45) * blink;
    vec3 color = toneColor(tone) * (ink + band * (mask + glow));
    color = pow(color, vec3(2.2));

    float alpha = clamp(mask + glow * 0.6, 0.0, 1.0) * blink * uFade;
    if (alpha < 0.002) discard;
    gl_FragColor = vec4(color, alpha);
    #include <colorspace_fragment>
  }
`
