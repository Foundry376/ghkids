import React, {PropTypes} from 'react';
import {Link, IndexLink} from 'react-router';
import {connect} from 'react-redux';
import {push} from 'react-router-redux';
import {Button, NavDropdown, DropdownItem, DropdownMenu, DropdownToggle} from 'reactstrap';

import {logout} from '../actions/main-actions';

class NavUserMenu extends React.Component {
  static propTypes = {
    dispatch: PropTypes.func,
    user: PropTypes.object,
  };

  constructor(props, context) {
    super(props, context);
    this.state = {
      open: false,
    };
  }

  _onVisitDashboard = () => {
    this.props.dispatch(logout());
  }

  render() {
    const {user} = this.props;
    const {open} = this.state;

    return (
      <NavDropdown
        isOpen={open}
        toggle={() => this.setState({open: !open})}
      >
        <DropdownToggle nav caret>
          {user.username}
        </DropdownToggle>
        <DropdownMenu right>
          <DropdownItem onClick={() => this.props.dispatch(push('dashboard'))}>Dashboard</DropdownItem>
          <DropdownItem divider />
          <DropdownItem onClick={() => this.props.dispatch(logout())}>Log Out</DropdownItem>
        </DropdownMenu>
      </NavDropdown>
    );
  }
}

class App extends React.Component {
  static propTypes = {
    user: PropTypes.object,
    children: PropTypes.element,
    network: PropTypes.object,
    dispatch: PropTypes.func,
  };

  _renderNav = () => {
    const {user, dispatch} = this.props;
    return (
      <div className="navbar navbar-light bg-faded">
        <div className="container">
          <div className="collapse navbar-toggleable-md">
            <IndexLink className="navbar-brand" to="/">Codako</IndexLink>
            <ul className="nav navbar-nav">
              <li className="nav-item">
                <IndexLink className="nav-link" to="/">Home</IndexLink>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/about">About</Link>
              </li>
            </ul>
            <ul className="nav navbar-nav float-lg-right">
              {user ? (
                <NavUserMenu user={user} dispatch={dispatch} />
              ) : ([
                <li className="nav-item" key="sign-in">
                  <Link to="/login"><Button >Sign in</Button></Link>
                </li>,
                <li className="nav-item" key="sign-up">
                  <Link to="/join"><Button color="success" to="/join">Sign up</Button></Link>
                </li>
              ])}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  _renderFooter() {
    return (
      <footer className="footer">
        <div className="container">
          <div className="row">
            <div className="col-md-8">
              <div className="navbar navbar-inverse ng-scope">
                <ul className="nav">
                </ul>
              </div>
              © 2017
              <a href="http://www.foundry376.com/">Foundry376</a>, LLC. All Rights Reserved.
              <a href="/terms-of-use">Terms of Use</a> and
              <a href="/privacy-policy">Privacy</a>
            </div>
          </div>
        </div>
      </footer>
    );
  }

  render() {
    const {children, network} = this.props;
    const {hidesNav} = (children.type.WrappedComponent && children.type.WrappedComponent.layoutConsiderations) || {};

    return (
      <div className="page-container">
        {!hidesNav && this._renderNav()}
        <div className="page-content-flex">
          {children}
        </div>
        {!hidesNav && this._renderFooter()}
        <div className={`network-bar active-${network.pending > 0}`} />
      </div>
    );
  }
}

function mapStateToProps(state) {
  return Object.assign({}, {
    user: state.user,
    network: state.network,
  });
}

export default connect(
  mapStateToProps,
)(App);