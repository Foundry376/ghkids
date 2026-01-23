import React from "react";
import { Link } from "react-router-dom";
import Container from "reactstrap/lib/Container";

const NotFoundPage: React.FC = () => {
  return (
    <Container>
      <h4>404 Page Not Found</h4>
      <Link to="/"> Go back to homepage </Link>
    </Container>
  );
};

export default NotFoundPage;
