import React from "react";
import PropTypes from "prop-types";
import { Link, IndexLink } from "react-router";
import { connect } from "react-redux";
import Button from "reactstrap/lib/Button";

import { logout } from "../actions/main-actions";

class App extends React.Component {
  static propTypes = {
    me: PropTypes.object,
    children: PropTypes.element,
    network: PropTypes.object,
    dispatch: PropTypes.func,
  };

  _renderNav = () => {
    const { me, dispatch } = this.props;

    return (
      <div className="navbar">
        <div className="container">
          <IndexLink className="navbar-brand" to="/">
            Codako
          </IndexLink>
          <ul className="nav navbar-nav">
            <li className="nav-item">
              <IndexLink className="nav-link" to="/">
                Home
              </IndexLink>
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
          </ul>
          <ul className="nav navbar-nav float-xs-right">
            {me
              ? [
                  <li className="nav-item" key="dashboard">
                    <Link className="nav-link" to="/dashboard">
                      My Games
                    </Link>
                  </li>,
                  <li className="nav-item" key="logout">
                    <a
                      className="nav-link"
                      href="#"
                      onClick={() => dispatch(logout())}
                    >
                      Log Out ({me.username})
                    </a>
                  </li>,
                ]
              : [
                  <li className="nav-item" key="sign-in">
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
      </div>
    );
  };

  _renderFooter() {
    return (
      <footer className="footer">
        <div className="container">
          <div className="row">
            <div className="col-md-12">
              {"Open sourced with love by "}
              <a href="http://www.foundry376.com/">Foundry376.</a>{" "}
              <a href="/terms-of-use">Terms of Use</a> and{" "}
              <a href="/privacy-policy">Privacy</a>
            </div>
          </div>
        </div>
      </footer>
    );
  }

  render() {
    const { children, network } = this.props;
    const ChildClass = children.type.WrappedComponent || children.type;
    const { hidesNav, hidesFooter, unwrapped } =
      (ChildClass && ChildClass.layoutConsiderations) || {};

    const content = unwrapped ? (
      children
    ) : (
      <div className="page-content-flex">{children}</div>
    );

    return (
      <div className="page-container">
        {!hidesNav && this._renderNav()}
        {content}
        {!hidesFooter && this._renderFooter()}
        <div className={`network-bar active-${network.pending > 0}`} />
      </div>
    );
  }
}

function mapStateToProps(state) {
  return Object.assign(
    {},
    {
      me: state.me,
      network: state.network,
    }
  );
}

export default connect(mapStateToProps)(App);
