import { motion } from "framer-motion";

import { RoundedStar } from "@/components/Star";
import { intensityColor } from "@/lib/utils";

export const WATER_MAX_COUNT = 30;

export const BOTTLE_SHAPE_PATH =
  "M85 18 h30 v38 c0 8 8 12 20 14 c26 4 42 18 42 40 v135 c0 22 -18 40 -40 40 h-54 c-22 0 -40 -18 -40 -40 v-135 c0 -22 16 -36 42 -40 c12 -2 20 -6 20 -14 v-38z";

export function waterLevelPercent(count: number): number {
  const capped = Math.min(count, WATER_MAX_COUNT);
  return Math.round(15 + (capped / WATER_MAX_COUNT) * 80);
}

const MAX_BALLS = 40;
const COLS = 4;

function ballPosition(index: number): { x: number; y: number; r: number } {
  const row = Math.floor(index / COLS);
  const col = index % COLS;
  const x = 58 + col * 27 + (row % 2) * 13;
  const y = 268 - row * 30;
  return { x, y, r: 9 };
}

export function Bottle({
  logs,
  onOpenForm,
}: {
  logs: { intensity: number }[];
  onOpenForm: () => void;
}) {
  const count = logs.length;
  const percent = waterLevelPercent(count);
  const waterTop = 285 - (percent / 100) * 200;
  const shown = logs.slice(-MAX_BALLS);

  return (
    <div className="flex flex-col items-center gap-5">
      <button
        type="button"
        onClick={onOpenForm}
        className="group relative outline-none"
        aria-label="扔一颗星星"
      >
        <svg
          viewBox="0 0 200 320"
          className="h-[360px] w-[230px] drop-shadow-[0_20px_50px_rgba(251,191,36,0.15)] transition duration-500 group-hover:drop-shadow-[0_24px_60px_rgba(251,191,36,0.25)] sm:h-[420px] sm:w-[270px]"
          data-testid="bottle"
        >
          <defs>
            <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f6d365" stopOpacity="0.45" />
              <stop offset="60%" stopColor="#fbbf24" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#fb923c" stopOpacity="0.75" />
            </linearGradient>
            <linearGradient id="glassGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.18" />
              <stop offset="35%" stopColor="#ffffff" stopOpacity="0.04" />
              <stop offset="65%" stopColor="#ffffff" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.14" />
            </linearGradient>
            <linearGradient id="corkGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d4ab7c" />
              <stop offset="50%" stopColor="#b98d5f" />
              <stop offset="100%" stopColor="#9d7a52" />
            </linearGradient>
            <filter id="starGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <clipPath id="bottleClip">
              <path d={BOTTLE_SHAPE_PATH} />
            </clipPath>
          </defs>

          {/* 瓶底阴影 */}
          <ellipse cx="100" cy="305" rx="52" ry="8" fill="rgba(0,0,0,0.3)" />

          {/* 瓶身轮廓 */}
          <path
            d={BOTTLE_SHAPE_PATH}
            fill="none"
            stroke="rgba(255,255,255,0.32)"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* 木塞 */}
          <rect x="88" y="6" width="24" height="16" rx="3" fill="url(#corkGrad)" />
          <rect x="86" y="20" width="28" height="8" rx="2" fill="rgba(196,154,108,0.9)" />

          <g clipPath="url(#bottleClip)">
            {/* 液体 */}
            <motion.rect
              x="42"
              width="116"
              fill="url(#waterGrad)"
              initial={false}
              animate={{ y: waterTop, height: 285 - waterTop }}
              transition={{ type: "spring", stiffness: 60, damping: 16 }}
              data-testid="water"
              data-level={percent}
            />

            {/* 水面高光 */}
            <motion.ellipse
              cx="100"
              fill="rgba(255,255,255,0.25)"
              rx="56"
              ry="3"
              initial={false}
              animate={{ cy: waterTop }}
              transition={{ type: "spring", stiffness: 60, damping: 16 }}
            />

            {/* 星星小球 */}
            {shown.map((log, i) => {
              const { x, y, r } = ballPosition(shown.length - 1 - i);
              return (
                <motion.g
                  key={shown.length - 1 - i}
                  initial={{ cy: 20, opacity: 0, scale: 0.5 }}
                  animate={{ cy: y, opacity: 1, scale: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 140,
                    damping: 11,
                    delay: i * 0.06,
                  }}
                  data-testid={`ball-${shown.length - 1 - i}`}
                >
                  <g filter="url(#starGlow)" transform={`translate(${x}, ${y})`}>
                    <RoundedStar size={r * 2} color={intensityColor(log.intensity)} />
                  </g>
                </motion.g>
              );
            })}
          </g>

          {/* 玻璃高光 */}
          <rect
            x="44"
            y="75"
            width="112"
            height="212"
            rx="12"
            fill="url(#glassGrad)"
          />
          <path
            d="M52 85 Q55 170 52 260"
            fill="none"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M148 85 Q145 170 148 260"
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {count > MAX_BALLS && (
            <text
              x="100"
              y="150"
              textAnchor="middle"
              className="fill-milk text-[14px] font-semibold"
            >
              +{count - MAX_BALLS}
            </text>
          )}
        </svg>

        <span className="pointer-events-none absolute left-1/2 top-[6px] -translate-x-1/2 rounded-full bg-star-gold/15 px-3 py-1 text-xs font-medium text-star-gold ring-1 ring-star-gold/30 backdrop-blur-md transition group-hover:scale-105 group-hover:bg-star-gold/25">
          ✨ 扔一颗星星
        </span>
      </button>

      <p className="text-sm text-milk-dim">
        瓶内 <span className="font-semibold text-star-amber">{count}</span> 颗星星 · 星光{" "}
        <span className="font-semibold text-star-gold">{percent}%</span>
      </p>
    </div>
  );
}
