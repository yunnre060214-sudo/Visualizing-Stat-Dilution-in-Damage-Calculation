import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEY } from "../../store/persistedState";
import { actionOptionLabel, Workbench } from "./Workbench";

describe("Workbench", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("separates core configuration, panel input, analysis, and persistent results", () => {
    render(<Workbench />);

    expect(screen.getByRole("heading", { name: "基础配置" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "面板参数" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "详细分析" })).toBeVisible();
    const resultRail = screen.getByRole("complementary", { name: "伤害结果" });
    expect(resultRail).toContainElement(screen.getByTestId("expected-damage"));
    expect(resultRail).toContainElement(screen.getByTestId("non-crit-damage"));
    expect(resultRail).toContainElement(screen.getByTestId("crit-damage"));
  });

  it("shows one analysis tab at a time without changing the build", async () => {
    const user = userEvent.setup();
    render(<Workbench />);
    const initialDamage = screen.getByTestId("expected-damage").textContent;

    expect(screen.getByRole("tab", { name: "乘区追踪" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { name: "乘区追踪" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Buff 来源" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Buff 来源" }));

    expect(screen.getByRole("tab", { name: "Buff 来源" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { name: "Buff 来源" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "乘区追踪" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("面板攻击")).toHaveValue("1000");
    expect(screen.getByTestId("expected-damage")).toHaveTextContent(initialDamage ?? "");
  });

  it("updates all three damage results when attack changes", async () => {
    const user = userEvent.setup();
    render(<Workbench />);

    await user.clear(screen.getByLabelText("面板攻击"));
    await user.type(screen.getByLabelText("面板攻击"), "2400");

    expect(screen.getByTestId("non-crit-damage")).toHaveTextContent("717");
    expect(screen.getByTestId("crit-damage")).toHaveTextContent("1076");
    expect(screen.getByTestId("expected-damage")).toHaveTextContent("735");
  });

  it("offers the checked-in 3.7 character, weapon, and action catalog", async () => {
    const user = userEvent.setup();
    render(<Workbench />);

    expect(screen.getByText(/数据 3\.7/)).toBeVisible();
    expect(screen.getByLabelText("角色").querySelectorAll("option").length).toBeGreaterThan(60);

    await user.selectOptions(screen.getByLabelText("角色"), "1304");

    expect(screen.getByLabelText("角色")).toHaveValue("1304");
    expect(screen.getByLabelText("武器").querySelectorAll("option").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("伤害动作").querySelectorAll("option").length).toBeGreaterThan(0);
  });

  it("initializes the visible panel from the selected catalog loadout", () => {
    render(<Workbench />);

    expect(screen.getByLabelText("技能倍率")).toHaveValue("66.47");
    expect(screen.getByLabelText("面板生命")).toHaveValue("10825");
    expect(screen.getByLabelText("面板防御")).toHaveValue("1258.8866");
  });

  it("recomputes catalog-derived stats when the weapon changes", async () => {
    const user = userEvent.setup();
    render(<Workbench />);
    const before = screen.getByTestId("expected-damage").textContent;

    await user.selectOptions(screen.getByLabelText("武器"), "21010024");

    expect(screen.getByTestId("expected-damage")).not.toHaveTextContent(before ?? "");
    expect(screen.getByText(/武器技能尚未自动应用/)).toBeVisible();
  });

  it("does not offer healing entries as damage actions", async () => {
    const user = userEvent.setup();
    render(<Workbench />);

    await user.selectOptions(screen.getByLabelText("角色"), "1103");

    expect(screen.getByLabelText("伤害动作").querySelector('option[value="1103160002"]')).toBeNull();
  });

  it("labels source actions that require manual confirmation", () => {
    expect(actionOptionLabel({ name: "特殊伤害", parseStatus: "manual" })).toBe(
      "特殊伤害（需手动确认）",
    );
  });

  it("uses the selected action scaling stat instead of forcing attack scaling", async () => {
    const user = userEvent.setup();
    render(<Workbench />);

    await user.selectOptions(screen.getByLabelText("角色"), "1103");
    await user.selectOptions(screen.getByLabelText("伤害动作"), "1103130001");
    const hpScaledDamage = screen.getByTestId("expected-damage").textContent;

    await user.clear(screen.getByLabelText("面板攻击"));
    await user.type(screen.getByLabelText("面板攻击"), "9999");

    expect(screen.getByTestId("expected-damage")).toHaveTextContent(hpScaledDamage ?? "");
  });

  it("keeps invalid input visible and blocks calculation", async () => {
    const user = userEvent.setup();
    render(<Workbench />);

    await user.clear(screen.getByLabelText("面板攻击"));
    await user.type(screen.getByLabelText("面板攻击"), "-");

    expect(screen.getByLabelText("面板攻击")).toHaveValue("-");
    expect(screen.getByRole("alert")).toHaveTextContent("请输入有限数值");
    expect(screen.getByTestId("expected-damage")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("complementary", { name: "伤害结果" })).toHaveTextContent("单次伤害演算");
  });

  it("rejects total critical damage below 100 percent and does not persist it", async () => {
    const user = userEvent.setup();
    render(<Workbench />);

    await user.clear(screen.getByLabelText("暴击伤害"));
    await user.type(screen.getByLabelText("暴击伤害"), "50");

    expect(screen.getByRole("alert")).toHaveTextContent("暴击伤害总倍率必须至少为 100%");
    expect(screen.getByLabelText("暴击伤害")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByTestId("expected-damage")).toHaveAttribute("aria-invalid", "true");
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}")).toMatchObject({
      schemaVersion: 2,
      buildA: { panel: { critDamage: "150" } },
    });
  });

  it("blocks arithmetic overflow while preserving the raw input", async () => {
    const user = userEvent.setup();
    render(<Workbench />);

    await user.clear(screen.getByLabelText("面板攻击"));
    await user.type(screen.getByLabelText("面板攻击"), "1e308");
    await user.clear(screen.getByLabelText("技能倍率"));
    await user.type(screen.getByLabelText("技能倍率"), "3000");

    expect(screen.getByLabelText("面板攻击")).toHaveValue("1e308");
    expect(screen.getByRole("alert")).toHaveTextContent("计算结果超出有限数值范围");
    expect(screen.getByTestId("expected-damage")).toHaveAttribute("aria-invalid", "true");
  });

  it.each([
    ["损坏 JSON", "{"],
    ["旧版结构", JSON.stringify({ schemaVersion: 0 })],
  ])("shows a one-time recovery warning for %s", (_label, stored) => {
    localStorage.setItem(STORAGE_KEY, stored);

    render(<Workbench />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "本地配置已损坏或版本不兼容，已恢复默认值",
    );
    expect(screen.getByTestId("expected-damage")).toHaveTextContent("306");
  });

  it("keeps calculating when browser storage rejects writes", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });

    render(<Workbench />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "浏览器存储不可用，本次配置仅在当前页面保留",
      );
    });
    expect(screen.getByTestId("expected-damage")).toHaveTextContent("306");
  });

  it("announces updated expected damage through a polite live region", async () => {
    const user = userEvent.setup();
    render(<Workbench />);

    await user.clear(screen.getByLabelText("面板攻击"));
    await user.type(screen.getByLabelText("面板攻击"), "2400");

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("期望伤害 735");
    });
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  });
});
