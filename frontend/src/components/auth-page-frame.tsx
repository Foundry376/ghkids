import React from "react";

import "./auth-pages.scss";

/**
 * The shared frame for the sign-in pages (/login, /join, /forgot-password,
 * /reset-password, /join-send-world): a narrow column in the middle of the
 * kid canvas with a big friendly heading, and then the page's form panel.
 */
export const AuthPageFrame = ({
  title,
  subtitle,
  centered,
  children,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Center the heading, for a page that's just a message. */
  centered?: boolean;
  children: React.ReactNode;
}) => (
  <div className="auth-page">
    <div className="auth-page__column">
      <div className={`auth-page__masthead${centered ? " auth-page__masthead--centered" : ""}`}>
        <h1 className="auth-page__title">{title}</h1>
        {subtitle && <p className="auth-page__subtitle">{subtitle}</p>}
      </div>
      {children}
    </div>
  </div>
);

/** The dashed box under the form: "New here? [Create an account]". */
export const AuthPageAlt = ({ children }: { children: React.ReactNode }) => (
  <div className="auth-page__alt">{children}</div>
);
