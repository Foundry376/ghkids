import React, { useEffect } from "react";
import { useDispatch } from "react-redux";
import { Link, useParams } from "react-router-dom";
import Button from "reactstrap/lib/Button";
import Col from "reactstrap/lib/Col";
import Container from "reactstrap/lib/Container";
import Row from "reactstrap/lib/Row";

import { createWorld, fetchWorld } from "../actions/main-actions";
import { usePageTitle } from "../hooks/usePageTitle";
import { RootPlayer } from "../editor/root-player";
import PageMessage from "./common/page-message";
import { useAppSelector } from "../hooks/redux";

const PlayPage: React.FC = () => {
  const { worldId } = useParams<{ worldId: string }>();
  const dispatch = useDispatch();

  const me = useAppSelector((state) => state.me);
  const worlds = useAppSelector((state) => state.worlds);

  const world = worlds && worldId ? worlds[worldId] : null;

  useEffect(() => {
    if (worldId) {
      dispatch(fetchWorld(Number(worldId)));
    }
  }, [worldId, dispatch]);

  usePageTitle(world?.name);

  const onFork = () => {
    // ben todo
  };

  const renderEditButton = () => {
    if (!world) return null;

    const isOwner = me && me.id === world.userId;
    const label = isOwner ? "Open in Editor" : "Remix this Game";
    const handleClick = () => {
      if (isOwner) {
        window.location.href = `/editor/${world.id}`;
      } else {
        dispatch(createWorld({ from: world.id, fork: "true" }));
      }
    };

    return (
      <Button color="success" className="with-counter" onClick={handleClick}>
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
              <Link to={`/play/${world.id}`}>{world.name}</Link>
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
          {renderEditButton()}
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
          <div className="play-tutorial-cta">
            <div className="message">
              Codako is a free online tool for creating games!{" "}
              <a onClick={onFork} href="#">
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

export default PlayPage;
