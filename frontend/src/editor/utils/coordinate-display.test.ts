import { expect } from "chai";
import u from "updeep";
import { Stage, World } from "../../types";
import { WORLDS } from "../constants/constants";
import {
  formatPosition,
  toDisplayX,
  toDisplayY,
  toInternalX,
  toInternalY,
} from "./coordinate-display";
import { getCurrentStageForWorld } from "./selectors";

const HEIGHT = 8;

describe("coordinate-display", () => {
  describe("toDisplayX / toInternalX", () => {
    it("round-trips at the left edge", () => {
      expect(toDisplayX(0)).to.equal(1);
      expect(toInternalX(1)).to.equal(0);
    });

    it("round-trips at the right edge", () => {
      expect(toDisplayX(9)).to.equal(10);
      expect(toInternalX(10)).to.equal(9);
    });
  });

  describe("toDisplayY / toInternalY", () => {
    it("top-left internal (0, 0) becomes display (1, height)", () => {
      expect(toDisplayY(0, HEIGHT)).to.equal(HEIGHT);
    });

    it("bottom-left internal (0, height-1) becomes display (1, 1)", () => {
      expect(toDisplayY(HEIGHT - 1, HEIGHT)).to.equal(1);
    });

    it("round-trips through internal → display → internal", () => {
      for (let y = 0; y < HEIGHT; y++) {
        expect(toInternalY(toDisplayY(y, HEIGHT), HEIGHT)).to.equal(y);
      }
    });
  });

  describe("formatPosition", () => {
    it("renders bottom-left tile as (1,1)", () => {
      expect(formatPosition({ x: 0, y: HEIGHT - 1 }, { height: HEIGHT })).to.equal("(1,1)");
    });

    it("renders top-left tile as (1, height)", () => {
      expect(formatPosition({ x: 0, y: 0 }, { height: HEIGHT })).to.equal(`(1,${HEIGHT})`);
    });
  });

  // The kid-facing display Y conversion uses the recording stage's height
  // when the inspector is in recording mode. If a future refactor clipped
  // the recording world's stage to the rule extent (or otherwise changed
  // its height), the inspector's displayed Y would silently diverge from
  // what the kid sees in the game. Guard the invariant explicitly.
  describe("recording world stage-height invariant", () => {
    function makeStubWorld(): World {
      const stage: Stage = {
        id: "stage-1",
        order: 0,
        name: "Test",
        actors: {},
        background: "",
        width: 10,
        height: HEIGHT,
        wrapX: false,
        wrapY: false,
      };
      return {
        id: WORLDS.ROOT,
        stages: { "stage-1": stage },
        globals: {
          selectedStageId: { id: "selectedStageId", name: "Stage", value: "stage-1", type: "stage" },
        },
        input: { keys: {}, clicks: {} },
        evaluatedRuleDetails: {},
        history: [],
        metadata: { name: "Test", id: 0, published: false, description: null },
      };
    }

    it("beforeWorld preserves the original stage height", () => {
      const world = makeStubWorld();
      const beforeWorld = u({ id: WORLDS.BEFORE }, world) as World;
      expect(getCurrentStageForWorld(beforeWorld)?.height).to.equal(
        getCurrentStageForWorld(world)?.height,
      );
    });

    it("afterWorld preserves the original stage height", () => {
      const world = makeStubWorld();
      const afterWorld = u({ id: WORLDS.AFTER }, world) as World;
      expect(getCurrentStageForWorld(afterWorld)?.height).to.equal(
        getCurrentStageForWorld(world)?.height,
      );
    });
  });
});
