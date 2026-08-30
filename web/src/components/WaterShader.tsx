"use client";

import { useEffect, useRef } from "react";

type Props = {
  shallow?: [number, number, number];
  deep?: [number, number, number];
  className?: string;
};

// Ambient animated water background -- purely decorative, fails silently
// with no WebGL rather than breaking the page.
export default function WaterShader({ shallow = [0.11, 0.55, 0.6], deep = [0.059, 0.145, 0.216], className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function syncSize() {
      if (!canvas) return;
      const w = canvas.clientWidth || 1280;
      const h = canvas.clientHeight || 220;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    }
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(syncSize) : null;
    observer?.observe(canvas);
    syncSize();

    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) return;
    const glCtx = gl as WebGLRenderingContext;

    const vs = `attribute vec2 a_position; varying vec2 v_uv;
      void main() { v_uv = a_position * 0.5 + 0.5; gl_Position = vec4(a_position, 0.0, 1.0); }`;
    const fs = `precision highp float;
      uniform float u_time; varying vec2 v_uv;
      vec3 permute(vec3 x){return mod(((x*34.0)+1.0)*x,289.0);}
      float snoise(vec2 v){
        const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
        vec2 i=floor(v+dot(v,C.yy)); vec2 x0=v-i+dot(i,C.xx);
        vec2 i1=(x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0);
        vec4 x12=x0.xyxy+C.xxzz; x12.xy-=i1; i=mod(i,289.0);
        vec3 p=permute(permute(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));
        vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0);
        m=m*m; m=m*m;
        vec3 x=2.0*fract(p*C.www)-1.0; vec3 h=abs(x)-0.5; vec3 a0=x-floor(x+0.5);
        float m1=1.79284291400159-0.85373472095314*(a0.x*a0.x+h.x*h.x);
        float m2=1.79284291400159-0.85373472095314*(a0.y*a0.y+h.y*h.y);
        float m3=1.79284291400159-0.85373472095314*(a0.z*a0.z+h.z*h.z);
        vec3 g; g.x=a0.x*x0.x+h.x*x0.y; g.yz=a0.yz*x12.xz+h.yz*x12.yw;
        return 130.0*dot(m*vec3(m1,m2,m3),g);
      }
      void main() {
        vec2 uv = v_uv;
        vec3 shallow = vec3(${shallow[0]}, ${shallow[1]}, ${shallow[2]});
        vec3 deep = vec3(${deep[0]}, ${deep[1]}, ${deep[2]});
        vec3 white = vec3(1.0);
        float noise = snoise(uv * 4.0 + u_time * 0.1);
        float wave = sin(uv.y * 12.0 + u_time * 1.5 + noise) * 0.05;
        vec3 color = mix(shallow, deep, uv.y + wave);
        float ripple = smoothstep(0.45, 0.5, sin(uv.y * 40.0 + u_time * 2.0 + noise * 2.0));
        color = mix(color, white, ripple * 0.12 * (1.0 - uv.y));
        gl_FragColor = vec4(color, 1.0);
      }`;
    function compile(type: number, src: string) {
      const s = glCtx.createShader(type)!;
      glCtx.shaderSource(s, src);
      glCtx.compileShader(s);
      return s;
    }
    const prog = glCtx.createProgram()!;
    glCtx.attachShader(prog, compile(glCtx.VERTEX_SHADER, vs));
    glCtx.attachShader(prog, compile(glCtx.FRAGMENT_SHADER, fs));
    glCtx.linkProgram(prog);
    glCtx.useProgram(prog);
    const buf = glCtx.createBuffer();
    glCtx.bindBuffer(glCtx.ARRAY_BUFFER, buf);
    glCtx.bufferData(glCtx.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), glCtx.STATIC_DRAW);
    const posLoc = glCtx.getAttribLocation(prog, "a_position");
    glCtx.enableVertexAttribArray(posLoc);
    glCtx.vertexAttribPointer(posLoc, 2, glCtx.FLOAT, false, 0, 0);
    const uTime = glCtx.getUniformLocation(prog, "u_time");

    let raf = 0;
    function render(t: number) {
      if (!observer) syncSize();
      glCtx.viewport(0, 0, canvas!.width, canvas!.height);
      if (uTime) glCtx.uniform1f(uTime, t * 0.001);
      glCtx.drawArrays(glCtx.TRIANGLE_STRIP, 0, 4);
      raf = requestAnimationFrame(render);
    }
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      observer?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className={className} style={{ display: "block", width: "100%", height: "100%" }} />;
}
