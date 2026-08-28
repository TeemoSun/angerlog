export interface BottleStyleConfig {
  key: string;
  name: string;
  category: "healing" | "magic" | "minimal";
  description: string;
  badge: string;
}

export const BOTTLE_STYLES: BottleStyleConfig[] = [
  {
    key: "C",
    name: "北欧晶莹平口罐",
    category: "minimal",
    description: "直筒极简水晶罐，搭配实木平盖与厚底折射玻璃，线条利落纯粹，大容量感。",
    badge: "默认推荐",
  },
  {
    key: "A",
    name: "经典圆肚许愿瓶",
    category: "healing",
    description: "经典圆润肚身许愿瓶，弧线柔美无棱角，自带细腻左侧弧光与晃动小吊坠。",
    badge: "经典温润",
  },
  {
    key: "B",
    name: "复古水滴药剂瓶",
    category: "magic",
    description: "修长水滴形魔法药剂瓶，自带黄铜金属环扣与金光刻度线，古典魔药美感。",
    badge: "古典优雅",
  },
  {
    key: "D",
    name: "软萌陪伴布丁瓶",
    category: "healing",
    description: "矮胖可爱的布丁玻璃奶瓶，宽大蘑菇木塞配手写便签小吊牌，安全感极强。",
    badge: "萌系治愈",
  },
  {
    key: "E",
    name: "幻夜八角棱晶瓶",
    category: "magic",
    description: "几何八角棱镜切面香水瓶，宝石般璀璨的切角折射与渐变极光水色，华丽梦幻。",
    badge: "华丽折射",
  },
  {
    key: "F",
    name: "微光心愿沙漏瓶",
    category: "magic",
    description: "双球收腰沙漏瓶，象征让时间沉淀与抚平怒气，实木双底座与流光粒子腰线。",
    badge: "时间沉淀",
  },
  {
    key: "G",
    name: "森林钟罩生态瓶",
    category: "healing",
    description: "经典小王子式钟罩生态瓶，顶部有晶莹圆环提手，底部配暖木圆托盘。",
    badge: "温情守护",
  },
  {
    key: "H",
    name: "日式露滴悬浮瓶",
    category: "minimal",
    description: "清晨露珠水滴造型，圆润球体架于极简竹环底座上，如悬浮星辰，空灵通透。",
    badge: "空灵悬浮",
  },
  {
    key: "classic",
    name: "原版方形瓶",
    category: "minimal",
    description: "经典原版圆角方形轮廓，搭配双层扁平木塞与基础柔光反射。",
    badge: "原版经典",
  },
];

export const DEFAULT_BOTTLE_STYLE = "C";

export function getStarPositions(
  styleKey: string,
  index: number,
): { x: number; y: number; r: number } {
  const k = styleKey.toLowerCase();
  
  if (k === "a") {
    // 经典圆肚许愿瓶
    const row = Math.floor(index / 4);
    const col = index % 4;
    const xOffset = (col - 1.5) * (24 + (row % 2 ? 1 : -1));
    const archY = Math.abs(col - 1.5) * 4;
    return { x: 100 + xOffset, y: 258 - row * 22 + archY, r: 8.5 };
  }
  
  if (k === "b") {
    // 复古水滴药剂瓶
    const row = Math.floor(index / 4);
    const col = index % 4;
    return { x: 62 + col * 25 + (row % 2) * 12, y: 260 - row * 23, r: 8.5 };
  }
  
  if (k === "c") {
    // 北欧晶莹平口罐 (默认)
    const row = Math.floor(index / 4);
    const col = index % 4;
    return { x: 62 + col * 25 + (row % 2) * 12, y: 256 - row * 22, r: 8.5 };
  }
  
  if (k === "d") {
    // 软萌陪伴布丁瓶
    const row = Math.floor(index / 5);
    const col = index % 5;
    return { x: 52 + col * 24 + (row % 2) * 12, y: 258 - row * 22, r: 8 };
  }
  
  if (k === "e") {
    // 幻夜八角棱晶瓶
    const row = Math.floor(index / 4);
    const col = index % 4;
    const xOffset = (col - 1.5) * 25;
    return { x: 100 + xOffset, y: 256 - row * 22, r: 8.5 };
  }
  
  if (k === "f") {
    // 微光心愿沙漏瓶
    const row = Math.floor(index / 4);
    const col = index % 4;
    const xOffset = (col - 1.5) * (20 + row * 1.5);
    return { x: 100 + xOffset, y: 252 - row * 20, r: 8 };
  }
  
  if (k === "g") {
    // 森林钟罩生态瓶
    const row = Math.floor(index / 4);
    const col = index % 4;
    return { x: 62 + col * 25 + (row % 2) * 12, y: 252 - row * 21, r: 8.5 };
  }
  
  if (k === "h") {
    // 日式露滴悬浮瓶
    const row = Math.floor(index / 4);
    const col = index % 4;
    const xOffset = (col - 1.5) * 24;
    const archY = Math.abs(col - 1.5) * 3.5;
    return { x: 100 + xOffset, y: 258 - row * 22 + archY, r: 8.5 };
  }
  
  // 原版 classic
  const row = Math.floor(index / 4);
  const col = index % 4;
  return { x: 58 + col * 27 + (row % 2) * 13, y: 262 - row * 26, r: 9 };
}

