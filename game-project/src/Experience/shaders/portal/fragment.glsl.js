export default `
uniform float uTime;
uniform vec3 uColorStart;
uniform vec3 uColorEnd;
uniform float uDistortionStrength;
uniform float uWaveFrequency;
uniform float uFogDensity;

varying vec2 vUv;

// Perlin Noise 3D
vec4 permute(vec4 x){
    return mod(((x*34.0)+1.0)*x, 289.0);
}
vec4 taylorInvSqrt(vec4 r){
    return 1.79284291400159 - 0.85373472095314 * r;
}
vec3 fade(vec3 t) {
    return t*t*t*(t*(t*6.0-15.0)+10.0);
}

float cnoise(vec3 P) {
    vec3 Pi0 = floor(P); 
    vec3 Pi1 = Pi0 + vec3(1.0); 
    Pi0 = mod(Pi0, 289.0);
    Pi1 = mod(Pi1, 289.0);
    vec3 Pf0 = fract(P); 
    vec3 Pf1 = Pf0 - vec3(1.0); 
    vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
    vec4 iy = vec4(Pi0.yy, Pi1.yy);
    vec4 iz0 = Pi0.zzzz;
    vec4 iz1 = Pi1.zzzz;

    vec4 ixy = permute(permute(ix) + iy);
    vec4 ixy0 = permute(ixy + iz0);
    vec4 ixy1 = permute(ixy + iz1);

    vec4 gx0 = ixy0 / 7.0;
    vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;
    gx0 = fract(gx0);
    vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
    vec4 sz0 = step(gz0, vec4(0.0));
    gx0 -= sz0 * (step(0.0, gx0) - 0.5);
    gy0 -= sz0 * (step(0.0, gy0) - 0.5);

    vec4 gx1 = ixy1 / 7.0;
    vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;
    gx1 = fract(gx1);
    vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
    vec4 sz1 = step(gz1, vec4(0.0));
    gx1 -= sz1 * (step(0.0, gx1) - 0.5);
    gy1 -= sz1 * (step(0.0, gy1) - 0.5);

    vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
    vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
    vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
    vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
    vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
    vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
    vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
    vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);

    vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
    g000 *= norm0.x;
    g010 *= norm0.y;
    g100 *= norm0.z;
    g110 *= norm0.w;
    vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
    g001 *= norm1.x;
    g011 *= norm1.y;
    g101 *= norm1.z;
    g111 *= norm1.w;

    float n000 = dot(g000, Pf0);
    float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
    float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
    float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
    float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
    float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
    float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
    float n111 = dot(g111, Pf1);

    vec3 fade_xyz = fade(Pf0);
    vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
    vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
    float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
    
    return 2.2 * n_xyz;
}

void main() {
    vec2 center = vec2(0.5, 0.5);
    vec2 toCenter = vUv - center;
    float distance = length(toCenter);
    
    // 🌀 VÓRTICE ESPIRAL MEJORADO
    float angle = atan(toCenter.y, toCenter.x);
    float spiralSpeed = uTime * 3.0;
    float spiralStrength = (1.0 - distance) * 8.0;
    
    // Rotación del vórtice (más fuerte cerca del centro)
    float rotation = spiralSpeed + distance * spiralStrength;
    vec2 spiralUv = vec2(
        toCenter.x * cos(rotation) - toCenter.y * sin(rotation),
        toCenter.x * sin(rotation) + toCenter.y * cos(rotation)
    ) + center;
    
    // Distorsión turbulenta
    float turbulence = cnoise(vec3(spiralUv * 4.0, uTime * 0.5)) * 0.15;
    vec2 distortedUv = spiralUv + turbulence * normalize(toCenter);
    
    // 🔥 Capas de ruido para profundidad
    float noise1 = cnoise(vec3(distortedUv * 5.0, uTime * 0.2));
    float noise2 = cnoise(vec3(distortedUv * 10.0, uTime * 0.4)) * 0.5;
    float noise3 = cnoise(vec3(distortedUv * 20.0, uTime * 0.6)) * 0.25;
    float strength = noise1 + noise2 + noise3;
    
    // ⚡ Anillos pulsantes
    float rings = sin(distance * 30.0 - uTime * 5.0);
    rings = smoothstep(0.3, 0.7, rings);
    strength += rings * 0.4;
    
    // 🌊 Ondas radiales
    float waves = sin(distance * uWaveFrequency - uTime * 4.0);
    waves = (waves + 1.0) * 0.5;
    strength += waves * 0.3;
    
    // ✨ Pulso del centro
    float pulse = sin(uTime * 3.0) * 0.2 + 0.8;
    float centerGlow = exp(-distance * 4.0) * pulse;
    strength += centerGlow * 2.0;
    
    // 🔥 Borde brillante
    float edgeGlow = smoothstep(0.45, 0.5, distance) * (1.0 - smoothstep(0.5, 0.55, distance));
    strength += edgeGlow * 1.5;
    
    strength = clamp(strength, 0.0, 1.0);
    
    // 🎨 Gradiente de color dinámico
    vec3 color = mix(uColorStart, uColorEnd, strength);
    
    // 🌈 Tintes espectrales
    vec3 spectralTint = vec3(
        sin(angle * 3.0 + uTime * 2.0) * 0.5 + 0.5,
        sin(angle * 5.0 + uTime * 3.0) * 0.5 + 0.5,
        sin(angle * 7.0 + uTime * 4.0) * 0.5 + 0.5
    ) * 0.3;
    color += spectralTint * (1.0 - distance);
    
    // 💨 Niebla oscura en los bordes
    float fog = exp(-distance * uFogDensity);
    vec3 smokeColor = vec3(0.05, 0.0, 0.1);
    color = mix(smokeColor, color, fog);
    
    // ✨ Brillo adicional para el centro
    color += vec3(1.0, 0.8, 0.5) * centerGlow * 0.5;
    
    // 🌟 Alpha para transparencia en los bordes
    float alpha = smoothstep(0.6, 0.4, distance);
    alpha = mix(0.7, 1.0, alpha);
    
    gl_FragColor = vec4(color, alpha);
}
`