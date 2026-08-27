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
      {/* 奶驼色木塞 */}
      <path d="M25 14C25 11 39 11 39 14V17H25V14Z" fill="#d9c49e" />
      {/* 暖米白瓶口 */}
      <ellipse cx="32" cy="18" rx="9" ry="2.5" stroke="#faf6ed" strokeWidth="2" />
      {/* 暖米白瓶身线条 */}
      <path
        d="M24 20C20 23 15 28 15 42C15 54 22 58 32 58C42 58 49 54 49 42C49 28 44 23 40 20"
        stroke="#faf6ed"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      {/* 浅金月牙挂饰 */}
      <path d="M41 21C43 24 43 27 41 29C40 27 39 24 41 21Z" fill="#fde68a" />
      {/* 暖金星芒与柔光 */}
      <circle cx="32" cy="43" r="11" fill="#fbbf24" opacity="0.18" />
      <path
        d="M32 35L33.8 40.5L39.5 41L35 44.5L36.5 50L32 46.8L27.5 50L29 44.5L24.5 41L30.2 40.5L32 35Z"
        fill="#fbbf24"
      />
    </svg>
  );
}
