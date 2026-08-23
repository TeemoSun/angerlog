import { motion } from "framer-motion";

import { RoundedStar } from "@/components/Star";
import { intensityColor } from "@/lib/utils";

export const WATER_MAX_COUNT = 30;

// 敦实可爱造型：大圆角矩形瓶身（x30-170, y~96-280）+ 短圆颈（y62-78）+ 顶部圆形木塞
export const BOTTLE_SHAPE_PATH =
  "M80 62 h40 v16 c0 12 14 14 24 18 c16 8 26 16 26 34 v110 c0 24 -20 40 -45 40 h-50 c-25 0 -45 -16 -45 -40 v-110 c0 -18 10 -26 26 -34 c10 -4 24 -6 24 -18 v-16 z";

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
  const y = 262 - row * 26;
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
  const waterBottom = 279;
  const waterTop = waterBottom - (percent / 100) * 175;
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
          preserveAspectRatio="xMidYMid meet"
          className="h-[360px] w-auto max-w-full drop-shadow-[0_20px_50px_rgba(251,191,36,0.15)] transition duration-500 group-hover:drop-shadow-[0_24px_60px_rgba(251,191,36,0.25)] sm:h-[420px]"
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
          <ellipse cx="100" cy="298" rx="58" ry="8" fill="rgba(0,0,0,0.3)" />

          <g clipPath="url(#bottleClip)">
            {/* 玻璃体积感：随瓶身轮廓裁剪，避免出现硬边内框 */}
            <rect x="25" y="55" width="150" height="235" fill="url(#glassGrad)" />

            {/* 液体 */}
            <motion.rect
              x="42"
              width="116"
              fill="url(#waterGrad)"
              initial={false}
              animate={{ y: waterTop, height: waterBottom - waterTop }}
              transition={{ type: "spring", stiffness: 60, damping: 16 }}
              data-testid="water"
              data-level={percent}
            />

            {/* 水面高光 */}
            <motion.ellipse
              cx="100"
              fill="rgba(255,255,255,0.25)"
              rx="54"
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

            {/* 两侧极细竖向高光，点到即止 */}
            <path
              d="M48 135 Q51 190 48 248"
              fill="none"
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M152 135 Q149 190 152 248"
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </g>

          {/* 瓶身轮廓置于最上层，保证瓶口/瓶底边缘清晰 */}
          <path
            d={BOTTLE_SHAPE_PATH}
            fill="none"
            stroke="rgba(255,255,255,0.32)"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* 圆形木塞 */}
          <rect x="82" y="36" width="36" height="18" rx="9" fill="url(#corkGrad)" />
          <rect x="77" y="50" width="46" height="11" rx="5.5" fill="rgba(196,154,108,0.9)" />

          {count > MAX_BALLS && (
            <text
              x="100"
              y="185"
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
