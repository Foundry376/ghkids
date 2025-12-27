import { expect } from "chai";
import { VariableComparator } from "../../../types";

/**
 * comparatorMatches is currently an internal function in world-operator.ts.
 * This test file duplicates the logic to test it in isolation.
 *
 * TODO: Consider extracting comparatorMatches to stage-helpers.ts for reuse and testability.
 */

function isNever(val: never): never {
  throw new Error(`Expected var to be never but it is ${JSON.stringify(val)}.`);
}

function comparatorMatches(comparator: VariableComparator, a: string | null, b: string | null): boolean {
  switch (comparator) {
    case "=":
      return `${a}` === `${b}`;
    case "!=":
      return `${a}` != `${b}`;
    case ">=":
      return Number(a) >= Number(b);
    case "<=":
      return Number(a) <= Number(b);
    case ">":
      return Number(a) > Number(b);
    case "<":
      return Number(a) < Number(b);
    case "contains":
      if (`${a}`.includes(",")) {
        // This is a special hack for keypress so "ArrowLeft,Space" doesn't match "A"
        return a?.split(",").some((v) => v === b) ?? false;
      }
      return `${a}`.includes(`${b}`);
    case "ends-with":
      return `${a}`.endsWith(`${b}`);
    case "starts-with":
      return `${a}`.startsWith(`${b}`);
    default:
      isNever(comparator);
      return false;
  }
}

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
      // Both are converted to strings via template literal
      expect(comparatorMatches("=", "1", "1")).to.be.true;
    });

    it("should match null to null", () => {
      expect(comparatorMatches("=", null, null)).to.be.true;
    });

    it("should match null to string 'null'", () => {
      // `${null}` === "null"
      expect(comparatorMatches("=", null, "null")).to.be.true;
    });

    it("should match empty strings", () => {
      expect(comparatorMatches("=", "", "")).to.be.true;
    });

    it("should not match empty string to null", () => {
      // "" !== "null"
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
      // NaN >= NaN is false
      expect(comparatorMatches(">=", "hello", "world")).to.be.false;
    });

    it("should treat empty string as 0", () => {
      // Number("") === 0
      expect(comparatorMatches(">=", "", "0")).to.be.true;
      expect(comparatorMatches(">=", "0", "")).to.be.true;
    });

    it("should treat null as 0", () => {
      // Number(null) === 0
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
        // This is the key feature: "ArrowLeft,Space" should NOT match "A"
        // even though "ArrowLeft" contains "A"
        expect(comparatorMatches("contains", "ArrowLeft,Space", "A")).to.be.false;
      });

      it("should NOT match partial key name", () => {
        expect(comparatorMatches("contains", "ArrowLeft,Space", "Arrow")).to.be.false;
      });

      it("should not match item not in list", () => {
        expect(comparatorMatches("contains", "ArrowLeft,Space", "ArrowDown")).to.be.false;
      });

      it("should handle single item with no comma as substring match", () => {
        // No comma, so uses regular substring matching
        expect(comparatorMatches("contains", "ArrowLeft", "Arrow")).to.be.true;
      });
    });

    describe("null handling", () => {
      it("should handle null a value", () => {
        // `${null}` === "null", which doesn't include ","
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
      expect(comparatorMatches("=", "007", "7")).to.be.false; // string comparison
      expect(comparatorMatches(">=", "007", "7")).to.be.true; // numeric comparison: 7 >= 7
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
