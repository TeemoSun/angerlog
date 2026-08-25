import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { DateTimePicker } from "@/components/DateTimePicker";

/** 包装为受控组件以观察 onChange */
function Harness({ initial }: { initial: Date }) {
  const [open, setOpen] = useState(true);
  const [value, setValue] = useState(initial);
  return (
    <DateTimePicker
      open={open}
      onOpenChange={setOpen}
      value={value}
      onChange={setValue}
      title="选择生气时间"
    />
  );
}

describe("DateTimePicker", () => {
  it("今天的日期可选（不处于禁用态）", () => {
    render(<Harness initial={new Date()} />);
    const now = new Date();
    const today = now.getDate();
    const cells = screen
      .getAllByRole("button")
      .filter((b) => b.textContent === String(today));
    expect(cells.length).toBeGreaterThan(0);
    // 今天不应被禁用
    expect(cells.some((c) => !c.hasAttribute("disabled"))).toBe(true);
  });

  it("把时分调到未来后点确定会被钳制为现在", async () => {
    const user = userEvent.setup();
    const initial = new Date();
    let captured: Date | null = null;
    function CaptureHarness() {
      const [open, setOpen] = useState(true);
      const [value, setValue] = useState(initial);
      return (
        <DateTimePicker
          open={open}
          onOpenChange={setOpen}
          value={value}
          onChange={(v) => {
            captured = v;
            setValue(v);
          }}
          title="选择生气时间"
        />
      );
    }
    render(<CaptureHarness />);
    // 选一个远在未来的时刻：23:59
    const hourSelect = screen.getByLabelText("时");
    await user.selectOptions(hourSelect, "23");
    const minuteSelect = screen.getByLabelText("分");
    await user.selectOptions(minuteSelect, "59");
    // 点确定
    await user.click(screen.getByTestId("dtp-confirm"));
    await waitFor(() => {
      expect(captured).not.toBeNull();
    });
    // 若初始时间本就在 23:59 之前，钳制后应接近当前时间（不超过 2 秒）
    const now = Date.now();
    expect(captured!.getTime()).toBeLessThanOrEqual(now + 2000);
    expect(captured!.getTime()).toBeGreaterThan(now - 5000);
  });

  it("点此刻设为当前时间", async () => {
    const user = userEvent.setup();
    let captured: Date | null = null;
    function NowHarness() {
      const [open, setOpen] = useState(true);
      const [value, setValue] = useState(new Date(2020, 0, 1));
      return (
        <DateTimePicker
          open={open}
          onOpenChange={setOpen}
          value={value}
          onChange={(v) => {
            captured = v;
            setValue(v);
          }}
          title="选择生气时间"
        />
      );
    }
    render(<NowHarness />);
    await user.click(screen.getByRole("button", { name: "此刻" }));
    await waitFor(() => expect(captured).not.toBeNull());
    const now = Date.now();
    expect(captured!.getTime()).toBeLessThanOrEqual(now + 2000);
    expect(captured!.getTime()).toBeGreaterThan(now - 5000);
  });
});