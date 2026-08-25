import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export const TABS = [
  { key: "bottle", label: "情绪瓶" },
  { key: "logs", label: "记录" },
  { key: "stats", label: "统计" },
] as const;

export type TabKey = (typeof TABS)[number]["key"];

const PILL_CLASS =
  "flex items-center gap-1 rounded-full border border-glass-border bg-glass p-1 backdrop-blur-xl";
const ACTIVE_CLASS =
  "rounded-full bg-star-gold/20 text-star-gold ring-1 ring-star-amber/40 shadow-[0_0_12px_rgba(251,191,36,0.15)]";
const INACTIVE_CLASS = "rounded-full text-milk-dim hover:text-milk";

export function TabBar({
  active,
  onChange,
}: {
  active: TabKey;
  onChange: (tab: TabKey) => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const select = (key: TabKey) => {
    onChange(key);
    if (location.pathname !== "/") navigate("/");
  };

  const renderPill = (stretch: boolean) => (
    <div className={PILL_CLASS + (stretch ? " w-full max-w-md" : "")}>
      {TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => select(tab.key)}
          className={
            (stretch ? "flex-1 " : "") +
            "px-4 py-1.5 text-sm transition " +
            (active === tab.key ? ACTIVE_CLASS : INACTIVE_CLASS)
          }
        >
          {tab.label}
        </button>
      ))}
    </div>
  );

  if (isMobile) {
    // 必须传送到 body：祖先的 backdrop-filter 会劫持 fixed 定位，导致导航被钉在页头
    return createPortal(
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-night-900/40 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl justify-center px-4 pb-3 pt-3">{renderPill(true)}</div>
      </nav>,
      document.body,
    );
  }

  return renderPill(false);
}
