import {replace, push} from 'react-router-redux';


import {makeRequest} from '../helpers/api';
import * as types from '../constants/action-types';

const DEFAULT_POST_AUTH_PATH = '/dashboard';

export function logout() {
  return function(dispatch) {
    dispatch({
      type: types.SET_ME,
      me: null,
    });
    dispatch(push('/'));
  };
}

export function register({username, password, email}, redirectTo) {
  return function(dispatch) {
    makeRequest('/users', {
      method: 'POST',
      json: {username, password, email},
    }).then((user) => {
      dispatch({
        type: types.SET_ME,
        me: Object.assign(user, {password}),
      });
      dispatch(replace(redirectTo || DEFAULT_POST_AUTH_PATH));
    });
  };
}

export function login({username, password}, redirectTo) {
  return function(dispatch) {
    makeRequest('/users/me', {
      headers: {
        'Authorization': `Basic ${btoa(username + ':' + password)}`,
      },
    }).then((user) => {
      dispatch({
        type: types.SET_ME,
        me: Object.assign(user, {password}),
      });
      dispatch(replace(redirectTo || DEFAULT_POST_AUTH_PATH));
    });
  };
}

export function fetchUser(username) {
  return function(dispatch) {
    makeRequest(`/users/${username}`).then((profile) => {
      dispatch({type: types.UPSERT_PROFILE, profile});
    });
  };
}

export function fetchWorldsForUser(userId) {
  return function(dispatch) {
    makeRequest(`/worlds`, {query: {user: userId}}).then((worlds) => {
      dispatch({type: types.UPSERT_WORLDS, worlds});
    });
  };
}

export function fetchWorld(id) {
  return function(dispatch) {
    makeRequest(`/worlds/${id}`).then((world) => {
      dispatch({type: types.UPSERT_WORLDS, worlds: [world]});
    });
  };
}

export function deleteWorld(id) {
  return function(dispatch) {
    if (window.confirm("Are you sure you want to delete this world? This action cannot be undone.")) {
      makeRequest(`/worlds/${id}`, {method: 'DELETE'}).then(() => {
        dispatch(fetchWorldsForUser('me'));
      });
    }
  };
}

export function createWorld({from, fork} = {}) {
  return function(dispatch) {
    let qs = '';
    if (from === 'tutorial') {
      qs = 'tutorial=base';
    } else if (fork) {
      qs = 'tutorial=fork';
    }

    if (window.store.getState().me) {
      makeRequest(`/worlds`, {query: {from, fork}, method: 'POST'}).then((created) => {
        dispatch(push(`/editor/${created.id}?${qs}`));
      });
    } else {
      if (!from) {
        alert("You need to create an account to create worlds from scratch!");
        return;
      }
      makeRequest(`/worlds/${from}`).then((world) => {
        const storageKey = `ls-${Date.now()}`;
        const storageWorld = Object.assign({}, world, {id: storageKey});
        localStorage.setItem(storageKey, JSON.stringify(storageWorld));
        dispatch(push(`/editor/${storageKey}?localstorage=true&${qs}`));
      });
    }
  };
}

export function uploadLocalStorageWorld(storageKey) {
  return function(dispatch) {
    let json = null;
    try {
      const world = JSON.parse(window.localStorage.getItem(storageKey));
      json = {name: world.name, data: world.data, thumbnail: world.thumbnail};
    } catch (err) {
      alert("Sorry, your world could not be uploaded. " + err.toString());
      dispatch(replace(`/dashboard`));
      return;
    }

    console.log("Creating a new world");
    makeRequest(`/worlds`, {method: 'POST'}).then((created) => {
      console.log("Uploading localstorage data to world");

      makeRequest(`/worlds/${created.id}`, {method: 'PUT', json}).then(() => {
        console.log("Removing localstorage, redirecting to world");
        window.localStorage.setItem(storageKey, JSON.stringify({uploadedAsId: created.id}));

        dispatch({type: types.UPSERT_WORLDS, worlds: [
          Object.assign({}, created, json),
        ]});
        dispatch(replace(`/editor/${created.id}`));
      });
    });
  };
}