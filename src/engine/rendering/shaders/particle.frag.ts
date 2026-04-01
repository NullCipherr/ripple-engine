export const particleFrag = `#version 300 es
precision mediump float;

in float vLife;
in vec3 vColor;

out vec4 fragColor;

void main() {
    if (vLife <= 0.0) discard;
    
    // Circular particle
    vec2 coord = gl_PointCoord * 2.0 - 1.0;
    float dist = dot(coord, coord);
    if (dist > 1.0) discard;
    
    // Soft edge
    float alpha = (1.0 - dist) * vLife;
    fragColor = vec4(vColor * alpha, alpha); // Premultiplied alpha
}
`;
