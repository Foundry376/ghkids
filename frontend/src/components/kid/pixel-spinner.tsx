import classNames from "classnames";

import "./kid-kit.scss";

/**
 * Three squares that light up in turn. Decorative: whatever is waiting should
 * say so in words too (a busy caption, aria-busy on the button).
 */
export const PixelSpinner = ({
  size = "regular",
  className,
}: {
  size?: "regular" | "small";
  className?: string;
}) => (
  <span
    className={classNames("pixel-spinner", { "pixel-spinner--small": size === "small" }, className)}
    aria-hidden="true"
  >
    <i />
    <i />
    <i />
  </span>
);
