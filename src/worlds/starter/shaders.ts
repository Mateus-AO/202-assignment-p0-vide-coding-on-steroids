export const vertex = /* glsl */ `
  varying vec2 vUv;
  varying vec2 vPos;
  void main() {
    vUv = uv;
    vPos = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

/**
 * The CRT glass. The picture is sampled through a barrel distortion (a slight fisheye), then
 * dressed with scanlines, a phosphor glow (`uFancy`), a rolling hum bar, a faint glare and a
 * vignette. Everything that moves is slow (flicker at 2 Hz, 2% deep). `uTune` is the drop to
 * static and black that ends the screen; `uFade` dims the picture to nothing. All of it is
 * driven by uniforms the scene sets from the world's progress and the clock.
 */
export const glassFragment = /* glsl */ `
  uniform sampler2D uTex;
  uniform vec2 uTexel;
  uniform float uTime;
  uniform float uCurve;
  uniform float uFade;
  uniform float uNoise;
  uniform float uFlicker;
  uniform float uFancy;
  uniform float uLines;
  varying vec2 vUv;
  varying vec2 vPos;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r2 = dot(p, p);
    // Barrel distortion: the edges of the picture sample from farther out, so they pull in.
    vec2 q = p * (1.0 + uCurve * r2) / (1.0 + uCurve);
    // Rounded window; the corners fall off naturally where the distortion pushes q past 1.
    vec2 e = abs(q) - (1.0 - 0.07);
    float sd = length(max(e, 0.0)) - 0.07;
    float inside = 1.0 - smoothstep(-0.012, 0.012, sd);

    vec2 uv = q * 0.5 + 0.5;
    vec3 col = texture2D(uTex, uv).rgb;
    if (uFancy > 0.5) {
      // Glow: blur the neighbors in, and a touch of color fringing toward the edges.
      vec2 o = uTexel * 2.0;
      vec3 g = texture2D(uTex, uv + vec2(o.x, 0.0)).rgb + texture2D(uTex, uv - vec2(o.x, 0.0)).rgb
             + texture2D(uTex, uv + vec2(0.0, o.y)).rgb + texture2D(uTex, uv - vec2(0.0, o.y)).rgb;
      col += g * 0.16;
      float fringe = uTexel.x * (0.6 + 1.6 * r2);
      col.r = mix(col.r, texture2D(uTex, uv + vec2(fringe, 0.0)).r, 0.6);
      col.b = mix(col.b, texture2D(uTex, uv - vec2(fringe, 0.0)).b, 0.6);
    }

    float scan = 0.8 + 0.2 * cos(uv.y * uLines * 6.2831853);
    col *= scan * 1.25;

    // A band of hum rolls slowly down the glass (one pass every 8 s).
    float roll = (fract(uv.y + uTime * 0.125) - 0.5) * 7.0;
    col *= 1.0 + 0.07 * exp(-roll * roll) * uFlicker;
    col *= 1.0 + 0.02 * sin(uTime * 12.566) * uFlicker;

    // The drop to static: snow that thickens, then the picture dims out.
    float snow = hash(floor(vUv * vec2(200.0, 150.0)) + floor(uTime * 8.0));
    col = col * uFade + uNoise * snow * vec3(0.55, 0.7, 0.6);

    float glare = smoothstep(0.7, 0.0, length(p - vec2(-0.55, 0.6)));
    col += vec3(0.05, 0.07, 0.06) * glare;
    // The glass is a little lit even when the picture is black.
    col += vec3(0.004, 0.008, 0.006);

    float vignette = 1.0 - 0.6 * smoothstep(0.35, 1.5, r2);
    col *= vignette * inside;

    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

/**
 * The casing's front plate with a window in it. Black, with a lit bevel round the window and a
 * power light below it.
 */
export const plateFragment = /* glsl */ `
  uniform vec2 uHole;
  uniform float uRadius;
  uniform float uPower;
  uniform float uGlow;
  varying vec2 vPos;

  void main() {
    vec2 p = vPos;
    vec2 e = abs(p) - (uHole * 0.5 - uRadius);
    float sd = length(max(e, 0.0)) - uRadius;

    // Pure black round the picture; only the bevel, the glow and the power light are lit.
    vec3 col = vec3(0.0);

    // The bevel: light along the window's top and sides, dark along its bottom.
    float rim = smoothstep(0.16, 0.0, sd);
    float lit = 0.5 + 0.5 * clamp(p.y * 2.0 / uHole.y, -1.0, 1.0);
    col += rim * (0.004 + 0.03 * lit);
    // Light from the picture spills onto the plate round the window.
    col += vec3(0.004, 0.02, 0.008) * exp(-max(sd, 0.0) * 5.0) * uGlow;

    // Power light at the lower left.
    float led = smoothstep(0.05, 0.03, length(p - vec2(-uHole.x * 0.5 + 0.35, -uHole.y * 0.5 - 0.3)));
    col = mix(col, vec3(0.06, 0.4, 0.1) * uPower, led);
    col += vec3(0.0, 0.012, 0.003) * uPower * smoothstep(0.35, 0.0, length(p - vec2(-uHole.x * 0.5 + 0.35, -uHole.y * 0.5 - 0.3)));

    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`
