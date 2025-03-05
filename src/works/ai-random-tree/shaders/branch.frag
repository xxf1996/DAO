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
    // 基础噪声和水彩效果
    float f = fbm(vec3(vUv * 8.0, 0.5324));
    float sf = smoothstep(0.4, 0.5, f);
    
    // 计算树枝融合效果
    float blendNoise = fbm(vec3(vWorldPosition.x * 0.5, vWorldPosition.y * 0.5, vWorldPosition.z * 0.5));
    float verticalGradient = smoothstep(0.0, 1.0, vUv.y);
    float horizontalVariation = sin(vUv.x * PI * 2.0) * 0.5 + 0.5;
    float blendFactor = mix(0.3, 0.7, blendNoise * verticalGradient * horizontalVariation);
    
    // 环境光计算
    vec3 ambient = color * ambientLightIntensity;
    
    // 平行光计算
    vec3 directionalLightDir = normalize(directionalLightPosition - vWorldPosition);
    float directionalDiffuse = max(dot(normalize(vNormal + 0.2 * vec3(f - 0.5)), directionalLightDir), 0.0);
    directionalDiffuse = smoothstep(0.4, 0.5, directionalDiffuse + 0.3 * f);
    
    // 基础颜色混合
    vec3 baseColor = mix(color, vec3(0.1, 0.3, 0.75), 0.3 * (1.0 - directionalDiffuse));
    
    // 添加融合色调变化
    vec3 blendColor = mix(
        baseColor,
        baseColor * (0.8 + 0.4 * blendNoise),
        blendFactor
    );
    
    vec3 col = blendColor + ambient;
    
    // 计算视角方向（在视图空间中）
    vec3 viewDir = normalize(-vPosition);
    
    // 高光计算
    float shine = 5.0;
    vec3 halfwayDir = normalize(directionalLightDir + viewDir);
    float spec = pow(max(dot(vNormal, halfwayDir), 0.0), shine);
    spec = smoothstep(0.5, 0.6, spec + 0.5 * f);
    col += 0.01 * shine * spec;
    
    // 水彩颜色分层 - 考虑融合效果
    vec3 lightColor = col * (1.2 - 0.2 * blendFactor);
    vec3 midColor = col;
    vec3 darkColor = col * (0.7 + 0.2 * blendFactor);
    vec3 finalColor = mix(darkColor, midColor, f);
    finalColor = mix(finalColor, lightColor, sf * (1.0 - 0.3 * blendFactor));

    // 改进的描边效果
    vec3 inkColor = vec3(0.15, 0.25, 0.4);

    // 计算视角相关因子
    float NdotV = abs(dot(normalize(vNormal), viewDir));
    
    // 计算深度因子（用于调整远近处的描边宽度）
    float depth = length(vPosition);
    float depthFactor = smoothstep(0.0, 20.0, depth);
    
    // 计算视角补偿因子（用于调整极端视角下的描边宽度）
    vec3 viewSpaceNormal = normalize(vNormal);
    float viewAngleFactor = abs(dot(viewSpaceNormal, vec3(0.0, 0.0, 1.0)));
    viewAngleFactor = pow(viewAngleFactor, 0.5);
    
    // 在连接处减弱描边
    float outlineBlendFactor = 1.0 - smoothstep(0.3, 0.7, blendFactor);
    
    // 创建自适应宽度的描边
    float baseWidth = 0.2 * outlineBlendFactor; // 基础描边宽度
    float outlineWidth = baseWidth * (1.0 + 0.5 * (1.0 - viewAngleFactor)) * (1.0 + 0.3 * depthFactor);
    float outlineThreshold = 0.3;
    
    // 计算描边
    float outline = 1.0 - smoothstep(
        outlineThreshold - outlineWidth,
        outlineThreshold + outlineWidth,
        NdotV * (0.5 + 0.5 * viewAngleFactor)
    );
    
    // 添加固定的细微噪声到描边，在连接处减弱噪声
    float edgeNoise = noise(vUv * 32.0) * 0.05 * outlineBlendFactor;
    outline = smoothstep(0.3, 0.7, outline + edgeNoise);
    
    // 应用描边，使用视角因子调整强度
    float outlineStrength = 0.8 * (0.8 + 0.2 * viewAngleFactor) * outlineBlendFactor;
    finalColor = mix(finalColor, inkColor, outline * outlineStrength);
    
    // 添加固定的水彩效果，在连接处增强水彩效果
    float watercolorNoise = noise(vUv * 16.0) * mix(0.1, 0.2, blendFactor);
    finalColor = mix(finalColor, finalColor * (1.0 - watercolorNoise), 0.95);
    
    gl_FragColor = vec4(finalColor, 1.0);
}