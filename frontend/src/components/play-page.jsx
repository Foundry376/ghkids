import { useEffect } from "react";
import { connect } from "react-redux";
import { Link, useParams } from "react-router-dom";
import Button from "reactstrap/lib/Button";
import Col from "reactstrap/lib/Col";
import Container from "reactstrap/lib/Container";
import Row from "reactstrap/lib/Row";

import { createWorld, fetchWorld } from "../actions/main-actions";
import { RootPlayer } from "../editor/root-player";
import PageMessage from "./common/page-message";
// class PlayPage extends React.Component {
//   static propTypes = {
//     dispatch: PropTypes.func,
//     me: PropTypes.object,
//     world: PropTypes.object,
//     params: PropTypes.shape({
//       worldId: PropTypes.string,
//     }),
//   };

const PlayPage = (props) => {
  const { worldId } = useParams();
  const { dispatch, me, worlds } = props;
  const world = worlds ? worlds[worldId] : null;

  useEffect(() => {
    dispatch(fetchWorld(worldId));
  }, [worldId]);

  const _onFork = () => {
    // ben todo
  };
  const _renderEditButton = () => {
    let label = "Remix this Game";
    let cmd = () => dispatch(createWorld({ from: world.id, fork: true }));
    if (me && me.id === world.userId) {
      label = "Open in Editor";
      cmd = () => (window.location.href = `/editor/${world.id}`);
    }

    return (
      <Button color="success" className="with-counter" onClick={cmd}>
        {label}
        <div className="counter-inline">{world.forkCount}</div>
        <div className="counter">{world.forkCount}</div>
      </Button>
    );
  };
  if (!world || !world.data) {
    return <PageMessage text="Loading..." />;
  }

  return (
    <Container style={{ marginTop: 30 }} className="play">
      <Row>
        <Col sm={12} className="header">
          <div className="world-path">
            <h4>
              <Link to={`/u/${world.user.username}`}>{world.user.username}</Link>/
              <Link>{world.name}</Link>
            </h4>
            {world.forkParent && world.forkParent.user && (
              <small className="text-muted">
                {`Remixed from `}
                <Link to={`/u/${world.forkParent.user.username}`}>
                  {world.forkParent.user.username}
                </Link>
                {`/`}
                <Link to={`/play/${world.forkParent.id}`}>{world.forkParent.name}</Link>
              </small>
            )}
          </div>
          <Button disabled className="with-counter" style={{ marginRight: 5 }}>
            Plays
            <div className="counter-inline">{world.playCount}</div>
            <div className="counter">{world.playCount}</div>
          </Button>
          {_renderEditButton()}
        </Col>
      </Row>
      <Row>
        <Col xl={9}>
          <RootPlayer world={world} />
        </Col>
        <Col xl={3} style={{ marginTop: 30 }}>
          {world.description && (
            <div style={{ marginBottom: 20 }}>
              <h5 style={{ marginBottom: 8 }}>About this Game</h5>
              <p style={{ color: "#666", whiteSpace: "pre-wrap" }}>{world.description}</p>
            </div>
          )}
          {/*<h4>
              {'Published by '}
              <Link to={`/u/${world.user.username}`}>
                <img src={"/img/profile-placeholder.png"} style={{maxWidth: 32}} />
                {world.user.username}
              </Link>
            </h4>*/}
          <div className="play-tutorial-cta">
            <div className="message">
              Codako is a free online tool for creating games!{" "}
              <a onClick={_onFork} href="#">
                Remix this game
              </a>{" "}
              to make your own like it or <Link to={"/explore"}>explore more games</Link>.
            </div>
            <img
              className="tutorial-cta-girl"
              src={new URL("../img/get-started-girl.png", import.meta.url).href}
            />
          </div>
        </Col>
      </Row>
    </Container>
  );
};

function mapStateToProps(state) {
  return {
    me: state.me,
    worlds: state.worlds,
  };
}

export default connect(mapStateToProps)(PlayPage);
