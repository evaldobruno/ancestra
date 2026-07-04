"use client";

import { useEffect, useRef } from "react";

// Animated "constellation" backdrop: twinkling stars, a family constellation
// that draws itself, and rising golden embers. Purely decorative.
export function NightSky({ constellation = true }: { constellation?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let W = 0, H = 0, DPR = 1;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    function size() {
      DPR = Math.min(2, window.devicePixelRatio || 1);
      const r = cv.getBoundingClientRect();
      W = r.width; H = r.height;
      cv.width = W * DPR; cv.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    size();
    window.addEventListener("resize", size);

    const stars = Array.from({ length: 110 }, () => ({
      x: Math.random(), y: Math.random(), r: Math.random() * 1.4 + 0.3,
      p: Math.random() * 6.28, s: Math.random() * 0.02 + 0.005,
    }));
    const embers = Array.from({ length: 20 }, () => ({
      x: Math.random(), y: Math.random(), v: Math.random() * 0.0009 + 0.0004,
      r: Math.random() * 2 + 1, a: Math.random(),
    }));
    const nodes = [
      { x: 0.30, y: 0.30, l: "A" }, { x: 0.50, y: 0.24, l: "T" }, { x: 0.70, y: 0.30, l: "L" },
      { x: 0.40, y: 0.55, l: "B" }, { x: 0.60, y: 0.55, l: "M" }, { x: 0.50, y: 0.80, l: "C" },
    ];
    const links = [[0, 3], [1, 3], [1, 4], [2, 4], [3, 5], [4, 5]];
    let t = 0;

    function frame() {
      t++;
      ctx.clearRect(0, 0, W, H);
      stars.forEach((s) => {
        s.p += s.s; const tw = 0.5 + 0.5 * Math.sin(s.p);
        ctx.globalAlpha = 0.25 + tw * 0.6; ctx.fillStyle = "#dfe8ff";
        ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.r, 0, 6.28); ctx.fill();
      });
      ctx.globalAlpha = 1;

      if (constellation) {
        const cx = W * 0.5, cy = H * 0.52;
        const sx = Math.min(W * 0.9, 620), sy = 260, ox = cx - sx / 2, oy = cy - sy / 2;
        const P = (n: { x: number; y: number }) => ({ x: ox + n.x * sx, y: oy + n.y * sy });
        links.forEach((lk, i) => {
          const a = P(nodes[lk[0]]), b = P(nodes[lk[1]]);
          const prog = Math.max(0, Math.min(1, (t - 30 - i * 10) / 40));
          ctx.strokeStyle = `rgba(212,164,55,${0.15 + 0.25 * prog})`; ctx.lineWidth = 1.4;
          ctx.setLineDash([4, 6]); ctx.lineDashOffset = -t * 0.6;
          ctx.beginPath(); ctx.moveTo(a.x, a.y);
          ctx.lineTo(a.x + (b.x - a.x) * prog, a.y + (b.y - a.y) * prog); ctx.stroke();
        });
        ctx.setLineDash([]);
        nodes.forEach((n, i) => {
          const p = P(n); const pulse = 1 + 0.12 * Math.sin(t * 0.05 + i); const r = 15 * pulse;
          const appear = Math.max(0, Math.min(1, (t - i * 8) / 30));
          ctx.globalAlpha = appear;
          const g = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, r * 2.4);
          g.addColorStop(0, "rgba(233,199,102,.5)"); g.addColorStop(1, "rgba(233,199,102,0)");
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r * 2.4, 0, 6.28); ctx.fill();
          ctx.fillStyle = "#0b1428"; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 6.28); ctx.fill();
          ctx.lineWidth = 2; ctx.strokeStyle = "#e9c766"; ctx.stroke();
          ctx.fillStyle = "#f6e6b3"; ctx.font = `600 ${Math.round(r)}px system-ui`;
          ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(n.l, p.x, p.y + 1);
          ctx.globalAlpha = 1;
        });
      }

      embers.forEach((e) => {
        e.y -= e.v; e.x += Math.sin((e.y + e.a) * 10) * 0.0004;
        if (e.y < -0.05) { e.y = 1.05; e.x = Math.random(); }
        ctx.globalAlpha = 0.35 + 0.4 * Math.sin(t * 0.05 + e.a * 6);
        ctx.fillStyle = "#f0c866"; ctx.beginPath(); ctx.arc(e.x * W, e.y * H, e.r, 0, 6.28); ctx.fill();
      });
      ctx.globalAlpha = 1;

      if (!reduce) raf = requestAnimationFrame(frame);
    }
    frame();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", size); };
  }, [constellation]);

  return <canvas ref={ref} className="nd-canvas" aria-hidden="true" />;
}
