import React, { useEffect } from "react";
import { useDispatch } from "react-redux";
import Button from "reactstrap/lib/Button";
import Col from "reactstrap/lib/Col";
import Container from "reactstrap/lib/Container";
import Row from "reactstrap/lib/Row";

import { createWorld, deleteWorld, fetchWorldsForUser } from "../actions/main-actions";
import { useAppSelector } from "../hooks/redux";
import WorldList from "./common/world-list";

const DashboardPage: React.FC = () => {
  const dispatch = useDispatch();
  const worlds = useAppSelector((state) => {
    if (!state.worlds || !state.me) return undefined;
    return Object.values(state.worlds)
      .filter((w) => w.userId === state.me?.id)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  });

  useEffect(() => {
    if (!window.store.getState().me) {
      window.location.href = `/login?redirectTo=/dashboard`;
      return;
    }

    dispatch(fetchWorldsForUser("me"));
  }, [dispatch]);

  const showTutorialPrompt = worlds && worlds.length === 0;

  return (
    <Container style={{ marginTop: 30 }} className="dashboard">
      <Row>
        <Col md={9}>
          {showTutorialPrompt && (
            <div className="card card-body tutorial-cta">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  maxWidth: 600,
                  margin: "auto",
                }}
              >
                <div style={{ flex: 1 }}>
                  <p>
                    Welcome to Codako! This is your profile page. To get started, let's make a
                    game together!
                  </p>
                  <Button
                    color="success"
                    className="float-xs-right"
                    onClick={() => dispatch(createWorld({ from: "tutorial" }))}
                  >
                    Start Tutorial
                  </Button>
                </div>
                <img
                  className="tutorial-cta-girl"
                  src={new URL("../img/get-started-girl.png", import.meta.url).href}
                />
              </div>
            </div>
          )}
          <div className="card card-body">
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <h5>My Games</h5>

              <Button
                size="sm"
                color={showTutorialPrompt ? undefined : "success"}
                onClick={() => dispatch(createWorld())}
              >
                New Game
              </Button>
            </div>
            <hr />
            <WorldList
              worlds={worlds ?? null}
              onDeleteWorld={(s) => dispatch(deleteWorld(s.id))}
              onDuplicateWorld={(s) => dispatch(createWorld({ from: s.id }))}
              canEdit
            />
          </div>
        </Col>
        <Col md={3}>
          <div className="dashboard-sidebar">
            <h5>Learn Codako</h5>
            <hr />
            Youtube videos go here
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default DashboardPage;
