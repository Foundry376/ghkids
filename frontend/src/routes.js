import React from 'react';
import { Route, IndexRoute } from 'react-router';

import App from './components/app';
import HomePage from './components/home-page';
import AboutPage from './components/about-page';
import EditorPage from './components/editor-page';
import NotFoundPage from './components/not-found-page';
import DashboardPage from './components/dashboard-page';
import LoginPage from './components/login-page';
import JoinPage from './components/join-page';

function requireAuth(nextState, replace) {
  if (!window.store.getState().user) {
    replace({
      pathname: '/login',
      state: {
        redirectTo: nextState.location.pathname,
      },
    });
  }
}

export default (
  <Route path="/" component={App}>
    <IndexRoute component={HomePage} />
    <Route path="about" component={AboutPage} />
    <Route path="login" component={LoginPage} />
    <Route path="join" component={JoinPage} />

    <Route path="editor" component={EditorPage} onEnter={requireAuth} />
    <Route path="dashboard" component={DashboardPage} onEnter={requireAuth} />

    <Route path="*" component={NotFoundPage}/>
  </Route>
);