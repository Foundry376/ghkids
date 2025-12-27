import { expect } from "chai";
import {
  pointApplyingTransform,
  pointByAdding,
  pointIsInside,
  pointIsOutside,
  applyVariableOperation,
  applyTransformOperation,
  resolveRuleValue,
  getVariableValue,
  actorFilledPoints,
  actorFillsPoint,
  actorIntersectsExtent,
  findRule,
  comparatorMatches,
} from "./stage-helpers";
import { Actor, ActorTransform, Character, Characters, Globals, RuleExtent } from "../../types";

describe("stage-helpers", () => {
  describe("comparatorMatches", () => {
    describe("equality (=)", () => {
      it("should match equal strings", () => {
        expect(comparatorMatches("=", "hello", "hello")).to.be.true;
      });

      it("should not match different strings", () => {
        expect(comparatorMatches("=", "hello", "world")).to.be.false;
      });

      it("should match numbers as strings", () => {
        expect(comparatorMatches("=", "42", "42")).to.be.true;
      });

      it("should handle type coercion via string conversion", () => {
        expect(comparatorMatches("=", "1", "1")).to.be.true;
      });

      it("should match null to null", () => {
        expect(comparatorMatches("=", null, null)).to.be.true;
      });

      it("should match null to string 'null'", () => {
        expect(comparatorMatches("=", null, "null")).to.be.true;
      });

      it("should match empty strings", () => {
        expect(comparatorMatches("=", "", "")).to.be.true;
      });

      it("should not match empty string to null", () => {
        expect(comparatorMatches("=", "", null)).to.be.false;
      });
    });

    describe("inequality (!=)", () => {
      it("should not match equal strings", () => {
        expect(comparatorMatches("!=", "hello", "hello")).to.be.false;
      });

      it("should match different strings", () => {
        expect(comparatorMatches("!=", "hello", "world")).to.be.true;
      });

      it("should not match null to null", () => {
        expect(comparatorMatches("!=", null, null)).to.be.false;
      });

      it("should match empty string to non-empty", () => {
        expect(comparatorMatches("!=", "", "hello")).to.be.true;
      });
    });

    describe("greater than or equal (>=)", () => {
      it("should match when a > b", () => {
        expect(comparatorMatches(">=", "10", "5")).to.be.true;
      });

      it("should match when a === b", () => {
        expect(comparatorMatches(">=", "5", "5")).to.be.true;
      });

      it("should not match when a < b", () => {
        expect(comparatorMatches(">=", "3", "5")).to.be.false;
      });

      it("should handle negative numbers", () => {
        expect(comparatorMatches(">=", "-1", "-5")).to.be.true;
        expect(comparatorMatches(">=", "-5", "-1")).to.be.false;
      });

      it("should handle floats", () => {
        expect(comparatorMatches(">=", "5.5", "5.4")).to.be.true;
        expect(comparatorMatches(">=", "5.5", "5.5")).to.be.true;
      });

      it("should treat non-numeric strings as NaN", () => {
        expect(comparatorMatches(">=", "hello", "world")).to.be.false;
      });

      it("should treat empty string as 0", () => {
        expect(comparatorMatches(">=", "", "0")).to.be.true;
        expect(comparatorMatches(">=", "0", "")).to.be.true;
      });

      it("should treat null as 0", () => {
        expect(comparatorMatches(">=", null, "0")).to.be.true;
      });
    });

    describe("less than or equal (<=)", () => {
      it("should match when a < b", () => {
        expect(comparatorMatches("<=", "3", "5")).to.be.true;
      });

      it("should match when a === b", () => {
        expect(comparatorMatches("<=", "5", "5")).to.be.true;
      });

      it("should not match when a > b", () => {
        expect(comparatorMatches("<=", "10", "5")).to.be.false;
      });

      it("should handle negative numbers", () => {
        expect(comparatorMatches("<=", "-5", "-1")).to.be.true;
      });
    });

    describe("greater than (>)", () => {
      it("should match when a > b", () => {
        expect(comparatorMatches(">", "10", "5")).to.be.true;
      });

      it("should not match when a === b", () => {
        expect(comparatorMatches(">", "5", "5")).to.be.false;
      });

      it("should not match when a < b", () => {
        expect(comparatorMatches(">", "3", "5")).to.be.false;
      });

      it("should handle floats with small differences", () => {
        expect(comparatorMatches(">", "5.01", "5.00")).to.be.true;
      });
    });

    describe("less than (<)", () => {
      it("should match when a < b", () => {
        expect(comparatorMatches("<", "3", "5")).to.be.true;
      });

      it("should not match when a === b", () => {
        expect(comparatorMatches("<", "5", "5")).to.be.false;
      });

      it("should not match when a > b", () => {
        expect(comparatorMatches("<", "10", "5")).to.be.false;
      });
    });

    describe("contains", () => {
      describe("simple substring matching", () => {
        it("should match when b is substring of a", () => {
          expect(comparatorMatches("contains", "hello world", "world")).to.be.true;
        });

        it("should match when b is at start of a", () => {
          expect(comparatorMatches("contains", "hello world", "hello")).to.be.true;
        });

        it("should not match when b is not in a", () => {
          expect(comparatorMatches("contains", "hello world", "foo")).to.be.false;
        });

        it("should match empty string in any string", () => {
          expect(comparatorMatches("contains", "hello", "")).to.be.true;
        });

        it("should match string containing itself", () => {
          expect(comparatorMatches("contains", "hello", "hello")).to.be.true;
        });

        it("should be case sensitive", () => {
          expect(comparatorMatches("contains", "Hello", "hello")).to.be.false;
        });
      });

      describe("comma-separated list matching (keypress special case)", () => {
        it("should match exact item in comma-separated list", () => {
          expect(comparatorMatches("contains", "ArrowLeft,Space,ArrowRight", "Space")).to.be.true;
        });

        it("should match first item in comma-separated list", () => {
          expect(comparatorMatches("contains", "ArrowLeft,Space", "ArrowLeft")).to.be.true;
        });

        it("should match last item in comma-separated list", () => {
          expect(comparatorMatches("contains", "ArrowLeft,Space", "Space")).to.be.true;
        });

        it("should NOT match partial substring in comma-separated list", () => {
          expect(comparatorMatches("contains", "ArrowLeft,Space", "A")).to.be.false;
        });

        it("should NOT match partial key name", () => {
          expect(comparatorMatches("contains", "ArrowLeft,Space", "Arrow")).to.be.false;
        });

        it("should not match item not in list", () => {
          expect(comparatorMatches("contains", "ArrowLeft,Space", "ArrowDown")).to.be.false;
        });

        it("should handle single item with no comma as substring match", () => {
          expect(comparatorMatches("contains", "ArrowLeft", "Arrow")).to.be.true;
        });
      });

      describe("null handling", () => {
        it("should handle null a value", () => {
          expect(comparatorMatches("contains", null, "null")).to.be.true;
        });

        it("should handle null b value", () => {
          expect(comparatorMatches("contains", "hello", null)).to.be.false;
        });
      });
    });

    describe("ends-with", () => {
      it("should match when a ends with b", () => {
        expect(comparatorMatches("ends-with", "hello world", "world")).to.be.true;
      });

      it("should not match when a does not end with b", () => {
        expect(comparatorMatches("ends-with", "hello world", "hello")).to.be.false;
      });

      it("should match exact string", () => {
        expect(comparatorMatches("ends-with", "hello", "hello")).to.be.true;
      });

      it("should match empty suffix", () => {
        expect(comparatorMatches("ends-with", "hello", "")).to.be.true;
      });

      it("should not match when suffix is longer than string", () => {
        expect(comparatorMatches("ends-with", "hi", "hello")).to.be.false;
      });

      it("should be case sensitive", () => {
        expect(comparatorMatches("ends-with", "Hello", "hello")).to.be.false;
      });

      it("should handle null converting to 'null' string", () => {
        expect(comparatorMatches("ends-with", null, "null")).to.be.true;
      });
    });

    describe("starts-with", () => {
      it("should match when a starts with b", () => {
        expect(comparatorMatches("starts-with", "hello world", "hello")).to.be.true;
      });

      it("should not match when a does not start with b", () => {
        expect(comparatorMatches("starts-with", "hello world", "world")).to.be.false;
      });

      it("should match exact string", () => {
        expect(comparatorMatches("starts-with", "hello", "hello")).to.be.true;
      });

      it("should match empty prefix", () => {
        expect(comparatorMatches("starts-with", "hello", "")).to.be.true;
      });

      it("should not match when prefix is longer than string", () => {
        expect(comparatorMatches("starts-with", "hi", "hello")).to.be.false;
      });

      it("should be case sensitive", () => {
        expect(comparatorMatches("starts-with", "Hello", "hello")).to.be.false;
      });
    });

    describe("edge cases across all comparators", () => {
      it("should handle numeric strings consistently", () => {
        expect(comparatorMatches("=", "007", "7")).to.be.false;
        expect(comparatorMatches(">=", "007", "7")).to.be.true;
      });

      it("should handle whitespace", () => {
        expect(comparatorMatches("=", " hello ", "hello")).to.be.false;
        expect(comparatorMatches("contains", " hello ", "hello")).to.be.true;
        expect(comparatorMatches("starts-with", " hello", " ")).to.be.true;
      });

      it("should handle special characters", () => {
        expect(comparatorMatches("=", "hello!", "hello!")).to.be.true;
        expect(comparatorMatches("contains", "a.b.c", ".")).to.be.true;
      });
    });
  });

  describe("pointApplyingTransform", () => {
    const dimensions = { width: 3, height: 4 };

    describe("identity transform (0 or undefined)", () => {
      it("should return unchanged coordinates for transform '0'", () => {
        expect(pointApplyingTransform(1, 2, dimensions, "0")).to.deep.equal([1, 2]);
      });

      it("should return unchanged coordinates for undefined transform", () => {
        expect(pointApplyingTransform(1, 2, dimensions, undefined)).to.deep.equal([1, 2]);
      });

      it("should handle origin point (0,0)", () => {
        expect(pointApplyingTransform(0, 0, dimensions, "0")).to.deep.equal([0, 0]);
      });

      it("should handle max boundary point", () => {
        expect(pointApplyingTransform(2, 3, dimensions, "0")).to.deep.equal([2, 3]);
      });
    });

    describe("90 degree rotation", () => {
      it("should rotate point 90 degrees clockwise", () => {
        expect(pointApplyingTransform(0, 0, dimensions, "90")).to.deep.equal([3, 0]);
      });

      it("should rotate center point", () => {
        expect(pointApplyingTransform(1, 2, dimensions, "90")).to.deep.equal([1, 1]);
      });

      it("should rotate bottom-right corner", () => {
        expect(pointApplyingTransform(2, 3, dimensions, "90")).to.deep.equal([0, 2]);
      });
    });

    describe("180 degree rotation", () => {
      it("should rotate point 180 degrees", () => {
        expect(pointApplyingTransform(0, 0, dimensions, "180")).to.deep.equal([2, 3]);
      });

      it("should rotate center point", () => {
        expect(pointApplyingTransform(1, 2, dimensions, "180")).to.deep.equal([1, 1]);
      });

      it("should rotate bottom-right to top-left", () => {
        expect(pointApplyingTransform(2, 3, dimensions, "180")).to.deep.equal([0, 0]);
      });
    });

    describe("270 degree rotation", () => {
      it("should rotate point 270 degrees clockwise", () => {
        expect(pointApplyingTransform(0, 0, dimensions, "270")).to.deep.equal([0, 2]);
      });

      it("should rotate center point", () => {
        expect(pointApplyingTransform(1, 2, dimensions, "270")).to.deep.equal([2, 1]);
      });
    });

    describe("flip-x (horizontal flip)", () => {
      it("should flip horizontally", () => {
        expect(pointApplyingTransform(0, 0, dimensions, "flip-x")).to.deep.equal([2, 0]);
      });

      it("should keep center x unchanged in odd-width", () => {
        expect(pointApplyingTransform(1, 2, dimensions, "flip-x")).to.deep.equal([1, 2]);
      });

      it("should flip right edge to left edge", () => {
        expect(pointApplyingTransform(2, 1, dimensions, "flip-x")).to.deep.equal([0, 1]);
      });
    });

    describe("flip-y (vertical flip)", () => {
      it("should flip vertically", () => {
        expect(pointApplyingTransform(0, 0, dimensions, "flip-y")).to.deep.equal([0, 3]);
      });

      it("should flip bottom to top", () => {
        expect(pointApplyingTransform(1, 3, dimensions, "flip-y")).to.deep.equal([1, 0]);
      });
    });

    describe("diagonal d1 (transpose)", () => {
      it("should transpose coordinates", () => {
        expect(pointApplyingTransform(0, 0, dimensions, "d1")).to.deep.equal([0, 0]);
      });

      it("should swap x and y", () => {
        expect(pointApplyingTransform(1, 2, dimensions, "d1")).to.deep.equal([2, 1]);
      });
    });

    describe("diagonal d2 (anti-transpose)", () => {
      it("should anti-transpose coordinates", () => {
        expect(pointApplyingTransform(0, 0, dimensions, "d2")).to.deep.equal([3, 2]);
      });

      it("should anti-transpose center point", () => {
        expect(pointApplyingTransform(1, 2, dimensions, "d2")).to.deep.equal([1, 1]);
      });
    });

    describe("square dimensions", () => {
      const square = { width: 4, height: 4 };

      it("should handle 90 rotation in square", () => {
        expect(pointApplyingTransform(0, 0, square, "90")).to.deep.equal([3, 0]);
        expect(pointApplyingTransform(3, 0, square, "90")).to.deep.equal([3, 3]);
        expect(pointApplyingTransform(3, 3, square, "90")).to.deep.equal([0, 3]);
        expect(pointApplyingTransform(0, 3, square, "90")).to.deep.equal([0, 0]);
      });
    });

    describe("1x1 dimensions", () => {
      const tiny = { width: 1, height: 1 };

      it("should return [0, 0] for all transforms", () => {
        const transforms: ActorTransform[] = ["0", "90", "180", "270", "flip-x", "flip-y", "d1", "d2"];
        for (const t of transforms) {
          expect(pointApplyingTransform(0, 0, tiny, t)).to.deep.equal([0, 0]);
        }
      });
    });
  });

  describe("pointByAdding", () => {
    it("should add positive offsets", () => {
      expect(pointByAdding({ x: 1, y: 2 }, { x: 3, y: 4 })).to.deep.equal({ x: 4, y: 6 });
    });

    it("should add negative offsets", () => {
      expect(pointByAdding({ x: 5, y: 5 }, { x: -3, y: -2 })).to.deep.equal({ x: 2, y: 3 });
    });

    it("should handle zero offset", () => {
      expect(pointByAdding({ x: 3, y: 4 }, { x: 0, y: 0 })).to.deep.equal({ x: 3, y: 4 });
    });

    it("should handle negative result", () => {
      expect(pointByAdding({ x: 1, y: 1 }, { x: -5, y: -5 })).to.deep.equal({ x: -4, y: -4 });
    });
  });

  describe("pointIsOutside / pointIsInside", () => {
    const extent: RuleExtent = {
      xmin: 0,
      xmax: 5,
      ymin: 0,
      ymax: 5,
      ignored: {},
    };

    describe("pointIsOutside", () => {
      it("should return true for point left of extent", () => {
        expect(pointIsOutside({ x: -1, y: 2 }, extent)).to.be.true;
      });

      it("should return true for point right of extent", () => {
        expect(pointIsOutside({ x: 6, y: 2 }, extent)).to.be.true;
      });

      it("should return true for point above extent", () => {
        expect(pointIsOutside({ x: 2, y: -1 }, extent)).to.be.true;
      });

      it("should return true for point below extent", () => {
        expect(pointIsOutside({ x: 2, y: 6 }, extent)).to.be.true;
      });

      it("should return false for point inside extent", () => {
        expect(pointIsOutside({ x: 2, y: 2 }, extent)).to.be.false;
      });

      it("should return false for point on boundary", () => {
        expect(pointIsOutside({ x: 0, y: 0 }, extent)).to.be.false;
        expect(pointIsOutside({ x: 5, y: 5 }, extent)).to.be.false;
      });
    });

    describe("pointIsInside", () => {
      it("should return true for point inside extent", () => {
        expect(pointIsInside({ x: 2, y: 2 }, extent)).to.be.true;
      });

      it("should return true for point on boundary", () => {
        expect(pointIsInside({ x: 0, y: 0 }, extent)).to.be.true;
        expect(pointIsInside({ x: 5, y: 5 }, extent)).to.be.true;
      });

      it("should return false for point outside extent", () => {
        expect(pointIsInside({ x: -1, y: 2 }, extent)).to.be.false;
        expect(pointIsInside({ x: 6, y: 2 }, extent)).to.be.false;
      });
    });
  });

  describe("applyVariableOperation", () => {
    describe("add operation", () => {
      it("should add two positive integers", () => {
        expect(applyVariableOperation("5", "add", "3")).to.equal("8");
      });

      it("should add with zero", () => {
        expect(applyVariableOperation("5", "add", "0")).to.equal("5");
      });

      it("should add negative number (subtraction)", () => {
        expect(applyVariableOperation("10", "add", "-3")).to.equal("7");
      });

      it("should handle float addition", () => {
        expect(applyVariableOperation("1.5", "add", "2.5")).to.equal("4");
      });

      it("should handle string numbers", () => {
        expect(applyVariableOperation("10", "add", "5")).to.equal("15");
      });
    });

    describe("subtract operation", () => {
      it("should subtract two positive integers", () => {
        expect(applyVariableOperation("10", "subtract", "3")).to.equal("7");
      });

      it("should subtract to negative result", () => {
        expect(applyVariableOperation("3", "subtract", "10")).to.equal("-7");
      });

      it("should subtract zero", () => {
        expect(applyVariableOperation("5", "subtract", "0")).to.equal("5");
      });

      it("should handle float subtraction", () => {
        expect(applyVariableOperation("5.5", "subtract", "2.5")).to.equal("3");
      });
    });

    describe("set operation", () => {
      it("should set to new value", () => {
        expect(applyVariableOperation("5", "set", "100")).to.equal("100");
      });

      it("should set to string value", () => {
        expect(applyVariableOperation("5", "set", "hello")).to.equal("hello");
      });

      it("should set to empty string", () => {
        expect(applyVariableOperation("5", "set", "")).to.equal("");
      });
    });

    describe("edge cases", () => {
      it("should handle non-numeric existing value with add", () => {
        expect(applyVariableOperation("hello", "add", "5")).to.equal("NaN");
      });

      it("should handle empty string as zero in add", () => {
        expect(applyVariableOperation("", "add", "5")).to.equal("5");
      });
    });
  });

  describe("applyTransformOperation", () => {
    describe("set operation", () => {
      it("should set transform to new value", () => {
        expect(applyTransformOperation("0", "set", "90")).to.equal("90");
      });

      it("should set transform from rotated to flipped", () => {
        expect(applyTransformOperation("180", "set", "flip-x")).to.equal("flip-x");
      });
    });

    describe("add operation (composition)", () => {
      it("should compose 90 + 90 = 180", () => {
        expect(applyTransformOperation("90", "add", "90")).to.equal("180");
      });

      it("should compose 180 + 180 = 0 (identity)", () => {
        expect(applyTransformOperation("180", "add", "180")).to.equal("0");
      });

      it("should compose 90 + 180 = 270", () => {
        expect(applyTransformOperation("90", "add", "180")).to.equal("270");
      });

      it("should compose 270 + 90 = 0", () => {
        expect(applyTransformOperation("270", "add", "90")).to.equal("0");
      });

      it("should compose flip-x + flip-x = 0", () => {
        expect(applyTransformOperation("flip-x", "add", "flip-x")).to.equal("0");
      });

      it("should compose flip-x + 180 = flip-y", () => {
        expect(applyTransformOperation("flip-x", "add", "180")).to.equal("flip-y");
      });

      it("should compose 0 + any = any (identity)", () => {
        expect(applyTransformOperation("0", "add", "90")).to.equal("90");
        expect(applyTransformOperation("0", "add", "flip-x")).to.equal("flip-x");
        expect(applyTransformOperation("0", "add", "d1")).to.equal("d1");
      });

      it("should compose d1 + d1 = 0", () => {
        expect(applyTransformOperation("d1", "add", "d1")).to.equal("0");
      });

      it("should compose d2 + d2 = 0", () => {
        expect(applyTransformOperation("d2", "add", "d2")).to.equal("0");
      });
    });
  });

  describe("resolveRuleValue", () => {
    const globals: Globals = {
      click: { id: "click", name: "Clicked Actor", value: "", type: "actor" },
      keypress: { id: "keypress", name: "Key Pressed", value: "", type: "key" },
      selectedStageId: { id: "selectedStageId", name: "Current Stage", value: "stage1", type: "stage" },
      score: { id: "score", name: "Score", value: "100" },
    };

    const characters: Characters = {
      char1: {
        id: "char1",
        name: "Player",
        rules: [],
        spritesheet: {
          appearances: { app1: ["data:image/png;base64,..."] },
          appearanceNames: { app1: "Walking" },
        },
        variables: {
          health: { id: "health", name: "Health", defaultValue: "100" },
        },
      },
    };

    const actors: { [id: string]: Actor } = {
      actor1: {
        id: "actor1",
        characterId: "char1",
        variableValues: { health: "75" },
        appearance: "app1",
        position: { x: 0, y: 0 },
        transform: "90",
      },
    };

    describe("constant values", () => {
      it("should return constant string value", () => {
        expect(resolveRuleValue({ constant: "hello" }, globals, characters, actors, "=")).to.equal("hello");
      });

      it("should return constant numeric value as string", () => {
        expect(resolveRuleValue({ constant: "42" }, globals, characters, actors, "=")).to.equal("42");
      });

      it("should return empty constant", () => {
        expect(resolveRuleValue({ constant: "" }, globals, characters, actors, "=")).to.equal("");
      });
    });

    describe("global values", () => {
      it("should resolve global value", () => {
        expect(resolveRuleValue({ globalId: "score" }, globals, characters, actors, "=")).to.equal("100");
      });

      it("should resolve stage global", () => {
        expect(resolveRuleValue({ globalId: "selectedStageId" }, globals, characters, actors, "=")).to.equal("stage1");
      });

      it("should return undefined for missing global", () => {
        expect(resolveRuleValue({ globalId: "nonexistent" }, globals, characters, actors, "=")).to.be.undefined;
      });
    });

    describe("actor variable values", () => {
      it("should resolve actor variable value", () => {
        expect(resolveRuleValue({ actorId: "actor1", variableId: "health" }, globals, characters, actors, "=")).to.equal("75");
      });

      it("should resolve actor appearance with = comparator", () => {
        expect(resolveRuleValue({ actorId: "actor1", variableId: "appearance" }, globals, characters, actors, "=")).to.equal("app1");
      });

      it("should resolve actor transform", () => {
        expect(resolveRuleValue({ actorId: "actor1", variableId: "transform" }, globals, characters, actors, "=")).to.equal("90");
      });
    });
  });

  describe("getVariableValue", () => {
    const character: Character = {
      id: "char1",
      name: "Player",
      rules: [],
      spritesheet: {
        appearances: { app1: ["data:..."], app2: ["data:..."] },
        appearanceNames: { app1: "Idle", app2: "Walking" },
      },
      variables: {
        health: { id: "health", name: "Health", defaultValue: "100" },
        speed: { id: "speed", name: "Speed", defaultValue: "5" },
      },
    };

    const actor: Actor = {
      id: "actor1",
      characterId: "char1",
      variableValues: { health: "75" },
      appearance: "app1",
      position: { x: 0, y: 0 },
      transform: "90",
    };

    describe("appearance variable", () => {
      it("should return appearance ID with = comparator", () => {
        expect(getVariableValue(actor, character, "appearance", "=")).to.equal("app1");
      });

      it("should return appearance ID with != comparator", () => {
        expect(getVariableValue(actor, character, "appearance", "!=")).to.equal("app1");
      });

      it("should return appearance NAME with contains comparator", () => {
        expect(getVariableValue(actor, character, "appearance", "contains")).to.equal("Idle");
      });

      it("should return appearance NAME with starts-with comparator", () => {
        expect(getVariableValue(actor, character, "appearance", "starts-with")).to.equal("Idle");
      });

      it("should return appearance NAME with ends-with comparator", () => {
        expect(getVariableValue(actor, character, "appearance", "ends-with")).to.equal("Idle");
      });
    });

    describe("transform variable", () => {
      it("should return actor transform value", () => {
        expect(getVariableValue(actor, character, "transform", "=")).to.equal("90");
      });

      it("should return null for actor without transform", () => {
        const actorNoTransform = { ...actor, transform: undefined };
        expect(getVariableValue(actorNoTransform, character, "transform", "=")).to.be.null;
      });
    });

    describe("custom variables", () => {
      it("should return actor variable value if set", () => {
        expect(getVariableValue(actor, character, "health", "=")).to.equal("75");
      });

      it("should return character default if actor value not set", () => {
        expect(getVariableValue(actor, character, "speed", "=")).to.equal("5");
      });

      it("should return null for non-existent variable", () => {
        expect(getVariableValue(actor, character, "nonexistent", "=")).to.be.null;
      });
    });
  });

  describe("actorFilledPoints", () => {
    const makeCharacter = (info: { width: number; height: number; anchor: { x: number; y: number }; filled: Record<string, boolean> }): Characters => ({
      char1: {
        id: "char1",
        name: "Test",
        rules: [],
        spritesheet: {
          appearances: { app1: ["data:..."] },
          appearanceNames: { app1: "Default" },
          appearanceInfo: {
            app1: {
              width: info.width,
              height: info.height,
              anchor: info.anchor,
              filled: info.filled,
            },
          },
        },
        variables: {},
      },
    });

    const makeActor = (x: number, y: number, transform?: ActorTransform): Actor => ({
      id: "actor1",
      characterId: "char1",
      variableValues: {},
      appearance: "app1",
      position: { x, y },
      transform,
    });

    describe("1x1 actor", () => {
      const characters = makeCharacter({
        width: 1,
        height: 1,
        anchor: { x: 0, y: 0 },
        filled: { "0,0": true },
      });

      it("should return single point at actor position", () => {
        const actor = makeActor(5, 3);
        expect(actorFilledPoints(actor, characters)).to.deep.equal([{ x: 5, y: 3 }]);
      });

      it("should handle negative positions", () => {
        const actor = makeActor(-1, -2);
        expect(actorFilledPoints(actor, characters)).to.deep.equal([{ x: -1, y: -2 }]);
      });
    });

    describe("2x2 actor with all filled", () => {
      const characters = makeCharacter({
        width: 2,
        height: 2,
        anchor: { x: 0, y: 0 },
        filled: { "0,0": true, "1,0": true, "0,1": true, "1,1": true },
      });

      it("should return all four points", () => {
        const actor = makeActor(0, 0);
        const points = actorFilledPoints(actor, characters);
        expect(points).to.have.length(4);
        expect(points).to.deep.include({ x: 0, y: 0 });
        expect(points).to.deep.include({ x: 1, y: 0 });
        expect(points).to.deep.include({ x: 0, y: 1 });
        expect(points).to.deep.include({ x: 1, y: 1 });
      });
    });

    describe("actor with custom anchor", () => {
      const characters = makeCharacter({
        width: 2,
        height: 2,
        anchor: { x: 1, y: 1 },
        filled: { "0,0": true, "1,0": true, "0,1": true, "1,1": true },
      });

      it("should offset points by anchor", () => {
        const actor = makeActor(5, 5);
        const points = actorFilledPoints(actor, characters);
        expect(points).to.have.length(4);
        expect(points).to.deep.include({ x: 4, y: 4 });
        expect(points).to.deep.include({ x: 5, y: 4 });
        expect(points).to.deep.include({ x: 4, y: 5 });
        expect(points).to.deep.include({ x: 5, y: 5 });
      });
    });

    describe("actor with partial fill", () => {
      const characters = makeCharacter({
        width: 3,
        height: 3,
        anchor: { x: 1, y: 1 },
        filled: { "1,0": true, "0,1": true, "1,1": true, "2,1": true, "1,2": true },
      });

      it("should only return filled points (cross pattern)", () => {
        const actor = makeActor(5, 5);
        const points = actorFilledPoints(actor, characters);
        expect(points).to.have.length(5);
      });
    });

    describe("actor with transform", () => {
      const characters = makeCharacter({
        width: 2,
        height: 1,
        anchor: { x: 0, y: 0 },
        filled: { "0,0": true, "1,0": true },
      });

      it("should apply 90 degree rotation to filled points", () => {
        const actor = makeActor(0, 0, "90");
        const points = actorFilledPoints(actor, characters);
        expect(points).to.have.length(2);
      });

      it("should apply flip-x to filled points", () => {
        const actor = makeActor(0, 0, "flip-x");
        const points = actorFilledPoints(actor, characters);
        expect(points).to.have.length(2);
      });
    });

    describe("missing appearance info", () => {
      const characters: Characters = {
        char1: {
          id: "char1",
          name: "Test",
          rules: [],
          spritesheet: {
            appearances: { app1: ["data:..."] },
            appearanceNames: { app1: "Default" },
          },
          variables: {},
        },
      };

      it("should fallback to single point at actor position", () => {
        const actor = makeActor(3, 4);
        expect(actorFilledPoints(actor, characters)).to.deep.equal([{ x: 3, y: 4 }]);
      });
    });
  });

  describe("actorFillsPoint", () => {
    const characters: Characters = {
      char1: {
        id: "char1",
        name: "Test",
        rules: [],
        spritesheet: {
          appearances: { app1: ["data:..."] },
          appearanceNames: { app1: "Default" },
          appearanceInfo: {
            app1: {
              width: 2,
              height: 2,
              anchor: { x: 0, y: 0 },
              filled: { "0,0": true, "1,0": true, "0,1": true, "1,1": true },
            },
          },
        },
        variables: {},
      },
    };

    const actor: Actor = {
      id: "actor1",
      characterId: "char1",
      variableValues: {},
      appearance: "app1",
      position: { x: 5, y: 5 },
    };

    it("should return true for points actor fills", () => {
      expect(actorFillsPoint(actor, characters, { x: 5, y: 5 })).to.be.true;
      expect(actorFillsPoint(actor, characters, { x: 6, y: 5 })).to.be.true;
      expect(actorFillsPoint(actor, characters, { x: 5, y: 6 })).to.be.true;
      expect(actorFillsPoint(actor, characters, { x: 6, y: 6 })).to.be.true;
    });

    it("should return false for points actor does not fill", () => {
      expect(actorFillsPoint(actor, characters, { x: 4, y: 5 })).to.be.false;
      expect(actorFillsPoint(actor, characters, { x: 7, y: 5 })).to.be.false;
      expect(actorFillsPoint(actor, characters, { x: 5, y: 4 })).to.be.false;
      expect(actorFillsPoint(actor, characters, { x: 5, y: 7 })).to.be.false;
    });
  });

  describe("actorIntersectsExtent", () => {
    const characters: Characters = {
      char1: {
        id: "char1",
        name: "Test",
        rules: [],
        spritesheet: {
          appearances: { app1: ["data:..."] },
          appearanceNames: { app1: "Default" },
          appearanceInfo: {
            app1: {
              width: 2,
              height: 2,
              anchor: { x: 0, y: 0 },
              filled: { "0,0": true, "1,0": true, "0,1": true, "1,1": true },
            },
          },
        },
        variables: {},
      },
    };

    const actor: Actor = {
      id: "actor1",
      characterId: "char1",
      variableValues: {},
      appearance: "app1",
      position: { x: 5, y: 5 },
    };

    it("should return true when actor overlaps extent", () => {
      const extent: RuleExtent = { xmin: 5, xmax: 10, ymin: 5, ymax: 10, ignored: {} };
      expect(actorIntersectsExtent(actor, characters, extent)).to.be.true;
    });

    it("should return true when actor partially overlaps extent", () => {
      const extent: RuleExtent = { xmin: 6, xmax: 10, ymin: 6, ymax: 10, ignored: {} };
      expect(actorIntersectsExtent(actor, characters, extent)).to.be.true;
    });

    it("should return false when actor does not overlap extent", () => {
      const extent: RuleExtent = { xmin: 10, xmax: 15, ymin: 10, ymax: 15, ignored: {} };
      expect(actorIntersectsExtent(actor, characters, extent)).to.be.false;
    });

    it("should return false when actor is adjacent but not overlapping", () => {
      const extent: RuleExtent = { xmin: 7, xmax: 10, ymin: 5, ymax: 10, ignored: {} };
      expect(actorIntersectsExtent(actor, characters, extent)).to.be.false;
    });
  });

  describe("findRule", () => {
    const rule1 = { id: "rule1", type: "rule" as const, name: "Rule 1", mainActorId: "a", conditions: [], actors: {}, actions: [], extent: { xmin: 0, xmax: 0, ymin: 0, ymax: 0, ignored: {} } };
    const rule2 = { id: "rule2", type: "rule" as const, name: "Rule 2", mainActorId: "a", conditions: [], actors: {}, actions: [], extent: { xmin: 0, xmax: 0, ymin: 0, ymax: 0, ignored: {} } };
    const flowContainer = {
      id: "flow1",
      type: "group-flow" as const,
      name: "Flow",
      behavior: "first" as const,
      rules: [rule2],
    };

    it("should find rule at top level", () => {
      const node = { rules: [rule1, flowContainer] };
      const [found, parent, idx] = findRule(node, "rule1");
      expect(found).to.equal(rule1);
      expect(parent).to.equal(node);
      expect(idx).to.equal(0);
    });

    it("should find rule nested in flow container", () => {
      const node = { rules: [rule1, flowContainer] };
      const [found, parent, idx] = findRule(node, "rule2");
      expect(found).to.equal(rule2);
      expect(parent).to.equal(flowContainer);
      expect(idx).to.equal(0);
    });

    it("should find flow container itself", () => {
      const node = { rules: [rule1, flowContainer] };
      const [found, parent, idx] = findRule(node, "flow1");
      expect(found).to.equal(flowContainer);
      expect(parent).to.equal(node);
      expect(idx).to.equal(1);
    });

    it("should return null for non-existent rule", () => {
      const node = { rules: [rule1, flowContainer] };
      const [found, , ] = findRule(node, "nonexistent");
      expect(found).to.be.null;
    });

    it("should handle empty rules array", () => {
      const node = { rules: [] };
      const [found, , ] = findRule(node, "rule1");
      expect(found).to.be.null;
    });
  });
});