export function getWaterGeometry(styleKey: string, percent: number) {
  const k = styleKey.toLowerCase();
  let bottom = 280;
  let maxH = 180;
  let x = 25;
  let width = 150;
  let lipRx = 58;
  let lipRy = 4.5;

  if (k === "a") {
    bottom = 278;
    maxH = 180;
    x = 25;
    width = 150;
    lipRx = 58;
    lipRy = 4.5;
  } else if (k === "b") {
    bottom = 280;
    maxH = 180;
    x = 30;
    width = 140;
    lipRx = 55;
    lipRy = 4;
  } else if (k === "c") {
    bottom = 276;
    maxH = 180;
    x = 42;
    width = 116;
    lipRx = 56;
    lipRy = 3.5;
  } else if (k === "d") {
    bottom = 276;
    maxH = 175;
    x = 25;
    width = 150;
    lipRx = 62;
    lipRy = 4.5;
  } else if (k === "e") {
    bottom = 274;
    maxH = 180;
    x = 30;
    width = 140;
    lipRx = 55;
    lipRy = 4;
  } else if (k === "f") {
    bottom = 262;
    maxH = 160;
    x = 40;
    width = 120;
    lipRx = 46;
    lipRy = 3.5;
  } else if (k === "g") {
    bottom = 260;
    maxH = 170;
    x = 45;
    width = 110;
    lipRx = 52;
    lipRy = 4;
  } else if (k === "h") {
    bottom = 276;
    maxH = 180;
    x = 25;
    width = 150;
    lipRx = 58;
    lipRy = 4.5;
  } else {
    // classic
    bottom = 280;
    maxH = 180;
    x = 42;
    width = 116;
    lipRx = 54;
    lipRy = 3;
  }

  const height = Math.max(25, (percent / 100) * maxH);
  const top = bottom - height;

  return {
    x,
    width,
    bottom,
    height,
    top,
    lipRx,
    lipRy,
    lipCy: top,
  };
}

