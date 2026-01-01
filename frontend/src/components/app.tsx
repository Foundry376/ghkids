import * as Sentry from "@sentry/react";
import { useDispatch } from "react-redux";
import { Link, Outlet, useLocation } from "react-router-dom";
import Button from "reactstrap/lib/Button";

import { logout } from "../actions/main-actions";
import { useAppSelector } from "../hooks/redux";

const App = () => {
  const location = useLocation();
  const me = useAppSelector((state) => state.me);
  const network = useAppSelector((state) => state.network);
  const dispatch = useDispatch();

  const _renderNav = () => {
    return (
      <nav className="navbar navbar-expand">
        <div className="container" style={{ justifyContent: "flex-start" }}>
          <Link className="navbar-brand" to="/">
            Codako
          </Link>
          <ul className="nav ">
            <li className="nav-item">
              <Link className="nav-link" to="/">
                Home
              </Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/faq">
                Parents
              </Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/explore">
                Explore
              </Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/changelog">
                Changelog
              </Link>
            </li>
          </ul>
          <div style={{ flex: 1 }} />
          <ul className="nav ">
            {me
              ? [
                  <li className="nav-item" key="dashboard">
                    <Link className="nav-link" to="/dashboard">
                      My Games
                    </Link>
                  </li>,
                  <li className="nav-item" key="logout">
                    <a className="nav-link" href="#" onClick={() => dispatch(logout())}>
                      Log Out ({me.username})
                    </a>
                  </li>,
                ]
              : [
                  <li className="nav-item" key="sign-in" style={{ marginRight: 10 }}>
                    <Link to="/login">
                      <Button>Sign in</Button>
                    </Link>
                  </li>,
                  <li className="nav-item" key="sign-up">
                    <Link to="/join">
                      <Button color="success" to="/join">
                        Sign up
                      </Button>
                    </Link>
                  </li>,
                ]}
          </ul>
        </div>
      </nav>
    );
  };

  const _renderFooter = () => {
    return (
      <footer className="footer">
        <div className="container">
          <div className="row">
            <div className="col-md-12">
              {"Open sourced with love by "}
              <a href="http://www.foundry376.com/">Foundry376.</a>{" "}
              <a href="/terms-of-use">Terms of Use</a> and{" "}
              <a href="/privacy-policy">Privacy Policy</a>
            </div>
          </div>
        </div>
      </footer>
    );
  };

  const isEditor = location.pathname.startsWith("/editor");
  const isLogin = location.pathname.startsWith("/login");

  const hidesNav = isLogin || isEditor;
  const hidesFooter = isLogin || isEditor;
  const unwrapped = isEditor;
  const content = unwrapped ? (
    <Outlet />
  ) : (
    <div className="page-content-flex">
      <Outlet />
    </div>
  );

  return (
    <div className="page-container">
      {!hidesNav && _renderNav()}
      <Sentry.ErrorBoundary
        fallback={(errorData) => (
          <div>
            Something went wrong!
            <h2>
              <code>{`${errorData.error}`}</code>
            </h2>
            <pre>
              <code>{`${errorData.error && typeof errorData.error === "object" && "stack" in errorData.error ? errorData.error.stack : null}`}</code>
              <code>{errorData.componentStack}</code>
            </pre>
          </div>
        )}
      >
        {content}
      </Sentry.ErrorBoundary>
      {!hidesFooter && _renderFooter()}
      <div className={`network-bar active-${network.pending > 0}`} />
    </div>
  );
};

export default App;
