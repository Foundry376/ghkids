import * as types from '../constants/action-types';

import xhr from 'xhr';

const API_ROOT = `https://www.codako.org`;// (window.location.host.includes('codako') ? `` : `http://localhost:8080`);

export function makeRequest(path, {method = 'GET', query = {}, headers = {}, json, body} = {}) {
  const {dispatch} = window.store;
  const qs = [];
  Object.keys(query).forEach(key => {
    if (query[key]){
      qs.push(`${key}=${encodeURIComponent(query[key])}`);
    }
  });

  dispatch({
    type: types.NETWORK_ACTIVITY,
    error: null,
    delta: 1,
  });

  const me = window.store.getState().me;

  return new Promise((resolve, reject) => {
    xhr(`${API_ROOT}${path}${(qs.length > 0) ? `?` : ''}${qs.join('&')}`, {
      method,
      body: json ? JSON.stringify(json) : body,
      headers: Object.assign({
        'Content-Type': 'application/json',
        'Authorization': me && `Basic ${btoa(me.username + ':' + me.password)}`,
      }, headers),
    }, (err, response, responseBody) => {
      if (err) {
        reject(err);
        return;
      }

      let responseJSON = null;
      try {
        responseJSON = JSON.parse(responseBody);
      } catch (jsonErr) {
        reject(jsonErr);
        return;
      }

      if (response.statusCode !== 200 || responseJSON.error) {
        reject(new Error(responseJSON.message));
      } else {
        dispatch({type: types.NETWORK_ACTIVITY, error: null, delta: -1});
        resolve(responseJSON);
      }
    });
  }).catch((error) => {
    dispatch({type: types.NETWORK_ACTIVITY, error, delta: -1});
    throw error;
  });
}
