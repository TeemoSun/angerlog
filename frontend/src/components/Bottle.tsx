import { motion } from "framer-motion";
import { useRef, useState } from "react";

import {
  BottleGraphicDef,
  BottleReflections,
  BottleStructure,
  DEFAULT_BOTTLE_STYLE,
  getGlassAndWaterUrls,
  getStarPositions,
  getWaterGeometry,
} from "@/components/BottleStyles";
import { RoundedStar } from "@/components/Star";
import { intensityColor } from "@/lib/utils";

export const WATER_MAX_COUNT = 30;

export function waterLevelPercent(count: number): number {
  const capped = Math.min(count, WATER_MAX_COUNT);
  return Math.round(15 + (capped / WATER_MAX_COUNT) * 80);
}

const MAX_BALLS = 40;

export function Bottle({
  logs,
  onOpenForm,
  onOpenStyleSelector,
  styleKey = DEFAULT_BOTTLE_STYLE,
}: {
  logs: { intensity: number }[];
  onOpenForm: () => void;
  onOpenStyleSelector?: () => void;
  styleKey?: string;
}) {
  const count = logs.length;
  const percent = waterLevelPercent(count);
  const geom = getWaterGeometry(styleKey, percent);
  const { glassUrl, waterUrl, clipUrl } = getGlassAndWaterUrls(styleKey);
  const shown = logs.slice(-MAX_BALLS);

  // 长按手势状态管理 (500ms 触发切换弹窗，短按触发写信)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = useRef(false);
  const [isPressing, setIsPressing] = useState(false);

  const handlePointerDown = () => {
    isLongPressRef.current = false;
    setIsPressing(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      setIsPressing(false);
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        try {
          navigator.vibrate(50);
        } catch {
          // ignore
        }
      }
      onOpenStyleSelector?.();
    }, 500);
  };

  const handlePointerUp = () => {
    setIsPressing(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!isLongPressRef.current) {
      onOpenForm();
    }
  };

  const handlePointerCancel = () => {
    setIsPressing(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  return (
    <div className="flex flex-col items-center gap-5 select-none">
      <div
        role="button"
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onPointerLeave={handlePointerCancel}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpenForm();
          }
        }}
        className="group relative cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-star-gold/50 rounded-2xl"
        aria-label="轻按扔一颗星星，长按更换瓶子造型"
      >
        <motion.div
          animate={{ scale: isPressing ? 0.96 : 1 }}
          transition={{ duration: 0.15 }}
        >
          <svg
            viewBox="0 0 200 320"
            preserveAspectRatio="xMidYMid meet"
            className="h-[360px] w-auto max-w-full drop-shadow-[0_20px_50px_rgba(251,191,36,0.15)] transition duration-500 group-hover:drop-shadow-[0_24px_60px_rgba(251,191,36,0.25)] sm:h-[420px]"
            data-testid="bottle"
          >
            <BottleGraphicDef styleKey={styleKey} />
            <BottleStructure styleKey={styleKey} />

            <g clipPath={clipUrl}>
              {/* 玻璃通透渐变底 */}
              <rect x="15" y="45" width="170" height="245" fill={glassUrl} />

              {/* 液体层 */}
              <motion.rect
                x={geom.x}
                width={geom.width}
                fill={waterUrl}
                initial={false}
                animate={{ y: geom.top, height: geom.height }}
                transition={{ type: "spring", stiffness: 60, damping: 16 }}
                data-testid="water"
                data-level={percent}
              />

              {/* 水面反光圆环 */}
              <motion.ellipse
                cx="100"
                fill="rgba(255,255,255,0.35)"
                rx={geom.lipRx}
                ry={geom.lipRy}
                initial={false}
                animate={{ cy: geom.lipCy }}
                transition={{ type: "spring", stiffness: 60, damping: 16 }}
              />

              {/* 星星小球 */}
              {shown.map((log, i) => {
                const { x, y, r } = getStarPositions(
                  styleKey,
                  shown.length - 1 - i,
                );
                return (
                  <motion.g
                    key={shown.length - 1 - i}
                    initial={{ cy: 20, opacity: 0, scale: 0.5 }}
                    animate={{ cy: y, opacity: 1, scale: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 140,
                      damping: 11,
                      delay: i * 0.04,
                    }}
                    data-testid={`ball-${shown.length - 1 - i}`}
                  >
                    <g
                      filter="url(#starGlow)"
                      transform={`translate(${x}, ${y})`}
                    >
                      <RoundedStar
                        size={r * 2}
                        color={intensityColor(log.intensity)}
                      />
                    </g>
                  </motion.g>
                );
              })}

              {/* 瓶身特异反光层 */}
              <BottleReflections styleKey={styleKey} />
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
        </motion.div>

        {/* 顶部悬浮操作提示标签 */}
        <div className="pointer-events-none absolute left-1/2 top-[6px] -translate-x-1/2 flex items-center gap-1.5 whitespace-nowrap rounded-full bg-star-gold/15 px-3.5 py-1 text-xs font-medium text-star-gold ring-1 ring-star-gold/30 backdrop-blur-md transition group-hover:scale-105 group-hover:bg-star-gold/25 shadow-lg">
          <span>✨ 轻按投星 · 长按换瓶</span>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-milk-dim">
        <p>
          瓶内 <span className="font-semibold text-star-amber">{count}</span> 颗星星
        </p>
        <span className="text-white/20">|</span>
        <button
          type="button"
          onClick={onOpenStyleSelector}
          className="text-xs text-camel hover:text-star-gold transition underline underline-offset-4 decoration-camel/40 hover:decoration-star-gold"
        >
          更换瓶身
        </button>
      </div>
    </div>
  );
}
