import React, { useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Button from "reactstrap/lib/Button";
import Col from "reactstrap/lib/Col";
import Container from "reactstrap/lib/Container";
import Row from "reactstrap/lib/Row";

import { makeRequest } from "../helpers/api";

const ResetPasswordPage: React.FC = () => {
  const location = useLocation();
  const search = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const token = search.get("token");

  const passRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const password = passRef.current?.value ?? "";
    const confirm = confirmRef.current?.value ?? "";

    if (!password) {
      setError("Please enter a new password.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await makeRequest("/users/reset-password", {
        method: "POST",
        json: { token, password },
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <Container>
        <Row>
          <Col lg={{ size: 4, offset: 4 }}>
            <div style={{ textAlign: "center", marginTop: 60, marginBottom: 30 }}>
              <h3>Invalid reset link</h3>
            </div>
            <div className="card">
              <div className="card-body">
                <p>This password reset link is invalid. Please request a new one.</p>
                <Link to="/forgot-password">Request a new link</Link>
              </div>
            </div>
          </Col>
        </Row>
      </Container>
    );
  }

  return (
    <Container>
      <Row>
        <Col lg={{ size: 4, offset: 4 }}>
          <div style={{ textAlign: "center", marginTop: 60, marginBottom: 30 }}>
            <h3>Choose a new password</h3>
          </div>
          <div className="card">
            {success ? (
              <div className="card-body">
                <p>Your password has been reset successfully.</p>
                <Link to="/login">
                  <Button block color="primary">
                    Log in
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                {error && (
                  <div className="card card-inverse bg-danger text-white card-body text-xs-center">
                    {error}
                  </div>
                )}
                <form className="card-body" onSubmit={onSubmit}>
                  <div className="form-group">
                    <label htmlFor="password">New password:</label>
                    <input
                      className="form-control"
                      id="password"
                      ref={passRef}
                      type="password"
                      autoFocus
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="confirm-password">Confirm new password:</label>
                    <input
                      className="form-control"
                      id="confirm-password"
                      ref={confirmRef}
                      type="password"
                      autoComplete="new-password"
                    />
                  </div>
                  <Button block color="primary" type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Resetting..." : "Reset password"}
                  </Button>
                </form>
              </>
            )}
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default ResetPasswordPage;
