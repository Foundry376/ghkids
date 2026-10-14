import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { Link } from "react-router-dom";

import { login } from "../actions/main-actions";
import { usePageTitle } from "../hooks/usePageTitle";
import { AuthPageAlt, AuthPageFrame } from "./auth-page-frame";
import { friendlyErrorMessage, useAuthParams } from "./auth-params";
import { KidButton, KidNotice, KidPanel, KidTextField } from "./kid";
import PasswordInput from "./password-input";

type Errors = { username?: string; password?: string; form?: string };

/**
 * The one sign-in page, for kids and grown-ups alike. The first box takes a
 * nickname or the email on the account - the API checks both.
 */
const LoginPage: React.FC = () => {
  const dispatch = useDispatch();
  const { redirectTo, why, linkTo } = useAuthParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  usePageTitle("Sign in");

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const missing: Errors = {};
    if (!username.trim()) missing.username = "Type your nickname or email first.";
    if (!password) missing.password = "Type your password.";
    if (missing.username || missing.password) {
      setErrors(missing);
      return;
    }

    setErrors({});
    setBusy(true);
    try {
      // On success this navigates away, so the button stays busy until then.
      await dispatch(login({ username: username.trim(), password }, redirectTo));
    } catch (err) {
      setBusy(false);
      // The API's 401s: "This username does not exist." / "The password you
      // entered is incorrect." Put each next to the box it's about.
      const message = err instanceof Error ? err.message : "";
      if (/username does not exist/i.test(message)) {
        setErrors({
          username: "We couldn't find that nickname or email. Check the spelling?",
        });
      } else if (/password/i.test(message)) {
        setErrors({ password: "That password isn't right. Try again!" });
      } else {
        setErrors({ form: friendlyErrorMessage(err) });
      }
    }
  };

  return (
    <AuthPageFrame
      title={why ? `Sign in${why}` : "Welcome back!"}
      subtitle="Sign in to open your saved games."
    >
      {redirectTo && !why && !errors.form && (
        <KidNotice tone="info" title="Sign in to keep going">
          You need to be signed in to see that page.
        </KidNotice>
      )}
      {errors.form && (
        <KidNotice tone="error" title="Hmm, that didn't work.">
          {errors.form}
        </KidNotice>
      )}

      <KidPanel as="form" className="auth-page__form" noValidate onSubmit={onSubmit}>
        <KidTextField
          label="Nickname or grown-up's email"
          name="username"
          autoFocus
          autoComplete="username"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          value={username}
          error={errors.username}
          onChange={(e) => {
            setUsername(e.target.value);
            if (errors.username) setErrors({ ...errors, username: undefined });
          }}
        />
        <PasswordInput
          label="Password"
          name="password"
          autoComplete="current-password"
          value={password}
          error={errors.password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (errors.password) setErrors({ ...errors, password: undefined });
          }}
        />
        <KidButton variant="primary" size="large" block type="submit" busy={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </KidButton>
        <p className="auth-page__under-submit">
          <Link className="kid-link" to="/forgot-password">
            Forgot your password?
          </Link>
        </p>
      </KidPanel>

      <AuthPageAlt>
        <span>New here?</span>
        <KidButton to={linkTo("/join")}>Create an account</KidButton>
      </AuthPageAlt>
    </AuthPageFrame>
  );
};

export default LoginPage;
