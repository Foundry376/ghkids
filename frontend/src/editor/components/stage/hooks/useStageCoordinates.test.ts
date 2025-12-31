import { expect } from "chai";
import {
  calculatePxOffset,
  calculateGridPosition,
  parseDragOffset,
  isPositionInBounds,
  PxOffset,
} from "./useStageCoordinates";

describe("useStageCoordinates", () => {
  describe("calculatePxOffset", () => {
    it("should calculate offset from stage origin", () => {
      const stageRect = { left: 100, top: 50 } as DOMRect;
      const result = calculatePxOffset(150, 75, stageRect);
      expect(result).to.deep.equal({ left: 50, top: 25 });
    });

    it("should handle zero offset (click at stage origin)", () => {
      const stageRect = { left: 100, top: 50 } as DOMRect;
      const result = calculatePxOffset(100, 50, stageRect);
      expect(result).to.deep.equal({ left: 0, top: 0 });
    });

    it("should handle negative offsets (click above/left of stage)", () => {
      const stageRect = { left: 100, top: 50 } as DOMRect;
      const result = calculatePxOffset(80, 30, stageRect);
      expect(result).to.deep.equal({ left: -20, top: -20 });
    });
  });

  describe("calculateGridPosition", () => {
    // STAGE_CELL_SIZE is 40px
    const CELL = 40;

    describe("without drag offset (uses half cell for centering)", () => {
      it("should convert pixel offset to grid position at scale 1", () => {
        // At (80, 120) pixels, with half-cell offset for rounding
        // x = round((80 - 20) / 40 / 1) = round(1.5) = 2
        // y = round((120 - 20) / 40 / 1) = round(2.5) = 3
        // Wait, let me recalculate:
        // x = round((80 - 20) / 40 / 1) = round(60 / 40) = round(1.5) = 2
        // y = round((120 - 20) / 40 / 1) = round(100 / 40) = round(2.5) = 3
        const pxOffset: PxOffset = { left: 80, top: 120 };
        const result = calculateGridPosition(pxOffset, 1);
        expect(result).to.deep.equal({ x: 2, y: 3 });
      });

      it("should handle scale factor", () => {
        // At scale 0.5, coordinates are effectively doubled
        // x = round((80 - 20) / 40 / 0.5) = round(60 / 40 / 0.5) = round(3) = 3
        const pxOffset: PxOffset = { left: 80, top: 80 };
        const result = calculateGridPosition(pxOffset, 0.5);
        expect(result).to.deep.equal({ x: 3, y: 3 });
      });

      it("should round to nearest grid position", () => {
        // Position that rounds down: 45px left
        // x = round((45 - 20) / 40 / 1) = round(25 / 40) = round(0.625) = 1
        const pxOffset1: PxOffset = { left: 45, top: 20 };
        expect(calculateGridPosition(pxOffset1, 1).x).to.equal(1);

        // Position that rounds down: 35px left
        // x = round((35 - 20) / 40 / 1) = round(15 / 40) = round(0.375) = 0
        const pxOffset2: PxOffset = { left: 35, top: 20 };
        expect(calculateGridPosition(pxOffset2, 1).x).to.equal(0);
      });

      it("should handle position at origin", () => {
        const pxOffset: PxOffset = { left: 0, top: 0 };
        const result = calculateGridPosition(pxOffset, 1);
        // x = round((0 - 20) / 40) = round(-0.5) = -0 in JS
        // -0 === 0 is true, so we test equality rather than deep.equal
        expect(result.x === 0).to.be.true;
        expect(result.y === 0).to.be.true;
      });
    });

    describe("with drag offset", () => {
      it("should apply custom drag offset", () => {
        const pxOffset: PxOffset = { left: 100, top: 100 };
        const dragOffset = { dragLeft: 10, dragTop: 10 };
        // x = round((100 - 10) / 40 / 1) = round(90 / 40) = round(2.25) = 2
        // y = round((100 - 10) / 40 / 1) = round(90 / 40) = round(2.25) = 2
        const result = calculateGridPosition(pxOffset, 1, dragOffset);
        expect(result).to.deep.equal({ x: 2, y: 2 });
      });

      it("should handle zero drag offset", () => {
        const pxOffset: PxOffset = { left: 80, top: 80 };
        const dragOffset = { dragLeft: 0, dragTop: 0 };
        // x = round(80 / 40 / 1) = 2
        const result = calculateGridPosition(pxOffset, 1, dragOffset);
        expect(result).to.deep.equal({ x: 2, y: 2 });
      });

      it("should combine drag offset with scale", () => {
        const pxOffset: PxOffset = { left: 100, top: 100 };
        const dragOffset = { dragLeft: 20, dragTop: 20 };
        // At scale 0.5:
        // x = round((100 - 20) / 40 / 0.5) = round(80 / 20) = 4
        const result = calculateGridPosition(pxOffset, 0.5, dragOffset);
        expect(result).to.deep.equal({ x: 4, y: 4 });
      });
    });
  });

  describe("parseDragOffset", () => {
    it("should return undefined for null dataTransfer", () => {
      expect(parseDragOffset(null)).to.be.undefined;
    });

    it("should return undefined when drag-offset data is missing", () => {
      const mockDataTransfer = {
        getData: () => "",
      } as unknown as DataTransfer;
      expect(parseDragOffset(mockDataTransfer)).to.be.undefined;
    });

    it("should parse valid drag offset JSON", () => {
      const mockDataTransfer = {
        getData: (key: string) =>
          key === "drag-offset"
            ? JSON.stringify({ dragLeft: 15, dragTop: 25 })
            : "",
      } as unknown as DataTransfer;
      expect(parseDragOffset(mockDataTransfer)).to.deep.equal({
        dragLeft: 15,
        dragTop: 25,
      });
    });

    it("should return undefined for invalid JSON", () => {
      const mockDataTransfer = {
        getData: (key: string) => (key === "drag-offset" ? "not json" : ""),
      } as unknown as DataTransfer;
      expect(parseDragOffset(mockDataTransfer)).to.be.undefined;
    });
  });

  describe("isPositionInBounds", () => {
    const width = 10;
    const height = 8;

    it("should return true for position inside bounds", () => {
      expect(isPositionInBounds({ x: 5, y: 4 }, width, height)).to.be.true;
    });

    it("should return true for position at origin", () => {
      expect(isPositionInBounds({ x: 0, y: 0 }, width, height)).to.be.true;
    });

    it("should return true for position at max valid coordinates", () => {
      expect(isPositionInBounds({ x: 9, y: 7 }, width, height)).to.be.true;
    });

    it("should return false for position left of bounds", () => {
      expect(isPositionInBounds({ x: -1, y: 4 }, width, height)).to.be.false;
    });

    it("should return false for position right of bounds", () => {
      expect(isPositionInBounds({ x: 10, y: 4 }, width, height)).to.be.false;
    });

    it("should return false for position above bounds", () => {
      expect(isPositionInBounds({ x: 5, y: -1 }, width, height)).to.be.false;
    });

    it("should return false for position below bounds", () => {
      expect(isPositionInBounds({ x: 5, y: 8 }, width, height)).to.be.false;
    });

    it("should return false for position at width/height (exclusive bound)", () => {
      expect(isPositionInBounds({ x: 10, y: 8 }, width, height)).to.be.false;
    });
  });
});
