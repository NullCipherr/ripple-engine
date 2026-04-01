export const fluidFrag = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uDensityTex;
uniform sampler2D uVelocityXTex;
uniform sampler2D uVelocityYTex;

uniform int uViewMode; // 0: density, 1: velocity, 2: pressure, 3: particles, 4: diffuse
uniform int uPalette; // 0: default, 1: fire, 2: ocean, 3: plasma
uniform int uFluidType; // 0: liquid, 1: gas, 2: smoke, 3: plasma
uniform int uShowGrid;
uniform float uGridSize;
uniform vec3 uEmissionTint;
uniform float uEmissionStrength;

// Color mapping functions
vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

vec3 getPaletteColor(int palette, float v) {
    float vPow = pow(clamp(v, 0.0, 1.0), 0.8);
    
    if (palette == 1) { // fire
        if (vPow < 0.33) return hsv2rgb(vec3(0.0, 1.0, vPow * 3.0));
        if (vPow < 0.66) return hsv2rgb(vec3((vPow - 0.33) * 0.5, 1.0, 1.0));
        return hsv2rgb(vec3(0.16, 1.0 - (vPow - 0.66) * 3.0, 1.0));
    } else if (palette == 2) { // ocean
        if (vPow < 0.5) return hsv2rgb(vec3(0.6, 1.0, vPow * 2.0));
        return hsv2rgb(vec3(0.6 - (vPow - 0.5) * 0.2, 1.0 - (vPow - 0.5) * 2.0, 1.0));
    } else if (palette == 3) { // plasma
        if (vPow < 0.5) return hsv2rgb(vec3(0.8, 1.0, vPow * 2.0));
        return hsv2rgb(vec3(0.8 + (vPow - 0.5) * 0.4, 1.0, 1.0));
    } else { // default
        if (vPow < 0.33) return hsv2rgb(vec3(0.65, 1.0, vPow * 3.0));
        if (vPow < 0.66) return hsv2rgb(vec3(0.65 - (vPow - 0.33) * 0.4, 1.0, 1.0));
        return hsv2rgb(vec3(0.5, 1.0 - (vPow - 0.66) * 3.0, 1.0));
    }
}

vec3 getDiffuseFluidColor(int fluidType, float v) {
    float t = clamp(v, 0.0, 1.0);

    if (fluidType == 0) { // liquid: azul/ciano
        return mix(vec3(0.04, 0.12, 0.22), vec3(0.30, 0.74, 1.0), t);
    } else if (fluidType == 1) { // gas: branco azulado sutil
        return mix(vec3(0.08, 0.10, 0.14), vec3(0.83, 0.90, 1.0), t);
    } else if (fluidType == 2) { // smoke: cinza real
        return mix(vec3(0.07, 0.07, 0.07), vec3(0.78, 0.78, 0.78), t);
    } else if (fluidType == 3) { // plasma: amarelo/laranja quente
        return mix(vec3(0.20, 0.06, 0.02), vec3(1.0, 0.76, 0.26), t);
    }

    return vec3(t);
}

float applyFluidTypeResponse(int fluidType, float value) {
    float v = clamp(value, 0.0, 1.0);
    if (fluidType == 1) { // gas
        return pow(v, 1.35);
    } else if (fluidType == 2) { // smoke
        return pow(v, 0.68);
    } else if (fluidType == 3) { // plasma
        return clamp(pow(v, 1.18) * 1.32, 0.0, 1.0);
    }
    return pow(v, 0.85); // liquid
}

float sampleDensitySoft(vec2 uv) {
    vec2 texel = 1.0 / vec2(textureSize(uDensityTex, 0));
    float center = texture(uDensityTex, uv).r * 0.28;
    float axis = 0.0;
    axis += texture(uDensityTex, uv + vec2(texel.x, 0.0)).r;
    axis += texture(uDensityTex, uv - vec2(texel.x, 0.0)).r;
    axis += texture(uDensityTex, uv + vec2(0.0, texel.y)).r;
    axis += texture(uDensityTex, uv - vec2(0.0, texel.y)).r;
    float diagonal = 0.0;
    diagonal += texture(uDensityTex, uv + texel).r;
    diagonal += texture(uDensityTex, uv + vec2(texel.x, -texel.y)).r;
    diagonal += texture(uDensityTex, uv + vec2(-texel.x, texel.y)).r;
    diagonal += texture(uDensityTex, uv - texel).r;

    return center + axis * 0.12 + diagonal * 0.06;
}

void main() {
    vec4 baseColor = vec4(0.0, 0.0, 0.0, 0.0);
    
    if (uViewMode == 0) { // density
        float d = texture(uDensityTex, vUv).r;
        float dv = applyFluidTypeResponse(uFluidType, d);
        vec3 color = getPaletteColor(uPalette, dv);
        baseColor = vec4(color, clamp(dv, 0.0, 1.0));
    } else if (uViewMode == 1) { // velocity
        float vx = texture(uVelocityXTex, vUv).r;
        float vy = texture(uVelocityYTex, vUv).r;
        float mag = length(vec2(vx, vy)) * 0.1; // Adjusted scale for WebGL
        float val = applyFluidTypeResponse(uFluidType, mag);
        vec3 color = getPaletteColor(uPalette, val);
        baseColor = vec4(color, 1.0);
    } else if (uViewMode == 2) { // pressure
        float vx = texture(uVelocityXTex, vUv).r * 0.1;
        float val = applyFluidTypeResponse(uFluidType, abs(vx));
        vec3 posColor = getPaletteColor(uPalette, val);
        vec3 negColor = getPaletteColor(uPalette, val * 0.7);
        baseColor = vec4(vx > 0.0 ? posColor : negColor * vec3(0.8, 0.5, 0.9), 1.0);
    } else if (uViewMode == 4) { // diffuse
        float smoothD = sampleDensitySoft(vUv);
        float vx = texture(uVelocityXTex, vUv).r;
        float vy = texture(uVelocityYTex, vUv).r;
        float flow = clamp(length(vec2(vx, vy)) * 0.065, 0.0, 1.0);
        float dv = applyFluidTypeResponse(uFluidType, smoothD * 0.92 + flow * 0.18);
        vec3 base = getDiffuseFluidColor(uFluidType, dv);
        vec3 softHighlight = mix(base, vec3(1.0), clamp(dv * 0.25 + flow * 0.2, 0.0, 0.4));
        baseColor = vec4(softHighlight, clamp(dv * 1.12, 0.0, 1.0));
    }

    if (uShowGrid == 1) {
        vec2 gridUv = vUv * uGridSize;
        vec2 grid = abs(fract(gridUv - 0.5) - 0.5) / fwidth(gridUv);
        float line = min(grid.x, grid.y);
        float alpha = 1.0 - smoothstep(0.0, 1.5, line);
        baseColor.rgb = mix(baseColor.rgb, vec3(1.0), alpha * 0.3);
        baseColor.a = max(baseColor.a, alpha * 0.3);
    }

    if (uEmissionStrength > 0.0 && baseColor.a > 0.0) {
        vec3 emission = uEmissionTint * (uEmissionStrength * (0.35 + baseColor.a * 0.65));
        baseColor.rgb = clamp(baseColor.rgb + emission, 0.0, 1.0);
    }

    fragColor = baseColor;
}
`;
