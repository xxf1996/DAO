precision highp float;

uniform sampler2D tDiffuse;
uniform vec2 resolution;
uniform float time;

// Controls
uniform float paperScale;      // ~ 2..12
uniform float paperStrength;   // ~ 0..1
uniform float granulation;     // ~ 0..1
uniform float edgeDarken;      // ~ 0..1
uniform float bleed;           // ~ 0..1
uniform float wash;            // ~ 0..1
uniform float warp;            // ~ 0..1  (paper-driven UV wobble)
uniform float bloom;           // ~ 0..1  (wet edge halo / blooms)
uniform float vignette;        // ~ 0..1

varying vec2 vUv;

float hash12(vec2 p) {
  // Stable-ish hash
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash12(i);
  float b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0));
  float d = hash12(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 p) {
  float f = 0.0;
  float a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 5; i++) {
    f += a * noise2(p);
    p = m * p + 0.17;
    a *= 0.5;
  }
  return f;
}

float luminance(vec3 c) {
  return dot(c, vec3(0.299, 0.587, 0.114));
}

vec3 sampleRGB(vec2 uv) {
  return texture2D(tDiffuse, uv).rgb;
}

// Paper texture: fibers + grain + subtle directionality
float paperTex(vec2 uv) {
  vec2 p = uv * paperScale;
  // base pulp
  float pulp = fbm(p * 2.2);
  // fibers: anisotropic streaks
  float ang = 0.55 + 0.08 * sin(time * 0.05);
  mat2 r = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));
  vec2 q = r * (p * vec2(3.5, 1.3));
  float fibers = fbm(vec2(q.x * 2.0, q.y * 9.0));
  // micro speckle
  float speck = noise2(p * 18.0);
  float tex = 0.55 * pulp + 0.35 * fibers + 0.10 * speck;
  return tex;
}

// Sobel edge + direction from luminance
vec3 sobel(vec2 uv, vec2 texel) {
  float tl = luminance(sampleRGB(uv + texel * vec2(-1.0,  1.0)));
  float  l = luminance(sampleRGB(uv + texel * vec2(-1.0,  0.0)));
  float bl = luminance(sampleRGB(uv + texel * vec2(-1.0, -1.0)));
  float  t = luminance(sampleRGB(uv + texel * vec2( 0.0,  1.0)));
  float  c = luminance(sampleRGB(uv));
  float  b = luminance(sampleRGB(uv + texel * vec2( 0.0, -1.0)));
  float tr = luminance(sampleRGB(uv + texel * vec2( 1.0,  1.0)));
  float  r = luminance(sampleRGB(uv + texel * vec2( 1.0,  0.0)));
  float br = luminance(sampleRGB(uv + texel * vec2( 1.0, -1.0)));

  float gx = -tl - 2.0 * l - bl + tr + 2.0 * r + br;
  float gy =  tl + 2.0 * t + tr - bl - 2.0 * b - br;
  float e = length(vec2(gx, gy));
  return vec3(gx, gy, e);
}

