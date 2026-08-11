import { expect } from "chai";
import { applyMiddleware, createStore, Store } from "redux";

import { Characters, EditorState, World } from "../../types";
import { advanceGameState, changeActors } from "../actions/stage-actions";
import { WORLDS } from "../constants/constants";
import rootReducer from "../reducers";
import InitialState from "../reducers/initial-state";
import {
  getActor,
  makeActor,
  makeCharacter,
  makeEventGroup,
  makeRule,
  makeStage,
  makeWorld,
} from "./__tests__/test-fixtures";
import { redo, undo, undoRedoMiddleware } from "./undo-redo";

const CHARACTER_ID = "char-1";
const ACTOR_ID = "actor-1";
const STAGE_ID = "stage-1";

/** A world with one actor of a character whose only rule moves it right each tick. */
function makeEditorState(): EditorState {
  const ruleActor = makeActor({ id: "rule-actor", characterId: CHARACTER_ID });
  const rule = makeRule({
    id: "move-right",
    mainActorId: "rule-actor",
    actors: { "rule-actor": ruleActor },
    actions: [{ type: "move", actorId: "rule-actor", delta: { x: 1, y: 0 } }],
  });
  const character = makeCharacter({
    id: CHARACTER_ID,
    name: "Mover",
    rules: [makeEventGroup({ id: "idle-group", event: "idle", rules: [rule] })],
  });
  const characters: Characters = { [CHARACTER_ID]: character };

  const stage = makeStage({
    id: STAGE_ID,
    actors: {
      [ACTOR_ID]: makeActor({ id: ACTOR_ID, characterId: CHARACTER_ID, position: { x: 2, y: 3 } }),
    },
  });

  return Object.assign({}, InitialState, {
    characters,
    characterZOrder: [CHARACTER_ID],
    world: makeWorld({ stage }),
  });
}

/** The same world, but the character's rule deletes the actor on the first tick. */
function makeEditorStateWithVanishingActor(): EditorState {
  const state = makeEditorState();
  const rule = makeRule({
    id: "vanish",
    mainActorId: "rule-actor",
    actors: { "rule-actor": makeActor({ id: "rule-actor", characterId: CHARACTER_ID }) },
    actions: [{ type: "delete", actorId: "rule-actor" }],
  });
  return Object.assign({}, state, {
    characters: {
      [CHARACTER_ID]: Object.assign({}, state.characters[CHARACTER_ID], {
        rules: [makeEventGroup({ id: "idle-group", event: "idle", rules: [rule] })],
      }),
    },
  });
}

function makeEditorStore(state: EditorState = makeEditorState()): Store<EditorState> {
  return createStore(rootReducer, state, applyMiddleware(undoRedoMiddleware));
}

function positionOf(store: Store<EditorState>) {
  return getActor(store.getState().world, ACTOR_ID)?.position;
}

function tick(store: Store<EditorState>, times: number) {
  for (let i = 0; i < times; i++) {
    store.dispatch(advanceGameState(WORLDS.ROOT));
  }
}

function moveActorTo(store: Store<EditorState>, position: { x: number; y: number }) {
  store.dispatch(
    changeActors({ worldId: WORLDS.ROOT, stageId: STAGE_ID, actorIds: [ACTOR_ID] }, { position }),
  );
}

describe("undo-redo", () => {
  it("undoes the last edit after the game has been run", () => {
    const store = makeEditorStore();

    tick(store, 3);
    expect(positionOf(store)).to.deep.equal({ x: 5, y: 3 });

    moveActorTo(store, { x: 5, y: 5 });
    tick(store, 3);
    expect(positionOf(store)).to.deep.equal({ x: 8, y: 5 });

    // Running the game leaves nothing on the undo stack, so undo has to rewind
    // the world to the point the edit was made before applying the diff.
    store.dispatch(undo());
    expect(positionOf(store)).to.deep.equal({ x: 5, y: 3 });
    expect(store.getState().world.history).to.have.length(0);
  });

  it("undoes an edit to an actor the game has since deleted", () => {
    // The reported crash: the diff describes an object that playback removed,
    // and jsondiffpatch throws a TypeError walking into it.
    const store = makeEditorStore(makeEditorStateWithVanishingActor());

    moveActorTo(store, { x: 5, y: 5 });
    tick(store, 1);
    expect(getActor(store.getState().world, ACTOR_ID)).to.equal(undefined);

    store.dispatch(undo());
    expect(positionOf(store)).to.deep.equal({ x: 2, y: 3 });
  });

  it("redoes the edit after the game has been run again", () => {
    const store = makeEditorStore();

    moveActorTo(store, { x: 5, y: 5 });
    store.dispatch(undo());
    expect(positionOf(store)).to.deep.equal({ x: 2, y: 3 });

    tick(store, 3);
    store.dispatch(redo());
    expect(positionOf(store)).to.deep.equal({ x: 5, y: 5 });
  });

  it("does not record derived playback state in the undo stack", () => {
    const store = makeEditorStore();

    tick(store, 3);
    moveActorTo(store, { x: 5, y: 5 });

    const [diff] = store.getState().undoStack as unknown as Record<
      string,
      Record<string, unknown>
    >[];
    expect(diff).to.have.property("world");
    expect(diff.world).to.have.property("stages");
    expect(diff.world).to.not.have.property("history");
    expect(diff.world).to.not.have.property("evaluatedRuleDetails");
    expect(diff.world).to.not.have.property("evaluatedTickFrames");
    expect(diff.world).to.not.have.property("input");
  });

  it("discards the stacks instead of throwing when a diff cannot be applied", () => {
    // A diff that describes an actor which is no longer on the stage - the
    // shape jsondiffpatch throws a TypeError on.
    const state = Object.assign(makeEditorState(), {
      undoStack: [
        {
          world: {
            stages: { [STAGE_ID]: { actors: { "actor-gone": { position: { x: [1, 2] } } } } },
          },
        },
      ],
      redoStack: [{ characters: {} }],
    }) as unknown as EditorState;

    const store = makeEditorStore(state);
    const consoleError = console.error;
    console.error = () => {};
    try {
      expect(() => store.dispatch(undo())).to.not.throw();
    } finally {
      console.error = consoleError;
    }

    expect(store.getState().undoStack).to.have.length(0);
    expect(store.getState().redoStack).to.have.length(0);
    expect(positionOf(store)).to.deep.equal({ x: 2, y: 3 });
  });

  it("does not rewind the world when there is nothing to undo", () => {
    const store = makeEditorStore();

    tick(store, 3);
    const world: World = store.getState().world;
    store.dispatch(undo());

    expect(store.getState().world).to.deep.equal(world);
  });
});
