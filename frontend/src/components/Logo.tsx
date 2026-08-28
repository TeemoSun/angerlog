export function Logo({
  size = 32,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      data-testid="app-logo"
    >
      <defs>
        <linearGradient id="cork1" x1="25" y1="9" x2="39" y2="15" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#eedfc5" />
          <stop offset="100%" stopColor="#be9e71" />
        </linearGradient>
        <radialGradient id="glow1" cx="32" cy="40" r="16" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.38" />
          <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="starGrad1" x1="25" y1="31" x2="39" y2="47" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fffbeb" />
          <stop offset="35%" stopColor="#fde68a" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>

      {/* 渐变质感木塞 */}
      <path
        d="M25 10 C25 8.5 39 8.5 39 10 V15 C39 15.8 37.5 16.5 32 16.5 C26.5 16.5 25 15.8 25 15 Z"
        fill="url(#cork1)"
      />

      {/* 暖米白瓶口 */}
      <rect x="22" y="15" width="20" height="3" rx="1.5" stroke="#faf6ed" strokeWidth="1.8" fill="none" />

      {/* 大圆角矩形瓶身 */}
      <rect
        x="17"
        y="19"
        width="30"
        height="38"
        rx="8"
        stroke="#faf6ed"
        strokeWidth="2.3"
        fill="rgba(255,255,255,0.04)"
      />

      {/* 玻璃左侧高光 */}
      <path
        d="M20.5 26 C20 30 20 46 21.5 50"
        stroke="#ffffff"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.45"
      />

      {/* 浅金月牙吊饰与细绳 */}
      <path d="M39 17 C42 19 44 21.5 44.5 24" stroke="#d9c49e" strokeWidth="1" strokeLinecap="round" />
      <path d="M45 23.5 C47 25.5 47 28.5 45 30.5 C43.8 29.2 43.8 25.8 45 23.5 Z" fill="#fde68a" />

      {/* 暖金星光柔晕 */}
      <circle cx="32" cy="40" r="14" fill="url(#glow1)" />

      {/* 瓶内主星（饱满圆润五角星） */}
      <path
        d="M32 31 L33.9 36.2 C34.1 36.7 34.6 37 35.1 37.1 L40.2 37.7 C41.4 37.8 41.9 39.4 41 40.1 L37.1 43.3 C36.7 43.6 36.5 44.1 36.7 44.6 L37.8 49.6 C38.1 50.8 36.8 51.7 35.8 51.1 L32.4 48.9 C32 48.6 31.6 48.6 31.2 48.9 L27.8 51.1 C26.8 51.7 25.5 50.8 25.8 49.6 L26.9 44.6 C27.1 44.1 26.9 43.6 26.5 43.3 L22.6 40.1 C21.7 39.4 22.2 37.8 23.4 37.7 L28.5 37.1 C29 37 29.5 36.7 29.7 36.2 Z"
        fill="url(#starGrad1)"
      />

      {/* 微光伴星 */}
      <circle cx="23" cy="47" r="1.2" fill="#fde68a" opacity="0.8" />
      <circle cx="40.5" cy="33" r="1.5" fill="#fef08a" />
    </svg>
  );
}
