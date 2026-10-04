import { describe, expect, it } from "vitest";
import { auditCatalog, loadGameData } from "../../src/data/catalog";

describe("generated data audit", () => {
  it("matches every generated file to the manifest", () => {
    const catalog = loadGameData();
    const audit = auditCatalog(catalog, catalog.manifest);

    expect(audit.countMismatches).toEqual([]);
    expect(audit.checksumMismatches).toEqual([]);
  });

  it("has no dangling skill, weapon, buff, or icon references", () => {
    const catalog = loadGameData();

    expect(auditCatalog(catalog, catalog.manifest).danglingReferences).toEqual([]);
  });

  it("detects a generated collection changed without a manifest update", () => {
    const catalog = loadGameData();
    const tampered = { ...catalog, weapons: catalog.weapons.slice(1) };
    const audit = auditCatalog(tampered, catalog.manifest);

    expect(audit.countMismatches).toContainEqual({
      collection: "weapons",
      expected: catalog.manifest.counts.weapons,
      actual: catalog.weapons.length - 1,
    });
    expect(audit.checksumMismatches.some((entry) => entry.collection === "weapons")).toBe(true);
  });
});
