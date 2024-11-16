import React from 'react'; import PropTypes from 'prop-types';
import {withRouter} from 'react-router';
import {connect} from 'react-redux';
import Button from 'reactstrap/lib/Button';
import Container from 'reactstrap/lib/Container';
import Row from 'reactstrap/lib/Row';
import Col from 'reactstrap/lib/Col';

import * as CustomPropTypes from '../constants/custom-prop-types';
import {register} from '../actions/main-actions';

class JoinPage extends React.Component {
  static propTypes = {
    router: PropTypes.object,
    dispatch: PropTypes.func,
    networkError: CustomPropTypes.BoomNetworkError,
    location: PropTypes.shape({
      state: PropTypes.shape({
        why: PropTypes.string,
        redirectTo: PropTypes.string,
      }),
    }),
  };

  constructor(props, context) {
    super(props, context);
  }

  _onSubmit = (event) => {
    event.preventDefault();

    const {dispatch, location} = this.props;
    dispatch(register({
      email: this.refs.email.value,
      password: this.refs.pass.value,
      username: this.refs.username.value,
    }, location.state && location.state.redirectTo));
  }

  render() {
    const {location, networkError} = this.props;
    const redirectPresent = location.state && location.state.redirectTo && !location.state.why;

    let message = '';
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
          <Col size={12}>
            <div style={{textAlign: 'center', marginTop:60, marginBottom: 30}}>
              <h3>Join Codako{location.state && location.state.why}</h3>
              <p>
                Create and share games with others around the world.
              </p>
            </div>
          </Col>
        </Row>
        <Row>
          <Col sm={{ size: 7 }} lg={{ size: 5, offset: 2 }}>
            <div className="card">
              {message && (
                <div className={`card card-inverse card-${messageClass} card-block text-xs-center`}>
                  <blockquote className="card-blockquote">
                    {message}
                  </blockquote>
                </div>
              )}
              <form className="card-block" onSubmit={this._onSubmit}>
                <div className={`form-group ${message.includes('username') ? 'has-danger' : ''}`}>
                  <label htmlFor="username">Username</label>
                  <input className={`form-control ${message.includes('username') ? 'form-control-danger' : ''}`} id="username" ref="username" />
                  <small className="form-text text-muted">
                    Don't use your real name!
                  </small>
                </div>
                <div className={`form-group ${message.includes('email') ? 'has-danger' : ''}`}>
                  <label htmlFor="email">Email Address</label>
                  <input className={`form-control ${message.includes('email') ? 'form-control-danger' : ''}`} id="email" ref="email" />
                  <small className="form-text text-muted">
                    You will occasionally receive emails from Codako.
                    We promise not to share your email with anyone.
                  </small>
                </div>
                <div className="form-group">
                  <label htmlFor="password">Password</label>
                  <input className="form-control" id="password" ref="pass" type="password" />
                  <small className="form-text text-muted">
                    Remember it - don't tell anyone else!
                  </small>
                </div>
                <hr />
                <p>
                  By clicking on "Create an account" below, you are agreeing to the Terms of Service and the Privacy Policy.
                </p>
                <hr />
                <Button color="primary" type="submit">Create an account</Button>
              </form>
            </div>
          </Col>
          <Col sm={{size: 5}} lg={{ size: 3 }}>
            <div className="card">
              <div className="card-header">
                Featured
              </div>
              <div className="card-block">
                <ul style={{paddingLeft: 10}}>
                  <li>Learn early programming concepts without writing code</li>
                  <li>Share your work and learn from others</li>
                  <li>No downloads - create games in your broswer!</li>
                </ul>
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

export default withRouter(connect(mapStateToProps)(JoinPage));
