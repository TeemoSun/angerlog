import { motion } from "framer-motion";

interface Star {
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  opacity: [number, number, number];
}

const STARS: Star[] = [
  { x: 8, y: 12, size: 2.5, duration: 9, delay: 0, opacity: [0.2, 0.7, 0.2] },
  { x: 18, y: 28, size: 1.5, duration: 12, delay: 1.2, opacity: [0.15, 0.5, 0.15] },
  { x: 26, y: 8, size: 3, duration: 10, delay: 2.1, opacity: [0.25, 0.8, 0.25] },
  { x: 38, y: 42, size: 2, duration: 14, delay: 0.6, opacity: [0.2, 0.55, 0.2] },
  { x: 46, y: 18, size: 2.5, duration: 11, delay: 3.4, opacity: [0.2, 0.65, 0.2] },
  { x: 55, y: 55, size: 1.8, duration: 13, delay: 4.2, opacity: [0.15, 0.45, 0.15] },
  { x: 64, y: 10, size: 3.5, duration: 10, delay: 5.0, opacity: [0.3, 0.85, 0.3] },
  { x: 72, y: 36, size: 2, duration: 12, delay: 2.8, opacity: [0.2, 0.6, 0.2] },
  { x: 82, y: 62, size: 2.5, duration: 15, delay: 1.8, opacity: [0.2, 0.5, 0.2] },
  { x: 88, y: 22, size: 1.5, duration: 11, delay: 3.9, opacity: [0.15, 0.4, 0.15] },
  { x: 92, y: 48, size: 2, duration: 13, delay: 0.3, opacity: [0.2, 0.55, 0.2] },
  { x: 14, y: 68, size: 2, duration: 10, delay: 4.5, opacity: [0.2, 0.5, 0.2] },
  { x: 30, y: 78, size: 1.5, duration: 12, delay: 2.2, opacity: [0.15, 0.4, 0.15] },
  { x: 58, y: 84, size: 2.5, duration: 14, delay: 1.1, opacity: [0.2, 0.6, 0.2] },
  { x: 76, y: 74, size: 1.8, duration: 11, delay: 3.1, opacity: [0.15, 0.45, 0.15] },
  { x: 94, y: 86, size: 2, duration: 13, delay: 5.2, opacity: [0.2, 0.5, 0.2] },
  { x: 5, y: 45, size: 2, duration: 10, delay: 0.9, opacity: [0.2, 0.55, 0.2] },
  { x: 50, y: 5, size: 2.2, duration: 12, delay: 4.8, opacity: [0.2, 0.6, 0.2] },
  { x: 96, y: 12, size: 1.8, duration: 9, delay: 2.5, opacity: [0.15, 0.5, 0.15] },
  { x: 42, y: 92, size: 2, duration: 11, delay: 3.6, opacity: [0.2, 0.55, 0.2] },
];

const SHOOTING_STARS = [
  { x: "10%", y: "15%", duration: 2.5, delay: 4 },
  { x: "70%", y: "8%", duration: 2.2, delay: 12 },
  { x: "40%", y: "25%", duration: 2.8, delay: 22 },
];

export function ParticleBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      {STARS.map((p, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: i % 3 === 0
              ? "rgba(246, 211, 101, 0.9)"
              : "rgba(255, 255, 255, 0.8)",
            boxShadow: i % 3 === 0
              ? "0 0 6px rgba(246, 211, 101, 0.6)"
              : "0 0 4px rgba(255, 255, 255, 0.4)",
          }}
          animate={{
            y: [0, -16, 0],
            x: [0, 6, 0],
            opacity: p.opacity,
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      {SHOOTING_STARS.map((s, i) => (
        <motion.div
          key={`shoot-${i}`}
          className="absolute h-[1px] w-24 rounded-full bg-gradient-to-r from-transparent via-star-gold/80 to-star-gold"
          style={{ left: s.x, top: s.y, rotate: 34 }}
          initial={{ x: 0, y: 0, opacity: 0 }}
          animate={{
            x: [0, 120, 240],
            y: [0, 80, 160],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: s.duration,
            delay: s.delay,
            repeat: Infinity,
            repeatDelay: 18 + i * 4,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
}
