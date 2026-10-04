import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_PERSISTED_STATE,
  STORAGE_KEY,
  encodeShareState,
  toShareableState,
  type PersistedStateV2,
} from "./store/persistedState";
import { App } from "./App";

const copyState = (): PersistedStateV2 => JSON.parse(JSON.stringify(DEFAULT_PERSISTED_STATE));
const digits = (value: string | null | undefined) => Number((value ?? "").replace(/\D/gu, ""));

describe("App", () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState(null, "", "/");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the four product views and data version", () => {
    render(<App />);

    expect(screen.getByRole("navigation")).toBeInTheDocument();
    expect(screen.getByText("伤害工作台")).toBeInTheDocument();
    expect(screen.getByText("词条稀释")).toBeInTheDocument();
    expect(screen.getByText("配装对比")).toBeInTheDocument();
    expect(screen.getByText("循环时间轴")).toBeInTheDocument();
    expect(screen.getByText(/数据版本 3\.7/)).toBeInTheDocument();
  });

  it("opens the stat dilution view from the product navigation", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /词条稀释/ }));

    expect(screen.getByRole("heading", { name: "词条稀释实验室" })).toBeVisible();
  });

  it("opens the build comparison view from the product navigation", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /配装对比/ }));

    expect(screen.getByRole("heading", { name: "双方案伤害对比" })).toBeVisible();
  });

  it("uses the same persisted build in workbench, dilution, and comparison", async () => {
    const user = userEvent.setup();
    render(<App />);

    const workbenchDamage = digits(
      screen.getByTestId("expected-damage").querySelector("strong")?.textContent,
    );
    await user.click(screen.getByRole("button", { name: /词条稀释/ }));
    const dilutionDamage = digits(screen.getByText("当前期望伤害").parentElement?.textContent);
    expect(dilutionDamage).toBe(workbenchDamage);

    await user.click(screen.getByRole("button", { name: /配装对比/ }));
    const comparisonA = /A\s+([\d,]+)/u.exec(screen.getByTestId("delta-expected").textContent ?? "");
    expect(Number(comparisonA?.[1].replaceAll(",", ""))).toBe(workbenchDamage);
  });

  it("keeps dilution inputs when navigating between views", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /词条稀释/ }));
    await user.clear(screen.getByLabelText("当前伤害加成"));
    await user.type(screen.getByLabelText("当前伤害加成"), "80");
    await user.click(screen.getByRole("button", { name: /伤害工作台/ }));
    await user.click(screen.getByRole("button", { name: /词条稀释/ }));

    expect(screen.getByLabelText("当前伤害加成")).toHaveValue(80);
  });

  it("hydrates a share URL once and retains later edits across navigation", async () => {
    const user = userEvent.setup();
    const state = copyState();
    state.view = "comparison";
    state.buildB.panel.attack = "2300";
    const encoded = encodeShareState(toShareableState(state));
    window.history.replaceState(null, "", `/?config=${encoded}`);

    render(<App />);
    await user.click(screen.getByRole("tab", { name: "B 面板参数" }));
    await user.clear(screen.getByLabelText("B 面板攻击"));
    await user.type(screen.getByLabelText("B 面板攻击"), "2400");
    await user.click(screen.getByRole("button", { name: /伤害工作台/ }));
    await user.click(screen.getByRole("button", { name: /配装对比/ }));
    await user.click(screen.getByRole("tab", { name: "B 面板参数" }));

    expect(screen.getByLabelText("B 面板攻击")).toHaveValue("2400");
  });

  it("preserves stale catalog references until the user explicitly replaces them", () => {
    const state = copyState();
    state.buildA.characterId = "removed-character";
    state.buildA.weaponId = "removed-weapon";
    state.buildA.actionId = "removed-action";
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

    render(<App />);

    expect(screen.getByText("角色数据已不存在")).toBeVisible();
    expect(screen.getByDisplayValue("removed-character")).toBeInTheDocument();
  });

  it("retains in-page state when browser storage is unavailable", async () => {
    const user = userEvent.setup();
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    render(<App />);

    await user.clear(screen.getByLabelText("面板攻击"));
    await user.type(screen.getByLabelText("面板攻击"), "2400");
    await user.click(screen.getByRole("button", { name: /词条稀释/ }));
    await user.click(screen.getByRole("button", { name: /伤害工作台/ }));

    expect(screen.getByLabelText("面板攻击")).toHaveValue("2400");
  });
});
