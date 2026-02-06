import { EditorState } from "../../types";
import { Actions } from "../actions";
import * as Types from "../constants/action-types";
import { undoRedoReducerFactory } from "../utils/undo-redo";
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

const undoRedoReducer = undoRedoReducerFactory({
  trackedKeys: ["recording", "world", "characters", "characterZOrder", "stages"],
  ignoredActions: [
    Types.ADVANCE_GAME_STATE,
    Types.STEP_BACK_GAME_STATE,
    Types.INPUT_FOR_GAME_STATE,
  ],
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
