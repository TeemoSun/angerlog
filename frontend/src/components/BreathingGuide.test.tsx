import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

import { BreathingGuide } from "@/components/BreathingGuide";

describe("BreathingGuide", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("激活时依次显示吸气/屏息/呼气", async () => {
    render(<BreathingGuide active />);
    expect(screen.getByText("吸气")).toBeInTheDocument();
    await vi.advanceTimersByTimeAsync(4000);
    expect(screen.getByText("屏息")).toBeInTheDocument();
    await vi.advanceTimersByTimeAsync(7000);
    expect(screen.getByText("呼气")).toBeInTheDocument();
    await vi.advanceTimersByTimeAsync(8000);
    expect(screen.getByText("吸气")).toBeInTheDocument();
    expect(screen.getByTestId("breathing-cycle")).toHaveTextContent("1");
  });

  it("未激活时不推进", async () => {
    render(<BreathingGuide active={false} />);
    expect(screen.getByText("准备")).toBeInTheDocument();
    await vi.advanceTimersByTimeAsync(20000);
    expect(screen.getByText("准备")).toBeInTheDocument();
  });
});
