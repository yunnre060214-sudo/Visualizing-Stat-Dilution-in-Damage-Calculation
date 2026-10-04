import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { DEFAULT_PERSISTED_STATE, type PersistedStateV2 } from "../../store/persistedState";
import { BuildComparison } from "./BuildComparison";

const copyState = (): PersistedStateV2 => JSON.parse(JSON.stringify(DEFAULT_PERSISTED_STATE));

describe("BuildComparison", () => {
  it("preserves and diagnoses a missing catalog reference", () => {
    const state = copyState();
    state.buildA.characterId = "removed-character";

    render(<BuildComparison initialState={state} />);

    expect(screen.getByText("角色数据已不存在")).toBeVisible();
    expect(screen.getByDisplayValue("removed-character")).toBeInTheDocument();
  });

  it("shows signed expected-damage deltas for two editable builds", () => {
    const state = copyState();
    state.buildA.panel.attack = "2000";
    state.buildB.panel.attack = "2200";

    render(<BuildComparison initialState={state} />);

    expect(screen.getByTestId("delta-expected")).toHaveTextContent("+");
    expect(screen.getByTestId("delta-expected")).toHaveTextContent("+10.00%");
  });

  it("uses one action and target by default, then permits independent overrides", async () => {
    const user = userEvent.setup();
    render(<BuildComparison initialState={copyState()} />);

    expect(screen.getByLabelText("B 伤害动作")).toBeDisabled();
    expect(screen.getByLabelText("B 目标")).toBeDisabled();

    await user.click(screen.getByLabelText("B 使用独立动作"));
    await user.click(screen.getByLabelText("B 使用独立目标"));

    expect(screen.getByLabelText("B 伤害动作")).toBeEnabled();
    expect(screen.getByLabelText("B 目标")).toBeEnabled();
  });

  it("links the effective action multiplier and target resistance, not only their IDs", async () => {
    const user = userEvent.setup();
    render(<BuildComparison initialState={copyState()} />);

    await user.selectOptions(screen.getByLabelText("A 伤害动作"), "1304002001");
    await user.click(screen.getByRole("tab", { name: "A 面板参数" }));
    await user.click(screen.getByRole("tab", { name: "B 面板参数" }));
    expect(screen.getByLabelText("B 技能倍率")).toBeDisabled();
    expect(screen.getByLabelText("B 技能倍率")).toHaveValue(
      (screen.getByLabelText("A 技能倍率") as HTMLInputElement).value,
    );
    expect(screen.getByTestId("delta-expected")).toHaveTextContent("0.00%");

    await user.click(screen.getByRole("tab", { name: "A 目录选择" }));
    await user.selectOptions(screen.getByLabelText("A 目标"), "310000090");
    await user.click(screen.getByRole("tab", { name: "A 面板参数" }));
    expect(screen.getByLabelText("B 目标抗性")).toBeDisabled();
    expect(screen.getByLabelText("B 目标抗性")).toHaveValue(
      (screen.getByLabelText("A 目标抗性") as HTMLInputElement).value,
    );
    expect(screen.getByTestId("delta-expected")).toHaveTextContent("0.00%");
  });

  it("blocks manual targets until a resistance override is supplied", async () => {
    const user = userEvent.setup();
    render(<BuildComparison initialState={copyState()} />);

    await user.selectOptions(screen.getByLabelText("A 目标"), "310001030");
    await user.click(screen.getByRole("tab", { name: "A 面板参数" }));

    expect(screen.getByText(/目标战斗数据缺失/)).toBeVisible();
    expect(screen.getByText(/修正无效输入或失效的数据引用/)).toBeVisible();
    await user.type(screen.getByLabelText("A 目标抗性"), "15");
    expect(screen.queryByText(/修正无效输入或失效的数据引用/)).not.toBeInTheDocument();
  });

  it("switches each build editor between catalog and panel fields", async () => {
    const user = userEvent.setup();
    render(<BuildComparison initialState={copyState()} />);

    expect(screen.getByLabelText("A 角色")).toBeVisible();
    expect(screen.queryByLabelText("A 面板攻击")).not.toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "A 面板参数" }));
    expect(screen.getByLabelText("A 面板攻击")).toBeVisible();
    expect(screen.queryByLabelText("A 角色")).not.toBeInTheDocument();
  });

  it("keeps comparison output in a result rail", () => {
    render(<BuildComparison initialState={copyState()} />);

    const rail = screen.getByRole("complementary", { name: "对比结果" });
    expect(within(rail).getByTestId("delta-expected")).toBeVisible();
    expect(within(rail).getByText("差值与斜率")).toBeVisible();
  });

  it("keeps JSON configuration tools collapsed until requested", async () => {
    const user = userEvent.setup();
    render(<BuildComparison initialState={copyState()} />);

    const toggle = screen.getByRole("button", { name: "配置工具" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByLabelText("配置 JSON")).not.toBeInTheDocument();
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    await user.click(screen.getByRole("button", { name: "导出 JSON" }));
    expect((screen.getByLabelText("配置 JSON") as HTMLTextAreaElement).value).toContain("schemaVersion");
  });
});
