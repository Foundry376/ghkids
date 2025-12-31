import React, { useEffect } from "react";
import { useDispatch } from "react-redux";

import { useLocation } from "react-router";
import Col from "reactstrap/lib/Col";
import Container from "reactstrap/lib/Container";
import Row from "reactstrap/lib/Row";
import { uploadLocalStorageWorld } from "../actions/main-actions";

const JoinSendWorldsPage: React.FC = () => {
  const location = useLocation();
  const dispatch = useDispatch();

  useEffect(() => {
    const storageKey = new URLSearchParams(location.search).get("storageKey");
    if (storageKey) {
      setTimeout(() => {
        dispatch(uploadLocalStorageWorld(storageKey));
      }, 400);
    }
  }, [dispatch, location.search]);

  return (
    <Container>
      <Row>
        <Col size={12}>
          <div style={{ textAlign: "center", marginTop: 60, marginBottom: 30 }}>
            <h3>Saving world to your account...</h3>
            <p>Please wait, this should only take a moment.</p>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default JoinSendWorldsPage;
