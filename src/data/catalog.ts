import charactersJson from "./generated/characters.json";
import echoesJson from "./generated/echoes.json";
import manifestJson from "./generated/manifest.json";
import targetsJson from "./generated/targets.json";
import weaponsJson from "./generated/weapons.json";
import { COMMON_BUFFS, type SourcedBuffEffect } from "./rules/commonBuffs";
import {
  dataManifestSchema,
  normalizedCharactersSchema,
  normalizedEchoesSchema,
  normalizedTargetsSchema,
  normalizedWeaponsSchema,
} from "./schema";
import type {
  CatalogCollection,
  DataManifest,
  NormalizedCharacter,
  NormalizedEcho,
  NormalizedTarget,
  NormalizedWeapon,
} from "./types";

export interface GameDataCatalog {
  manifest: DataManifest;
  characters: NormalizedCharacter[];
  weapons: NormalizedWeapon[];
  echoes: NormalizedEcho[];
  targets: NormalizedTarget[];
  buffs: SourcedBuffEffect[];
}

export interface CountMismatch {
  collection: CatalogCollection;
  expected: number;
  actual: number;
}

export interface ChecksumMismatch {
  collection: CatalogCollection;
  expected: string;
  actual: string;
}

export interface CatalogAuditResult {
  countMismatches: CountMismatch[];
  checksumMismatches: ChecksumMismatch[];
  danglingReferences: string[];
}

const catalog: GameDataCatalog = {
  manifest: dataManifestSchema.parse(manifestJson) as DataManifest,
  characters: normalizedCharactersSchema.parse(charactersJson) as NormalizedCharacter[],
  weapons: normalizedWeaponsSchema.parse(weaponsJson) as NormalizedWeapon[],
  echoes: normalizedEchoesSchema.parse(echoesJson) as NormalizedEcho[],
  targets: normalizedTargetsSchema.parse(targetsJson) as NormalizedTarget[],
  buffs: COMMON_BUFFS,
};

const charactersById = new Map(catalog.characters.map((character) => [character.id, character]));
const weaponsById = new Map(catalog.weapons.map((weapon) => [weapon.id, weapon]));

export function loadGameData(): GameDataCatalog {
  return catalog;
}

export function findCharacter(id: string): NormalizedCharacter | undefined {
  return charactersById.get(id);
}

export function findWeapon(id: string): NormalizedWeapon | undefined {
  return weaponsById.get(id);
}

function rotateRight(value: number, shift: number): number {
  return (value >>> shift) | (value << (32 - shift));
}

function sha256(value: string): string {
  const constants = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
    0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
    0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
    0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
    0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
    0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];
  const state = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];
  const source = new TextEncoder().encode(value);
  const padding = (64 - ((source.length + 9) % 64)) % 64;
  const message = new Uint8Array(source.length + 9 + padding);
  message.set(source);
  message[source.length] = 0x80;
  const view = new DataView(message.buffer);
  const bitLength = source.length * 8;
  view.setUint32(message.length - 8, Math.floor(bitLength / 0x1_0000_0000));
  view.setUint32(message.length - 4, bitLength >>> 0);

  const words = new Uint32Array(64);
  for (let offset = 0; offset < message.length; offset += 64) {
    for (let index = 0; index < 16; index += 1) {
      words[index] = view.getUint32(offset + index * 4);
    }
    for (let index = 16; index < 64; index += 1) {
      const left = words[index - 15];
      const right = words[index - 2];
      const sigma0 = rotateRight(left, 7) ^ rotateRight(left, 18) ^ (left >>> 3);
      const sigma1 = rotateRight(right, 17) ^ rotateRight(right, 19) ^ (right >>> 10);
      words[index] = (words[index - 16] + sigma0 + words[index - 7] + sigma1) >>> 0;
    }

    let [a, b, c, d, e, f, g, h] = state;
    for (let index = 0; index < 64; index += 1) {
      const sum1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const choose = (e & f) ^ (~e & g);
      const temp1 = (h + sum1 + choose + constants[index] + words[index]) >>> 0;
      const sum0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (sum0 + majority) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    state[0] = (state[0] + a) >>> 0;
    state[1] = (state[1] + b) >>> 0;
    state[2] = (state[2] + c) >>> 0;
    state[3] = (state[3] + d) >>> 0;
    state[4] = (state[4] + e) >>> 0;
    state[5] = (state[5] + f) >>> 0;
    state[6] = (state[6] + g) >>> 0;
    state[7] = (state[7] + h) >>> 0;
  }

  return state.map((part) => part.toString(16).padStart(8, "0")).join("");
}

