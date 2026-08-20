import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import { LogFormDialog } from "@/components/LogFormDialog";

vi.mock("@/lib/requests", () => ({
  createLogRequest: vi.fn(),
}));

import { createLogRequest } from "@/lib/requests";

const mockCreate = vi.mocked(createLogRequest);

function renderDialog() {
  const onCreated = vi.fn();
  const onOpenChange = vi.fn();
  render(
    <LogFormDialog open onOpenChange={onOpenChange} onCreated={onCreated} />,
  );
  return { onCreated, onOpenChange };
}

describe("LogFormDialog", () => {
  it("空原因提交时显示校验错误", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole("button", { name: "投入瓶中" }));
    expect(await screen.findByText(/请描述一下发生了什么/)).toBeInTheDocument();
  });

  it("强度≥8 时显示呼吸引导", async () => {
    const user = userEvent.setup();
    renderDialog();
    expect(screen.queryByTestId("breathing-guide")).not.toBeInTheDocument();
    await user.click(screen.getByRole("slider"));
    await user.keyboard("{End}");
    await waitFor(() => {
      expect(screen.getByTestId("high-intensity-hint")).toBeInTheDocument();
    });
    expect(screen.getByTestId("breathing-guide")).toBeInTheDocument();
  });

  it("强度<8 时无呼吸引导", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole("slider"));
    await user.keyboard("{Home}");
    await waitFor(() => {
      expect(screen.queryByTestId("breathing-guide")).not.toBeInTheDocument();
    });
  });

  it("有效提交调用 createLogRequest 并触发 onCreated", async () => {
    const user = userEvent.setup();
    const { onCreated, onOpenChange } = renderDialog();
    mockCreate.mockResolvedValueOnce({
      id: "1",
      trigger_reason: "堵车",
      intensity: 8,
      category: "交通",
      is_resolved: false,
      resolution_method: null,
      created_at: "2026-08-21T00:00:00Z",
      updated_at: "2026-08-21T00:00:00Z",
      resolved_at: null,
    });
    await user.type(screen.getByLabelText("发生了什么？"), "堵车一小时");
    await user.click(screen.getByRole("button", { name: "投入瓶中" }));
    await waitFor(() => expect(mockCreate).toHaveBeenCalled());
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      trigger_reason: "堵车一小时",
      intensity: 5,
    });
    await waitFor(() => expect(onCreated).toHaveBeenCalled());
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
