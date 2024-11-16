import React from 'react'; import PropTypes from 'prop-types';
import {Link} from 'react-router';
import {push} from 'react-router-redux';
import {connect} from 'react-redux';
import Button from 'reactstrap/lib/Button';
import Row from 'reactstrap/lib/Row';
import Col from 'reactstrap/lib/Col';
import Container from 'reactstrap/lib/Container';

import RootPlayer from '../editor/root-player';
import {fetchWorld, createWorld} from '../actions/main-actions';
import PageMessage from './common/page-message';

class PlayPage extends React.Component {
  static propTypes = {
    dispatch: PropTypes.func,
    me: PropTypes.object,
    world: PropTypes.object,
    params: PropTypes.shape({
      worldId: PropTypes.string,
    }),
  }

  constructor(props, context) {
    super(props, context);
  }

  componentDidMount() {
    this.props.dispatch(fetchWorld(this.props.params.worldId));
  }

  _renderEditButton = () => {
    const {dispatch, me, world} = this.props;

    let label = 'Remix this Game';
    let cmd = () => dispatch(createWorld({from: world.id, fork: true}));
    if (me && me.id === world.userId) {
      label = 'Open in Editor';
      cmd = () => dispatch(push(`/editor/${world.id}`));
    }

    return (
      <Button
        color="success"
        className="with-counter"
        onClick={cmd}
      >
        {label} 
        <div className="counter-inline">{world.forkCount}</div>
        <div className="counter">{world.forkCount}</div>
      </Button>
    );
  }

  render() {
    const {world} = this.props;

    if (!world || !world.data) {
      return (
        <PageMessage text="Loading..." />
      );
    }

    return (
      <Container style={{marginTop: 30}} className="play">
        <Row>
          <Col sm={12} className="header">
            <div className="world-path">
              <h4><Link to={`/u/${world.user.username}`}>{world.user.username}</Link>/<Link>{world.name}</Link></h4>
              {world.forkParent && world.forkParent.user && (<small className="text-muted">
                {`Remixed from `}
                <Link to={`/u/${world.forkParent.user.username}`}>{world.forkParent.user.username}</Link>
                {`/`}
                <Link to={`/play/${world.forkParent.id}`}>{world.forkParent.name}</Link>
              </small>
              )}
            </div>
            <Button
              disabled
              className="with-counter"
              style={{marginRight: 5}}
            >
              Plays
              <div className="counter-inline">{world.playCount}</div>
              <div className="counter">{world.playCount}</div>
            </Button>
            {this._renderEditButton()}
          </Col>
        </Row>
        <Row>
          <Col xl={9}>
            <RootPlayer world={world} />
          </Col>
          <Col xl={3} style={{marginTop: 30}}>
            {/*<h4>
              {'Published by '}
              <Link to={`/u/${world.user.username}`}>
                <img src={"/img/profile-placeholder.png"} style={{maxWidth: 32}} />
                {world.user.username}
              </Link>
            </h4>*/}
            <div className="play-tutorial-cta">
              <div className="message">
                Codako is a free online tool for creating games! <a onClick={this._onFork} href="#">Remix this game</a> to make your own like it or <Link to={'/explore'}>explore more games</Link>.
              </div>
              <img className="tutorial-cta-girl" src={new URL('../img/get-started-girl.png', import.meta.url).href} />
            </div>
          </Col>
        </Row>
      </Container>
    );
  }
}

function mapStateToProps(state, ownProps) {
  return {
    me: state.me,
    world: state.worlds && state.worlds[ownProps.params.worldId],
  };
}

export default connect(mapStateToProps)(PlayPage);
