import { expect } from "chai";
import {
  defaultOperationForValueChange,
  operandForValueChange,
  extentIgnoredPositions,
  extentByShiftingExtent,
} from "./recording-helpers";
import { RuleExtent } from "../../types";

describe("recording-helpers", () => {
  describe("defaultOperationForValueChange", () => {
    describe("add operation detection", () => {
      it("should detect increment by 1 as add", () => {
        expect(defaultOperationForValueChange(5, 6)).to.equal("add");
      });

      it("should detect increment from string numbers", () => {
        expect(defaultOperationForValueChange("10", "11")).to.equal("add");
      });

      it("should detect increment with floats", () => {
        expect(defaultOperationForValueChange(1.5, 2.5)).to.equal("add");
      });
    });

    describe("subtract operation detection", () => {
      it("should detect decrement by 1 as subtract", () => {
        expect(defaultOperationForValueChange(6, 5)).to.equal("subtract");
      });

      it("should detect decrement from string numbers", () => {
        expect(defaultOperationForValueChange("11", "10")).to.equal("subtract");
      });

      it("should detect decrement with floats", () => {
        expect(defaultOperationForValueChange(2.5, 1.5)).to.equal("subtract");
      });
    });

    describe("set operation detection", () => {
      it("should default to set for increment larger than 1", () => {
        expect(defaultOperationForValueChange(5, 10)).to.equal("set");
      });

      it("should default to set for decrement larger than 1", () => {
        expect(defaultOperationForValueChange(10, 5)).to.equal("set");
      });

      it("should default to set for non-numeric values", () => {
        expect(defaultOperationForValueChange("hello", "world")).to.equal("set");
      });

      it("should default to set for string to number change", () => {
        expect(defaultOperationForValueChange("hello", 5)).to.equal("set");
      });

      it("should default to set when before is 0", () => {
        // Number(0) is falsy, so this falls through to set
        expect(defaultOperationForValueChange(0, 1)).to.equal("set");
      });

      it("should default to set when after is 0", () => {
        expect(defaultOperationForValueChange(1, 0)).to.equal("set");
      });

      it("should default to set for same value", () => {
        expect(defaultOperationForValueChange(5, 5)).to.equal("set");
      });
    });
  });

  describe("operandForValueChange", () => {
    describe("add operation", () => {
      it("should calculate positive difference for add", () => {
        expect(operandForValueChange(5, 8, "add")).to.equal(3);
      });

      it("should work with string numbers", () => {
        expect(operandForValueChange("10", "15", "add")).to.equal(5);
      });

      it("should handle negative difference for add", () => {
        expect(operandForValueChange(10, 7, "add")).to.equal(-3);
      });
    });

    describe("subtract operation", () => {
      it("should calculate positive difference for subtract", () => {
        expect(operandForValueChange(10, 7, "subtract")).to.equal(3);
      });

      it("should work with string numbers", () => {
        expect(operandForValueChange("15", "10", "subtract")).to.equal(5);
      });

      it("should handle cases where before < after", () => {
        expect(operandForValueChange(5, 8, "subtract")).to.equal(-3);
      });
    });

    describe("set operation", () => {
      it("should return after value for set", () => {
        expect(operandForValueChange(5, 100, "set")).to.equal(100);
      });

      it("should return string after value for set", () => {
        expect(operandForValueChange("hello", "world", "set")).to.equal("world");
      });

      it("should return after value regardless of before", () => {
        expect(operandForValueChange(999, 1, "set")).to.equal(1);
      });
    });

    describe("edge cases with zero", () => {
      it("should throw for zero before value with add (known limitation)", () => {
        // Number(0) is falsy, so the condition fails and throws
        // This is arguably a bug in the original code
        expect(() => operandForValueChange(0, 5, "add")).to.throw("Unknown op");
      });

      it("should throw for zero after value with subtract (known limitation)", () => {
        // Number(0) is falsy, so the condition fails and throws
        // This is arguably a bug in the original code
        expect(() => operandForValueChange(5, 0, "subtract")).to.throw("Unknown op");
      });

      it("should handle zero values with set operation", () => {
        // set operation doesn't check Number(before) or Number(after)
        expect(operandForValueChange(0, 0, "set")).to.equal(0);
        expect(operandForValueChange(5, 0, "set")).to.equal(0);
        expect(operandForValueChange(0, 5, "set")).to.equal(5);
      });
    });
  });

  describe("extentIgnoredPositions", () => {
    it("should return empty array for no ignored positions", () => {
      const extent: RuleExtent = {
        xmin: 0,
        xmax: 5,
        ymin: 0,
        ymax: 5,
        ignored: {},
      };
      expect(extentIgnoredPositions(extent)).to.deep.equal([]);
    });

    it("should parse single ignored position", () => {
      const extent: RuleExtent = {
        xmin: 0,
        xmax: 5,
        ymin: 0,
        ymax: 5,
        ignored: { "2,3": true },
      };
      expect(extentIgnoredPositions(extent)).to.deep.equal([{ x: 2, y: 3 }]);
    });

    it("should parse multiple ignored positions", () => {
      const extent: RuleExtent = {
        xmin: 0,
        xmax: 5,
        ymin: 0,
        ymax: 5,
        ignored: { "0,0": true, "1,2": true, "3,4": true },
      };
      const positions = extentIgnoredPositions(extent);
      expect(positions).to.have.length(3);
      expect(positions).to.deep.include({ x: 0, y: 0 });
      expect(positions).to.deep.include({ x: 1, y: 2 });
      expect(positions).to.deep.include({ x: 3, y: 4 });
    });

    it("should handle negative coordinates", () => {
      const extent: RuleExtent = {
        xmin: -2,
        xmax: 2,
        ymin: -2,
        ymax: 2,
        ignored: { "-1,-1": true },
      };
      expect(extentIgnoredPositions(extent)).to.deep.equal([{ x: -1, y: -1 }]);
    });
  });

  describe("extentByShiftingExtent", () => {
    it("should shift extent by positive offset", () => {
      const extent: RuleExtent = {
        xmin: 0,
        xmax: 5,
        ymin: 0,
        ymax: 5,
        ignored: {},
      };
      const shifted = extentByShiftingExtent(extent, { x: 3, y: 2 });
      expect(shifted).to.deep.equal({
        xmin: 3,
        xmax: 8,
        ymin: 2,
        ymax: 7,
        ignored: {},
      });
    });

    it("should shift extent by negative offset", () => {
      const extent: RuleExtent = {
        xmin: 5,
        xmax: 10,
        ymin: 5,
        ymax: 10,
        ignored: {},
      };
      const shifted = extentByShiftingExtent(extent, { x: -3, y: -2 });
      expect(shifted).to.deep.equal({
        xmin: 2,
        xmax: 7,
        ymin: 3,
        ymax: 8,
        ignored: {},
      });
    });

    it("should shift ignored positions along with extent", () => {
      const extent: RuleExtent = {
        xmin: 0,
        xmax: 5,
        ymin: 0,
        ymax: 5,
        ignored: { "1,1": true, "2,3": true },
      };
      const shifted = extentByShiftingExtent(extent, { x: 10, y: 20 });
      expect(shifted.ignored).to.deep.equal({
        "11,21": true,
        "12,23": true,
      });
    });

    it("should handle zero offset", () => {
      const extent: RuleExtent = {
        xmin: 0,
        xmax: 5,
        ymin: 0,
        ymax: 5,
        ignored: { "1,1": true },
      };
      const shifted = extentByShiftingExtent(extent, { x: 0, y: 0 });
      expect(shifted).to.deep.equal(extent);
    });

    it("should not mutate original extent", () => {
      const extent: RuleExtent = {
        xmin: 0,
        xmax: 5,
        ymin: 0,
        ymax: 5,
        ignored: { "1,1": true },
      };
      extentByShiftingExtent(extent, { x: 10, y: 10 });
      expect(extent.xmin).to.equal(0);
      expect(extent.ignored["1,1"]).to.be.true;
    });
  });
});
