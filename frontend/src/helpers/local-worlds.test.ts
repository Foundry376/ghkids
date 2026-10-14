import { expect } from "chai";

import {
  commitLocalDraft,
  deleteLocalWorld,
  listLocalWorlds,
  localWorldHref,
  UNTITLED_LOCAL_WORLD,
} from "./local-worlds";

/** Just enough of the Storage interface, kept in insertion order. */
class MemoryStorage implements Storage {
  private items = new Map<string, string>();
  get length() {
    return this.items.size;
  }
  key(i: number) {
    return [...this.items.keys()][i] ?? null;
  }
  getItem(key: string) {
    return this.items.has(key) ? this.items.get(key)! : null;
  }
  setItem(key: string, value: string) {
    this.items.set(key, String(value));
  }
  removeItem(key: string) {
    this.items.delete(key);
  }
  clear() {
    this.items.clear();
  }
}

const put = (storage: Storage, key: string, value: unknown) =>
  storage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));

describe("local worlds", () => {
  let storage: MemoryStorage;
  beforeEach(() => {
    storage = new MemoryStorage();
  });

  describe("listLocalWorlds", () => {
    it("reads name, thumbnail and dates from a saved game", () => {
      put(storage, "ls-1700000000000", {
        id: "ls-1700000000000",
        name: "Frog Jump",
        thumbnail: "data:image/png;base64,AAA",
        data: { world: {} },
        updatedAt: "2026-10-01T10:00:00.000Z",
      });
      expect(listLocalWorlds(storage)).to.deep.equal([
        {
          storageKey: "ls-1700000000000",
          name: "Frog Jump",
          thumbnail: "data:image/png;base64,AAA",
          updatedAt: "2026-10-01T10:00:00.000Z",
          createdAt: new Date(1700000000000).toISOString(),
        },
      ]);
    });

    it("falls back for a game that was only ever autosaved", () => {
      put(storage, "ls-1700000000000", {
        id: "ls-1700000000000",
        unsavedData: { world: {} },
        unsavedDataUpdatedAt: "2026-10-02T10:00:00.000Z",
      });
      const [world] = listLocalWorlds(storage);
      expect(world.name).to.equal(UNTITLED_LOCAL_WORLD);
      expect(world.thumbnail).to.equal(null);
      expect(world.updatedAt).to.equal("2026-10-02T10:00:00.000Z");
    });

    it("uses the name inside the game when the entry has none", () => {
      put(storage, "ls-1", { data: { world: { metadata: { name: "Space Cats" } } } });
      expect(listLocalWorlds(storage)[0].name).to.equal("Space Cats");
    });

    it("uses the newer of the saved and draft times, then the key's time", () => {
      put(storage, "ls-1", {
        data: {},
        updatedAt: "2026-10-03T00:00:00.000Z",
        unsavedData: {},
        unsavedDataUpdatedAt: "2026-10-01T00:00:00.000Z",
      });
      put(storage, "ls-2", { data: {}, updatedAt: "not a date" });
      const worlds = listLocalWorlds(storage);
      expect(worlds.map((w) => w.updatedAt)).to.deep.equal([
        "2026-10-03T00:00:00.000Z",
        new Date(2).toISOString(),
      ]);
    });

    it("treats the server's '#' placeholder as no picture", () => {
      put(storage, "ls-1", { data: {}, thumbnail: "#" });
      expect(listLocalWorlds(storage)[0].thumbnail).to.equal(null);
    });

    it("sorts most recently changed first", () => {
      put(storage, "ls-1", { data: {}, updatedAt: "2026-01-01T00:00:00.000Z" });
      put(storage, "ls-2", { data: {}, updatedAt: "2026-03-01T00:00:00.000Z" });
      put(storage, "ls-3", { data: {}, updatedAt: "2026-02-01T00:00:00.000Z" });
      expect(listLocalWorlds(storage).map((w) => w.storageKey)).to.deep.equal([
        "ls-2",
        "ls-3",
        "ls-1",
      ]);
    });

    it("skips uploaded, blank, corrupt and unrelated entries", () => {
      put(storage, "ls-1", { uploadedAsId: 42 });
      put(storage, "ls-2", { id: "ls-2" });
      put(storage, "ls-3", "{not json");
      put(storage, "ls-4", "[1,2]");
      put(storage, "ls-5", "null");
      put(storage, "ls-abc", { data: {} });
      put(storage, "theme", { data: {} });
      put(storage, "ls-6", { data: {} });
      expect(listLocalWorlds(storage).map((w) => w.storageKey)).to.deep.equal(["ls-6"]);
    });

    it("returns nothing when storage is unavailable or throws", () => {
      expect(listLocalWorlds(null)).to.deep.equal([]);
      const broken = {
        get length(): number {
          throw new Error("SecurityError");
        },
      } as unknown as Storage;
      expect(listLocalWorlds(broken)).to.deep.equal([]);
    });
  });

  describe("deleteLocalWorld", () => {
    it("removes only game entries", () => {
      put(storage, "ls-1", { data: {} });
      put(storage, "theme", "dark");
      expect(deleteLocalWorld("ls-1", storage)).to.equal(true);
      expect(deleteLocalWorld("theme", storage)).to.equal(false);
      expect(storage.getItem("ls-1")).to.equal(null);
      expect(storage.getItem("theme")).to.equal("dark");
    });

    it("reports failure instead of throwing", () => {
      const broken = {
        removeItem() {
          throw new Error("nope");
        },
      } as unknown as Storage;
      expect(deleteLocalWorld("ls-1", broken)).to.equal(false);
      expect(deleteLocalWorld("ls-1", null)).to.equal(false);
    });
  });

  describe("commitLocalDraft", () => {
    it("makes a draft-only game's draft its saved data", () => {
      put(storage, "ls-1", { id: "ls-1", unsavedData: { v: 2 }, unsavedDataUpdatedAt: "x" });
      expect(commitLocalDraft("ls-1", storage)).to.equal(true);
      const record = JSON.parse(storage.getItem("ls-1")!);
      expect(record.data).to.deep.equal({ v: 2 });
      expect(record).not.to.have.property("unsavedData");
      expect(record).not.to.have.property("unsavedDataUpdatedAt");
    });

    it("prefers a draft newer than the saved data", () => {
      put(storage, "ls-1", {
        data: { v: 1 },
        updatedAt: "2026-10-01T00:00:00.000Z",
        unsavedData: { v: 2 },
        unsavedDataUpdatedAt: "2026-10-02T00:00:00.000Z",
      });
      expect(commitLocalDraft("ls-1", storage)).to.equal(true);
      expect(JSON.parse(storage.getItem("ls-1")!).data).to.deep.equal({ v: 2 });
    });

    it("leaves an older draft alone, like the editor does", () => {
      const record = {
        data: { v: 1 },
        updatedAt: "2026-10-03T00:00:00.000Z",
        unsavedData: { v: 2 },
        unsavedDataUpdatedAt: "2026-10-02T00:00:00.000Z",
      };
      put(storage, "ls-1", record);
      expect(commitLocalDraft("ls-1", storage)).to.equal(false);
      expect(JSON.parse(storage.getItem("ls-1")!)).to.deep.equal(record);
    });

    it("does nothing without a draft, or for an uploaded or missing game", () => {
      put(storage, "ls-1", { data: { v: 1 } });
      put(storage, "ls-2", { uploadedAsId: 3, unsavedData: {} });
      expect(commitLocalDraft("ls-1", storage)).to.equal(false);
      expect(commitLocalDraft("ls-2", storage)).to.equal(false);
      expect(commitLocalDraft("ls-9", storage)).to.equal(false);
    });
  });

  it("opens local games in the editor from this browser", () => {
    expect(localWorldHref("ls-5")).to.equal("/editor/ls-5?localstorage=true");
  });
});