void main() {
  vec2 texel = 1.0 / max(resolution, vec2(1.0));

  // Paper
  float p = paperTex(vUv);
  // Paper shading (slightly warm)
  vec3 paperColor = vec3(0.965, 0.962, 0.945);
  float paperShade = (p - 0.5);

  // Paper-driven UV wobble: breaks perfect geometry edges (very important for "watercolor")
  vec2 warpVec = vec2(
    fbm(vUv * paperScale * 1.7 + vec2(5.2, 1.3)),
    fbm(vUv * paperScale * 1.7 + vec2(1.7, 9.2))
  ) - 0.5;
  float warpPx = mix(0.0, 10.0, warp) * (0.7 + 0.9 * p);
  vec2 uvW = clamp(vUv + warpVec * texel * warpPx, vec2(0.0), vec2(1.0));

  vec3 base = sampleRGB(uvW);
  float lum = luminance(base);

  // Edges: outline + pooling
  vec3 s = sobel(uvW, texel);
  vec2 grad = s.xy;
  float edge = s.z;
  // Normalize edge to a usable range
  // Make edge detection much more sensitive (previous thresholds were too high)
  edge = smoothstep(0.012, 0.085, edge);
  vec2 dir = normalize(grad + vec2(1e-4));

  // Wet edge bleeding (directional diffusion around edges)
  float rnd = hash12(uvW * resolution + time * 3.1);
  float bleedPx = mix(0.0, 16.0, bleed) * (0.65 + 0.7 * p) * (0.85 + 0.3 * rnd);
  vec2 o1 = dir * texel * bleedPx;
  vec2 o2 = vec2(-dir.y, dir.x) * texel * (bleedPx * 0.6); // perpendicular

  vec3 b0 = base;
  vec3 b1 = sampleRGB(clamp(uvW + o1, vec2(0.0), vec2(1.0)));
  vec3 b2 = sampleRGB(clamp(uvW - o1, vec2(0.0), vec2(1.0)));
  vec3 b3 = sampleRGB(clamp(uvW + o2, vec2(0.0), vec2(1.0)));
  vec3 b4 = sampleRGB(clamp(uvW - o2, vec2(0.0), vec2(1.0)));
  vec3 blur = (b0 * 0.40 + b1 * 0.16 + b2 * 0.16 + b3 * 0.14 + b4 * 0.14);

  float edgeMask = edge * smoothstep(0.98, 0.25, lum); // more on darker pigments
  // Add a bit of paper roughness to the edge mask so it doesn't look like a clean Sobel edge
  float edgeRough = (fbm(vUv * paperScale * 6.0 + vec2(2.3, 4.1)) - 0.5) * 0.35 * warp;
  edgeMask = clamp(edgeMask + edgeRough * edgeMask, 0.0, 1.0);

  vec3 col = mix(base, blur, edgeMask * (0.85 * bleed));

  // Wash diffusion (soft wet-in-wet look, very subtle)
  float washPx = mix(0.0, 12.0, wash) * (0.6 + 0.6 * p);
  vec2 j = vec2(cos(6.2831 * rnd), sin(6.2831 * rnd));
  vec3 w1 = sampleRGB(clamp(uvW + texel * washPx * j, vec2(0.0), vec2(1.0)));
  vec3 w2 = sampleRGB(clamp(uvW - texel * washPx * j, vec2(0.0), vec2(1.0)));
  vec3 w3 = sampleRGB(clamp(uvW + texel * washPx * vec2(-j.y, j.x), vec2(0.0), vec2(1.0)));
  vec3 w4 = sampleRGB(clamp(uvW - texel * washPx * vec2(-j.y, j.x), vec2(0.0), vec2(1.0)));
  vec3 washBlur = (col * 0.52 + (w1 + w2) * 0.16 + (w3 + w4) * 0.08);
  col = mix(col, washBlur, (0.65 * wash) * smoothstep(0.0, 0.85, 1.0 - lum));

  // Wet edge blooms / halos (very "watercolor")
  float bloomPx = mix(0.0, 22.0, bloom) * (0.6 + 0.8 * p);
  vec2 bo1 = dir * texel * bloomPx;
  vec2 bo2 = vec2(-dir.y, dir.x) * texel * (bloomPx * 0.8);
  vec3 h1 = sampleRGB(clamp(uvW + bo1, vec2(0.0), vec2(1.0)));
  vec3 h2 = sampleRGB(clamp(uvW - bo1, vec2(0.0), vec2(1.0)));
  vec3 h3 = sampleRGB(clamp(uvW + bo2, vec2(0.0), vec2(1.0)));
  vec3 h4 = sampleRGB(clamp(uvW - bo2, vec2(0.0), vec2(1.0)));
  vec3 halo = (h1 + h2 + h3 + h4) * 0.25;
  float haloLum = luminance(halo);
  float ring = smoothstep(0.02, 0.18, abs(haloLum - luminance(col)));
  col = mix(col, halo, bloom * edgeMask * 0.45);
  col = mix(col, (col + halo) * 0.5, bloom * edgeMask * 0.25);
  col *= (1.0 - ring * bloom * edgeMask * 0.10);

  // Granulation: pigment settles into paper valleys in dark regions
  float g = fbm(vUv * paperScale * 3.0 + vec2(11.2, 7.7));
  float pigment = smoothstep(0.15, 0.85, 1.0 - lum);
  float gran = (g - 0.5) * granulation * pigment;
  // Reduce chroma a bit where granulation is strong
  vec3 grey = vec3(luminance(col));
  col = mix(col, grey, clamp(gran * 0.55, 0.0, 0.55));
  col *= (1.0 - gran * 0.22);

  // Edge darkening / pooling
  float pool = edgeMask * edgeDarken;
  col *= (1.0 - 0.40 * pool);
  col += 0.05 * pool * vec3(0.08, 0.10, 0.12); // slight cool ink pooling

  // Apply paper lighting/shading
  col = mix(col, col * (0.92 + 0.22 * paperShade), paperStrength);
  col = mix(paperColor, col, 0.82 + 0.18 * smoothstep(-0.25, 0.25, paperShade));

  // Vignette
  vec2 d = vUv - 0.5;
  float vig = smoothstep(0.78, 0.15, dot(d, d));
  col *= mix(1.0, vig, vignette * 0.35);

  col = clamp(col, 0.0, 1.0);
  gl_FragColor = vec4(col, 1.0);
}

