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
  float noise = random(st);
  float edgeNoise = random(st * 2.0) * 0.3;
  vec3 seasonColor = getSeasonColor(season);

  // 环境光计算
  vec3 ambient = seasonColor * ambientLightIntensity;

  // 平行光计算
  vec3 directionalLightDir = normalize(directionalLightPosition);
  float directionalDiffuse = max(dot(normalize(vNormal), directionalLightDir), 0.0);
  vec3 directionalLight = seasonColor * directionalLightIntensity * directionalDiffuse;

  // 合并光照和水彩效果
  vec3 lightColor = (ambient + directionalLight) * 1.6;
  vec3 darkColor = (ambient + directionalLight) * 0.8;
  vec3 finalColor = mix(darkColor, lightColor, noise + edgeNoise);

  gl_FragColor = vec4(finalColor, 0.95);
}