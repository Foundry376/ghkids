import u from 'updeep';

import * as Types from '../constants/action-types';
import initialState from './initial-state';
import StageOperator from '../utils/stage-operator';

export default function stageReducer(state = initialState.stage, action) {
  if (action.stageUid !== state.uid) {
    return state;
  }

  switch (action.type) {
    case Types.UPSERT_ACTOR: {
      return u({
        actors: u.updateIn(action.id, action.values)
      }, state);
    }
    case Types.DELETE_ACTOR: {
      return u({
        actors: u.omit(action.id),
      }, state);
    }
    case Types.INPUT_FOR_GAME_STATE: {
      return u({
        input:{ keys: action.keys, clicks: action.clicks }
      }, state);
    }
    case Types.UPDATE_STAGE_SETTINGS: {
      const {wrapX, wrapY, width, height} = action.settings;
      return u({wrapX, wrapY, width, height}, state);
    }
    case Types.SAVE_INITIAL_GAME_STATE: {
      return u({
        startThumbnail: action.thumbnail,
        startActors: u.constant(action.actors),
      }, state);
    }
    case Types.RESTORE_INITIAL_GAME_STATE: {
      return u({
        actors: u.constant(state.startActors)
      }, state);
    }
    case Types.ADVANCE_GAME_STATE: {
      const nextState = JSON.parse(JSON.stringify(state));
      StageOperator(nextState).tick();
      return nextState;
    }
    default:
      return state;
  }
}