import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { LogList } from "@/components/LogList";
import { useLogsStore } from "@/stores/logs";
import type { LogItem } from "@/lib/types";

const logs: LogItem[] = [
  {
    id: "a",
    trigger_reason: "会议取消",
    intensity: 8,
    category: "工作",
    is_resolved: false,
    resolution_method: null,
    created_at: "2026-08-21T01:00:00Z",
    updated_at: "2026-08-21T01:00:00Z",
    resolved_at: null,
  },
  {
    id: "b",
    trigger_reason: "堵车",
    intensity: 4,
    category: "交通",
    is_resolved: true,
    resolution_method: "听歌",
    created_at: "2026-08-20T01:00:00Z",
    updated_at: "2026-08-20T02:00:00Z",
    resolved_at: "2026-08-20T02:00:00Z",
  },
];

describe("LogList 筛选", () => {
  beforeEach(() => useLogsStore.getState().resetFilters());

  it("按分类筛选", async () => {
    const user = userEvent.setup();
    render(
      <LogList logs={logs} onResolve={() => {}} onDelete={() => {}} meta={null} onPageChange={() => {}} />,
    );
    expect(screen.getByText("会议取消")).toBeInTheDocument();
    expect(screen.getByText("堵车")).toBeInTheDocument();

    await user.click(screen.getAllByRole("combobox")[0]);
    await user.click(await screen.findByRole("option", { name: "工作" }));
    expect(useLogsStore.getState().filters.category).toBe("工作");
  });

  it("重置筛选恢复默认", async () => {
    const user = userEvent.setup();
    render(
      <LogList logs={logs} onResolve={() => {}} onDelete={() => {}} meta={null} onPageChange={() => {}} />,
    );
    await user.click(screen.getAllByRole("combobox")[0]);
    await user.click(await screen.findByRole("option", { name: "家庭" }));
    await user.click(screen.getByRole("button", { name: "重置筛选" }));
    const f = useLogsStore.getState().filters;
    expect(f.category).toBeNull();
    expect(f.resolved).toBe("all");
  });

  it("空列表显示占位文案", () => {
    render(
      <LogList logs={[]} onResolve={() => {}} onDelete={() => {}} meta={null} onPageChange={() => {}} />,
    );
    expect(screen.getByText(/还没有记录/)).toBeInTheDocument();
  });
});