export function BottleGraphicDef({ styleKey: _styleKey }: { styleKey?: string }) {
  return (
    <defs>
      <style>{`
        @keyframes pendantSway {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(7deg); }
        }
        .sway-pendant {
          transform-origin: 100px 75px;
          animation: pendantSway 4.5s ease-in-out infinite;
        }
      `}</style>

      {/* 通用发光滤镜 */}
      <filter id="starGlow" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* 方案 A */}
      <linearGradient id="b1-glass-grad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
        <stop offset="25%" stopColor="#ffffff" stopOpacity="0.05" />
        <stop offset="50%" stopColor="#3d2c70" stopOpacity="0.15" />
        <stop offset="75%" stopColor="#ffffff" stopOpacity="0.04" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0.18" />
      </linearGradient>
      <linearGradient id="b1-water-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#f6d365" stopOpacity="0.5" />
        <stop offset="45%" stopColor="#fbbf24" stopOpacity="0.65" />
        <stop offset="100%" stopColor="#f97316" stopOpacity="0.82" />
      </linearGradient>
      <linearGradient id="b1-cork-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#dfb788" />
        <stop offset="50%" stopColor="#c19363" />
        <stop offset="100%" stopColor="#9a7044" />
      </linearGradient>
      <linearGradient id="b1-gold-pendant" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#fff0ad" />
        <stop offset="60%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#b45309" />
      </linearGradient>
      <clipPath id="b1-clip">
        <path d="M82 68 H118 V84 C132 88 168 112 168 178 C168 244 142 278 100 278 C58 278 32 244 32 178 C32 112 68 88 82 84 Z" />
      </clipPath>

      {/* 方案 B */}
      <linearGradient id="b2-glass-grad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
        <stop offset="30%" stopColor="#ffffff" stopOpacity="0.04" />
        <stop offset="70%" stopColor="#2a1f4d" stopOpacity="0.2" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0.18" />
      </linearGradient>
      <linearGradient id="b2-water-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#fcd34d" stopOpacity="0.4" />
        <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.65" />
        <stop offset="100%" stopColor="#ea580c" stopOpacity="0.8" />
      </linearGradient>
      <linearGradient id="b2-cork-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#e2bf92" />
        <stop offset="100%" stopColor="#8b5e34" />
      </linearGradient>
      <clipPath id="b2-clip">
        <path d="M88 56 H112 V110 C125 130 162 180 162 235 C162 265 136 280 100 280 C64 280 38 265 38 235 C38 180 75 130 88 110 Z" />
      </clipPath>

      {/* 方案 C (默认) */}
      <linearGradient id="b3-glass-grad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
        <stop offset="15%" stopColor="#ffffff" stopOpacity="0.03" />
        <stop offset="85%" stopColor="#ffffff" stopOpacity="0.03" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0.2" />
      </linearGradient>
      <linearGradient id="b3-water-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#fde047" stopOpacity="0.45" />
        <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.65" />
        <stop offset="100%" stopColor="#d97706" stopOpacity="0.8" />
      </linearGradient>
      <linearGradient id="b3-wood-grad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#b08556" />
        <stop offset="50%" stopColor="#d6ab7b" />
        <stop offset="100%" stopColor="#966d41" />
      </linearGradient>
      <clipPath id="b3-clip">
        <rect x="42" y="70" width="116" height="206" rx="16" />
      </clipPath>

      {/* 方案 D */}
      <linearGradient id="b4-glass-grad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
        <stop offset="35%" stopColor="#ffffff" stopOpacity="0.06" />
        <stop offset="65%" stopColor="#3b2b68" stopOpacity="0.12" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0.2" />
      </linearGradient>
      <linearGradient id="b4-water-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#fde68a" stopOpacity="0.5" />
        <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.7" />
        <stop offset="100%" stopColor="#f97316" stopOpacity="0.85" />
      </linearGradient>
      <linearGradient id="b4-cork-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#dfba8f" />
        <stop offset="100%" stopColor="#a47748" />
      </linearGradient>
      <clipPath id="b4-clip">
        <path d="M72 82 H128 V98 C145 106 172 135 172 205 C172 258 145 276 100 276 C55 276 28 258 28 205 C28 135 55 106 72 98 Z" />
      </clipPath>

      {/* 方案 E */}
      <linearGradient id="b5-glass-grad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
        <stop offset="40%" stopColor="#ffffff" stopOpacity="0.05" />
        <stop offset="60%" stopColor="#4f3b78" stopOpacity="0.18" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0.22" />
      </linearGradient>
      <linearGradient id="b5-water-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#fde047" stopOpacity="0.5" />
        <stop offset="50%" stopColor="#fb923c" stopOpacity="0.7" />
        <stop offset="100%" stopColor="#c026d3" stopOpacity="0.75" />
      </linearGradient>
      <clipPath id="b5-clip">
        <path d="M78 68 H122 L164 110 V232 L122 274 H78 L36 232 V110 Z" />
      </clipPath>

      {/* 方案 F */}
      <linearGradient id="b6-glass-grad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
        <stop offset="30%" stopColor="#ffffff" stopOpacity="0.04" />
        <stop offset="70%" stopColor="#ffffff" stopOpacity="0.04" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0.2" />
      </linearGradient>
      <clipPath id="b6-clip">
        <path d="M64 68 H136 C136 112 114 148 110 162 C114 176 142 212 142 262 H58 C58 212 86 176 90 162 C86 148 64 112 64 68 Z" />
      </clipPath>

      {/* 方案 G */}
      <linearGradient id="b7-glass-grad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
        <stop offset="25%" stopColor="#ffffff" stopOpacity="0.04" />
        <stop offset="75%" stopColor="#ffffff" stopOpacity="0.04" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0.2" />
      </linearGradient>
      <clipPath id="b7-clip">
        <path d="M100 68 C56 68 56 115 56 160 V260 H144 V160 C144 115 144 68 100 68 Z" />
      </clipPath>

      {/* 方案 H */}
      <linearGradient id="b8-glass-grad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
        <stop offset="30%" stopColor="#ffffff" stopOpacity="0.05" />
        <stop offset="70%" stopColor="#2a2258" stopOpacity="0.15" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0.2" />
      </linearGradient>
      <clipPath id="b8-clip">
        <path d="M100 62 C118 82 165 145 165 202 C165 248 136 276 100 276 C64 276 35 248 35 202 C35 145 82 82 100 62 Z" />
      </clipPath>

      {/* 原版 classic */}
      <linearGradient id="b0-glass-grad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.18" />
        <stop offset="35%" stopColor="#ffffff" stopOpacity="0.04" />
        <stop offset="65%" stopColor="#ffffff" stopOpacity="0.06" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0.14" />
      </linearGradient>
      <linearGradient id="b0-water-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#f6d365" stopOpacity="0.45" />
        <stop offset="60%" stopColor="#fbbf24" stopOpacity="0.6" />
        <stop offset="100%" stopColor="#fb923c" stopOpacity="0.75" />
      </linearGradient>
      <linearGradient id="b0-cork-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#d4ab7c" />
        <stop offset="50%" stopColor="#b98d5f" />
        <stop offset="100%" stopColor="#9d7a52" />
      </linearGradient>
      <clipPath id="b0-clip">
        <path d="M80 62 h40 v16 c0 12 14 14 24 18 c16 8 26 16 26 34 v110 c0 24 -20 40 -45 40 h-50 c-25 0 -45 -16 -45 -40 v-110 c0 -18 10 -26 26 -34 c10 -4 24 -6 24 -18 v-16 z" />
      </clipPath>
    </defs>
  );
}

