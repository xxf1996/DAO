precision mediump float;

uniform float time;
uniform vec3 color;
uniform float ambientLightIntensity;
uniform vec3 directionalLightPosition;
uniform float directionalLightIntensity;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldPosition;

#define PI 3.14159
#define EPS 0.00001
#define EPSN 0.001

float hash(vec3 p) {
    return fract(123456.789 * sin(dot(p, vec3(12.34, 56.78, 91.01))));
}

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float noise3d(vec3 p) {
    vec3 f = fract(p);
    f = f * f * (3. - 2. * f);
    vec3 c = floor(p);
    
    return mix(
        mix(
            mix(hash(c), hash(c + vec3(1., 0., 0.)), f.x),
            mix(hash(c + vec3(0., 1., 0.)), hash(c + vec3(1., 1., 0.)), f.x),
            f.y
        ),
        mix(
            mix(hash(c + vec3(0., 0., 1.)), hash(c + vec3(1., 0., 1.)), f.x),
            mix(hash(c + vec3(0., 1., 1.)), hash(c + vec3(1., 1., 1.)), f.x),
            f.y
        ),
        f.z
    );
}

mat2 rot(float a) {
    float c = cos(a);
    float s = sin(a);
    return mat2(c, -s, s, c);
}

float fbm(vec3 p) {
    vec3 pos = 10. * p;
    float c = 0.5;
    float res = 0.;
    for(int i = 0; i < 4; i++) {
        pos.xy = rot(2.) * pos.xy;
        pos = pos * 2. + 2.;
        res += c * noise3d(pos);
        c /= 2.;
    }
    return res;
}

void main() {
    // ----------------------------
    // Watercolor-oriented shading:
    // - Softer tonal range (less "3D plastic")
    // - Wash banding (pigment layers)
    // - Granulation on paper valleys
    // - Pooling on silhouettes (NOT ink outlines)
    // ----------------------------

    // Base noises
    float f = fbm(vec3(vUv * 6.0, 0.5324));
    float f2 = fbm(vec3(vUv * 16.0, 2.17));

    // Paper / fiber signal in world space (stable across the object)
    float paper = fbm(vec3(vWorldPosition.xz * 0.02, 1.31));
    paper = 0.55 * paper + 0.45 * fbm(vec3(vWorldPosition.xy * 0.02, 3.71));

    // Lighting (keep it subtle)
    vec3 directionalLightDir = normalize(directionalLightPosition - vWorldPosition);
    vec3 n = normalize(vNormal + 0.12 * vec3(f - 0.5));
    float ndl = max(dot(n, directionalLightDir), 0.0);
    // compress contrast: watercolor usually has gentle shading
    float shade = smoothstep(0.15, 0.85, ndl);

    // Wash banding: 3-4 pigment layers (posterize, then soften with noise)
    float bands = 4.0;
    float banded = floor(shade * bands) / (bands - 1.0);
    float bandJitter = (f2 - 0.5) * 0.10 + (paper - 0.5) * 0.10;
    float washT = clamp(banded + bandJitter, 0.0, 1.0);

    // Base pigment color (slightly warm + a hint of cool in shadow)
    vec3 warm = color;
    vec3 coolShadow = mix(vec3(0.20, 0.30, 0.45), warm, 0.35);
    vec3 pigment = mix(coolShadow, warm, washT);

    // Ambient (paper bounce light)
    vec3 ambient = warm * ambientLightIntensity * 0.55;

    // Granulation: stronger in darker regions and in paper valleys
    float pigmentAmt = smoothstep(0.10, 0.90, 1.0 - washT);
    float gran = (paper - 0.5) * 0.55 * pigmentAmt;
    vec3 grey = vec3(dot(pigment, vec3(0.299, 0.587, 0.114)));
    pigment = mix(pigment, grey, clamp(abs(gran) * 0.55, 0.0, 0.55));
    pigment *= (1.0 - 0.20 * gran);

    // Pooling on silhouettes: darker edge where water stops
    vec3 viewDir = normalize(-vPosition);
    float NdotV = abs(dot(normalize(vNormal), viewDir));
    float silhouette = 1.0 - smoothstep(0.25, 0.80, NdotV);
    float edgeRough = (noise(vUv * 24.0 + vec2(time * 0.03, -time * 0.02)) - 0.5) * 0.35;
    silhouette = clamp(silhouette + edgeRough * silhouette, 0.0, 1.0);
    vec3 poolColor = vec3(0.08, 0.10, 0.12);
    pigment = mix(pigment, pigment * 0.60 + poolColor * 0.40, silhouette * 0.75);

    // Subtle fiber shading: paper texture influences pigment density
    pigment *= (0.92 + 0.18 * (paper - 0.5));

    // Final color (keep it matte)
    vec3 finalColor = pigment + ambient;
    finalColor = clamp(finalColor, 0.0, 1.0);

    gl_FragColor = vec4(finalColor, 1.0);
}