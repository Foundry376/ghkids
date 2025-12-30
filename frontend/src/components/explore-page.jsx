import { useEffect, useState } from "react";
import { connect } from "react-redux";
import Col from "reactstrap/lib/Col";
import Container from "reactstrap/lib/Container";
import Row from "reactstrap/lib/Row";

import { makeRequest } from "../helpers/api";
import { usePageTitle } from "../hooks/usePageTitle";
import WorldList from "./common/world-list";

const ExplorePage = () => {
  const [worlds, setWorlds] = useState(null);

  usePageTitle("Explore");

  useEffect(() => {
    makeRequest(`/worlds/explore`).then((worlds) => {
      setWorlds(worlds);
    });
  }, []);

  return (
    <Container style={{ marginTop: 30 }} className="explore">
      <Row>
        <Col md={12}>
          <div className="card card-body">
            <h5>Popular Games</h5>
            <hr />
            <WorldList worlds={worlds} />
          </div>
        </Col>
      </Row>
    </Container>
  );
};

function mapStateToProps(state) {
  return {
    me: state.me,
  };
}

export default connect(mapStateToProps)(ExplorePage);
