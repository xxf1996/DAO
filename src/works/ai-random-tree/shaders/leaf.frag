precision mediump float;
uniform float time;
uniform float season;
uniform float ambientLightIntensity;
uniform vec3 directionalLightPosition;
uniform float directionalLightIntensity;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

float noise2(vec2 st) {
  vec2 i = floor(st);
  vec2 f = fract(st);
  float a = random(i);
  float b = random(i + vec2(1.0, 0.0));
  float c = random(i + vec2(0.0, 1.0));
  float d = random(i + vec2(1.0, 1.0));
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

vec3 getSeasonColor(float season) {
  vec3 springColor = vec3(0.7, 1.0, 0.4);
  vec3 summerColor = vec3(0.4, 0.9, 0.3);
  vec3 autumnColor = vec3(1.0, 0.6, 0.2);
  vec3 winterColor = vec3(0.9, 0.8, 0.7);

  float normalizedSeason = season * 3.0;
  int seasonIndex = int(floor(normalizedSeason));
  float t = fract(normalizedSeason);

  if (seasonIndex == 0) return mix(springColor, summerColor, t);
  if (seasonIndex == 1) return mix(summerColor, autumnColor, t);
  if (season == 1.0f) return winterColor;
  return mix(autumnColor, winterColor, t);
}

void main() {
  vec2 st = vUv;
  vec3 base = getSeasonColor(season);

  // Leaf mask in UV space (CircleGeometry)
  vec2 p = st - 0.5;
  float r = length(p) * 2.0; // ~0 center, ~1 edge
  float edge = smoothstep(0.85, 1.02, r);
  float inside = 1.0 - smoothstep(0.98, 1.10, r);

  // Subtle lighting (matte)
  vec3 ambient = base * ambientLightIntensity * 0.65;
  vec3 directionalLightDir = normalize(directionalLightPosition);
  float ndl = max(dot(normalize(vNormal), directionalLightDir), 0.0);
  float shade = smoothstep(0.20, 0.85, ndl);

  // Wash banding on leaves
  float bands = 3.0;
  float banded = floor(shade * bands) / (bands - 1.0);
  float paper = fbm(st * 8.0 + vec2(2.1, 7.3));
  float washJitter = (paper - 0.5) * 0.18 + (fbm(st * 22.0) - 0.5) * 0.10;
  float washT = clamp(banded + washJitter, 0.0, 1.0);

  // Pigment mix: slightly warmer light, cooler shadow
  vec3 coolShadow = mix(vec3(0.20, 0.28, 0.35), base, 0.35);
  vec3 pigment = mix(coolShadow, base, washT);

  // Granulation: stronger in darker areas and in paper valleys
  float pigmentAmt = smoothstep(0.10, 0.90, 1.0 - washT);
  float gran = (paper - 0.5) * 0.75 * pigmentAmt;
  float lum = dot(pigment, vec3(0.299, 0.587, 0.114));
  vec3 grey = vec3(lum);
  pigment = mix(pigment, grey, clamp(abs(gran) * 0.55, 0.0, 0.55));
  pigment *= (1.0 - 0.22 * gran);

  // Pooling at the wet edge (darker rim instead of ink outline)
  float rim = smoothstep(0.70, 1.02, r);
  float rimNoise = (fbm(st * 30.0 + vec2(time * 0.03, -time * 0.02)) - 0.5) * 0.35;
  rim = clamp(rim + rimNoise * rim, 0.0, 1.0);
  vec3 poolColor = vec3(0.08, 0.10, 0.12);
  pigment = mix(pigment, pigment * 0.62 + poolColor * 0.38, rim * 0.65);

  vec3 finalColor = pigment + ambient;
  finalColor = clamp(finalColor, 0.0, 1.0);

  // Soften leaf silhouette a bit (watercolor edges are not razor sharp)
  float alpha = 0.92 * inside;
  // Tiny feather near edge
  alpha *= 1.0 - 0.25 * edge;

  gl_FragColor = vec4(finalColor, alpha);
}