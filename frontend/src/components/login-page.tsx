import React, { useRef } from "react";
import { useDispatch } from "react-redux";
import { Link, useLocation } from "react-router-dom";
import Button from "reactstrap/lib/Button";
import Col from "reactstrap/lib/Col";
import Container from "reactstrap/lib/Container";
import Row from "reactstrap/lib/Row";

import { login } from "../actions/main-actions";
import { useAppSelector } from "../hooks/redux";

const LoginPage: React.FC = () => {
  const usernameRef = useRef<HTMLInputElement>(null);
  const passRef = useRef<HTMLInputElement>(null);
  const location = useLocation();
  const dispatch = useDispatch();
  const networkError = useAppSelector((state) => state.network.error);

  const locationState = location.state as { redirectTo?: string } | null;

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const nextPathname = locationState?.redirectTo ?? null;

    dispatch(
      login(
        {
          username: usernameRef.current?.value ?? "",
          password: passRef.current?.value ?? "",
        },
        nextPathname ?? "",
      ),
    );
  };

  const redirectPresent = locationState?.redirectTo;

  let message: string | null = null;
  let messageClass: string | null = null;
  if (redirectPresent) {
    message = "Sorry, you need to log in to view that page.";
    messageClass = "bg-info text-white";
  }
  if (networkError) {
    message =
      "statusCode" in networkError && (networkError as { statusCode: number }).statusCode === 401
        ? "Sorry, your username or password was incorrect."
        : networkError.message;
    messageClass = "bg-danger text-white ";
  }

  return (
    <Container>
      <Row>
        <Col lg={{ size: 4, offset: 4 }}>
          <div style={{ textAlign: "center", marginTop: 60, marginBottom: 30 }}>
            <h3>Sign in to Codako</h3>
          </div>
          <div className="card">
            {message && (
              <div className={`card card-inverse ${messageClass} card-body text-xs-center`}>
                {message}
              </div>
            )}
            <form className="card-body" onSubmit={onSubmit}>
              <div className="form-group">
                <label htmlFor="username">Username or email address:</label>
                <input
                  className="form-control"
                  id="username"
                  ref={usernameRef}
                  autoFocus
                  autoComplete="username"
                  autoCorrect="off"
                  autoCapitalize="off"
                />
              </div>
              <div className="form-group">
                <label htmlFor="password">Password:</label>
                <input
                  className="form-control"
                  id="password"
                  ref={passRef}
                  type="password"
                  autoComplete="password"
                />
              </div>
              <Button block color="primary" type="submit">
                Login
              </Button>
            </form>
          </div>
          <div className="card" style={{ marginTop: 20 }}>
            <div className="card-body text-xs-center">
              New to Codako? <Link to="/join">Create an account</Link>.
            </div>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default LoginPage;
