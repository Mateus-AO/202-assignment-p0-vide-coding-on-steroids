export const skyVertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

/**
 * Daytime gradient with a square sun and a soft glow. `horizon` is the fog color, so
 * distant terrain fades into it. Tone mapping is included so the sky looks the same on
 * screen and through a portal (which tone-maps everything itself).
 */
export const skyFragment = /* glsl */ `
  uniform vec3 horizon;
  varying vec3 vDir;
  void main() {
    vec3 d = normalize(vDir);
    float t = smoothstep(0.0, 0.6, d.y);
    vec3 top = vec3(0.16, 0.40, 0.90);
    vec3 c = mix(horizon, top, t);

    // A thin brighter haze right at the horizon.
    c = mix(c, horizon * 1.04, (1.0 - smoothstep(0.0, 0.12, d.y)) * 0.6);

    // Square sun, like the blocks around it, with a warm glow.
    vec3 sunDir = normalize(vec3(0.35, 0.27, -0.9));
    vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), sunDir));
    vec3 up = cross(sunDir, right);
    float facing = dot(d, sunDir);
    if (facing > 0.0) {
      vec2 p = vec2(dot(d, right), dot(d, up)) / facing;
      float glow = pow(max(facing, 0.0), 48.0) * 0.45 + pow(max(facing, 0.0), 6.0) * 0.12;
      c += vec3(1.0, 0.85, 0.55) * glow;
      float square = 1.0 - step(0.075, max(abs(p.x), abs(p.y)));
      c = mix(c, vec3(1.0, 0.97, 0.78), square);
    }

    gl_FragColor = vec4(c, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`
