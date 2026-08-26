import { motion } from "framer-motion";

import { RoundedStar } from "@/components/Star";
import { intensityColor } from "@/lib/utils";

export const WATER_MAX_COUNT = 30;

// 软萌陪伴布丁瓶造型：矮胖圆鼓瓶身（x28-172, y~82-276）+ 翻卷圆口（y82）+ 严密木塞 + 便签吊牌(左) + 月亮吊坠(右)
export const BOTTLE_SHAPE_PATH =
  "M72 82 H128 V98 C145 106 172 135 172 205 C172 258 145 276 100 276 C55 276 28 258 28 205 C28 135 55 106 72 98 Z";

export function waterLevelPercent(count: number): number {
  const capped = Math.min(count, WATER_MAX_COUNT);
  return Math.round(15 + (capped / WATER_MAX_COUNT) * 80);
}

const MAX_BALLS = 40;
const COLS = 5;

function ballPosition(index: number): { x: number; y: number; r: number } {
  const row = Math.floor(index / COLS);
  const col = index % COLS;
  const x = 52 + col * 24 + (row % 2) * 12;
  const y = 258 - row * 22;
  return { x, y, r: 8.5 };
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
  const waterBottom = 276;
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
            <style>{`
              @keyframes tagSway {
                0%, 100% { transform: rotate(0deg); }
                50% { transform: rotate(-7deg); }
              }
              @keyframes moonSway {
                0%, 100% { transform: rotate(0deg); }
                50% { transform: rotate(8deg); }
              }
              .sway-tag {
                transform-origin: 68px 98px;
                animation: tagSway 4.5s ease-in-out infinite;
              }
              .sway-moon {
                transform-origin: 132px 98px;
                animation: moonSway 4s ease-in-out infinite;
              }
            `}</style>
            <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fde68a" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0.85" />
            </linearGradient>
            <linearGradient id="glassGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
              <stop offset="35%" stopColor="#ffffff" stopOpacity="0.06" />
              <stop offset="65%" stopColor="#3b2b68" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id="corkGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#dfba8f" />
              <stop offset="50%" stopColor="#c19363" />
              <stop offset="100%" stopColor="#8d6238" />
            </linearGradient>
            <linearGradient id="goldPendant" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fff0ad" />
              <stop offset="60%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#b45309" />
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

          {/* 瓶底柔和阴影 */}
          <ellipse cx="100" cy="292" rx="60" ry="9" fill="rgba(0,0,0,0.36)" />

          <g clipPath="url(#bottleClip)">
            {/* 玻璃体积感 */}
            <rect x="20" y="70" width="160" height="220" fill="url(#glassGrad)" />

            {/* 插入瓶颈内部的木塞下段（隐约透光可见） */}
            <path d="M78 78 L81 94 Q100 97 119 94 L122 78 Z" fill="#b98d5f" opacity="0.6" />

            {/* 液体 */}
            <motion.rect
              x="25"
              width="150"
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
              fill="rgba(255,255,255,0.35)"
              rx="62"
              ry="4.5"
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
                    delay: i * 0.05,
                  }}
                  data-testid={`ball-${shown.length - 1 - i}`}
                >
                  <g filter="url(#starGlow)" transform={`translate(${x}, ${y})`}>
                    <RoundedStar size={r * 2} color={intensityColor(log.intensity)} />
                  </g>
                </motion.g>
              );
            })}

            {/* 奶萌饱满弧光 */}
            <path
              d="M42 150 C38 190 48 238 72 262"
              fill="none"
              stroke="rgba(255,255,255,0.4)"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle cx="56" cy="138" r="4" fill="rgba(255,255,255,0.5)" />
          </g>

          {/* 瓶身轮廓置于最上层，保证外沿清晰 */}
          <path
            d={BOTTLE_SHAPE_PATH}
            fill="none"
            stroke="rgba(255,255,255,0.36)"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* 翻卷水晶瓶口 (Rolled Lip) */}
          <ellipse
            cx="100"
            cy="82"
            rx="28"
            ry="5.5"
            fill="none"
            stroke="rgba(255,255,255,0.65)"
            strokeWidth="2"
          />

          {/* 严丝合缝盖在瓶口上的大圆润蘑菇木塞 */}
          {/* 木塞上部圆顶 */}
          <path
            d="M74 80 C74 58 126 58 126 80 Q100 85 74 80 Z"
            fill="url(#corkGrad)"
          />
          {/* 木塞顶部高光弧 */}
          <ellipse cx="100" cy="67" rx="22" ry="7" fill="#e7c8a3" />
          {/* 木塞与瓶口贴合处压边阴影 */}
          <path
            d="M74 80 Q100 85 126 80"
            fill="none"
            stroke="#6e4720"
            strokeWidth="1.5"
            opacity="0.7"
          />

          {/* 瓶颈系绳 */}
          <path d="M68 98 Q100 102 132 98" fill="none" stroke="#d97706" strokeWidth="1.8" />

          {/* 左侧：软萌便签吊牌 (Tag - 微微摇摆) */}
          <g className="sway-tag">
            <path
              d="M68 98 Q58 108 52 118"
              fill="none"
              stroke="#d97706"
              strokeWidth="1.5"
              strokeDasharray="2 1"
            />
            <g transform="translate(40, 114) rotate(-8)">
              <rect
                x="0"
                y="0"
                width="22"
                height="32"
                rx="4"
                fill="#faf6ed"
                className="drop-shadow-md"
              />
              <circle cx="11" cy="6" r="2" fill="#d97706" />
              <line x1="5" y1="14" x2="17" y2="14" stroke="#c9bfa8" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="5" y1="20" x2="15" y2="20" stroke="#c9bfa8" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M11 26 L12 24 L13 26 Z" fill="#fbbf24" />
            </g>
          </g>

          {/* 右侧：微光小金月亮吊坠 (微微摇摆) */}
          <g className="sway-moon">
            <path
              d="M132 98 Q142 110 140 124"
              fill="none"
              stroke="#d97706"
              strokeWidth="1.5"
              strokeDasharray="2 1"
            />
            <path
              d="M140 124 A 7.5 7.5 0 1 1 133 134 A 6 6 0 1 0 140 124 Z"
              fill="url(#goldPendant)"
              filter="drop-shadow(0 0 3px rgba(245,158,11,0.65))"
            />
          </g>

          {count > MAX_BALLS && (
            <text
              x="100"
              y="175"
              textAnchor="middle"
              className="fill-milk text-[14px] font-semibold drop-shadow"
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
        瓶内 <span className="font-semibold text-star-amber">{count}</span> 颗星星
      </p>
    </div>
  );
}
