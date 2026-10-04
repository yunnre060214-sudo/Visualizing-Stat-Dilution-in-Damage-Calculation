import { createElement } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CharacterIcon } from "../components/CharacterIcon";
import { findCharacter, findWeapon, loadGameData } from "./catalog";

describe("game data catalog", () => {
  it("loads every 3.7 resonator with at least one parsed damage action", () => {
    const catalog = loadGameData();

    expect(catalog.manifest.gameVersion).toBe("3.7");
    expect(catalog.characters).toHaveLength(catalog.manifest.counts.characters);
    expect(catalog.weapons.every((weapon) => weapon.quality === 4 || weapon.quality === 5)).toBe(true);
    expect(
      catalog.characters.filter((character) =>
        character.actions.some((action) => action.parseStatus === "parsed"),
      ),
    ).toHaveLength(catalog.characters.length);
  });

  it("finds catalog records by stable string ID", () => {
    const catalog = loadGameData();
    const character = catalog.characters[0];
    const weapon = catalog.weapons[0];

    expect(findCharacter(character.id)).toEqual(character);
    expect(findWeapon(weapon.id)).toEqual(weapon);
    expect(findCharacter("removed-character")).toBeUndefined();
  });

  it("falls back to an element-labelled initial when a remote icon fails", () => {
    render(
      createElement(CharacterIcon, {
        name: "今汐",
        element: "spectro",
        src: "https://invalid.example/icon.png",
      }),
    );

    fireEvent.error(screen.getByRole("img", { name: "今汐" }));

    expect(screen.getByText("今")).toHaveAttribute("data-element", "spectro");
  });
});
