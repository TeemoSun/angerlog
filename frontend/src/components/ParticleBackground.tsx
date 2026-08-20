import { motion } from "framer-motion";

const PARTICLES = [
  { x: 12, y: 20, size: 3, duration: 11, delay: 0 },
  { x: 30, y: 70, size: 2, duration: 14, delay: 1.2 },
  { x: 52, y: 35, size: 3.5, duration: 10, delay: 2.1 },
  { x: 72, y: 80, size: 2.5, duration: 13, delay: 0.6 },
  { x: 88, y: 15, size: 2, duration: 12, delay: 3.4 },
  { x: 20, y: 88, size: 2, duration: 15, delay: 4.2 },
  { x: 65, y: 55, size: 3, duration: 12.5, delay: 5.0 },
  { x: 90, y: 45, size: 2.5, duration: 11.5, delay: 2.8 },
];

export function ParticleBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      {PARTICLES.map((p, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-amber-200/20 blur-[1px]"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
          }}
          animate={{
            y: [0, -24, 0],
            x: [0, 8, 0],
            opacity: [0.15, 0.45, 0.15],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
