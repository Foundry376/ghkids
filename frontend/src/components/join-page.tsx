import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { GoogleReCaptchaProvider, useGoogleReCaptcha } from "react-google-recaptcha-v3";

import { register } from "../actions/main-actions";
import { usePageTitle } from "../hooks/usePageTitle";
import { AuthPageAlt, AuthPageFrame } from "./auth-page-frame";
import { friendlyErrorMessage, useAuthParams } from "./auth-params";
import { KidButton, KidNotice, KidPanel, KidTextField } from "./kid";
import PasswordInput from "./password-input";

const RECAPTCHA_SITE_KEY = `6LczpzwsAAAAADQs-j6-hokHJ8JUsqZ8NZ6t3BTC`;

type Errors = { username?: string; email?: string; password?: string; form?: string };

// Just enough to catch a missing @ or a typo'd domain; the API takes any string.
const LOOKS_LIKE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const JoinPageForm: React.FC = () => {
  const dispatch = useDispatch();
  const { executeRecaptcha } = useGoogleReCaptcha();
  const { redirectTo, why, linkTo } = useAuthParams();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  usePageTitle("Make an account");

  const clear = (field: keyof Errors) => {
    if (errors[field]) setErrors({ ...errors, [field]: undefined });
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const problems: Errors = {};
    if (!username.trim()) {
      problems.username = "Make up a nickname first!";
    }
    if (!email.trim()) {
      problems.email = "Ask a grown-up to type their email here.";
    } else if (!LOOKS_LIKE_EMAIL.test(email.trim())) {
      problems.email = "That doesn't look like an email address. Check for typos?";
    }
    if (!password) {
      problems.password = "Pick a password.";
    }
    if (Object.keys(problems).length) {
      setErrors(problems);
      return;
    }

    if (!executeRecaptcha) {
      // Google's robot check hasn't loaded yet (or something is blocking it).
      setErrors({
        form: "The page is still loading. Wait a moment and try again. If this keeps happening, ask a grown-up to check for an ad blocker.",
      });
      return;
    }

    setErrors({});
    setBusy(true);
    try {
      const captchaToken = await executeRecaptcha("register");
      // On success this navigates away, so the button stays busy until then.
      await dispatch(
        register(
          { username: username.trim(), email: email.trim(), password },
          redirectTo,
          captchaToken,
        ),
      );
    } catch (err) {
      setBusy(false);
      const message = err instanceof Error ? err.message : "";
      if (/already in use/i.test(message)) {
        // The API can't say which one is taken: "Sorry, this username or
        // email address is already in use."
        setErrors({
          username:
            "That nickname is taken, or that email already has an account. Try a different nickname!",
        });
      } else if (/captcha/i.test(message)) {
        setErrors({ form: "We couldn't check that you're not a robot. Please try again!" });
      } else {
        setErrors({ form: friendlyErrorMessage(err) });
      }
    }
  };

  return (
    <AuthPageFrame
      title={why ? `Make an account${why}` : "Make your Codako account"}
      subtitle="It's free! Your games get saved to your account so you can open them anywhere."
    >
      {redirectTo && !why && !errors.form && (
        <KidNotice tone="info" title="You'll need an account for that">
          Make one here, or sign in if you already have one.
        </KidNotice>
      )}
      {errors.form && (
        <KidNotice tone="error" title="Hmm, that didn't work.">
          {errors.form}
        </KidNotice>
      )}

      <KidPanel as="form" className="auth-page__form" noValidate onSubmit={onSubmit}>
        <KidTextField
          label="Nickname"
          name="username"
          hint="This is your name in Codako. Make one up — don't use your real name!"
          autoFocus
          autoComplete="username"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          value={username}
          error={errors.username}
          onChange={(e) => {
            setUsername(e.target.value);
            clear("username");
          }}
        />
        <KidTextField
          label="A grown-up's email"
          name="email"
          type="email"
          hint="We use it if you forget your password, and to send a note now and then about your games (like when someone remixes one). We never share it."
          autoComplete="email"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          value={email}
          error={errors.email}
          onChange={(e) => {
            setEmail(e.target.value);
            clear("email");
          }}
        />
        <PasswordInput
          label="Password"
          name="password"
          hint="Pick something you'll remember. Don't tell anyone except your grown-up!"
          autoComplete="new-password"
          value={password}
          error={errors.password}
          onChange={(e) => {
            setPassword(e.target.value);
            clear("password");
          }}
        />

        <p className="auth-page__fine-print">
          By making an account, you and your grown-up agree to the{" "}
          <a className="kid-link" href="/terms-of-use" target="_blank" rel="noopener noreferrer">
            Terms of Use
          </a>{" "}
          and the{" "}
          <a className="kid-link" href="/privacy-policy" target="_blank" rel="noopener noreferrer">
            Privacy Policy
          </a>
          .
        </p>

        <KidButton variant="primary" size="large" block type="submit" busy={busy}>
          {busy ? "Making your account…" : "Make my account"}
        </KidButton>
      </KidPanel>

      <AuthPageAlt>
        <span>Already have an account?</span>
        <KidButton to={linkTo("/login")}>Sign in</KidButton>
      </AuthPageAlt>
    </AuthPageFrame>
  );
};

const JoinPage: React.FC = () => (
  <GoogleReCaptchaProvider reCaptchaKey={RECAPTCHA_SITE_KEY}>
    <JoinPageForm />
  </GoogleReCaptchaProvider>
);

export default JoinPage;
