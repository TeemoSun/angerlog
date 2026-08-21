import { useId } from "react";

export function roundedStarPath(
  cx: number,
  cy: number,
  outer: number,
  inner: number,
  radius: number,
): string {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const r = i % 2 === 0 ? outer : inner;
    pts.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
  }
  let d = "";
  for (let i = 0; i < 10; i++) {
    const prev = pts[(i + 9) % 10];
    const curr = pts[i];
    const next = pts[(i + 1) % 10];
    const dxIn = curr.x - prev.x;
    const dyIn = curr.y - prev.y;
    const dxOut = next.x - curr.x;
    const dyOut = next.y - curr.y;
    const lenIn = Math.hypot(dxIn, dyIn);
    const lenOut = Math.hypot(dxOut, dyOut);
    const k = Math.min(radius / lenIn, radius / lenOut);
    const p1x = curr.x - dxIn * k;
    const p1y = curr.y - dyIn * k;
    const p2x = curr.x + dxOut * k;
    const p2y = curr.y + dyOut * k;
    d +=
      (i === 0 ? `M ${p1x.toFixed(2)} ${p1y.toFixed(2)} ` : "")
      + `Q ${curr.x.toFixed(2)} ${curr.y.toFixed(2)} ${p2x.toFixed(2)} ${p2y.toFixed(2)} `;
  }
  return `${d}Z`;
}

function shade(hex: string, factor: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) * factor));
  const g = Math.min(255, Math.round(((n >> 8) & 255) * factor));
  const b = Math.min(255, Math.round((n & 255) * factor));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

export const starBright = (hex: string) => shade(hex, 1.22);
export const starDeep = (hex: string) => shade(hex, 0.55);

export function RoundedStar({
  size,
  color,
  className,
  glow = false,
}: {
  size: number;
  color: string;
  className?: string;
  glow?: boolean;
}) {
  const rawId = useId();
  const id = `star-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      style={glow ? { filter: "drop-shadow(0 0 4px rgba(251,191,36,0.35))" } : undefined}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={id} cx="50%" cy="42%" r="62%">
          <stop offset="0%" stopColor={starBright(color)} />
          <stop offset="45%" stopColor={color} />
          <stop offset="100%" stopColor={starDeep(color)} />
        </radialGradient>
      </defs>
      <path d={roundedStarPath(50, 50, 46, 24, 5)} fill={`url(#${id})`} />
    </svg>
  );
}
