import React from 'react'; import PropTypes from 'prop-types';
import {withRouter, Link} from 'react-router';
import {connect} from 'react-redux';
import Button from 'reactstrap/lib/Button';
import Container from 'reactstrap/lib/Container';
import Row from 'reactstrap/lib/Row';
import Col from 'reactstrap/lib/Col';

import * as CustomPropTypes from '../constants/custom-prop-types';
import {login} from '../actions/main-actions';

class LoginPage extends React.Component {
  static propTypes = {
    router: PropTypes.object,
    dispatch: PropTypes.func,
    networkError: CustomPropTypes.BoomNetworkError,
    location: PropTypes.shape({
      state: PropTypes.shape({
        redirectTo: PropTypes.string,
      }),
    }),
  };

  static layoutConsiderations = {
    hidesNav: true,
    hidesFooter: true,
  };

  constructor(props, context) {
    super(props, context);
  }

  _onSubmit = (event) => {
    event.preventDefault();

    const {location, dispatch} = this.props;
    const nextPathname = location.state ? location.state.redirectTo : null;

    dispatch(login({
      username: this.refs.username.value,
      password: this.refs.pass.value,
    }, nextPathname));
  }

  render() {
    const {location, networkError} = this.props;
    const redirectPresent = location.state && location.state.redirectTo;

    let message = null;
    let messageClass = null;
    if (redirectPresent) {
      message = 'Sorry, you need to log in to view that page.';
      messageClass = 'info';
    }
    if (networkError) {
      message = (networkError.statusCode === 401) ? 'Sorry, your username or password was incorrect.' : networkError.message;
      messageClass = 'danger';
    }

    return (
      <Container>
        <Row>
          <Col lg={{ size: 4, push: 3, pull: 3, offset: 1 }}>
            <div style={{textAlign: 'center', marginTop:60, marginBottom: 30}}>
              <h3>Sign in to Codako</h3>
            </div>
            <div className="card">
              {message && (
                <div className={`card card-inverse card-${messageClass} card-block text-xs-center`}>
                  <blockquote className="card-blockquote">
                    {message}
                  </blockquote>
                </div>
              )}
              <form className="card-block" onSubmit={this._onSubmit}>
                <div className="form-group">
                  <label htmlFor="username">Username or email address:</label>
                  <input className="form-control" id="username" ref="username" />
                </div>
                <div className="form-group">
                  <label htmlFor="password">Password:</label>
                  <input className="form-control" id="password" ref="pass" type="password" />
                </div>
                <Button block color="primary" type="submit">Login</Button>
              </form>
            </div>
            <div className="card">
              <div className="card-block text-xs-center">
                New to Codako? <Link to="/join">Create an account</Link>.
              </div>
            </div>
          </Col>
        </Row>
      </Container>
    );
  }
}

function mapStateToProps(state) {
  return {
    networkError: state.network.error,
  };
}

export default withRouter(connect(mapStateToProps)(LoginPage));
