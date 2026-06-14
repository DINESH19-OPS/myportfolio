/**
 * Strands WebGL2 — Vanilla JS port of React-Bits Strands
 * With two-pass Framebuffer rendering for glass sphere refraction overlay.
 */
(function () {
  'use strict';

  /* ── Config ────────────────────────────────────────────────────────────── */
  const CFG = {
    colors:     ['#069968', '#921d19', '#541a8c'],
    count:      3,
    speed:      0.5,
    amplitude:  1,
    waviness:   1,
    thickness:  0.7,
    glow:       0.3,
    taper:      4.9,
    spread:     1,
    intensity:  0.6,
    saturation: 2,
    opacity:    1,
    scale:      1.5,
    hueShift:   0,
    glass:      false,
    refraction: 2,
    dispersion: 1,
    glassSize:  0.87
  };

  const MAX_STRANDS = 12;
  const MAX_COLORS  = 8;

  /* ── GLSL ──────────────────────────────────────────────────────────────── */
  const VERT = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}`;

  const FRAG = `#version 300 es
precision highp float;

uniform float uTime;
uniform vec2  uResolution;
uniform vec3  uColors[${MAX_COLORS}];
uniform int   uColorCount;
uniform int   uStrandCount;
uniform float uSpeed;
uniform float uAmplitude;
uniform float uWaviness;
uniform float uThickness;
uniform float uGlow;
uniform float uTaper;
uniform float uSpread;
uniform float uHueShift;
uniform float uIntensity;
uniform float uOpacity;
uniform float uScale;
uniform float uSaturation;

out vec4 fragColor;

const float PI = 3.14159265;

vec3 spectrum(float t) {
  return 0.5 + 0.5 * cos(2.0 * PI * (t + vec3(0.00, 0.33, 0.67)));
}

vec3 samplePalette(float t) {
  t = fract(t);
  float scaled = t * float(uColorCount);
  int   idx    = int(floor(scaled));
  float blend  = fract(scaled);
  int   nxt    = idx + 1;
  if (nxt >= uColorCount) nxt = 0;
  return mix(uColors[idx], uColors[nxt], blend);
}

vec3 strandColor(float t) {
  if (uColorCount > 0) return samplePalette(t);
  return spectrum(t);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;
  uv /= max(uScale, 0.0001);

  float e   = 0.06 + uIntensity * 0.94;
  float env = pow(max(cos(uv.x * PI * 1.3), 0.0), uTaper);

  vec3 col = vec3(0.0);

  for (int i = 0; i < ${MAX_STRANDS}; i++) {
    if (i >= uStrandCount) break;

    float fi  = float(i);
    float ph   = fi * 1.7 * uSpread;
    float freq = (2.0 + fi * 0.35) * uWaviness;
    float spd  = 1.4 + fi * 1.2;
    float tt   = uTime * uSpeed;

    float w = sin(uv.x * freq + tt * spd + ph) * 0.60
            + sin(uv.x * freq * 1.1 - tt * spd * 0.7 + ph * 1.7) * 0.40;

    float amp   = (0.1 + 0.02 * e) * env * uAmplitude;
    float y     = w * amp;
    float d     = abs(uv.y - y);

    float thick = (0.001 + 0.05 * e) * (0.35 + env) * uThickness;
    float g = thick / (d + thick * 0.45);
    g = g * g;

    float h = fi / float(uStrandCount) + uv.x * 0.30 + uTime * 0.04 + uHueShift;
    col += strandColor(h) * g * env;
  }

  col *= 0.45 + 0.7 * e;
  col  = 1.0 - exp(-col * uGlow);

  float gray = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = max(mix(vec3(gray), col, uSaturation), 0.0);

  float lum   = max(max(col.r, col.g), col.b);
  float alpha = clamp(lum, 0.0, 1.0) * uOpacity;

  fragColor = vec4(col * uOpacity, alpha);
}`;

  const GLASS_FRAG = `#version 300 es
precision highp float;

uniform sampler2D uScene;
uniform vec2      uResolution;
uniform float     uRadius;
uniform float     uRefraction;
uniform float     uDispersion;

out vec4 fragColor;

vec2 toUv(vec2 p) {
  return p * (uResolution.y / uResolution) + 0.5;
}

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;
  float d = length(p);
  float r = uRadius;

  float edge = fwidth(d) * 1.5;
  float mask = 1.0 - smoothstep(r - edge, r + edge, d);
  if (mask <= 0.0) {
    fragColor = vec4(0.0);
    return;
  }

  // sphere height: 0 at the rim, 1 at the center
  float z = sqrt(max(r * r - d * d, 0.0)) / r;
  float nd = d / r; // 0 at the center, 1 at the rim

  // refraction is confined to a narrow band near the rim; the rest stays undistorted
  vec2 dir = d > 0.0 ? p / d : vec2(0.0);
  float lens = smoothstep(0.85, 1.0, nd) * pow(nd, 6.0);
  vec2 offset = -dir * lens * uRefraction * 0.15;
  vec2 disp = -dir * lens * uDispersion * 0.012;

  vec3 light;
  light.r = texture(uScene, toUv(p + offset - disp)).r;
  light.g = texture(uScene, toUv(p + offset)).g;
  light.b = texture(uScene, toUv(p + offset + disp)).b;

  // neutral fresnel rim (no color tint so the glass stays clear)
  float fres = pow(1.0 - z, 3.0);
  vec3 rim = vec3(1.0) * fres * 0.18;

  // specular highlight from the upper-left
  vec2 lightDir = normalize(vec2(-0.55, 0.6));
  float spec = pow(max(dot(p / max(r, 1e-4), lightDir), 0.0), 6.0);
  spec *= smoothstep(r, r * 0.55, d);

  vec3 emissive = light + rim + vec3(spec) * 0.4;
  float emissiveA = clamp(max(max(emissive.r, emissive.g), emissive.b), 0.0, 1.0);

  // almost clear glass body: only a faint neutral darkening, mostly near the rim
  float bodyA = 0.05 + fres * 0.05;

  // composite emissive light over the clear body (premultiplied)
  float outA = emissiveA + bodyA * (1.0 - emissiveA);
  vec3 outRGB = emissive;

  outRGB *= mask;
  outA *= mask;

  fragColor = vec4(outRGB, outA);
}`;

  /* ── Helpers ───────────────────────────────────────────────────────────── */
  function hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    return [
      parseInt(hex.slice(0, 2), 16) / 255,
      parseInt(hex.slice(2, 4), 16) / 255,
      parseInt(hex.slice(4, 6), 16) / 255,
    ];
  }

  function buildPalette(colors) {
    const filled = colors && colors.length ? colors : ['#ffffff'];
    const flat = [];
    for (let i = 0; i < MAX_COLORS; i++) {
      const hex = filled[i] ?? filled[filled.length - 1];
      flat.push(...hexToRgb(hex));
    }
    return new Float32Array(flat);
  }

  function compileShader(gl, type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error('Shader error:', gl.getShaderInfoLog(sh));
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }

  function createProgram(gl, vertSrc, fragSrc) {
    const vs  = compileShader(gl, gl.VERTEX_SHADER,   vertSrc);
    const fs  = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);
    if (!vs || !fs) return null;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(prog));
      return null;
    }
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return prog;
  }

  /* ── Init ──────────────────────────────────────────────────────────────── */
  function init() {
    const canvas = document.getElementById('strands-canvas');
    if (!canvas) return;

    /* ── WebGL2 context ── */
    const gl = canvas.getContext('webgl2', {
      alpha:              true,
      premultipliedAlpha: true,
      antialias:          true,
    });
    if (!gl) { console.warn('WebGL2 not supported'); return; }

    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    /* Full-screen triangle buffer */
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1,  3, -1,  -1, 3]), gl.STATIC_DRAW);

    /* Strands program */
    const prog = createProgram(gl, VERT, FRAG);
    if (!prog) return;

    /* Glass program */
    const glassProg = createProgram(gl, VERT, GLASS_FRAG);
    if (!glassProg) return;

    /* Set up Vertex Attributes */
    const posLoc = gl.getAttribLocation(prog, 'position');
    const vao    = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    /* Bind Strands Uniforms */
    gl.useProgram(prog);
    const U = {};
    [
      'uTime','uResolution','uColors','uColorCount','uStrandCount',
      'uSpeed','uAmplitude','uWaviness','uThickness','uGlow',
      'uTaper','uSpread','uHueShift','uIntensity','uOpacity',
      'uScale','uSaturation',
    ].forEach(n => { U[n] = gl.getUniformLocation(prog, n); });

    /* Bind static / initial strands uniforms */
    gl.uniform3fv(U.uColors,      buildPalette(CFG.colors));
    gl.uniform1i( U.uColorCount,  Math.min(CFG.colors.length, MAX_COLORS));
    gl.uniform1i( U.uStrandCount, Math.min(Math.max(Math.round(CFG.count),1), MAX_STRANDS));
    gl.uniform1f( U.uSpeed,       CFG.speed);
    gl.uniform1f( U.uAmplitude,   CFG.amplitude);
    gl.uniform1f( U.uWaviness,    CFG.waviness);
    gl.uniform1f( U.uThickness,   CFG.thickness);
    gl.uniform1f( U.uGlow,        CFG.glow);
    gl.uniform1f( U.uTaper,       CFG.taper);
    gl.uniform1f( U.uSpread,      CFG.spread);
    gl.uniform1f( U.uHueShift,    CFG.hueShift);
    gl.uniform1f( U.uIntensity,   CFG.intensity);
    gl.uniform1f( U.uOpacity,     CFG.opacity);
    gl.uniform1f( U.uScale,       CFG.scale);
    gl.uniform1f( U.uSaturation,  CFG.saturation);

    /* Bind Glass Uniforms */
    gl.useProgram(glassProg);
    const GU = {};
    [
      'uScene', 'uResolution', 'uRadius', 'uRefraction', 'uDispersion'
    ].forEach(n => { GU[n] = gl.getUniformLocation(glassProg, n); });

    gl.uniform1i(GU.uScene, 0); // texture unit 0

    /* Framebuffer for glass refraction pass */
    let fbo = null;
    let fboTexture = null;

    function createFBO(width, height) {
      if (fbo) gl.deleteFramebuffer(fbo);
      if (fboTexture) gl.deleteTexture(fboTexture);

      fbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);

      fboTexture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, fboTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fboTexture, 0);

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.bindTexture(gl.TEXTURE_2D, null);
    }

    /* ── Resize ── */
    function resize() {
      const dpr = window.devicePixelRatio || 1;
      canvas.width  = Math.round(window.innerWidth  * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);

      gl.useProgram(prog);
      gl.uniform2f(U.uResolution, canvas.width, canvas.height);

      gl.useProgram(glassProg);
      gl.uniform2f(GU.uResolution, canvas.width, canvas.height);

      createFBO(canvas.width, canvas.height);
    }
    window.addEventListener('resize', resize);
    resize();

    /* ── Render loop ── */
    let raf;
    function frame(t) {
      raf = requestAnimationFrame(frame);

      if (CFG.glass) {
        // Step 1: Render scene to framebuffer
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(prog);
        gl.uniform1f(U.uTime, t * 0.001);
        gl.bindVertexArray(vao);
        gl.drawArrays(gl.TRIANGLES, 0, 3);

        // Step 2: Render framebuffer texture with glass shader to screen
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(glassProg);
        // radius size based on viewport height, scaled by glassSize relative to 0.46
        gl.uniform1f(GU.uRadius,     0.46 * CFG.glassSize * Math.min(canvas.width, canvas.height));
        gl.uniform1f(GU.uRefraction, CFG.refraction);
        gl.uniform1f(GU.uDispersion, CFG.dispersion);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, fboTexture);

        gl.bindVertexArray(vao);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      } else {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(prog);
        gl.uniform1f(U.uTime, t * 0.001);
        gl.bindVertexArray(vao);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
    }
    raf = requestAnimationFrame(frame);

    window.addEventListener('unload', () => {
      cancelAnimationFrame(raf);
      gl.deleteVertexArray(vao);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      gl.deleteProgram(glassProg);
      if (fbo) gl.deleteFramebuffer(fbo);
      if (fboTexture) gl.deleteTexture(fboTexture);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
