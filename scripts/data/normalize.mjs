#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  normalizeCharacter,
  normalizeEcho,
  normalizeMonster,
  normalizeWeapon,
  preferRemoteIcon,
  sortByNumericId,
} from "./lib.mjs";

function parseArguments(argv) {
  const argumentsByName = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (!current.startsWith("--")) throw new Error(`Unexpected argument: ${current}`);
    const name = current.slice(2);
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Missing value for --${name}`);
    }
    argumentsByName.set(name, value);
    index += 1;
  }

  const input = argumentsByName.get("input");
  const output = argumentsByName.get("output");
  if (!input || !output) {
    throw new Error("Usage: npm run data:normalize -- --input <directory> --output <directory>");
  }
  const gameVersion = argumentsByName.get("game-version");
  const fetchedAt = argumentsByName.get("fetched-at");
  if ((gameVersion === undefined) !== (fetchedAt === undefined)) {
    throw new Error("--game-version and --fetched-at must be provided together");
  }
  return { input, output, gameVersion, fetchedAt };
}

async function collectJsonFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name, "en"))) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectJsonFiles(entryPath));
    if (entry.isFile() && entry.name.endsWith(".json") && !entry.name.startsWith("_")) {
      files.push(entryPath);
    }
  }
  return files;
}

function classifyRecord(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  if ("ItemId" in value && "Properties" in value) return "weapon";
  if ("ItemId" in value && "MonsterId" in value && "Skill" in value) return "echo";
  if ("Id" in value && "Skills" in value && "Properties" in value) return "character";
  if ("Id" in value && "GrowthRates" in value && "Properties" in value) return "monster";
  return null;
}

function expectedRecordType(input, file, value) {
  const names = new Map([
    ["character", "character"],
    ["characters", "character"],
    ["weapon", "weapon"],
    ["weapons", "weapon"],
    ["echo", "echo"],
    ["echoes", "echo"],
    ["monster", "monster"],
    ["monsters", "monster"],
    ["target", "monster"],
    ["targets", "monster"],
  ]);
  const relative = path.relative(input, file);
  const firstSegment = relative.split(path.sep)[0].replace(/\.json$/u, "");
  const expected = names.get(firstSegment);
  if (expected) return expected;
  const classified = classifyRecord(value);
  if (classified) return classified;
  const id = value && typeof value === "object"
    ? value.Id ?? value.ItemId ?? value.MonsterId ?? "unknown"
    : "unknown";
  throw new Error(`Unrecognized detail record ${id} at ${relative}`);
}

function serializeJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function readOptionalJson(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") return null;
    throw error;
  }
}

export async function normalizeDirectory(input, output, metadata = {}) {
  const files = await collectJsonFiles(input);
  const weaponList = await readOptionalJson(path.join(input, "weapon", "_list.json"));
  const weaponIconById = new Map(
    Array.isArray(weaponList?.weapons)
      ? weaponList.weapons.map((weapon) => [String(weapon.Id), weapon.Icon])
      : [],
  );
  const characters = [];
  const weapons = [];
  const echoes = [];
  const targets = [];

  for (const file of files) {
    const raw = JSON.parse(await readFile(file, "utf8"));
    const recordType = expectedRecordType(input, file, raw);
    if (recordType === "character") characters.push(normalizeCharacter(raw));
    if (recordType === "weapon") {
      const weapon = normalizeWeapon(raw);
      weapon.iconUrl = preferRemoteIcon(weapon.iconUrl, weaponIconById.get(weapon.id));
      weapons.push(weapon);
    }
    if (recordType === "echo") echoes.push(normalizeEcho(raw));
    if (recordType === "monster") targets.push(normalizeMonster(raw));
  }

  await mkdir(output, { recursive: true });
  const collections = {
    characters: sortByNumericId(characters),
    weapons: sortByNumericId(weapons.filter((weapon) => weapon.quality >= 4)),
    echoes: sortByNumericId(echoes),
    targets: sortByNumericId(targets),
  };
  const serialized = Object.fromEntries(
    Object.entries(collections).map(([name, records]) => [name, serializeJson(records)]),
  );
  await Promise.all(
    Object.entries(serialized).map(([name, contents]) =>
      writeFile(path.join(output, `${name}.json`), contents, "utf8"),
    ),
  );

  if (metadata.gameVersion !== undefined && metadata.fetchedAt !== undefined) {
    if (Number.isNaN(Date.parse(metadata.fetchedAt))) {
      throw new Error("--fetched-at must be an ISO-8601 timestamp");
    }
    const names = Object.keys(collections);
    const manifest = {
      schemaVersion: 1,
      gameVersion: metadata.gameVersion,
      fetchedAt: new Date(metadata.fetchedAt).toISOString(),
      provider: {
        name: "encore.moe",
        baseUrl: "https://api-v2.encore.moe/api",
        language: "zh-Hans",
      },
      normalizerVersion: "1",
      files: Object.fromEntries(names.map((name) => [name, `${name}.json`])),
      counts: Object.fromEntries(names.map((name) => [name, collections[name].length])),
      checksums: Object.fromEntries(names.map((name) => [name, sha256(serialized[name])])),
    };
    await writeFile(path.join(output, "manifest.json"), serializeJson(manifest), "utf8");
  }

  return Object.fromEntries(
    Object.entries(collections).map(([name, records]) => [name, records.length]),
  );
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(currentFile)) {
  try {
    const { input, output, gameVersion, fetchedAt } = parseArguments(process.argv.slice(2));
    const counts = await normalizeDirectory(input, output, { gameVersion, fetchedAt });
    process.stdout.write(
      `Normalized ${counts.characters} character(s), ${counts.weapons} weapon(s), `
      + `${counts.echoes} echo(es), and ${counts.targets} target(s) into ${output}\n`,
    );
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
