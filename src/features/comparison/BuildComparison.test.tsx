import { render, screen } from "@testing-library/react";
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
    expect(screen.getByLabelText("B 技能倍率")).toBeDisabled();
    expect(screen.getByLabelText("B 技能倍率")).toHaveValue(
      (screen.getByLabelText("A 技能倍率") as HTMLInputElement).value,
    );
    expect(screen.getByTestId("delta-expected")).toHaveTextContent("0.00%");

    await user.selectOptions(screen.getByLabelText("A 目标"), "310000090");
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

    expect(screen.getByText(/目标战斗数据缺失/)).toBeVisible();
    expect(screen.getByText(/修正无效输入或失效的数据引用/)).toBeVisible();
    await user.type(screen.getByLabelText("A 目标抗性"), "15");
    expect(screen.queryByText(/修正无效输入或失效的数据引用/)).not.toBeInTheDocument();
  });
});
