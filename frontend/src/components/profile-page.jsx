import React, {PropTypes} from 'react';
import {connect} from 'react-redux';
import Row from 'reactstrap/lib/Row';
import Col from 'reactstrap/lib/Col';
import Container from 'reactstrap/lib/Container';
import {fetchWorldsForUser, fetchUser, deleteWorld, createWorld} from '../actions/main-actions';

import WorldList from './common/world-list';

class ProfilePage extends React.Component {
  static propTypes = {
    me: PropTypes.object,
    profile: PropTypes.object,
    worlds: PropTypes.array,
    dispatch: PropTypes.func,
    params: PropTypes.shape({
      username: PropTypes.string,
    }),
  };

  constructor(props, context) {
    super(props, context);
  }

  componentDidMount() {
    // for now, always fetch worlds again when the dashboard is loaded.
    const {dispatch, params} = this.props;
    dispatch(fetchUser(params.username));
    dispatch(fetchWorldsForUser(params.username));
  }

  render() {
    const {me, profile, worlds, dispatch} = this.props;

    return (
      <Container style={{marginTop: 30}} className="dashboard">
        <Row>
          <Col md={3}>
            <div className="dashboard-sidebar">
              <img src={require("../img/profile-placeholder.png")} style={{maxWidth: '100%'}} />
              <h4>{profile.username}</h4>
            </div>
          </Col>
          <Col md={9}>
            <div className="card card-block">
              <h5>Public Worlds</h5>
              <hr/>
              <WorldList
                worlds={worlds}
                onDeleteWorld={(s) => dispatch(deleteWorld(s.id))}
                onDuplicateWorld={(s) => dispatch(createWorld({from: s.id}))}
                canEdit={me && me.id === profile.id}
              />
            </div>
          </Col>
        </Row>
      </Container>
    );
  }
}

function mapStateToProps(state, ownProps) {
  const profile = state.profiles[ownProps.params.username];

  return {
    me: state.me,
    profile: profile || {
      username: 'loading',
      id: '',
    },
    worlds: state.worlds && Object.values(state.worlds)
      .filter(w => profile && w.userId === profile.id)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
  };
}

export default connect(mapStateToProps)(ProfilePage);
