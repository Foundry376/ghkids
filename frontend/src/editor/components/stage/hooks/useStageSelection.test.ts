import { expect } from "chai";
import {
  selectionRectToGridBounds,
  findActorsInBounds,
  getSelectionCharacterId,
  SelectionRect,
} from "./useStageSelection";
import { Actor } from "../../../../types";

describe("useStageSelection", () => {
  // STAGE_CELL_SIZE is 40px
  const CELL = 40;

  describe("selectionRectToGridBounds", () => {
    it("should convert pixel rectangle to grid bounds at scale 1", () => {
      const rect: SelectionRect = {
        start: { left: 40, top: 40 },
        end: { left: 120, top: 160 },
      };
      const result = selectionRectToGridBounds(rect, 1);
      // min: floor(40/40) = 1, floor(40/40) = 1
      // max: floor(120/40) = 3, floor(160/40) = 4
      expect(result.min).to.deep.equal({ x: 1, y: 1 });
      expect(result.max).to.deep.equal({ x: 3, y: 4 });
    });

    it("should handle reversed rectangle (dragging up-left)", () => {
      const rect: SelectionRect = {
        start: { left: 120, top: 160 },
        end: { left: 40, top: 40 },
      };
      const result = selectionRectToGridBounds(rect, 1);
      // Same result as dragging down-right
      expect(result.min).to.deep.equal({ x: 1, y: 1 });
      expect(result.max).to.deep.equal({ x: 3, y: 4 });
    });

    it("should handle scale factor", () => {
      const rect: SelectionRect = {
        start: { left: 20, top: 20 },
        end: { left: 60, top: 60 },
      };
      const result = selectionRectToGridBounds(rect, 0.5);
      // At scale 0.5, coordinates are effectively doubled
      // min: floor(20/40/0.5) = floor(1) = 1
      // max: floor(60/40/0.5) = floor(3) = 3
      expect(result.min).to.deep.equal({ x: 1, y: 1 });
      expect(result.max).to.deep.equal({ x: 3, y: 3 });
    });

    it("should handle selection starting at origin", () => {
      const rect: SelectionRect = {
        start: { left: 0, top: 0 },
        end: { left: 80, top: 80 },
      };
      const result = selectionRectToGridBounds(rect, 1);
      expect(result.min).to.deep.equal({ x: 0, y: 0 });
      expect(result.max).to.deep.equal({ x: 2, y: 2 });
    });

    it("should handle zero-size selection (single click)", () => {
      const rect: SelectionRect = {
        start: { left: 50, top: 50 },
        end: { left: 50, top: 50 },
      };
      const result = selectionRectToGridBounds(rect, 1);
      // Both min and max should be the same cell
      expect(result.min).to.deep.equal({ x: 1, y: 1 });
      expect(result.max).to.deep.equal({ x: 1, y: 1 });
    });

    it("should floor pixel coordinates to grid", () => {
      const rect: SelectionRect = {
        start: { left: 39, top: 39 }, // Just before cell 1
        end: { left: 81, top: 81 }, // Just into cell 2
      };
      const result = selectionRectToGridBounds(rect, 1);
      expect(result.min).to.deep.equal({ x: 0, y: 0 });
      expect(result.max).to.deep.equal({ x: 2, y: 2 });
    });
  });

  describe("findActorsInBounds", () => {
    const createActor = (id: string, x: number, y: number, characterId = "char1"): Actor => ({
      id,
      characterId,
      position: { x, y },
      appearance: "app1",
      variableValues: {},
    });

    it("should find actors within bounds", () => {
      const actors = {
        a1: createActor("a1", 2, 2),
        a2: createActor("a2", 3, 3),
        a3: createActor("a3", 5, 5), // Outside bounds
      };
      const result = findActorsInBounds(actors, { x: 1, y: 1 }, { x: 4, y: 4 });
      expect(result).to.have.length(2);
      expect(result.map((a) => a.id).sort()).to.deep.equal(["a1", "a2"]);
    });

    it("should include actors on bounds edges", () => {
      const actors = {
        a1: createActor("a1", 1, 1), // On min edge
        a2: createActor("a2", 4, 4), // On max edge
      };
      const result = findActorsInBounds(actors, { x: 1, y: 1 }, { x: 4, y: 4 });
      expect(result).to.have.length(2);
    });

    it("should return empty array when no actors in bounds", () => {
      const actors = {
        a1: createActor("a1", 10, 10),
      };
      const result = findActorsInBounds(actors, { x: 1, y: 1 }, { x: 4, y: 4 });
      expect(result).to.have.length(0);
    });

    it("should return empty array for empty actors dict", () => {
      const result = findActorsInBounds({}, { x: 1, y: 1 }, { x: 4, y: 4 });
      expect(result).to.have.length(0);
    });

    it("should handle single-cell bounds", () => {
      const actors = {
        a1: createActor("a1", 2, 2),
        a2: createActor("a2", 2, 3),
      };
      const result = findActorsInBounds(actors, { x: 2, y: 2 }, { x: 2, y: 2 });
      expect(result).to.have.length(1);
      expect(result[0].id).to.equal("a1");
    });

    it("should find overlapping actors at same position", () => {
      const actors = {
        a1: createActor("a1", 2, 2),
        a2: createActor("a2", 2, 2), // Same position
      };
      const result = findActorsInBounds(actors, { x: 2, y: 2 }, { x: 2, y: 2 });
      expect(result).to.have.length(2);
    });
  });

  describe("getSelectionCharacterId", () => {
    const createActor = (id: string, characterId: string): Actor => ({
      id,
      characterId,
      position: { x: 0, y: 0 },
      appearance: "app1",
      variableValues: {},
    });

    it("should return character ID when all actors share same character", () => {
      const actors = [
        createActor("a1", "char1"),
        createActor("a2", "char1"),
        createActor("a3", "char1"),
      ];
      expect(getSelectionCharacterId(actors)).to.equal("char1");
    });

    it("should return null when actors have different characters", () => {
      const actors = [
        createActor("a1", "char1"),
        createActor("a2", "char2"),
      ];
      expect(getSelectionCharacterId(actors)).to.be.null;
    });

    it("should return null for empty array", () => {
      expect(getSelectionCharacterId([])).to.be.null;
    });

    it("should return character ID for single actor", () => {
      const actors = [createActor("a1", "char1")];
      expect(getSelectionCharacterId(actors)).to.equal("char1");
    });

    it("should return null when only one actor differs", () => {
      const actors = [
        createActor("a1", "char1"),
        createActor("a2", "char1"),
        createActor("a3", "char2"), // Different
      ];
      expect(getSelectionCharacterId(actors)).to.be.null;
    });
  });
});
