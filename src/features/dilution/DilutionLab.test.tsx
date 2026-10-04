import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { ThemeToggle } from "../../theme/ThemeToggle";
import { DilutionLab } from "./DilutionLab";

function renderLab() {
  return render(<ThemeProvider><DilutionLab /></ThemeProvider>);
}

describe("DilutionLab", () => {
  it("renders an accessible curve, budget source, and marginal ranking", () => {
    renderLab();

    expect(screen.getByRole("heading", { name: "词条稀释实验室" })).toBeVisible();
    expect(screen.getByRole("img", { name: "词条投入边际收益曲线" })).toBeVisible();
    expect(screen.getByLabelText("预算口径")).toHaveValue("median-substat");
    expect(screen.getByText("3.7 声骸副词条中位档")).toBeVisible();
    expect(screen.getByText(/下一份预算优先/)).toBeVisible();
  });

  it("shows less damage-bonus gain after that additive zone is saturated", async () => {
    const user = userEvent.setup();
    renderLab();

    const gain = screen.getByTestId("gain-damageBonus");
    const before = Number(gain.getAttribute("data-value"));
    await user.clear(screen.getByLabelText("当前伤害加成"));
    await user.type(screen.getByLabelText("当前伤害加成"), "100");
    const after = Number(screen.getByTestId("gain-damageBonus").getAttribute("data-value"));

    expect(after).toBeLessThan(before);
  });

  it("exposes critical-rate overflow instead of counting it as damage", async () => {
    const user = userEvent.setup();
    renderLab();

    await user.selectOptions(screen.getByLabelText("预算口径"), "ten-percent");
    await user.clear(screen.getByLabelText("当前暴击率"));
    await user.type(screen.getByLabelText("当前暴击率"), "100");

    expect(screen.getByTestId("gain-critRate")).toHaveTextContent("溢出 10.0%");
  });

  it("switches to a common ten-percentage-point denominator", async () => {
    const user = userEvent.setup();
    renderLab();

    await user.selectOptions(screen.getByLabelText("预算口径"), "ten-percent");

    expect(screen.getByText("统一百分点对照预算")).toBeVisible();
    expect(screen.getByText(/每 10 个百分点/)).toBeVisible();
  });

  it("keeps the live baseline and ranking in the persistent result rail", () => {
    renderLab();

    const rail = screen.getByRole("complementary", { name: "词条结论" });
    expect(within(rail).getByText("当前期望伤害")).toBeVisible();
    expect(within(rail).getByText(/下一份预算优先/)).toBeVisible();
    expect(within(rail).getByTestId("gain-damageBonus")).toBeVisible();
  });

  it("rethemes the chart when the global theme changes", async () => {
    const user = userEvent.setup();
    render(<ThemeProvider><ThemeToggle /><DilutionLab /></ThemeProvider>);
    const chart = screen.getByRole("img", { name: "词条投入边际收益曲线" });
    const initialTheme = document.documentElement.dataset.theme;
    const nextTheme = initialTheme === "dark" ? "light" : "dark";
    expect(chart).toHaveAttribute("data-chart-theme", initialTheme);

    await user.click(screen.getByRole("button", { name: /切换到.*主题/ }));
    fireEvent.animationEnd(screen.getByTestId("theme-curtain"));

    await waitFor(() => expect(chart).toHaveAttribute("data-chart-theme", nextTheme));
  });
});
