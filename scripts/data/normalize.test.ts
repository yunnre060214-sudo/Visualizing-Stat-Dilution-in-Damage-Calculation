import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { extractResourceIds } from "./fetch-encore.mjs";
import {
  expandSkillAttribute,
  normalizeCharacter,
  normalizeEcho,
  normalizeMonster,
  normalizeWeapon,
  preferRemoteIcon,
} from "./lib.mjs";
import { normalizeDirectory } from "./normalize.mjs";

const fixture = (name: string): unknown =>
  JSON.parse(
    readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "fixtures", `${name}.json`), "utf8"),
  );

describe("expandSkillAttribute", () => {
  it("expands multiplied and additive multi-hit attributes", () => {
    expect(expandSkillAttribute("32.40%×2")).toEqual([0.324, 0.324]);
    expect(expandSkillAttribute("6.99%+10.48%")).toEqual([0.0699, 0.1048]);
  });
});

describe("extractResourceIds", () => {
  it("accepts the live echo list key and sorts IDs numerically", () => {
    expect(extractResourceIds("echo", { Echo: [{ Id: 10 }, { Id: 2 }] })).toEqual(["2", "10"]);
  });
});

describe("preferRemoteIcon", () => {
  it("uses list metadata when a detail record only has an internal asset path", () => {
    expect(
      preferRemoteIcon(
        "/Game/Aki/T_IconWeapon21010036_UI.T_IconWeapon21010036_UI",
        "https://api.encore.moe/resource/T_IconWeapon21010036_UI.webp",
      ),
    ).toBe("https://api.encore.moe/resource/T_IconWeapon21010036_UI.webp");
  });
});

describe("normalizeCharacter", () => {
  it("normalizes level-90 properties and only skill levels 1 through 10", () => {
    const character = normalizeCharacter(fixture("character"));

    expect(character).toMatchObject({
      id: "1304",
      name: "今汐",
      element: { id: "5", name: "衍射" },
      weaponType: { id: "1", name: "长刃" },
      level90: { hp: 10825, atk: 412.5, def: 1258.8866, critRate: 0.05, critDamage: 1.5 },
    });
    expect(character.actions[0].levels).toHaveLength(10);
    expect(character.actions[0].levels[0]).toEqual({
      level: 1,
      source: "32.40%×2",
      hits: [0.324, 0.324],
    });
  });

  it("keeps unparsed actions as manual instead of zero damage", () => {
    const character = normalizeCharacter(fixture("character"));
    const manual = character.actions.find((action: { id: string }) => action.id === "1304200003");

    expect(manual).toMatchObject({ parseStatus: "manual" });
    expect(manual?.levels[0].hits).toEqual([]);
    expect(manual?.parseNotes[0]).toMatch(/根据特殊状态变化/);
  });

  it("treats source schema drift as fatal and names the record", () => {
    expect(() => normalizeCharacter({ Id: 1001 })).toThrow(/1001.*(Properties|Skills)/s);
  });
});

describe("normalizeDirectory", () => {
  it("rejects a detail record whose missing discriminator fields would otherwise skip it", async () => {
    const root = mkdtempSync(join(tmpdir(), "wuwa-schema-drift-"));
    const input = join(root, "input");
    mkdirSync(join(input, "character"), { recursive: true });
    writeFileSync(
      join(input, "character", "1001.json"),
      JSON.stringify({ Id: 1001, Properties: [] }),
    );

    await expect(normalizeDirectory(input, join(root, "output"))).rejects.toThrow(
      /1001.*Skills/s,
    );
  });
});

describe("normalizeWeapon", () => {
  it("normalizes level-90 stats and five resonance parameter ranks", () => {
    const weapon = normalizeWeapon(fixture("weapon"));

    expect(weapon).toMatchObject({
      id: "21010036",
      name: "焰痕",
      quality: 5,
      weaponType: { id: "1", name: "长刃" },
      level90BaseAtk: 587.5,
      secondaryStat: { name: "暴击伤害", value: 0.486, source: "48.60%" },
      effect: { name: "闪耀星火", sourceText: "攻击提升12%/15%/18%/21%/24%。" },
    });
    expect(weapon.effect.parameters[0].values).toEqual([0.12, 0.15, 0.18, 0.21, 0.24]);
  });

  it("treats missing weapon properties as fatal and names the record", () => {
    expect(() => normalizeWeapon({ ItemId: 21010036 })).toThrow(/21010036.*Properties/s);
  });
});

describe("normalizeEcho", () => {
  it("keeps echo skill parameters and sourced set effects", () => {
    const echo = normalizeEcho(fixture("echo"));

    expect(echo).toMatchObject({
      id: "6000038",
      itemId: "60000385",
      name: "幼猿",
      element: { id: "4", name: "气动" },
      phantomType: 1,
      skill: { id: "200045", cooldown: 8, parseStatus: "manual" },
    });
    expect(echo.skill.levelParameters[4]).toEqual(["48.00%+96", "8"]);
    expect(echo.sets[0]).toMatchObject({
      id: "9",
      name: "不绝余音",
      sourceText: "攻击力提升10%",
    });
  });
});

describe("normalizeMonster", () => {
  it("normalizes level-90 target stats and elemental resistances", () => {
    const target = normalizeMonster(fixture("monster"));

    expect(target).toMatchObject({
      id: "310000010",
      name: "先锋幼岩",
      defaultLevel: 90,
      level90: { hp: 258, atk: 183.6, def: 1200 },
      resistances: {
        glacio: 0.1,
        fusion: 0.2,
        electro: 0.1,
        aero: 0.1,
        spectro: 0.1,
        havoc: 0.1,
      },
    });
  });

  it("keeps source records without combat properties as manual targets", () => {
    const raw = fixture("monster") as Record<string, unknown>;
    const target = normalizeMonster({ ...raw, Properties: {}, GrowthRates: {} });

    expect(target.parseStatus).toBe("manual");
    expect(target.level90).toEqual({ hp: null, atk: null, def: null });
    expect(target.resistances.spectro).toBeNull();
    expect(target.parseNotes[0]).toMatch(/Properties/);
  });
});
