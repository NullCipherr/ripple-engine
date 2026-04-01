export const particleVert = `#version 300 es
layout(location = 0) in vec2 aPosition;
layout(location = 1) in float aLife;
layout(location = 2) in vec3 aColor;
layout(location = 3) in float aSize;

out float vLife;
out vec3 vColor;

void main() {
    vLife = aLife;
    vColor = aColor;
    
    // Convert from [0, 1] to [-1, 1]
    vec2 clipSpace = aPosition * 2.0 - 1.0;
    // Flip Y
    clipSpace.y = -clipSpace.y;
    
    gl_Position = vec4(clipSpace, 0.0, 1.0);
    gl_PointSize = aSize;
}
`;
