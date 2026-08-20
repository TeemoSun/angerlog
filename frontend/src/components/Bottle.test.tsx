import { render, screen } from "@testing-library/react";

import { Bottle, waterLevelPercent } from "@/components/Bottle";

describe("waterLevelPercent", () => {
  it("随累计数量上升并封顶", () => {
    expect(waterLevelPercent(0)).toBe(15);
    expect(waterLevelPercent(15)).toBe(55);
    expect(waterLevelPercent(30)).toBe(95);
    expect(waterLevelPercent(100)).toBe(95);
  });
});

describe("Bottle", () => {
  it("渲染瓶内小球且数量正确", () => {
    const logs = [
      { intensity: 1 },
      { intensity: 5 },
      { intensity: 9 },
    ];
    render(<Bottle logs={logs} onOpenForm={() => {}} />);
    expect(screen.getByTestId("bottle")).toBeInTheDocument();
    expect(screen.getAllByTestId(/^ball-/)).toHaveLength(3);
    expect(screen.getByText(/瓶内/).textContent).toContain("3");
  });

  it("水位随记录数变化", () => {
    const { rerender } = render(<Bottle logs={[]} onOpenForm={() => {}} />);
    const emptyLevel = screen.getByTestId("water").getAttribute("data-level");
    rerender(
      <Bottle
        logs={Array.from({ length: 20 }, () => ({ intensity: 5 }))}
        onOpenForm={() => {}}
      />,
    );
    const fullLevel = screen.getByTestId("water").getAttribute("data-level");
    expect(emptyLevel).toBe("15");
    expect(fullLevel).toBe("68");
    expect(fullLevel).not.toBe(emptyLevel);
  });
});
