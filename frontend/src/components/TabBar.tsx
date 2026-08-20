import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export const TABS = [
  { key: "bottle", label: "情绪瓶", mobileLabel: "瓶子" },
  { key: "logs", label: "记录", mobileLabel: "记录" },
  { key: "stats", label: "统计", mobileLabel: "统计" },
] as const;

export type TabKey = (typeof TABS)[number]["key"];

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

  const tabIcon = (key: TabKey) => {
    if (key === "bottle") return "🫙";
    if (key === "logs") return "✉️";
    return "📈";
  };

  if (isMobile) {
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-night-900/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-2xl">
        <div className="mx-auto flex max-w-md">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => select(tab.key)}
              className={
                "relative flex flex-1 flex-col items-center gap-1 py-3 text-xs transition " +
                (active === tab.key
                  ? "text-star-amber"
                  : "text-slate-400 hover:text-slate-200")
              }
            >
              <motion.span
                className="text-xl leading-none"
                animate={active === tab.key ? { scale: 1.15, y: -2 } : { scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                {tabIcon(tab.key)}
              </motion.span>
              <span>{tab.mobileLabel}</span>
              {active === tab.key && (
                <motion.span
                  layoutId="mobile-tab-glow"
                  className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-gradient-to-r from-transparent via-star-amber to-transparent"
                />
              )}
            </button>
          ))}
        </div>
      </nav>
    );
  }

  return (
    <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1 backdrop-blur-xl">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => select(tab.key)}
          className={
            "rounded-full px-4 py-1.5 text-sm transition " +
            (active === tab.key
              ? "bg-gradient-to-r from-star-gold/20 to-star-amber/20 text-star-amber ring-1 ring-star-amber/40 shadow-[0_0_12px_rgba(251,191,36,0.15)]"
              : "text-slate-300 hover:text-white")
          }
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
