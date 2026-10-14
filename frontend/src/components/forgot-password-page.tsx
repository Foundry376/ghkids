import React, { useState } from "react";

import { makeRequest } from "../helpers/api";
import { usePageTitle } from "../hooks/usePageTitle";
import { AuthPageAlt, AuthPageFrame } from "./auth-page-frame";
import { friendlyErrorMessage } from "./auth-params";
import { KidButton, KidNotice, KidPanel, KidTextField } from "./kid";

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  usePageTitle("Forgot your password?");

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) {
      setFieldError("Type the email that's on your account.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await makeRequest("/users/forgot-password", {
        method: "POST",
        json: { email: email.trim() },
      });
      setSubmitted(true);
    } catch (err) {
      setError(friendlyErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthPageFrame
      title="Forgot your password?"
      subtitle="No problem! We'll email a link for making a new one."
    >
      {submitted ? (
        <KidPanel className="auth-page__form">
          <KidNotice tone="success" title="Check your email!">
            If <strong>{email.trim()}</strong> has a Codako account, we just sent it a link for
            making a new password. It can take a few minutes, so check the spam folder too.
          </KidNotice>
          <KidButton variant="primary" size="large" block to="/login">
            Back to sign in
          </KidButton>
        </KidPanel>
      ) : (
        <>
          {error && (
            <KidNotice tone="error" title="Hmm, that didn't work.">
              {error}
            </KidNotice>
          )}
          <KidPanel as="form" className="auth-page__form" noValidate onSubmit={onSubmit}>
            <KidTextField
              label="Grown-up's email"
              name="email"
              type="email"
              hint="The email you used when you made your account."
              autoFocus
              autoComplete="email"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              value={email}
              error={fieldError}
              onChange={(e) => {
                setEmail(e.target.value);
                setFieldError(null);
              }}
            />
            <KidButton variant="primary" size="large" block type="submit" busy={isSubmitting}>
              {isSubmitting ? "Sending…" : "Send me a link"}
            </KidButton>
          </KidPanel>
        </>
      )}

      {!submitted && (
        <AuthPageAlt>
          <span>Remembered it?</span>
          <KidButton to="/login">Back to sign in</KidButton>
        </AuthPageAlt>
      )}
    </AuthPageFrame>
  );
};

export default ForgotPasswordPage;
