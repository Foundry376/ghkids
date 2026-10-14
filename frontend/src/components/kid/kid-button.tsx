import classNames from "classnames";
import React from "react";
import { Link, LinkProps } from "react-router-dom";

import { PixelSpinner } from "./pixel-spinner";

import "./kid-kit.scss";

type KidButtonOwnProps = {
  /** primary: the one green action on a screen. secondary: a white tile.
   *  quiet: a dashed outline for the way out / the less likely choice. */
  variant?: "primary" | "secondary" | "quiet";
  size?: "regular" | "large";
  /** Stretch to the width of the container (form submit buttons). */
  block?: boolean;
  /** Working: shows a small pixel spinner in place of the icon and stops
   *  answering clicks, but keeps its colors. */
  busy?: boolean;
  disabled?: boolean;
  /** Drawn before the label, e.g. a <PixelIcon size={24} />. */
  icon?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
};

type KidButtonAsButton = KidButtonOwnProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof KidButtonOwnProps> & {
    to?: undefined;
  };

type KidButtonAsLink = KidButtonOwnProps & Omit<LinkProps, keyof KidButtonOwnProps>;

export type KidButtonProps = KidButtonAsButton | KidButtonAsLink;

/**
 * The kid side's button. Pass `to` and it renders a router <Link> (a real
 * <a href>, so it can be opened in a new tab and crawled); otherwise it's a
 * <button type="button"> unless you pass another `type`.
 */
export const KidButton = (props: KidButtonProps) => {
  const {
    variant = "secondary",
    size = "regular",
    block,
    busy,
    disabled,
    icon,
    className,
    children,
    ...rest
  } = props;

  const classes = classNames(
    "kid-button",
    `kid-button--${variant}`,
    { "kid-button--large": size === "large", "kid-button--block": block },
    className,
  );
  const leading = busy ? <PixelSpinner size="small" /> : icon;
  const content = (
    <>
      {leading}
      {children !== undefined && <span className="kid-button__label">{children}</span>}
    </>
  );

  if (rest.to !== undefined) {
    const { onClick, ...linkProps } = rest as Omit<KidButtonAsLink, keyof KidButtonOwnProps>;
    const inert = disabled || busy;
    return (
      <Link
        {...linkProps}
        className={classes}
        aria-disabled={inert || undefined}
        aria-busy={busy || undefined}
        tabIndex={disabled ? -1 : linkProps.tabIndex}
        onClick={(e) => {
          if (inert) {
            e.preventDefault();
            return;
          }
          onClick?.(e);
        }}
      >
        {content}
      </Link>
    );
  }

  const { type = "button", ...buttonProps } = rest as Omit<
    KidButtonAsButton,
    keyof KidButtonOwnProps
  >;
  return (
    <button
      {...buttonProps}
      type={type}
      className={classes}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
    >
      {content}
    </button>
  );
};
