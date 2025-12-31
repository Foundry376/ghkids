import { expect } from "chai";
import { calculateFitScale, STAGE_ZOOM_STEPS } from "./useStageZoom";

describe("useStageZoom", () => {
  // STAGE_CELL_SIZE is 40px
  const CELL = 40;

  describe("STAGE_ZOOM_STEPS", () => {
    it("should have 7 zoom steps", () => {
      expect(STAGE_ZOOM_STEPS).to.have.length(7);
    });

    it("should be in descending order", () => {
      for (let i = 0; i < STAGE_ZOOM_STEPS.length - 1; i++) {
        expect(STAGE_ZOOM_STEPS[i]).to.be.greaterThan(STAGE_ZOOM_STEPS[i + 1]);
      }
    });

    it("should start at 1 (100% zoom)", () => {
      expect(STAGE_ZOOM_STEPS[0]).to.equal(1);
    });
  });

  describe("calculateFitScale", () => {
    it("should return 1 when stage fits exactly at 100%", () => {
      // 10x10 stage = 400x400 pixels
      // Container = 400x400 pixels
      const result = calculateFitScale(400, 400, 10, 10);
      expect(result).to.equal(1);
    });

    it("should return 1 when stage fits with room to spare", () => {
      // 10x10 stage = 400x400 pixels
      // Container = 800x800 pixels (fit = 2.0)
      // Best zoom step <= 2.0 is 1
      const result = calculateFitScale(800, 800, 10, 10);
      expect(result).to.equal(1);
    });

    it("should return smaller zoom when stage is too large", () => {
      // 10x10 stage = 400x400 pixels
      // Container = 200x200 pixels (fit = 0.5)
      // Best zoom step <= 0.5 is 0.5
      const result = calculateFitScale(200, 200, 10, 10);
      expect(result).to.equal(0.5);
    });

    it("should handle non-square stages (width-constrained)", () => {
      // 20x10 stage = 800x400 pixels
      // Container = 400x400 pixels
      // Width fit = 400/800 = 0.5, Height fit = 400/400 = 1.0
      // min(0.5, 1.0) = 0.5
      const result = calculateFitScale(400, 400, 20, 10);
      expect(result).to.equal(0.5);
    });

    it("should handle non-square stages (height-constrained)", () => {
      // 10x20 stage = 400x800 pixels
      // Container = 400x400 pixels
      // Width fit = 400/400 = 1.0, Height fit = 400/800 = 0.5
      // min(1.0, 0.5) = 0.5
      const result = calculateFitScale(400, 400, 10, 20);
      expect(result).to.equal(0.5);
    });

    it("should snap to nearest zoom step", () => {
      // Fit = 0.7, should snap down to 0.63
      // 10x10 stage = 400x400 pixels
      // Container = 280x280 pixels (fit = 0.7)
      const result = calculateFitScale(280, 280, 10, 10);
      expect(result).to.equal(0.63);
    });

    it("should return raw fit when smaller than all steps", () => {
      // Very small container
      // 10x10 stage = 400x400 pixels
      // Container = 100x100 pixels (fit = 0.25)
      // 0.25 is smaller than all zoom steps, so return 0.25
      const result = calculateFitScale(100, 100, 10, 10);
      expect(result).to.equal(0.25);
    });

    it("should use custom zoom steps when provided", () => {
      const customSteps = [1, 0.5, 0.25];
      // Fit = 0.7, should snap to 0.5 (largest step <= 0.7)
      const result = calculateFitScale(280, 280, 10, 10, customSteps);
      expect(result).to.equal(0.5);
    });

    it("should handle edge case of very small stage", () => {
      // 1x1 stage = 40x40 pixels
      // Container = 400x400 pixels (fit = 10.0)
      // Best zoom step <= 10.0 is 1
      const result = calculateFitScale(400, 400, 1, 1);
      expect(result).to.equal(1);
    });

    it("should handle edge case of large stage", () => {
      // 100x100 stage = 4000x4000 pixels
      // Container = 400x400 pixels (fit = 0.1)
      // 0.1 is smaller than all zoom steps
      const result = calculateFitScale(400, 400, 100, 100);
      expect(result).to.equal(0.1);
    });
  });
});