function serializedCollection(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function duplicateIds<T extends { id: string }>(records: T[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const record of records) {
    if (seen.has(record.id)) duplicates.add(record.id);
    seen.add(record.id);
  }
  return [...duplicates].sort();
}

export function auditCatalog(
  candidate: GameDataCatalog,
  manifest: DataManifest,
): CatalogAuditResult {
  const collections = {
    characters: candidate.characters,
    weapons: candidate.weapons,
    echoes: candidate.echoes,
    targets: candidate.targets,
  } satisfies Record<CatalogCollection, unknown[]>;
  const countMismatches: CountMismatch[] = [];
  const checksumMismatches: ChecksumMismatch[] = [];
  const danglingReferences: string[] = [];

  for (const name of Object.keys(collections) as CatalogCollection[]) {
    const actualCount = collections[name].length;
    if (actualCount !== manifest.counts[name]) {
      countMismatches.push({ collection: name, expected: manifest.counts[name], actual: actualCount });
    }
    const actualChecksum = sha256(serializedCollection(collections[name]));
    if (actualChecksum !== manifest.checksums[name]) {
      checksumMismatches.push({
        collection: name,
        expected: manifest.checksums[name],
        actual: actualChecksum,
      });
    }
  }

  const allProviderIds = new Set([
    ...candidate.characters.map((entry) => entry.id),
    ...candidate.weapons.map((entry) => entry.id),
    ...candidate.echoes.map((entry) => entry.id),
  ]);
  const weaponTypes = new Set(candidate.weapons.map((weapon) => weapon.weaponType.id));

  for (const collection of Object.keys(collections) as CatalogCollection[]) {
    for (const id of duplicateIds(collections[collection] as { id: string }[])) {
      danglingReferences.push(`${collection}:${id}:duplicate-id`);
    }
  }
  for (const character of candidate.characters) {
    if (!weaponTypes.has(character.weaponType.id)) {
      danglingReferences.push(`character:${character.id}:weapon-type:${character.weaponType.id}`);
    }
    if (!character.iconUrl) danglingReferences.push(`character:${character.id}:icon`);
    const actionIds = new Set<string>();
    for (const action of character.actions) {
      if (actionIds.has(action.id)) danglingReferences.push(`character:${character.id}:action:${action.id}`);
      actionIds.add(action.id);
      if (!action.skillId) danglingReferences.push(`character:${character.id}:skill`);
    }
  }
  for (const weapon of candidate.weapons) {
    if (!weapon.iconUrl) danglingReferences.push(`weapon:${weapon.id}:icon`);
  }
  for (const echo of candidate.echoes) {
    if (!echo.iconUrl) danglingReferences.push(`echo:${echo.id}:icon`);
  }
  for (const target of candidate.targets) {
    if (!target.iconUrl) danglingReferences.push(`target:${target.id}:icon`);
  }
  for (const buff of candidate.buffs) {
    if (!allProviderIds.has(buff.providerId)) danglingReferences.push(`buff:${buff.id}:provider`);
    if (buff.source.sourceText.trim() === "") danglingReferences.push(`buff:${buff.id}:source`);
  }

  return { countMismatches, checksumMismatches, danglingReferences };
}
