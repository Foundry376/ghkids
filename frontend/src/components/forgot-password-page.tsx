import React, { useRef, useState } from "react";
import { Link } from "react-router-dom";
import Button from "reactstrap/lib/Button";
import Col from "reactstrap/lib/Col";
import Container from "reactstrap/lib/Container";
import Row from "reactstrap/lib/Row";

import { makeRequest } from "../helpers/api";

const ForgotPasswordPage: React.FC = () => {
  const emailRef = useRef<HTMLInputElement>(null);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const email = emailRef.current?.value ?? "";
    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await makeRequest("/users/forgot-password", {
        method: "POST",
        json: { email },
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container>
      <Row>
        <Col lg={{ size: 4, offset: 4 }}>
          <div style={{ textAlign: "center", marginTop: 60, marginBottom: 30 }}>
            <h3>Reset your password</h3>
          </div>
          <div className="card">
            {submitted ? (
              <div className="card-body">
                <p>
                  If an account with that email exists, we've sent a password reset link. Please
                  check your inbox.
                </p>
                <Link to="/login">Back to login</Link>
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
                    <label htmlFor="email">
                      Enter the email address associated with your account and we'll send you a link
                      to reset your password.
                    </label>
                    <input
                      className="form-control"
                      id="email"
                      ref={emailRef}
                      type="email"
                      autoFocus
                      autoComplete="email"
                      autoCorrect="off"
                      autoCapitalize="off"
                    />
                  </div>
                  <Button block color="primary" type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Sending..." : "Send reset link"}
                  </Button>
                </form>
              </>
            )}
          </div>
          <div className="card" style={{ marginTop: 20 }}>
            <div className="card-body text-xs-center">
              <Link to="/login">Back to login</Link>
            </div>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default ForgotPasswordPage;
