import {routerReducer} from 'react-router-redux';


import mainReducer from './main-reducer';
import initialState from './initial-state';

export default (state = initialState, action) => {
  let nextState = Object.assign({}, state);
  nextState = mainReducer(nextState, action);
  nextState.routing = routerReducer(nextState.routing, action);

  return nextState;
};
