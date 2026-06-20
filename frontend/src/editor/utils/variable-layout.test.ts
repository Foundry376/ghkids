import { expect } from "chai";

import {
  CELL_HEIGHT,
  CELL_WIDTH,
  cellFromPoint,
  layoutHeight,
  nextPosition,
  resolveLayout,
} from "./variable-layout";

describe("variable-layout", () => {
  describe("resolveLayout", () => {
    it("keeps stored positions and flows position-less defs into free cells", () => {
      const layout = resolveLayout([
        { id: "a", position: { col: 1, row: 0 } },
        { id: "b" },
        { id: "c" },
      ]);
      // a stays put; b/c fill the first free reading-order cells around it.
      expect(layout.get("a")).to.deep.equal({ col: 1, row: 0 });
      expect(layout.get("b")).to.deep.equal({ col: 0, row: 0 });
      expect(layout.get("c")).to.deep.equal({ col: 0, row: 1 });
    });

    it("bumps colliding stored positions to the next free cell", () => {
      const layout = resolveLayout([
        { id: "a", position: { col: 0, row: 0 } },
        { id: "b", position: { col: 0, row: 0 } },
      ]);
      expect(layout.get("a")).to.deep.equal({ col: 0, row: 0 });
      expect(layout.get("b")).to.deep.equal({ col: 1, row: 0 });
    });
  });

  describe("layoutHeight", () => {
    it("spans every occupied row", () => {
      const layout = resolveLayout([
        { id: "a", position: { col: 0, row: 0 } },
        { id: "b", position: { col: 1, row: 2 } },
      ]);
      expect(layoutHeight(layout)).to.equal(3 * CELL_HEIGHT);
    });
  });

  describe("cellFromPoint", () => {
    const rect = { left: 100, top: 50 };

    it("snaps to the cell under the box's top-left (cursor minus grab offset)", () => {
      // Pointer at (255, 142) grabbed 10px/12px into the box → top-left ≈ (245,130)
      // → relative (145, 80) → col round(145/CELL_WIDTH), row round(80/CELL_HEIGHT).
      const cell = cellFromPoint(255, 142, rect, 10, 12);
      expect(cell).to.deep.equal({
        col: Math.round(145 / CELL_WIDTH),
        row: Math.round(80 / CELL_HEIGHT),
      });
    });

    it("clamps to the 2-column grid and non-negative rows", () => {
      expect(cellFromPoint(9999, -9999, rect, 0, 0)).to.deep.equal({ col: 1, row: 0 });
    });
  });

  describe("nextPosition", () => {
    it("returns bottom-left below the lowest positioned item", () => {
      expect(
        nextPosition([
          { position: { col: 0, row: 0 } },
          { position: { col: 1, row: 2 } },
        ]),
      ).to.deep.equal({ col: 0, row: 3 });
    });

    it("starts at the origin when nothing is positioned (e.g. only built-ins)", () => {
      expect(nextPosition([{}, {}])).to.deep.equal({ col: 0, row: 0 });
    });
  });
});
