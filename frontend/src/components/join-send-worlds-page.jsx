import React from 'react'; import PropTypes from 'prop-types';
import {connect} from 'react-redux';

import Container from 'reactstrap/lib/Container';
import Row from 'reactstrap/lib/Row';
import Col from 'reactstrap/lib/Col';
import {uploadLocalStorageWorld} from '../actions/main-actions';

class JoinSendWorldsPage extends React.Component {
  static propTypes = {
    dispatch: PropTypes.func,
    location: PropTypes.shape({
      query: PropTypes.shape({
        storageKey: PropTypes.string,
      }),
    }),
  };

  componentDidMount() {
    const {location, dispatch} = this.props;
    const storageKey = location.query.storageKey;

    setTimeout(() => {
      dispatch(uploadLocalStorageWorld(storageKey));
    }, 400);
  }

  render() {
    return (
      <Container>
        <Row>
          <Col size={12}>
            <div style={{textAlign: 'center', marginTop:60, marginBottom: 30}}>
              <h3>Saving world to your account...</h3>
              <p>
                Please wait, this should only take a moment.
              </p>
            </div>
          </Col>
        </Row>
      </Container>
    );
  }
}

function mapStateToProps(state) {
  return {
    me: state.me,
    networkError: state.network.error,
  };
}

export default connect(mapStateToProps)(JoinSendWorldsPage);
