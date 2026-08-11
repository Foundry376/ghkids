import { EditorState } from "../../types";
import { Actions } from "../actions";
import * as Types from "../constants/action-types";
import { undoRedoReducerFactory } from "../utils/undo-redo";
import { rewindWorldToStart } from "../utils/world-operator";
import characterZOrderReducer from "./character-z-order-reducer";
import charactersReducer from "./characters-reducer";
import InitialState from "./initial-state";
import recordingReducer from "./recording-reducer";
import uiReducer from "./ui-reducer";
import worldReducer from "./world-reducer";

const reducerMap = {
  ui: uiReducer,
  world: worldReducer,
  characters: charactersReducer,
  characterZOrder: characterZOrderReducer,
  recording: recordingReducer,
};

// Running the game moves the world without leaving anything on the undo
// stack, so by the time the user hits undo the world no longer looks like it
// did when the diff on top of the stack was recorded - actors have moved and
// may not even exist anymore. Rewinding first returns the world to the state
// it was in when the last edit was made (edits clear the history), which is
// exactly the state the diff was computed against.
function rewindWorldForUndoRedo(state: EditorState): EditorState {
  if (!state.world || !state.world.history || state.world.history.length === 0) {
    return state;
  }
  return Object.assign({}, state, {
    world: rewindWorldToStart(state.world, state.characters),
  });
}

const undoRedoReducer = undoRedoReducerFactory({
  trackedKeys: ["recording", "world", "characters", "characterZOrder", "stages"],
  ignoredActions: [
    Types.ADVANCE_GAME_STATE,
    Types.STEP_BACK_GAME_STATE,
    Types.INPUT_FOR_GAME_STATE,
    Types.REWIND_ALL_GAME_STATE,
  ],
  prepareForShift: rewindWorldForUndoRedo,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyReducerMap(map: any, state: any, action: Actions) {
  const nextState = Object.assign({}, state);

  for (const key of Object.keys(map)) {
    if (map[key] instanceof Function) {
      nextState[key] = map[key](state[key], action, state);
    } else {
      nextState[key] = applyReducerMap(map[key], state[key], action);
    }
  }

  return nextState as EditorState;
}

export default function (state: EditorState = InitialState, action: Actions) {
  // apply reducers that handle individual state keys
  let nextState = applyReducerMap(reducerMap, state, action);

  // apply undo/redo actions
  nextState = undoRedoReducer(nextState, action);

  return nextState;
}
