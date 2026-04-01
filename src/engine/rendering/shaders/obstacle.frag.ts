export const obstacleFrag = `#version 300 es
precision mediump float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uObstacleTex;

void main() {
    float obs = texture(uObstacleTex, vUv).r;
    if (obs > 0.5) {
        fragColor = vec4(0.1, 0.12, 0.15, 0.8); // Dark gray/blue
    } else {
        fragColor = vec4(0.0);
    }
}
`;
