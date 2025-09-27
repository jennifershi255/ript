// src/Aurora.jsx
import { Renderer, Program, Mesh, Color, Triangle } from "ogl";
import { useEffect, useRef } from "react";
import "./Aurora.css";

const VERT = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAG = `#version 300 es
precision highp float;

// uniforms
uniform float uTime;
uniform float uAmplitude;
uniform vec3 uColorStops[3];
uniform vec2 uResolution;
uniform float uBlend;

out vec4 fragColor;

// Simple noise function
float noise(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

// Smooth noise
float smoothNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    
    return mix(
        mix(noise(i), noise(i + vec2(1.0, 0.0)), f.x),
        mix(noise(i + vec2(0.0, 1.0)), noise(i + vec2(1.0, 1.0)), f.x),
        f.y
    );
}

// Fractal noise
float fractalNoise(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 4; i++) {
        value += smoothNoise(p) * amplitude;
        p *= 2.0;
        amplitude *= 0.5;
    }
    return value;
}

void main() {
    vec2 uv = gl_FragCoord.xy / uResolution.xy;
    vec2 p = uv * 6.0;
    
    // Create flowing aurora effect
    float n1 = fractalNoise(p + vec2(uTime * 0.5, uTime * 0.3));
    float n2 = fractalNoise(p * 0.8 + vec2(-uTime * 0.4, uTime * 0.6));
    float n3 = fractalNoise(p * 1.2 + vec2(uTime * 0.2, -uTime * 0.5));
    
    // Combine noise layers
    float aurora = (n1 + n2 * 0.7 + n3 * 0.5) * uAmplitude;
    
    // Create vertical bands
    float bands = sin(uv.x * 8.0 + uTime) * 0.3 + 0.7;
    aurora *= bands;
    
    // Fade edges
    float fade = smoothstep(0.0, 0.3, uv.y) * smoothstep(1.0, 0.7, uv.y);
    aurora *= fade;
    
    // Color mixing
    vec3 color = mix(uColorStops[0], uColorStops[1], aurora);
    color = mix(color, uColorStops[2], aurora * 0.5);
    
    // Apply blend factor
    fragColor = vec4(color, aurora * uBlend);
}`;

export default function Aurora(props) {
  const { colorStops = ['#5227FF', '#7cff67', '#5227FF'], amplitude = 1.0, blend = 0.5 } = props;
  const propsRef = useRef(props);
  propsRef.current = props;

  const ctnDom = useRef(null);

  useEffect(() => {
    const ctn = ctnDom.current;
    if (!ctn) return;

    const renderer = new Renderer({
      alpha: true,
      premultipliedAlpha: true,
      antialias: true,
    });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.canvas.style.backgroundColor = "transparent";

    let program;

    function resize() {
      if (!ctn) return;
      const width = ctn.offsetWidth;
      const height = ctn.offsetHeight;
      renderer.setSize(width, height);
      if (program) {
        program.uniforms.uResolution.value = [width, height];
      }
    }
    window.addEventListener("resize", resize);

    const geometry = new Triangle(gl);
    if (geometry.attributes.uv) {
      delete geometry.attributes.uv;
    }

    const colorStopsArray = colorStops.map((hex) => {
      const c = new Color(hex);
      return [c.r, c.g, c.b];
    });

    program = new Program(gl, {
      vertex: VERT,
      fragment: FRAG,
      uniforms: {
        uTime: { value: 0 },
        uAmplitude: { value: amplitude },
        uColorStops: { value: colorStopsArray },
        uResolution: { value: [ctn.offsetWidth, ctn.offsetHeight] },
        uBlend: { value: blend },
      },
    });

    const mesh = new Mesh(gl, { geometry, program });
    ctn.appendChild(gl.canvas);

    let animateId = 0;
    const update = (t) => {
      animateId = requestAnimationFrame(update);
      const { time = t * 0.01, speed = 1.0 } = propsRef.current;
      program.uniforms.uTime.value = time * speed * 0.1;
      program.uniforms.uAmplitude.value = propsRef.current.amplitude ?? 1.0;
      program.uniforms.uBlend.value = propsRef.current.blend ?? blend;
      const stops = propsRef.current.colorStops ?? colorStops;
      program.uniforms.uColorStops.value = stops.map((hex) => {
        const c = new Color(hex);
        return [c.r, c.g, c.b];
      });
      renderer.render({ scene: mesh });
    };
    animateId = requestAnimationFrame(update);

    resize();

    return () => {
      cancelAnimationFrame(animateId);
      window.removeEventListener("resize", resize);
      if (ctn && gl.canvas.parentNode === ctn) {
        ctn.removeChild(gl.canvas);
      }
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [amplitude]);

  return (
    <div className="aurora-wrapper">
      <div ref={ctnDom} className="aurora-container" />
    </div>
  );
  
}
