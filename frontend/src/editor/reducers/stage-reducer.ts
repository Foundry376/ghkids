import u from "updeep";

import { Stage } from "../../types";
import { Actions } from "../actions";
import * as Types from "../constants/action-types";

export default function stageReducer(state: Stage, action: Actions) {
  if ("stageId" in action && action.stageId && action.stageId !== state.id) {
    return state;
  }

  switch (action.type) {
    case Types.UPSERT_ACTORS: {
      let next = state;
      for (const { id, values } of action.upserts) {
        next = u({ actors: u.updateIn(id, values) }, next) as Stage;
      }
      return next;
    }
    case Types.DELETE_ACTORS: {
      return u(
        {
          actors: u.omit(action.actorIds),
        },
        state,
      );
    }
    case Types.DELETE_CHARACTER: {
      return u(
        {
          actors: u.omitBy((value) => value.characterId === action.characterId),
        },
        state,
      );
    }
    case Types.UPDATE_STAGE_SETTINGS: {
      return u(action.settings, state);
    }
    default:
      return state;
  }
}
