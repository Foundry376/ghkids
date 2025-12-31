import React, { useRef } from "react";
import { useDispatch } from "react-redux";
import Button from "reactstrap/lib/Button";
import Col from "reactstrap/lib/Col";
import Container from "reactstrap/lib/Container";
import Row from "reactstrap/lib/Row";

import { useLocation } from "react-router";
import { register } from "../actions/main-actions";
import { useAppSelector } from "../hooks/redux";

interface NetworkError extends Error {
  statusCode?: number;
}

const JoinPage: React.FC = () => {
  const location = useLocation();
  const usernameRef = useRef<HTMLInputElement>(null);
  const passRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const dispatch = useDispatch();
  const networkError = useAppSelector((state) => state.network.error);

  const search = new URLSearchParams(location.search);

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    dispatch(
      register(
        {
          email: emailRef.current?.value ?? "",
          password: passRef.current?.value ?? "",
          username: usernameRef.current?.value ?? "",
        },
        search.get("redirectTo") ?? "",
      ),
    );
  };

  const redirectPresent = search.get("redirectTo") && !search.get("why");

  let message = "";
  let messageClass: string | null = null;
  if (redirectPresent) {
    message = "Sorry, you need to log in to view that page.";
    messageClass = "info";
  }
  if (networkError) {
    const error = networkError as NetworkError;
    message =
      error.statusCode === 401
        ? "Sorry, your username or password was incorrect."
        : error.message;
    messageClass = "danger";
  }

  return (
    <Container>
      <Row>
        <Col size={12}>
          <div style={{ textAlign: "center", marginTop: 60, marginBottom: 30 }}>
            <h3>Join Codako{search.get("why")}</h3>
            <p>Create and share games with others around the world.</p>
          </div>
        </Col>
      </Row>
      <Row>
        <Col sm={{ size: 7 }} lg={{ size: 5, offset: 2 }}>
          <div className="card">
            {message && (
              <div className={`card card-inverse card-${messageClass} card-body text-xs-center`}>
                <blockquote className="card-bodyquote">{message}</blockquote>
              </div>
            )}
            <form className="card-body" onSubmit={onSubmit}>
              <div className={`form-group ${message.includes("username") ? "has-danger" : ""}`}>
                <label htmlFor="username">Username</label>
                <input
                  autoFocus
                  autoComplete="username"
                  autoCorrect="off"
                  autoCapitalize="off"
                  className={`form-control ${message.includes("username") ? "form-control-danger" : ""}`}
                  id="username"
                  ref={usernameRef}
                />
                <small className="form-text text-muted">Don't use your real name!</small>
              </div>
              <div className={`form-group ${message.includes("email") ? "has-danger" : ""}`}>
                <label htmlFor="email">Email Address</label>
                <input
                  autoComplete="email"
                  autoCorrect="off"
                  autoCapitalize="off"
                  type="email"
                  className={`form-control ${message.includes("email") ? "form-control-danger" : ""}`}
                  id="email"
                  ref={emailRef}
                />
                <small className="form-text text-muted">
                  You will occasionally receive emails from Codako. We promise not to share your
                  email with anyone.
                </small>
              </div>
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  autoComplete="password"
                  autoCorrect="off"
                  autoCapitalize="off"
                  className="form-control"
                  id="password"
                  ref={passRef}
                  type="password"
                />
                <small className="form-text text-muted">
                  Remember it - don't tell anyone else!
                </small>
              </div>
              <hr />
              <p>
                By clicking on "Create an account" below, you are agreeing to the{" "}
                <a href="/terms-of-use" target="_blank">
                  Terms of Service
                </a>
                and the{" "}
                <a href="/privacy-policy" target="_blank">
                  Privacy Policy
                </a>
                .
              </p>
              <hr />
              <Button color="primary" type="submit">
                Create an account
              </Button>
            </form>
          </div>
        </Col>
        <Col sm={{ size: 5 }} lg={{ size: 3 }}>
          <div className="card">
            <div className="card-header">Featured</div>
            <div className="card-body">
              <ul style={{ paddingLeft: 10 }}>
                <li style={{ marginBottom: 8 }}>
                  Learn early programming concepts without writing code
                </li>
                <li style={{ marginBottom: 8 }}>Share your work and learn from others</li>
                <li>No downloads - create games in your broswer!</li>
              </ul>
            </div>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default JoinPage;
