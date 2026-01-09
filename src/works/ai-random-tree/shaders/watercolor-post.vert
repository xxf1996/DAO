precision highp float;

attribute vec3 position;

varying vec2 vUv;

void main() {
  // PlaneGeometry(2,2) positions are in clip-like space [-1, 1]
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}

