import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../theme/ThemeProvider";
import { AppShell } from "./AppShell";
import { WorkspaceFrame } from "./WorkspaceFrame";

function installMatchMedia(mobile: boolean) {
  vi.stubGlobal("matchMedia", vi.fn((query: string) => ({
    matches: query.includes("max-width: 759px") ? mobile : false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(() => true),
  })));
}

function renderShell(mobile = false) {
  installMatchMedia(mobile);
  return render(
    <ThemeProvider>
      <AppShell activeView="workbench" onViewChange={vi.fn()}>
        <WorkspaceFrame
          description="测试说明"
          kicker="TEST / WORKSPACE"
          result={<div>详细结果内容</div>}
          resultLabel="测试结果"
          title="测试工作区"
        >
          <div>主要任务内容</div>
        </WorkspaceFrame>
      </AppShell>
    </ThemeProvider>,
  );
}

describe("AppShell", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders one desktop sidebar navigation with global status and theme control", () => {
    renderShell();

    const navigation = screen.getByRole("navigation", { name: "功能视图" });
    expect(navigation).toHaveAttribute("data-variant", "sidebar");
    expect(screen.getAllByRole("navigation", { name: "功能视图" })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: /伤害工作台|词条稀释|配装对比|循环时间轴/u })).toHaveLength(4);
    expect(screen.getByText("数据版本 3.7")).toBeVisible();
    expect(screen.getByRole("button", { name: "切换到深色主题" })).toBeEnabled();
    expect(screen.getByText("主要任务内容")).toBeVisible();
    expect(screen.getByText("详细结果内容")).toBeVisible();
  });

  it("renders only the mobile navigation and expands the compact result panel", async () => {
    const user = userEvent.setup();
    renderShell(true);

    const navigation = screen.getByRole("navigation", { name: "功能视图" });
    expect(navigation).toHaveAttribute("data-variant", "mobile");
    expect(screen.getAllByRole("navigation", { name: "功能视图" })).toHaveLength(1);
    const resultToggle = screen.getByRole("button", { name: "展开测试结果" });
    expect(resultToggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("详细结果内容")).not.toBeInTheDocument();

    await user.click(resultToggle);

    expect(screen.getByRole("button", { name: "收起测试结果" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("详细结果内容")).toBeVisible();
  });
});
