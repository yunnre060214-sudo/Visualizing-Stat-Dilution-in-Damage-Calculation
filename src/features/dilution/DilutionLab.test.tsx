import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { DilutionLab } from "./DilutionLab";

describe("DilutionLab", () => {
  it("renders an accessible curve, budget source, and marginal ranking", () => {
    render(<DilutionLab />);

    expect(screen.getByRole("heading", { name: "词条稀释实验室" })).toBeVisible();
    expect(screen.getByRole("img", { name: "词条投入边际收益曲线" })).toBeVisible();
    expect(screen.getByLabelText("预算口径")).toHaveValue("median-substat");
    expect(screen.getByText("3.7 声骸副词条中位档")).toBeVisible();
    expect(screen.getByText(/下一份预算优先/)).toBeVisible();
  });

  it("shows less damage-bonus gain after that additive zone is saturated", async () => {
    const user = userEvent.setup();
    render(<DilutionLab />);

    const gain = screen.getByTestId("gain-damageBonus");
    const before = Number(gain.getAttribute("data-value"));
    await user.clear(screen.getByLabelText("当前伤害加成"));
    await user.type(screen.getByLabelText("当前伤害加成"), "100");
    const after = Number(screen.getByTestId("gain-damageBonus").getAttribute("data-value"));

    expect(after).toBeLessThan(before);
  });

  it("exposes critical-rate overflow instead of counting it as damage", async () => {
    const user = userEvent.setup();
    render(<DilutionLab />);

    await user.selectOptions(screen.getByLabelText("预算口径"), "ten-percent");
    await user.clear(screen.getByLabelText("当前暴击率"));
    await user.type(screen.getByLabelText("当前暴击率"), "100");

    expect(screen.getByTestId("gain-critRate")).toHaveTextContent("溢出 10.0%");
  });

  it("switches to a common ten-percentage-point denominator", async () => {
    const user = userEvent.setup();
    render(<DilutionLab />);

    await user.selectOptions(screen.getByLabelText("预算口径"), "ten-percent");

    expect(screen.getByText("统一百分点对照预算")).toBeVisible();
    expect(screen.getByText(/每 10 个百分点/)).toBeVisible();
  });
});
