import { MainActions } from "../actions/main-actions";
import * as Types from "../constants/action-types";
import { MainState } from "./initial-state";

export default function mainReducer(state: MainState, action: MainActions) {
  switch (action.type) {
    case Types.SET_ME: {
      return Object.assign({}, state, {
        me: action.me,
      });
    }
    case Types.UPSERT_PROFILE: {
      return Object.assign({}, state, {
        profiles: Object.assign({}, state.profiles, {
          [action.profile.username]: action.profile,
        }),
      });
    }
    case Types.UPSERT_WORLDS: {
      const hash = state.worlds ? Object.assign({}, state.worlds) : {};
      for (const w of action.worlds) {
        hash[w.id] = w;
      }
      return Object.assign({}, state, {
        worlds: hash,
      });
    }
    case Types.REMOVE_WORLD: {
      const hash = Object.assign({}, state.worlds);
      delete hash[action.id];
      return Object.assign({}, state, {
        worlds: hash,
      });
    }
    case Types.NETWORK_ACTIVITY: {
      return Object.assign({}, state, {
        network: {
          pending: state.network.pending + action.delta,
          error: action.error,
        },
      });
    }
    // case LOCATION_CHANGE: {
    //   return Object.assign({}, state, {
    //     network: {
    //       pending: 0,
    //       error: null,
    //     },
    //   });
    // }
    default:
      return state;
  }
}
