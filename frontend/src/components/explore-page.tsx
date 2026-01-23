import React, { useEffect, useState } from "react";
import Col from "reactstrap/lib/Col";
import Container from "reactstrap/lib/Container";
import Row from "reactstrap/lib/Row";

import { makeRequest } from "../helpers/api";
import { usePageTitle } from "../hooks/usePageTitle";
import { Game } from "../types";
import WorldList from "./common/world-list";

const ExplorePage: React.FC = () => {
  const [worlds, setWorlds] = useState<Game[] | null>(null);

  usePageTitle("Explore");

  useEffect(() => {
    makeRequest<Game[]>(`/worlds/explore`).then((fetchedWorlds) => {
      setWorlds(fetchedWorlds);
    });
  }, []);

  return (
    <Container style={{ marginTop: 30 }} className="explore">
      <Row>
        <Col md={12}>
          <div className="card card-body">
            <h5>Popular Games</h5>
            <hr />
            <WorldList
              worlds={worlds}
              onDeleteWorld={() => {}}
              onDuplicateWorld={() => {}}
              canEdit={false}
            />
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default ExplorePage;
