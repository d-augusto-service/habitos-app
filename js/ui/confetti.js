// Confetes em canvas (leve, 60fps). Não faz nada se o utilizador pediu "reduzir movimento".
import { reduceMotion } from '../utils.js';
const COLORS = ['#F6C026', '#FFE27A', '#FF8A3D', '#FF5D73', '#4D9DFF', '#27D3C3', '#ffffff'];
let parts = [], raf = 0, cv, ctx;

export function confetti({ x = innerWidth / 2, y = innerHeight * 0.35, count = 90, power = 1 } = {}) {
  if (reduceMotion()) return;
  cv = cv || document.getElementById('confetti');
  if (!cv) return;
  ctx = ctx || cv.getContext('2d');
  const dpr = Math.min(devicePixelRatio || 1, 2);
  cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  for (let i = 0; i < count && parts.length < 300; i++) {
    const a = Math.random() * Math.PI * 2, v = (4 + Math.random() * 8) * power;
    parts.push({
      x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 5 * power,
      w: 5 + Math.random() * 6, h: 3 + Math.random() * 5, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
      c: COLORS[(Math.random() * COLORS.length) | 0], life: 1
    });
  }
  if (!raf) raf = requestAnimationFrame(tick);
}
function tick() {
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  parts = parts.filter((p) => p.life > 0 && p.y < innerHeight + 40);
  for (const p of parts) {
    p.vy += 0.28; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life -= 0.006;
    ctx.save(); ctx.globalAlpha = Math.max(p.life, 0); ctx.translate(p.x, p.y); ctx.rotate(p.r);
    ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
  }
  raf = parts.length ? requestAnimationFrame(tick) : (ctx.clearRect(0, 0, innerWidth, innerHeight), 0);
}
