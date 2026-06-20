import { expect } from "chai";

import { EditorState, World, WorldMinimal } from "../../types";
import {
  createGlobal,
  createStageVariable,
  setGlobalPositions,
  setStageVariablePositions,
  setStageVariableValue,
  upsertStageVariable,
} from "../actions/world-actions";
import { BUILTIN_GLOBAL_IDS } from "../utils/variable-layout";
import { CREATE_STAGE } from "../constants/action-types";
import { WORLDS } from "../constants/constants";
import { makeId } from "../utils/utils";
import initialState from "./initial-state";
import worldReducer from "./world-reducer";

function reduce(state: WorldMinimal, action: Parameters<typeof worldReducer>[1]): WorldMinimal {
  return worldReducer(state as World, action, initialState as EditorState) as WorldMinimal;
}

function createStageAction(stageId: string, stageName: string) {
  return { type: CREATE_STAGE, worldId: WORLDS.ROOT, stageId, stageName } as const;
}

describe("worldReducer stage-variable invariant", () => {
  describe("UPSERT_STAGE_VARIABLE (creating)", () => {
    it("seeds the new variable's initial value on every stage", () => {
      const before = initialState.world as WorldMinimal;
      const stageIds = Object.keys(before.stages);
      expect(stageIds.length).to.be.greaterThan(0);

      const create = createStageVariable(WORLDS.ROOT);
      const after = reduce(before, create);

      for (const stageId of stageIds) {
        expect(after.stages[stageId].variableValues[create.stageVariableId]).to.equal("0");
      }
      expect(after.stageVariables[create.stageVariableId]).to.deep.include({
        id: create.stageVariableId,
        name: "Untitled",
      });
    });

    it("renaming an existing variable does NOT re-seed values", () => {
      const before = initialState.world as WorldMinimal;
      const create = createStageVariable(WORLDS.ROOT);
      let next = reduce(before, create);
      const firstStageId = Object.keys(next.stages)[0];

      next = reduce(
        next,
        setStageVariableValue(WORLDS.ROOT, firstStageId, create.stageVariableId, "42"),
      );
      expect(next.stages[firstStageId].variableValues[create.stageVariableId]).to.equal("42");

      next = reduce(next, upsertStageVariable(WORLDS.ROOT, create.stageVariableId, { name: "Score" }));
      expect(next.stages[firstStageId].variableValues[create.stageVariableId]).to.equal("42");
      expect(next.stageVariables[create.stageVariableId].name).to.equal("Score");
    });
  });

  describe("CREATE_STAGE", () => {
    it("copies variableValues from the currently-selected stage", () => {
      const before = initialState.world as WorldMinimal;
      const create = createStageVariable(WORLDS.ROOT);
      let next = reduce(before, create);
      const sourceStageId = Object.keys(next.stages)[0];
      next = reduce(
        next,
        setStageVariableValue(WORLDS.ROOT, sourceStageId, create.stageVariableId, "7"),
      );
      // also override a built-in so we can confirm the copy includes built-ins
      next = reduce(
        next,
        setStageVariableValue(WORLDS.ROOT, sourceStageId, "wrapX", "false"),
      );

      const newStageId = makeId("stage");
      next = reduce(next, createStageAction(newStageId, "Level 2"));
      expect(next.stages[newStageId].variableValues[create.stageVariableId]).to.equal("7");
      expect(next.stages[newStageId].variableValues.wrapX).to.equal("false");
      expect(next.stages[newStageId].variableValues.wrapY).to.equal("true");
    });
  });

  describe("SET_STAGE_VARIABLE_VALUE", () => {
    it("no-ops on undefined (so the every-var-on-every-stage invariant holds)", () => {
      const before = initialState.world as WorldMinimal;
      const stageId = Object.keys(before.stages)[0];

      let next = reduce(before, setStageVariableValue(WORLDS.ROOT, stageId, "wrapX", "false"));
      expect(next.stages[stageId].variableValues.wrapX).to.equal("false");

      next = reduce(next, setStageVariableValue(WORLDS.ROOT, stageId, "wrapX", undefined));
      expect(next.stages[stageId].variableValues.wrapX).to.equal("false");
    });
  });

  describe("variable grid positions", () => {
    it("places a new stage variable bottom-left, ignoring position-less built-ins", () => {
      const before = initialState.world as WorldMinimal;
      const create = createStageVariable(WORLDS.ROOT);
      const after = reduce(before, create);
      expect(after.stageVariables[create.stageVariableId].position).to.deep.equal({ col: 0, row: 0 });
    });

    it("stacks successive new stage variables down column 0", () => {
      const before = initialState.world as WorldMinimal;
      const first = createStageVariable(WORLDS.ROOT);
      let next = reduce(before, first);
      const second = createStageVariable(WORLDS.ROOT);
      next = reduce(next, second);
      expect(next.stageVariables[first.stageVariableId].position).to.deep.equal({ col: 0, row: 0 });
      expect(next.stageVariables[second.stageVariableId].position).to.deep.equal({ col: 0, row: 1 });
    });

    it("SET_STAGE_VARIABLE_POSITIONS replaces the position for the given id", () => {
      const before = initialState.world as WorldMinimal;
      const create = createStageVariable(WORLDS.ROOT);
      let next = reduce(before, create);
      next = reduce(
        next,
        setStageVariablePositions(WORLDS.ROOT, { [create.stageVariableId]: { col: 1, row: 2 } }),
      );
      expect(next.stageVariables[create.stageVariableId].position).to.deep.equal({ col: 1, row: 2 });
    });

    it("SET_GLOBAL_POSITIONS replaces the position for the given id", () => {
      const before = initialState.world as WorldMinimal;
      let next = reduce(before, createGlobal(WORLDS.ROOT));
      const userId = Object.keys(next.globals).find((id) => !BUILTIN_GLOBAL_IDS.has(id))!;
      next = reduce(next, setGlobalPositions(WORLDS.ROOT, { [userId]: { col: 1, row: 3 } }));
      expect(next.globals[userId].position).to.deep.equal({ col: 1, row: 3 });
    });
  });
});
