import React, { useState } from "react";
import { Link } from "react-router-dom";

import { makeRequest } from "../helpers/api";
import { usePageTitle } from "../hooks/usePageTitle";
import { AuthPageFrame } from "./auth-page-frame";
import { friendlyErrorMessage, useAuthParams } from "./auth-params";
import { KidButton, KidNotice, KidPanel } from "./kid";
import PasswordInput from "./password-input";

type Errors = { password?: string; confirm?: string; form?: string };

/** Where the link in the password reset email lands: /reset-password?token=… */
const ResetPasswordPage: React.FC = () => {
  const { search } = useAuthParams();
  const token = search.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  usePageTitle("Make a new password");

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!password) {
      setErrors({ password: "Type a new password." });
      return;
    }
    if (password !== confirm) {
      setErrors({ confirm: "Those don't match. Try typing it again." });
      return;
    }

    setIsSubmitting(true);
    setErrors({});
    try {
      await makeRequest("/users/reset-password", {
        method: "POST",
        json: { token, password },
      });
      setSuccess(true);
    } catch (err) {
      setErrors({ form: friendlyErrorMessage(err) });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <AuthPageFrame title="This link doesn't work">
        <KidPanel className="auth-page__form">
          <p className="auth-page__text">
            This password reset link is missing a piece. Try the link in the email again, or ask for
            a new one.
          </p>
          <KidButton variant="primary" size="large" block to="/forgot-password">
            Get a new link
          </KidButton>
        </KidPanel>
      </AuthPageFrame>
    );
  }

  if (success) {
    return (
      <AuthPageFrame title="All set!">
        <KidPanel className="auth-page__form">
          <KidNotice tone="success" title="Your password is changed.">
            Sign in with your new password to get back to your games.
          </KidNotice>
          <KidButton variant="primary" size="large" block to="/login">
            Sign in
          </KidButton>
        </KidPanel>
      </AuthPageFrame>
    );
  }

  // "This reset link is invalid or has expired." - the one error a kid can fix
  // themselves, by asking for another link.
  const expired = !!errors.form && /invalid|expired/i.test(errors.form);

  return (
    <AuthPageFrame
      title="Make a new password"
      subtitle="Pick something you'll remember. Don't tell anyone except your grown-up!"
    >
      {errors.form && (
        <KidNotice tone="error" title="Hmm, that didn't work.">
          {errors.form}
          {expired && (
            <>
              {" "}
              <Link className="kid-link" to="/forgot-password">
                Get a new link
              </Link>
            </>
          )}
        </KidNotice>
      )}
      <KidPanel as="form" className="auth-page__form" noValidate onSubmit={onSubmit}>
        <PasswordInput
          label="New password"
          name="password"
          autoFocus
          autoComplete="new-password"
          value={password}
          error={errors.password}
          onChange={(e) => {
            setPassword(e.target.value);
            setErrors({ ...errors, password: undefined });
          }}
        />
        <PasswordInput
          label="Type it again"
          name="confirm-password"
          autoComplete="new-password"
          value={confirm}
          error={errors.confirm}
          onChange={(e) => {
            setConfirm(e.target.value);
            setErrors({ ...errors, confirm: undefined });
          }}
        />
        <KidButton variant="primary" size="large" block type="submit" busy={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save my new password"}
        </KidButton>
      </KidPanel>
    </AuthPageFrame>
  );
};

export default ResetPasswordPage;
