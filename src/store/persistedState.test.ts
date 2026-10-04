import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_PERSISTED_STATE,
  LEGACY_STORAGE_KEY,
  STORAGE_KEY,
  decodeShareState,
  encodeShareState,
  exportState,
  importState,
  loadState,
  migrateV1ToV2,
  saveState,
  toShareableState,
  type PersistedStateV1,
  type PersistedStateV2,
} from "./persistedState";

const v1Fixture: PersistedStateV1 = {
  schemaVersion: 1,
  attack: "2400",
  critRate: "60",
  critDamage: "260",
  multiplier: "320",
  resistance: "10",
  selectedActionId: "demo-skill",
};

const v2Fixture = (): PersistedStateV2 => JSON.parse(JSON.stringify(DEFAULT_PERSISTED_STATE));

describe("persisted calculator state", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("recovers from corrupt storage with the current schema", () => {
    localStorage.setItem(STORAGE_KEY, "{");

    expect(loadState(localStorage)).toMatchObject({
      recovered: true,
      state: { schemaVersion: 2 },
    });
  });

  it("migrates a phase-one flat panel into build A", () => {
    expect(migrateV1ToV2(v1Fixture)).toMatchObject({
      schemaVersion: 2,
      buildA: {
        actionId: "demo-skill",
        panel: {
          attack: "2400",
          critRate: "60",
          critDamage: "260",
          multiplier: "320",
          resistance: "10",
        },
      },
    });
  });

  it("loads and migrates the legacy storage key", () => {
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(v1Fixture));

    expect(loadState(localStorage)).toMatchObject({
      recovered: false,
      state: { schemaVersion: 2, buildA: { panel: { attack: "2400" } } },
    });
  });

  it("round-trips a compact share state with numeric overrides", () => {
    const state = v2Fixture();
    state.buildA.panel.attack = "2400";
    state.buildB.actionId = "locally-retained-action";
    const shareable = toShareableState(state);

    expect(decodeShareState(encodeShareState(shareable))).toEqual({ ok: true, state: shareable });
    expect(shareable.buildA.attack).toBe(2400);
    expect(shareable.buildB.actionId).toBe(state.buildA.actionId);
    expect(shareable).not.toHaveProperty("linked");
  });

  it("round-trips a complete configuration through JSON", () => {
    const state = v2Fixture();

    expect(importState(exportState(state))).toEqual({ ok: true, state });
  });

  it("falls back to memory when storage reads throw", () => {
    const throwingStorage = {
      getItem: () => {
        throw new DOMException("denied", "SecurityError");
      },
    } as unknown as Storage;

    expect(loadState(throwingStorage)).toMatchObject({
      recovered: false,
      persistenceAvailable: false,
      state: { schemaVersion: 2 },
    });
  });

  it("reports failed writes without throwing", () => {
    const throwingStorage = {
      setItem: () => {
        throw new DOMException("quota", "QuotaExceededError");
      },
    } as unknown as Storage;

    expect(saveState(throwingStorage, DEFAULT_PERSISTED_STATE)).toBe(false);
  });
});
