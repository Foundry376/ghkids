import { Actions } from "../actions";
import * as Types from "../constants/action-types";

export default function characterZOrderReducer(state: string[] = [], action: Actions): string[] {
  switch (action.type) {
    case Types.UPSERT_CHARACTER: {
      if (!state.includes(action.characterId)) {
        return [...state, action.characterId];
      }
      return state;
    }
    case Types.DELETE_CHARACTER: {
      return state.filter((id) => id !== action.characterId);
    }
    case Types.SET_CHARACTER_Z_ORDER: {
      return action.characterZOrder;
    }
    default:
      return state;
  }
}
