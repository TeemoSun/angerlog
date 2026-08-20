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

  if (isMobile) {
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-slate-950/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-md">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => select(tab.key)}
              className={
                "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs " +
                (active === tab.key
                  ? "text-amber-300"
                  : "text-slate-400 hover:text-slate-200")
              }
            >
              {active === tab.key && (
                <motion.span
                  layoutId="tab-indicator"
                  className="absolute top-0 h-0.5 w-10 rounded-full bg-amber-400"
                />
              )}
              <span className="text-base leading-none">
                {tab.key === "bottle" ? "🫙" : tab.key === "logs" ? "📋" : "📈"}
              </span>
              <span>{tab.mobileLabel}</span>
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
              ? "bg-amber-500/20 text-amber-200 ring-1 ring-amber-400/40"
              : "text-slate-300 hover:text-white")
          }
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
