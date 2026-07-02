import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  shape: "rect" | "circle";
}

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ec4899", "#06b6d4", "#8b5cf6", "#f97316"];

export function Confetti({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    particlesRef.current = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: -20,
      vx: (Math.random() - 0.5) * 6,
      vy: Math.random() * 4 + 2,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: Math.random() * 10 + 5,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 8,
      opacity: 1,
      shape: Math.random() > 0.5 ? "rect" : "circle",
    }));

    let frame = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;
      particlesRef.current = particlesRef.current.filter(p => p.opacity > 0.01);

      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.12;
        p.rotation += p.rotationSpeed;
        if (p.y > canvas.height * 0.7) p.opacity -= 0.018;

        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        if (p.shape === "rect") {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      if (particlesRef.current.length > 0) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-40 pointer-events-none"
      style={{ width: "100vw", height: "100vh" }}
    />
  );
}
