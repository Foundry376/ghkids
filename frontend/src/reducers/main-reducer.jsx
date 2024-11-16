import * as Types from '../constants/action-types';
import { LOCATION_CHANGE } from 'react-router-redux';


export default function mainReducer(state, action) {
  switch (action.type) {
    case Types.SET_ME: {
      return Object.assign({}, state, {
        me: action.me,
      });
    }
    case Types.UPSERT_PROFILE: {
      return Object.assign({}, state, {
        profiles: Object.assign({}, state.profile, {[action.profile.username]: action.profile}),
      });
    }
    case Types.UPSERT_WORLDS: {
      const hash = Object.assign({}, state.worlds);
      for (const w of action.worlds) {
        hash[w.id] = w;
      }
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
    case LOCATION_CHANGE: {
      return Object.assign({}, state, {
        network: {
          pending: 0,
          error: null,
        },
      });
    }
    default:
      return state;
  }
}
