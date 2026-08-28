import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { useState } from "react";

import {
  BOTTLE_STYLES,
  BottleGraphicDef,
  BottleReflections,
  BottleStructure,
  getGlassAndWaterUrls,
  getStarPositions,
  getWaterGeometry,
} from "@/components/BottleStyles";
import { RoundedStar } from "@/components/Star";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { intensityColor } from "@/lib/utils";

interface BottleStyleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStyle: string;
  onSelectStyle: (styleKey: string) => void;
}

export function BottleStyleDialog({
  open,
  onOpenChange,
  currentStyle,
  onSelectStyle,
}: BottleStyleDialogProps) {
  const [filter, setFilter] = useState<string>("all");

  const filteredStyles = BOTTLE_STYLES.filter((item) => {
    if (filter === "all") return true;
    return item.category === filter;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] w-[95vw] max-w-3xl overflow-hidden border-white/15 bg-night-800/95 p-0 text-paper shadow-2xl backdrop-blur-2xl sm:max-h-[80vh]">
        <DialogHeader className="border-b border-white/10 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-star-amber/15 text-star-amber">
                <Sparkles size={16} />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-paper sm:text-lg">
                  选择瓶身造型
                </DialogTitle>
                <p className="text-xs text-milk-dim">
                  长按瓶身可随时唤出更换，选择将自动保存到数据库
                </p>
              </div>
            </div>
          </div>

          {/* 分类筛选标签 */}
          <div className="mt-3 flex gap-2 overflow-x-auto text-xs">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`rounded-full px-3 py-1 transition ${
                filter === "all"
                  ? "bg-star-amber/20 font-medium text-star-amber ring-1 ring-star-amber/40"
                  : "bg-white/5 text-milk-dim hover:bg-white/10 hover:text-paper"
              }`}
            >
              全部 ({BOTTLE_STYLES.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("minimal")}
              className={`rounded-full px-3 py-1 transition ${
                filter === "minimal"
                  ? "bg-star-amber/20 font-medium text-star-amber ring-1 ring-star-amber/40"
                  : "bg-white/5 text-milk-dim hover:bg-white/10 hover:text-paper"
              }`}
            >
              极简与自然
            </button>
            <button
              type="button"
              onClick={() => setFilter("healing")}
              className={`rounded-full px-3 py-1 transition ${
                filter === "healing"
                  ? "bg-star-amber/20 font-medium text-star-amber ring-1 ring-star-amber/40"
                  : "bg-white/5 text-milk-dim hover:bg-white/10 hover:text-paper"
              }`}
            >
              经典治愈
            </button>
            <button
              type="button"
              onClick={() => setFilter("magic")}
              className={`rounded-full px-3 py-1 transition ${
                filter === "magic"
                  ? "bg-star-amber/20 font-medium text-star-amber ring-1 ring-star-amber/40"
                  : "bg-white/5 text-milk-dim hover:bg-white/10 hover:text-paper"
              }`}
            >
              魔法与折射
            </button>
          </div>
        </DialogHeader>

        {/* 瓶子卡片展示网格 */}
        <div className="custom-scrollbar max-h-[calc(85vh-130px)] overflow-y-auto p-4 sm:max-h-[calc(80vh-130px)] sm:p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredStyles.map((item) => {
              const isSelected = item.key.toLowerCase() === currentStyle.toLowerCase();

              return (
                <motion.div
                  key={item.key}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    onSelectStyle(item.key);
                    onOpenChange(false);
                  }}
                  className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border p-3.5 transition duration-200 ${
                    isSelected
                      ? "border-star-amber bg-star-amber/[0.08] shadow-[0_0_24px_rgba(251,191,36,0.2)] ring-1 ring-star-amber/60"
                      : "border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]"
                  }`}
                >
                  {/* 选中指示标记 */}
                  {isSelected && (
                    <div className="absolute right-3 top-3 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-star-amber text-night-900 shadow">
                      <Check size={12} strokeWidth={3} />
                    </div>
                  )}

                  {/* 顶部标签 */}
                  <div className="mb-2 flex items-center justify-between">
                    <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-camel">
                      方案 {item.key}
                    </span>
                    <span className="text-[11px] text-milk-dim">{item.badge}</span>
                  </div>

                  {/* 瓶子微缩矢量预览 */}
                  <div className="relative mb-3 flex h-44 items-center justify-center rounded-xl bg-night-900/60 p-2">
                    <MiniBottlePreview styleKey={item.key} />
                  </div>

                  {/* 标题与描述 */}
                  <h4 className="text-sm font-semibold text-paper group-hover:text-star-gold">
                    {item.name}
                  </h4>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-milk-dim">
                    {item.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MiniBottlePreview({ styleKey }: { styleKey: string }) {
  const geom = getWaterGeometry(styleKey, 50);
  const { glassUrl, waterUrl, clipUrl } = getGlassAndWaterUrls(styleKey);
  const dummyLogs = [
    { intensity: 2 },
    { intensity: 4 },
    { intensity: 6 },
    { intensity: 8 },
    { intensity: 10 },
  ];

  return (
    <svg
      viewBox="0 0 200 320"
      className="h-full w-auto drop-shadow-md"
      preserveAspectRatio="xMidYMid meet"
    >
      <BottleGraphicDef styleKey={styleKey} />
      <BottleStructure styleKey={styleKey} />

      <g clipPath={clipUrl}>
        <rect x="15" y="45" width="170" height="245" fill={glassUrl} />
        <rect
          x={geom.x}
          y={geom.top}
          width={geom.width}
          height={geom.height}
          fill={waterUrl}
        />
        <ellipse
          cx="100"
          cy={geom.lipCy}
          rx={geom.lipRx}
          ry={geom.lipRy}
          fill="rgba(255,255,255,0.3)"
        />

        {dummyLogs.map((log, i) => {
          const { x, y, r } = getStarPositions(styleKey, i);
          return (
            <g key={i} transform={`translate(${x}, ${y})`} filter="url(#starGlow)">
              <RoundedStar size={r * 2} color={intensityColor(log.intensity)} />
            </g>
          );
        })}

        <BottleReflections styleKey={styleKey} />
      </g>
    </svg>
  );
}
