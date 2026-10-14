/**
 * Games made while signed out live in this browser's localStorage, one entry
 * per game under an `ls-<timestamp>` key (see createWorld in
 * actions/main-actions.tsx and lessons/start-lesson.ts). The editor's
 * LocalStorageAdapter (components/editor-page.tsx) keeps each entry up to date:
 *
 *   { id, name?, thumbnail?, data?, updatedAt?, unsavedData?, unsavedDataUpdatedAt? }
 *
 * `data` and `thumbnail` change on an explicit save; autosaves only write the
 * draft (`unsavedData`). Once a game has been moved to an account the entry is
 * replaced with `{ uploadedAsId }`, which only exists to redirect old links.
 *
 * Storage can be missing, full, blocked, or hold anything at all (another
 * version of Codako, a half-written entry), so everything here reads
 * defensively and never throws.
 */

export type LocalWorld = {
  /** The localStorage key, which is also the world's id in the editor URL. */
  storageKey: string;
  name: string;
  /** A data: URL of the stage, or null if the game was never saved with one. */
  thumbnail: string | null;
  /** When it was last changed (saved or autosaved), as an ISO string. */
  updatedAt: string | null;
  /** When it was made, from the key's timestamp. */
  createdAt: string | null;
};

export const UNTITLED_LOCAL_WORLD = "Untitled game";

const KEY_PATTERN = /^ls-(\d+)$/;

/** Where a local game opens: the editor, reading from this browser. */
export function localWorldHref(storageKey: string) {
  return `/editor/${storageKey}?localstorage=true`;
}

function defaultStorage(): Storage | null {
  try {
    // Reading window.localStorage itself throws when site data is blocked.
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readRecord(storage: Storage, key: string): Record<string, any> | null {
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function validDate(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date.toISOString();
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function metadataName(data: any): string | null {
  return nonEmptyString(data?.world?.metadata?.name);
}

function keysOf(storage: Storage): string[] {
  const keys: string[] = [];
  try {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && KEY_PATTERN.test(key)) keys.push(key);
    }
  } catch {
    // Listing can fail midway if storage goes away; use what we got.
  }
  return keys;
}

/**
 * Every game saved in this browser, most recently changed first. Skips games
 * already moved to an account, and blank ones that were opened and left
 * without anything in them (the server throws those away too).
 */
export function listLocalWorlds(storage: Storage | null = defaultStorage()): LocalWorld[] {
  if (!storage) return [];

  const worlds: LocalWorld[] = [];
  for (const key of keysOf(storage)) {
    const record = readRecord(storage, key);
    if (!record || record.uploadedAsId) continue;
    if (record.data == null && record.unsavedData == null) continue;

    const createdAt = validDate(Number(KEY_PATTERN.exec(key)![1]));
    const saved = validDate(record.updatedAt);
    const drafted = validDate(record.unsavedDataUpdatedAt);
    const updatedAt =
      saved && drafted ? (saved > drafted ? saved : drafted) : (saved ?? drafted ?? createdAt);

    const thumbnail = nonEmptyString(record.thumbnail);

    worlds.push({
      storageKey: key,
      name:
        nonEmptyString(record.name) ??
        metadataName(record.unsavedData) ??
        metadataName(record.data) ??
        UNTITLED_LOCAL_WORLD,
      // The server's placeholder for "no picture" is "#".
      thumbnail: thumbnail && thumbnail !== "#" ? thumbnail : null,
      updatedAt,
      createdAt,
    });
  }

  return worlds.sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
}

/** Remove a game from this browser. Returns false if storage refused. */
export function deleteLocalWorld(
  storageKey: string,
  storage: Storage | null = defaultStorage(),
): boolean {
  if (!storage || !KEY_PATTERN.test(storageKey)) return false;
  try {
    storage.removeItem(storageKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Make the newest version of a game its saved version, the way the editor's
 * "save" does. Moving a game to an account copies only its saved `data`, and
 * a game made signed out is often only ever autosaved as a draft — without
 * this, the copy in the account would come out empty or out of date.
 */
export function commitLocalDraft(
  storageKey: string,
  storage: Storage | null = defaultStorage(),
): boolean {
  if (!storage) return false;
  const record = readRecord(storage, storageKey);
  if (!record || record.uploadedAsId || record.unsavedData == null) return false;

  const saved = validDate(record.updatedAt);
  const drafted = validDate(record.unsavedDataUpdatedAt);
  const draftIsNewer = record.data == null || !saved || !drafted || drafted > saved;
  if (!draftIsNewer) return false;

  record.data = record.unsavedData;
  delete record.unsavedData;
  delete record.unsavedDataUpdatedAt;
  record.updatedAt = new Date().toISOString();
  try {
    storage.setItem(storageKey, JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}
