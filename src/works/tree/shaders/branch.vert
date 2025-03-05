varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldPosition;

void main() {
    vUv = uv;
    
    // 计算世界空间的位置
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    
    // 计算视图空间的位置
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vPosition = viewPosition.xyz;
    
    // 正确变换法线到视图空间
    vNormal = normalize(normalMatrix * normal);
    
    gl_Position = projectionMatrix * viewPosition;
}