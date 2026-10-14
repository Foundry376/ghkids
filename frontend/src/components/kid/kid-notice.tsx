import classNames from "classnames";
import React from "react";

import "./kid-kit.scss";

const BADGES = { info: "i", success: "✓", error: "!" } as const;

export type KidNoticeProps = {
  tone?: keyof typeof BADGES;
  /** A bold first line: "That password didn't match." */
  title?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
};

/**
 * A message box: "info" for a heads-up, "success" when something worked,
 * "error" when it didn't. Errors are announced right away (role="alert");
 * the others politely (role="status").
 */
export const KidNotice = ({ tone = "info", title, className, children }: KidNoticeProps) => (
  <div
    className={classNames("kid-notice", `kid-notice--${tone}`, className)}
    role={tone === "error" ? "alert" : "status"}
  >
    <span className="kid-notice__badge" aria-hidden="true">
      {BADGES[tone]}
    </span>
    <div className="kid-notice__body">
      {title && <strong className="kid-notice__title">{title}</strong>}
      {children}
    </div>
  </div>
);
