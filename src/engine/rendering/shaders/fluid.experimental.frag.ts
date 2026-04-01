export const fluidExperimentalFrag = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uDensityTex;
uniform sampler2D uVelocityXTex;
uniform sampler2D uVelocityYTex;

uniform int uViewMode; // 0: density, 1: velocity, 2: pressure, 3: particles, 4: diffuse
uniform int uPalette;
uniform int uFluidType; // 0: liquid, 1: gas, 2: smoke, 3: plasma
uniform int uShowGrid;
uniform float uGridSize;
uniform vec3 uEmissionTint;
uniform float uEmissionStrength;

vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

vec3 getPaletteColor(int palette, float v) {
    float vPow = pow(clamp(v, 0.0, 1.0), 0.7);

    if (palette == 1) {
        if (vPow < 0.33) return hsv2rgb(vec3(0.0, 1.0, vPow * 3.0));
        if (vPow < 0.66) return hsv2rgb(vec3((vPow - 0.33) * 0.5, 1.0, 1.0));
        return hsv2rgb(vec3(0.16, 1.0 - (vPow - 0.66) * 3.0, 1.0));
    } else if (palette == 2) {
        if (vPow < 0.5) return hsv2rgb(vec3(0.6, 1.0, vPow * 2.0));
        return hsv2rgb(vec3(0.6 - (vPow - 0.5) * 0.2, 1.0 - (vPow - 0.5) * 2.0, 1.0));
    } else if (palette == 3) {
        if (vPow < 0.5) return hsv2rgb(vec3(0.8, 1.0, vPow * 2.0));
        return hsv2rgb(vec3(0.8 + (vPow - 0.5) * 0.4, 1.0, 1.0));
    }

    if (vPow < 0.33) return hsv2rgb(vec3(0.65, 1.0, vPow * 3.0));
    if (vPow < 0.66) return hsv2rgb(vec3(0.65 - (vPow - 0.33) * 0.4, 1.0, 1.0));
    return hsv2rgb(vec3(0.5, 1.0 - (vPow - 0.66) * 3.0, 1.0));
}

vec3 getDiffuseFluidColor(int fluidType, float v) {
    float t = clamp(v, 0.0, 1.0);

    if (fluidType == 0) return mix(vec3(0.04, 0.12, 0.22), vec3(0.30, 0.74, 1.0), t); // liquid
    if (fluidType == 1) return mix(vec3(0.08, 0.10, 0.14), vec3(0.83, 0.90, 1.0), t); // gas
    if (fluidType == 2) return mix(vec3(0.07, 0.07, 0.07), vec3(0.78, 0.78, 0.78), t); // smoke
    if (fluidType == 3) return mix(vec3(0.20, 0.06, 0.02), vec3(1.0, 0.76, 0.26), t); // plasma
    return vec3(t);
}

float applyFluidTypeResponse(int fluidType, float value) {
    float v = clamp(value, 0.0, 1.0);
    if (fluidType == 1) return pow(v, 1.35); // gas
    if (fluidType == 2) return pow(v, 0.68); // smoke
    if (fluidType == 3) return clamp(pow(v, 1.18) * 1.32, 0.0, 1.0); // plasma
    return pow(v, 0.85); // liquid
}

float sampleDensity(vec2 uv) {
    return texture(uDensityTex, clamp(uv, 0.0, 1.0)).r;
}

float sampleDensitySoft(vec2 uv) {
    vec2 texel = 1.0 / vec2(textureSize(uDensityTex, 0));
    float center = sampleDensity(uv) * 0.3;
    float axis = 0.0;
    axis += sampleDensity(uv + vec2(texel.x, 0.0));
    axis += sampleDensity(uv - vec2(texel.x, 0.0));
    axis += sampleDensity(uv + vec2(0.0, texel.y));
    axis += sampleDensity(uv - vec2(0.0, texel.y));
    float diagonal = 0.0;
    diagonal += sampleDensity(uv + texel);
    diagonal += sampleDensity(uv + vec2(texel.x, -texel.y));
    diagonal += sampleDensity(uv + vec2(-texel.x, texel.y));
    diagonal += sampleDensity(uv - texel);
    return center + axis * 0.11 + diagonal * 0.065;
}

void main() {
    float d = sampleDensity(vUv);
    float dx = sampleDensity(vUv + vec2(1.0 / max(uGridSize, 1.0), 0.0)) - sampleDensity(vUv - vec2(1.0 / max(uGridSize, 1.0), 0.0));
    float dy = sampleDensity(vUv + vec2(0.0, 1.0 / max(uGridSize, 1.0))) - sampleDensity(vUv - vec2(0.0, 1.0 / max(uGridSize, 1.0)));
    float edge = clamp(length(vec2(dx, dy)) * 1.5, 0.0, 1.0);

    vec4 baseColor = vec4(0.0);

    if (uViewMode == 0) {
        float dv = applyFluidTypeResponse(uFluidType, d + edge * 0.2);
        vec3 color = getPaletteColor(uPalette, dv);
        baseColor = vec4(color + edge * 0.12, clamp(dv + edge * 0.12, 0.0, 1.0));
    } else if (uViewMode == 1) {
        float vx = texture(uVelocityXTex, vUv).r;
        float vy = texture(uVelocityYTex, vUv).r;
        float mag = length(vec2(vx, vy)) * 0.12;
        float val = applyFluidTypeResponse(uFluidType, mag + edge * 0.2);
        baseColor = vec4(getPaletteColor(uPalette, val), 1.0);
    } else if (uViewMode == 2) {
        float vx = texture(uVelocityXTex, vUv).r * 0.12;
        float val = applyFluidTypeResponse(uFluidType, abs(vx) + edge * 0.15);
        vec3 posColor = getPaletteColor(uPalette, val);
        vec3 negColor = getPaletteColor(uPalette, val * 0.7);
        baseColor = vec4(vx > 0.0 ? posColor : negColor * vec3(0.8, 0.5, 0.9), 1.0);
    } else if (uViewMode == 4) {
        float smoothD = sampleDensitySoft(vUv);
        float vx = texture(uVelocityXTex, vUv).r;
        float vy = texture(uVelocityYTex, vUv).r;
        float flow = clamp(length(vec2(vx, vy)) * 0.08, 0.0, 1.0);
        float dv = applyFluidTypeResponse(uFluidType, smoothD * 0.94 + edge * 0.12 + flow * 0.16);
        vec3 color = getDiffuseFluidColor(uFluidType, dv);
        vec3 soft = mix(color, vec3(1.0), clamp(dv * 0.22 + edge * 0.15, 0.0, 0.42));
        baseColor = vec4(soft, clamp(dv * 1.1, 0.0, 1.0));
    }

    if (uShowGrid == 1) {
        vec2 gridUv = vUv * uGridSize;
        vec2 grid = abs(fract(gridUv - 0.5) - 0.5) / fwidth(gridUv);
        float line = min(grid.x, grid.y);
        float alpha = 1.0 - smoothstep(0.0, 1.5, line);
        baseColor.rgb = mix(baseColor.rgb, vec3(1.0), alpha * 0.25);
        baseColor.a = max(baseColor.a, alpha * 0.25);
    }

    if (uEmissionStrength > 0.0 && baseColor.a > 0.0) {
        vec3 emission = uEmissionTint * (uEmissionStrength * (0.35 + baseColor.a * 0.65));
        baseColor.rgb = clamp(baseColor.rgb + emission, 0.0, 1.0);
    }

    fragColor = baseColor;
}
`;