export function BottleStructure({ styleKey }: { styleKey: string }) {
  const k = styleKey.toLowerCase();

  if (k === "a") {
    // 方案 A: 经典圆肚许愿瓶
    return (
      <>
        {/* 底部阴影 */}
        <ellipse cx="100" cy="294" rx="55" ry="9" fill="rgba(0,0,0,0.35)" />
        {/* 外轮廓 */}
        <path
          d="M50 264 C70 276 130 276 150 264"
          fill="none"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="2"
        />
        <path
          d="M82 68 H118 V84 C132 88 168 112 168 178 C168 244 142 278 100 278 C58 278 32 244 32 178 C32 112 68 88 82 84 Z"
          fill="none"
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <ellipse
          cx="100"
          cy="68"
          rx="20"
          ry="4.5"
          fill="none"
          stroke="rgba(255,255,255,0.6)"
          strokeWidth="2"
        />
        {/* 木塞 */}
        <path d="M84 46 C84 42 116 42 116 46 V65 H84 Z" fill="url(#b1-cork-grad)" />
        <ellipse cx="100" cy="45" rx="16" ry="3.5" fill="#dfb788" />
        <rect x="81" y="60" width="38" height="6" rx="3" fill="#9a7044" opacity="0.6" />
        {/* 细绳与摇晃月牙 */}
        <path d="M80 82 Q100 86 120 82" fill="none" stroke="#d97706" strokeWidth="2" />
        <g className="sway-pendant">
          <path
            d="M112 84 Q122 100 120 115"
            fill="none"
            stroke="#d97706"
            strokeWidth="1.5"
            strokeDasharray="2 1"
          />
          <path
            d="M120 115 A 7 7 0 1 0 126 124 A 5.5 5.5 0 1 1 120 115 Z"
            fill="url(#b1-gold-pendant)"
            filter="drop-shadow(0 0 3px rgba(245,158,11,0.6))"
          />
        </g>
      </>
    );
  }

  if (k === "b") {
    // 方案 B: 复古水滴药剂瓶
    return (
      <>
        <ellipse cx="100" cy="294" rx="52" ry="8" fill="rgba(0,0,0,0.35)" />
        <path
          d="M88 56 H112 V110 C125 130 162 180 162 235 C162 265 136 280 100 280 C64 280 38 265 38 235 C38 180 75 130 88 110 Z"
          fill="none"
          stroke="rgba(255,255,255,0.38)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <rect x="85" y="70" width="30" height="4" rx="2" fill="#d97706" />
        <rect x="86" y="54" width="28" height="3" rx="1.5" fill="rgba(255,255,255,0.5)" />
        <path d="M90 32 L110 32 L108 55 L92 55 Z" fill="url(#b2-cork-grad)" />
        <ellipse cx="100" cy="32" rx="10" ry="2.5" fill="#e2bf92" />
      </>
    );
  }

  if (k === "c") {
    // 方案 C: 北欧晶莹平口罐 (默认)
    return (
      <>
        <ellipse cx="100" cy="292" rx="54" ry="7" fill="rgba(0,0,0,0.32)" />
        <path
          d="M42 260 Q100 264 158 260 V268 Q100 278 42 268 Z"
          fill="rgba(255,255,255,0.12)"
        />
        <path
          d="M52 268 Q100 273 148 268"
          fill="none"
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="1.5"
        />
        <rect
          x="42"
          y="70"
          width="116"
          height="206"
          rx="16"
          fill="none"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="2.5"
        />
        <rect x="36" y="52" width="128" height="18" rx="6" fill="url(#b3-wood-grad)" />
        <ellipse cx="100" cy="52" rx="60" ry="3" fill="#e8c79f" />
        <rect
          x="44"
          y="68"
          width="112"
          height="4"
          rx="2"
          fill="rgba(255,255,255,0.6)"
          opacity="0.7"
        />
      </>
    );
  }

  if (k === "d") {
    // 方案 D: 软萌陪伴布丁瓶
    return (
      <>
        <ellipse cx="100" cy="292" rx="60" ry="9" fill="rgba(0,0,0,0.36)" />
        <path
          d="M72 82 H128 V98 C145 106 172 135 172 205 C172 258 145 276 100 276 C55 276 28 258 28 205 C28 135 55 106 72 98 Z"
          fill="none"
          stroke="rgba(255,255,255,0.36)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <ellipse
          cx="100"
          cy="82"
          rx="28"
          ry="5.5"
          fill="none"
          stroke="rgba(255,255,255,0.65)"
          strokeWidth="2"
        />
        <ellipse cx="100" cy="65" rx="26" ry="12" fill="url(#b4-cork-grad)" />
        <ellipse cx="100" cy="60" rx="22" ry="8" fill="#e7c8a3" />
        <path d="M72 98 Q100 102 128 98" fill="none" stroke="#d97706" strokeWidth="1.8" />
        <g transform="translate(132, 106) rotate(12)">
          <rect
            x="0"
            y="0"
            width="22"
            height="32"
            rx="4"
            fill="#faf6ed"
            filter="drop-shadow(0 2px 5px rgba(0,0,0,0.3))"
          />
          <circle cx="11" cy="6" r="2" fill="#d97706" />
          <line
            x1="5"
            y1="14"
            x2="17"
            y2="14"
            stroke="#c9bfa8"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <line
            x1="5"
            y1="20"
            x2="15"
            y2="20"
            stroke="#c9bfa8"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path d="M11 26 L12 24 L13 26 Z" fill="#fbbf24" />
        </g>
      </>
    );
  }

  if (k === "e") {
    // 方案 E: 幻夜八角棱晶瓶
    return (
      <>
        <polygon
          points="76,290 124,290 160,282 120,296 80,296 40,282"
          fill="rgba(0,0,0,0.35)"
        />
        <path
          d="M78 68 H122 L164 110 V232 L122 274 H78 L36 232 V110 Z"
          fill="none"
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <polygon points="85,38 115,38 122,66 78,66" fill="url(#b1-cork-grad)" />
        <polygon points="85,38 115,38 108,48 92,48" fill="#e8c79f" />
        <rect x="75" y="64" width="50" height="4" rx="2" fill="#f59e0b" opacity="0.8" />
      </>
    );
  }

  if (k === "f") {
    // 方案 F: 微光心愿沙漏瓶
    return (
      <>
        <ellipse cx="100" cy="292" rx="56" ry="8" fill="rgba(0,0,0,0.35)" />
        <rect x="52" y="52" width="96" height="16" rx="6" fill="#c19363" />
        <ellipse cx="100" cy="52" rx="48" ry="3" fill="#dfb788" />
        <rect x="48" y="262" width="104" height="16" rx="6" fill="#c19363" />
        <ellipse cx="100" cy="262" rx="52" ry="3" fill="#dfb788" />
        <line
          x1="56"
          y1="68"
          x2="56"
          y2="262"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <line
          x1="144"
          y1="68"
          x2="144"
          y2="262"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M64 68 H136 C136 112 114 148 110 162 C114 176 142 212 142 262 H58 C58 212 86 176 90 162 C86 148 64 112 64 68 Z"
          fill="none"
          stroke="rgba(255,255,255,0.38)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
      </>
    );
  }

  if (k === "g") {
    // 方案 G: 森林钟罩生态瓶
    return (
      <>
        <ellipse cx="100" cy="290" rx="58" ry="8" fill="rgba(0,0,0,0.35)" />
        <path d="M42 260 H158 V272 C158 278 42 278 42 272 Z" fill="#b08556" />
        <ellipse cx="100" cy="260" rx="58" ry="4" fill="#dfb788" />
        <path
          d="M100 68 C56 68 56 115 56 160 V260 H144 V160 C144 115 144 68 100 68 Z"
          fill="none"
          stroke="rgba(255,255,255,0.38)"
          strokeWidth="2.5"
        />
        <circle
          cx="100"
          cy="52"
          r="10"
          fill="none"
          stroke="rgba(255,255,255,0.6)"
          strokeWidth="2.5"
        />
        <circle cx="100" cy="52" r="5" fill="rgba(255,255,255,0.2)" />
      </>
    );
  }

  if (k === "h") {
    // 方案 H: 日式露滴悬浮瓶
    return (
      <>
        <ellipse cx="100" cy="296" rx="46" ry="7" fill="rgba(0,0,0,0.3)" />
        <ellipse
          cx="100"
          cy="282"
          rx="44"
          ry="7"
          fill="none"
          stroke="#c19363"
          strokeWidth="3"
        />
        <ellipse
          cx="100"
          cy="282"
          rx="38"
          ry="5"
          fill="none"
          stroke="#dfb788"
          strokeWidth="1"
        />
        <path
          d="M100 62 C118 82 165 145 165 202 C165 248 136 276 100 276 C64 276 35 248 35 202 C35 145 82 82 100 62 Z"
          fill="none"
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <rect x="94" y="44" width="12" height="20" rx="6" fill="#c19363" />
        <ellipse cx="100" cy="44" rx="6" ry="2" fill="#dfb788" />
      </>
    );
  }

  // 原版 classic
  return (
    <>
      <ellipse cx="100" cy="298" rx="58" ry="8" fill="rgba(0,0,0,0.3)" />
      <path
        d="M80 62 h40 v16 c0 12 14 14 24 18 c16 8 26 16 26 34 v110 c0 24 -20 40 -45 40 h-50 c-25 0 -45 -16 -45 -40 v-110 c0 -18 10 -26 26 -34 c10 -4 24 -6 24 -18 v-16 z"
        fill="none"
        stroke="rgba(255,255,255,0.32)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <rect x="82" y="36" width="36" height="18" rx="9" fill="url(#b0-cork-grad)" />
      <rect
        x="77"
        y="50"
        width="46"
        height="11"
        rx="5.5"
        fill="rgba(196,154,108,0.9)"
      />
    </>
  );
}

export function BottleReflections({ styleKey }: { styleKey: string }) {
  const k = styleKey.toLowerCase();

  if (k === "a") {
    return (
      <>
        <path
          d="M44 140 C40 180 50 230 75 262"
          fill="none"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M48 148 C45 178 54 220 72 250"
          fill="none"
          stroke="rgba(255,255,255,0.6)"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <path
          d="M156 142 C160 178 152 225 132 258"
          fill="none"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </>
    );
  }

  if (k === "b") {
    return (
      <>
        <path
          d="M89 118 C80 145 48 195 48 240 C48 258 58 270 75 275"
          fill="none"
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <line
          x1="140"
          y1="210"
          x2="148"
          y2="210"
          stroke="rgba(251,191,36,0.6)"
          strokeWidth="1.5"
        />
        <line
          x1="135"
          y1="230"
          x2="146"
          y2="230"
          stroke="rgba(251,191,36,0.4)"
          strokeWidth="1"
        />
        <line
          x1="130"
          y1="250"
          x2="144"
          y2="250"
          stroke="rgba(251,191,36,0.6)"
          strokeWidth="1.5"
        />
      </>
    );
  }

  if (k === "c") {
    return (
      <>
        <line
          x1="50"
          y1="85"
          x2="50"
          y2="260"
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <line
          x1="55"
          y1="95"
          x2="55"
          y2="250"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="1"
          strokeLinecap="round"
        />
        <line
          x1="150"
          y1="85"
          x2="150"
          y2="260"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </>
    );
  }

  if (k === "d") {
    return (
      <>
        <path
          d="M42 150 C38 190 48 238 72 262"
          fill="none"
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="56" cy="138" r="4" fill="rgba(255,255,255,0.5)" />
      </>
    );
  }

  if (k === "e") {
    return (
      <>
        <polygon
          points="36,110 78,68 64,120 48,220 36,232"
          fill="rgba(255,255,255,0.08)"
        />
        <polygon
          points="164,110 122,68 136,120 152,220 164,232"
          fill="rgba(255,255,255,0.05)"
        />
        <line
          x1="64"
          y1="120"
          x2="48"
          y2="220"
          stroke="rgba(255,255,255,0.45)"
          strokeWidth="1.8"
        />
        <line
          x1="136"
          y1="120"
          x2="152"
          y2="220"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="1.2"
        />
      </>
    );
  }

  if (k === "f") {
    return (
      <>
        <path
          d="M100 162 L100 240"
          stroke="#fde047"
          strokeWidth="1.5"
          strokeDasharray="3 3"
          opacity="0.75"
        />
        <circle cx="85" cy="110" r="1.5" fill="#fde047" opacity="0.8" />
        <circle cx="115" cy="125" r="1.2" fill="#fde047" opacity="0.6" />
        <circle cx="98" cy="140" r="2" fill="#fbbf24" opacity="0.9" />
        <path
          d="M68 85 C68 115 88 145 92 160"
          fill="none"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="2"
        />
      </>
    );
  }

  if (k === "g") {
    return (
      <>
        <path
          d="M72 80 C85 73 115 73 128 80"
          fill="none"
          stroke="rgba(255,255,255,0.5)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M62 120 V240"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M138 120 V240"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </>
    );
  }

  if (k === "h") {
    return (
      <>
        <ellipse
          cx="68"
          cy="165"
          rx="6"
          ry="16"
          transform="rotate(-28 68 165)"
          fill="rgba(255,255,255,0.4)"
        />
        <circle cx="56" cy="195" r="3" fill="rgba(255,255,255,0.6)" />
        <path
          d="M152 170 C154 210 140 248 120 265"
          fill="none"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="2"
        />
      </>
    );
  }

  // classic
  return (
    <>
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
    </>
  );
}

export function getGlassAndWaterUrls(styleKey: string) {
  const k = styleKey.toLowerCase();
  if (k === "a") return { glassUrl: "url(#b1-glass-grad)", waterUrl: "url(#b1-water-grad)", clipUrl: "url(#b1-clip)" };
  if (k === "b") return { glassUrl: "url(#b2-glass-grad)", waterUrl: "url(#b2-water-grad)", clipUrl: "url(#b2-clip)" };
  if (k === "c") return { glassUrl: "url(#b3-glass-grad)", waterUrl: "url(#b3-water-grad)", clipUrl: "url(#b3-clip)" };
  if (k === "d") return { glassUrl: "url(#b4-glass-grad)", waterUrl: "url(#b4-water-grad)", clipUrl: "url(#b4-clip)" };
  if (k === "e") return { glassUrl: "url(#b5-glass-grad)", waterUrl: "url(#b5-water-grad)", clipUrl: "url(#b5-clip)" };
  if (k === "f") return { glassUrl: "url(#b6-glass-grad)", waterUrl: "url(#b1-water-grad)", clipUrl: "url(#b6-clip)" };
  if (k === "g") return { glassUrl: "url(#b7-glass-grad)", waterUrl: "url(#b1-water-grad)", clipUrl: "url(#b7-clip)" };
  if (k === "h") return { glassUrl: "url(#b8-glass-grad)", waterUrl: "url(#b1-water-grad)", clipUrl: "url(#b8-clip)" };
  return { glassUrl: "url(#b0-glass-grad)", waterUrl: "url(#b0-water-grad)", clipUrl: "url(#b0-clip)" };
}
