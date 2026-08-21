import { expect } from "chai";
import { createStore, Dispatch, Store } from "redux";

import { Characters, EditorState } from "../../types";
import { Actions } from "../actions";
import { advancePlaybackGameState, recordInputForGameState } from "../actions/stage-actions";
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
import { heldKeysAsInput, holdKeys, isKeyHeld, releaseAllKeys, releaseKeys } from "./held-keys";

const CHARACTER_ID = "char-1";
const ACTOR_ID = "actor-1";
const STAGE_ID = "stage-1";
const RIGHT = "ArrowRight";

/** A world with one actor that moves right whenever the right arrow key is down. */
function makeEditorState(): EditorState {
  const rule = makeRule({
    id: "move-right",
    mainActorId: "rule-actor",
    actors: { "rule-actor": makeActor({ id: "rule-actor", characterId: CHARACTER_ID }) },
    actions: [{ type: "move", actorId: "rule-actor", delta: { x: 1, y: 0 } }],
  });
  const characters: Characters = {
    [CHARACTER_ID]: makeCharacter({
      id: CHARACTER_ID,
      name: "Spaceship",
      rules: [makeEventGroup({ id: "key-group", event: "key", code: RIGHT, rules: [rule] })],
    }),
  };
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

function makeEditorStore(): Store<EditorState> {
  return createStore(rootReducer, makeEditorState());
}

function xOf(store: Store<EditorState>) {
  return getActor(store.getState().world, ACTOR_ID)!.position.x;
}

/** What the key handler does on keydown: record the hold, then sync the input. */
function pressKey(store: Store<EditorState>, key: string) {
  holdKeys([key]);
  store.dispatch(recordInputForGameState(WORLDS.ROOT, { keys: heldKeysAsInput() }));
}

/**
 * What the key handler does on keyup during playback: forget the hold, but
 * leave the frame's input alone so a tap that started this frame still counts.
 */
function releaseKey(key: string) {
  releaseKeys([key]);
}

/** One playback frame, the way stage-controls' timer runs it. */
function tick(store: Store<EditorState>, times = 1) {
  for (let i = 0; i < times; i++) {
    // Run the thunk by hand rather than pulling redux-thunk into the store.
    advancePlaybackGameState(WORLDS.ROOT)(store.dispatch as Dispatch<Actions>, store.getState);
  }
}

describe("held keys", () => {
  beforeEach(() => {
    releaseAllKeys();
  });

  it("tracks which keys are down", () => {
    expect(isKeyHeld(RIGHT)).to.equal(false);
    expect(holdKeys([RIGHT])).to.equal(true);
    expect(holdKeys([RIGHT])).to.equal(false); // auto-repeat, nothing changed
    expect(isKeyHeld(RIGHT)).to.equal(true);
    expect(heldKeysAsInput()).to.deep.equal({ [RIGHT]: true });

    expect(releaseKeys([RIGHT])).to.equal(true);
    expect(releaseKeys([RIGHT])).to.equal(false);
    expect(heldKeysAsInput()).to.deep.equal({});
  });

  it("releases everything at once", () => {
    holdKeys([RIGHT, "ArrowLeft"]);
    expect(releaseAllKeys()).to.equal(true);
    expect(releaseAllKeys()).to.equal(false);
    expect(heldKeysAsInput()).to.deep.equal({});
  });

  describe("during playback", () => {
    it("keeps firing the key's rules for as long as the key is held", () => {
      const store = makeEditorStore();
      pressKey(store, RIGHT);

      // The player holds the key down; the browser's auto-repeat keydowns are
      // ignored, so nothing but the ticks happen from here.
      const positions = [xOf(store)];
      for (let i = 0; i < 4; i++) {
        tick(store);
        positions.push(xOf(store));
      }
      expect(positions).to.deep.equal([2, 3, 4, 5, 6]);
    });

    it("stops as soon as the key is released", () => {
      const store = makeEditorStore();
      pressKey(store, RIGHT);
      tick(store, 2);
      expect(xOf(store)).to.equal(4);

      releaseKey(RIGHT);
      tick(store, 3);
      expect(xOf(store)).to.equal(4);
    });

    it("fires once for a tap that ends before the next tick", () => {
      const store = makeEditorStore();
      pressKey(store, RIGHT);
      releaseKey(RIGHT); // keyup lands between two ticks

      tick(store, 3);
      expect(xOf(store)).to.equal(3);
    });

    it("moves diagonally when two keys are held at once", () => {
      const store = makeEditorStore();
      pressKey(store, RIGHT);
      pressKey(store, "ArrowUp");
      expect(heldKeysAsInput()).to.deep.equal({ [RIGHT]: true, ArrowUp: true });

      // Only the right-arrow rule exists, but both keys stay held across ticks.
      tick(store, 2);
      expect(xOf(store)).to.equal(4);
      expect(heldKeysAsInput()).to.deep.equal({ [RIGHT]: true, ArrowUp: true });

      releaseKey(RIGHT);
      tick(store, 2);
      expect(xOf(store)).to.equal(4);
      expect(heldKeysAsInput()).to.deep.equal({ ArrowUp: true });
    });
  });
});
