import { expect } from "chai";
import { diff, unpatch, Delta } from "./history-diff";

/**
 * Helper: given a before and after state, verify that diff + unpatch
 * round-trips back to the original `before` state.
 */
function expectRoundTrip(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
) {
  const delta = diff(before, after);
  expect(delta).to.not.be.undefined;
  const restored = unpatch(after, delta!);
  expect(restored).to.deep.equal(before);
}

describe("history-diff", () => {
  describe("diff", () => {
    it("should return undefined for identical objects", () => {
      const obj = { a: 1, b: "hello", c: { nested: true } };
      expect(diff(obj, obj)).to.be.undefined;
    });

    it("should return undefined for deep-equal objects", () => {
      const a = { x: { y: { z: 42 } } };
      const b = { x: { y: { z: 42 } } };
      expect(diff(a, b)).to.be.undefined;
    });

    it("should detect a modified primitive", () => {
      const delta = diff({ a: 1 }, { a: 2 });
      expect(delta).to.deep.equal({ a: [1, 2] });
    });

    it("should detect a modified string", () => {
      const delta = diff({ name: "old" }, { name: "new" });
      expect(delta).to.deep.equal({ name: ["old", "new"] });
    });

    it("should detect an added key", () => {
      const delta = diff({}, { a: 42 });
      expect(delta).to.deep.equal({ a: [42] });
    });

    it("should detect a deleted key", () => {
      const delta = diff({ a: 42 }, {});
      expect(delta).to.deep.equal({ a: [42, 0, 0] });
    });

    it("should nest changes in sub-objects", () => {
      const before = { outer: { inner: 1, stable: "yes" } };
      const after = { outer: { inner: 2, stable: "yes" } };
      const delta = diff(before, after);
      expect(delta).to.deep.equal({ outer: { inner: [1, 2] } });
    });

    it("should handle multiple changes at different depths", () => {
      const before = { a: 1, b: { c: 2, d: { e: 3 } } };
      const after = { a: 10, b: { c: 2, d: { e: 30 } } };
      const delta = diff(before, after);
      expect(delta).to.deep.equal({ a: [1, 10], b: { d: { e: [3, 30] } } });
    });

    it("should detect type changes (number to string)", () => {
      const delta = diff({ a: 1 } as Record<string, unknown>, { a: "1" });
      expect(delta).to.deep.equal({ a: [1, "1"] });
    });

    it("should detect changes in arrays (treated as leaf values)", () => {
      const before = { tags: [1, 2, 3] };
      const after = { tags: [1, 2, 4] };
      const delta = diff(
        before as Record<string, unknown>,
        after as Record<string, unknown>,
      );
      expect(delta).to.deep.equal({ tags: [[1, 2, 3], [1, 2, 4]] });
    });

    it("should treat identical arrays as equal", () => {
      const before = { tags: [1, 2, 3] };
      const after = { tags: [1, 2, 3] };
      expect(
        diff(
          before as Record<string, unknown>,
          after as Record<string, unknown>,
        ),
      ).to.be.undefined;
    });

    it("should handle null values", () => {
      const delta = diff(
        { a: null } as Record<string, unknown>,
        { a: 42 } as Record<string, unknown>,
      );
      expect(delta).to.deep.equal({ a: [null, 42] });
    });

    it("should handle value changing to null", () => {
      const delta = diff(
        { a: 42 } as Record<string, unknown>,
        { a: null } as Record<string, unknown>,
      );
      expect(delta).to.deep.equal({ a: [42, null] });
    });

    it("should handle boolean values", () => {
      const delta = diff(
        { flag: true } as Record<string, unknown>,
        { flag: false } as Record<string, unknown>,
      );
      expect(delta).to.deep.equal({ flag: [true, false] });
    });

    it("should handle empty string values", () => {
      const delta = diff({ a: "hello" }, { a: "" });
      expect(delta).to.deep.equal({ a: ["hello", ""] });
    });

    it("should handle value changing from object to primitive", () => {
      const delta = diff(
        { a: { nested: true } } as Record<string, unknown>,
        { a: 42 } as Record<string, unknown>,
      );
      expect(delta).to.deep.equal({ a: [{ nested: true }, 42] });
    });

    it("should handle value changing from primitive to object", () => {
      const delta = diff(
        { a: 42 } as Record<string, unknown>,
        { a: { nested: true } } as Record<string, unknown>,
      );
      expect(delta).to.deep.equal({ a: [42, { nested: true }] });
    });
  });

  describe("unpatch", () => {
    it("should restore a modified primitive", () => {
      const after = { a: 2 };
      const delta: Delta = { a: [1, 2] };
      expect(unpatch(after, delta)).to.deep.equal({ a: 1 });
    });

    it("should restore a deleted key", () => {
      const after = {};
      const delta: Delta = { a: [42, 0, 0] };
      expect(unpatch(after, delta)).to.deep.equal({ a: 42 });
    });

    it("should remove an added key", () => {
      const after = { a: 42 };
      const delta: Delta = { a: [42] };
      expect(unpatch(after, delta)).to.deep.equal({});
    });

    it("should recurse into nested deltas", () => {
      const after = { outer: { inner: 2, stable: "yes" } };
      const delta: Delta = { outer: { inner: [1, 2] } };
      const result = unpatch(
        after as Record<string, unknown>,
        delta,
      );
      expect(result).to.deep.equal({ outer: { inner: 1, stable: "yes" } });
    });

    it("should not mutate the input object", () => {
      const after = { a: 2, b: { c: 3 } };
      const afterCopy = JSON.parse(JSON.stringify(after));
      const delta: Delta = { a: [1, 2], b: { c: [10, 3] } };
      unpatch(after as Record<string, unknown>, delta);
      expect(after).to.deep.equal(afterCopy);
    });

    it("should not mutate nested input objects", () => {
      const inner = { c: 3, d: 4 };
      const after = { b: inner };
      const delta: Delta = { b: { c: [10, 3] } };
      unpatch(after as Record<string, unknown>, delta);
      expect(inner).to.deep.equal({ c: 3, d: 4 });
    });
  });

  describe("round-trip (diff then unpatch)", () => {
    it("should round-trip a single field change", () => {
      expectRoundTrip({ a: 1 }, { a: 2 });
    });

    it("should round-trip added and deleted keys", () => {
      expectRoundTrip({ a: 1, b: 2 }, { b: 2, c: 3 });
    });

    it("should round-trip deeply nested changes", () => {
      expectRoundTrip(
        { l1: { l2: { l3: { value: "old" } } } },
        { l1: { l2: { l3: { value: "new" } } } },
      );
    });

    it("should round-trip actor movement (typical game tick)", () => {
      const before = {
        stages: {
          s1: {
            actors: {
              a1: { id: "a1", characterId: "c1", position: { x: 0, y: 0 }, appearance: "idle", variableValues: {} },
              a2: { id: "a2", characterId: "c2", position: { x: 3, y: 3 }, appearance: "walk", variableValues: {} },
              a3: { id: "a3", characterId: "c1", position: { x: 5, y: 5 }, appearance: "idle", variableValues: {} },
            },
          },
        },
        globals: {
          keypress: { id: "keypress", name: "keypress", value: "ArrowRight" },
          click: { id: "click", name: "click", value: "" },
        },
        input: { keys: { ArrowRight: true }, clicks: {} },
        evaluatedRuleDetails: {},
      };

      const after = {
        stages: {
          s1: {
            actors: {
              a1: { id: "a1", characterId: "c1", position: { x: 1, y: 0 }, appearance: "idle", variableValues: {} },
              a2: { id: "a2", characterId: "c2", position: { x: 3, y: 3 }, appearance: "walk", variableValues: {} },
              a3: { id: "a3", characterId: "c1", position: { x: 5, y: 5 }, appearance: "idle", variableValues: {} },
            },
          },
        },
        globals: {
          keypress: { id: "keypress", name: "keypress", value: "" },
          click: { id: "click", name: "click", value: "" },
        },
        input: { keys: {}, clicks: {} },
        evaluatedRuleDetails: {
          a1: { r1: { passed: true, squares: [], conditions: [], matchedActors: {} } },
        },
      };

      expectRoundTrip(
        before as Record<string, unknown>,
        after as Record<string, unknown>,
      );
    });

    it("should round-trip actor deletion", () => {
      const before = {
        stages: {
          s1: {
            actors: {
              a1: { id: "a1", characterId: "c1", position: { x: 0, y: 0 } },
              a2: { id: "a2", characterId: "c2", position: { x: 5, y: 5 } },
            },
          },
        },
      };
      const after = {
        stages: {
          s1: {
            actors: {
              a1: { id: "a1", characterId: "c1", position: { x: 1, y: 0 } },
            },
          },
        },
      };
      expectRoundTrip(
        before as Record<string, unknown>,
        after as Record<string, unknown>,
      );
    });

    it("should round-trip actor creation", () => {
      const before = {
        stages: {
          s1: {
            actors: {
              a1: { id: "a1", characterId: "c1", position: { x: 0, y: 0 } },
            },
          },
        },
      };
      const after = {
        stages: {
          s1: {
            actors: {
              a1: { id: "a1", characterId: "c1", position: { x: 0, y: 0 } },
              a2: { id: "a2", characterId: "c2", position: { x: 7, y: 7 } },
            },
          },
        },
      };
      expectRoundTrip(
        before as Record<string, unknown>,
        after as Record<string, unknown>,
      );
    });

    it("should round-trip simultaneous add, delete, and modify", () => {
      const before = {
        stages: {
          s1: {
            actors: {
              a1: { id: "a1", position: { x: 0, y: 0 } },
              a2: { id: "a2", position: { x: 5, y: 5 } },
            },
          },
        },
      };
      const after = {
        stages: {
          s1: {
            actors: {
              a1: { id: "a1", position: { x: 1, y: 0 } },
              a3: { id: "a3", position: { x: 9, y: 9 } },
            },
          },
        },
      };
      expectRoundTrip(
        before as Record<string, unknown>,
        after as Record<string, unknown>,
      );
    });

    it("should round-trip variable value changes", () => {
      const before = {
        stages: {
          s1: {
            actors: {
              a1: { id: "a1", variableValues: { health: "100", score: "0" } },
            },
          },
        },
      };
      const after = {
        stages: {
          s1: {
            actors: {
              a1: { id: "a1", variableValues: { health: "90", score: "10" } },
            },
          },
        },
      };
      expectRoundTrip(
        before as Record<string, unknown>,
        after as Record<string, unknown>,
      );
    });

    it("should round-trip global variable changes", () => {
      const before = {
        globals: {
          score: { id: "score", name: "Score", value: "0" },
          lives: { id: "lives", name: "Lives", value: "3" },
        },
      };
      const after = {
        globals: {
          score: { id: "score", name: "Score", value: "10" },
          lives: { id: "lives", name: "Lives", value: "3" },
        },
      };
      expectRoundTrip(
        before as Record<string, unknown>,
        after as Record<string, unknown>,
      );
    });

    it("should round-trip appearance and transform changes", () => {
      const before = {
        stages: {
          s1: {
            actors: {
              a1: { id: "a1", appearance: "idle", transform: "0" },
            },
          },
        },
      };
      const after = {
        stages: {
          s1: {
            actors: {
              a1: { id: "a1", appearance: "walk", transform: "90" },
            },
          },
        },
      };
      expectRoundTrip(
        before as Record<string, unknown>,
        after as Record<string, unknown>,
      );
    });
  });

  describe("delta compactness", () => {
    it("should produce a delta smaller than the full snapshot when few actors change", () => {
      const actors: Record<string, unknown> = {};
      for (let i = 0; i < 20; i++) {
        actors["a" + i] = {
          id: "a" + i,
          characterId: "c1",
          position: { x: i, y: i },
          appearance: "idle",
          variableValues: {},
        };
      }
      const actorsAfter = JSON.parse(JSON.stringify(actors));
      (actorsAfter.a0 as Record<string, unknown>).position = { x: 1, y: 0 };

      const before = { stages: { s1: { actors } } };
      const after = { stages: { s1: { actors: actorsAfter } } };

      const delta = diff(
        before as Record<string, unknown>,
        after as Record<string, unknown>,
      );
      const deltaSize = JSON.stringify(delta).length;
      const fullSize = JSON.stringify(before).length;

      expect(deltaSize).to.be.lessThan(fullSize / 2);
    });
  });

  describe("edge cases", () => {
    it("should handle empty objects", () => {
      expect(diff({}, {})).to.be.undefined;
    });

    it("should handle going from empty to populated", () => {
      const delta = diff({}, { a: 1, b: { c: 2 } });
      expect(delta).to.not.be.undefined;
      const restored = unpatch({ a: 1, b: { c: 2 } } as Record<string, unknown>, delta!);
      expect(restored).to.deep.equal({});
    });

    it("should handle going from populated to empty", () => {
      const before = { a: 1, b: { c: 2 } };
      const delta = diff(before as Record<string, unknown>, {});
      expect(delta).to.not.be.undefined;
      const restored = unpatch({}, delta!);
      expect(restored).to.deep.equal(before);
    });

    it("should handle value 0 correctly (not confused with deletion sentinel)", () => {
      // The deletion sentinel is [oldValue, 0, 0]. Ensure a value of 0
      // doesn't get misinterpreted.
      expectRoundTrip(
        { a: 0 } as Record<string, unknown>,
        { a: 1 } as Record<string, unknown>,
      );
      expectRoundTrip(
        { a: 1 } as Record<string, unknown>,
        { a: 0 } as Record<string, unknown>,
      );
    });

    it("should handle value false correctly", () => {
      expectRoundTrip(
        { a: false } as Record<string, unknown>,
        { a: true } as Record<string, unknown>,
      );
    });

    it("should handle undefined-like values (key exists with undefined)", () => {
      // Object.keys will include the key, but the value is undefined
      const before: Record<string, unknown> = { a: undefined };
      const after: Record<string, unknown> = { a: 42 };
      expectRoundTrip(before, after);
    });

    it("should handle deeply nested additions", () => {
      const before = { a: { b: {} } };
      const after = { a: { b: { c: { d: "new" } } } };
      expectRoundTrip(
        before as Record<string, unknown>,
        after as Record<string, unknown>,
      );
    });

    it("should handle multiple ticks of sequential diffs and unpatches", () => {
      // Simulate 5 ticks of an actor moving right, then unpatch all the way back
      const states: Record<string, unknown>[] = [];
      for (let tick = 0; tick <= 5; tick++) {
        states.push({
          stages: {
            s1: {
              actors: {
                a1: { id: "a1", position: { x: tick, y: 0 } },
              },
            },
          },
        });
      }

      // Compute deltas for each transition
      const deltas: Delta[] = [];
      for (let i = 0; i < states.length - 1; i++) {
        const d = diff(states[i], states[i + 1]);
        expect(d).to.not.be.undefined;
        deltas.push(d!);
      }

      // Unpatch from final state all the way back to initial
      let current = states[states.length - 1];
      for (let i = deltas.length - 1; i >= 0; i--) {
        current = unpatch(current, deltas[i]);
        expect(current).to.deep.equal(states[i]);
      }
    });
  });
});
