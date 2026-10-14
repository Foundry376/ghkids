import classNames from "classnames";
import React from "react";

import "./kid-kit.scss";

export type KidPanelProps = React.HTMLAttributes<HTMLElement> & {
  /** Render as a <form> to hold a sign-in form, <section> for a titled list… */
  as?: "div" | "section" | "form" | "article";
  /** Shown at the top in the display face. */
  heading?: React.ReactNode;
  headingLevel?: 1 | 2 | 3;
  /** tile: a raised white tile. quiet: a dashed outline on the paper. */
  tone?: "tile" | "quiet";
  /** Passed through when `as="form"`. */
  noValidate?: boolean;
};

/** A tile to hold a form, a list, or an empty state. */
export const KidPanel = ({
  as: Tag = "div",
  heading,
  headingLevel = 2,
  tone = "tile",
  className,
  children,
  ...rest
}: KidPanelProps) => {
  const Heading = `h${headingLevel}` as "h1" | "h2" | "h3";
  return (
    <Tag
      className={classNames("kid-panel", { "kid-panel--quiet": tone === "quiet" }, className)}
      {...rest}
    >
      {heading && <Heading className="kid-panel__heading">{heading}</Heading>}
      {children}
    </Tag>
  );
};
