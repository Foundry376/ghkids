import classNames from "classnames";

import "./kid-kit.scss";

/* Kids don't have profile pictures, so each account gets a colored square
   with its first letter. The color comes from the username, so it's the same
   on every visit and every computer. All dark enough for a white letter. */
const BADGE_COLORS = [
  "#5a9e2f", // green
  "#2f8fb0", // cyan
  "#cf8a12", // amber
  "#d4554b", // coral
  "#8461c4", // purple
  "#2a9483", // teal
  "#cc5f92", // pink
  "#4772c9", // blue
];

function badgeColorFor(username: string) {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = (hash * 31 + username.charCodeAt(i)) >>> 0;
  }
  return BADGE_COLORS[hash % BADGE_COLORS.length];
}

/**
 * A player's square: their first letter on their color. Without a username
 * it's the grey "?" of someone who hasn't signed in. Decorative — put the
 * name in text next to it.
 */
export const PixelBadge = ({
  username,
  size = "regular",
  className,
}: {
  username?: string;
  size?: "small" | "regular" | "large";
  className?: string;
}) => (
  <span
    className={classNames(
      "pixel-badge",
      `pixel-badge--${size}`,
      { "pixel-badge--empty": !username },
      className,
    )}
    style={username ? { backgroundColor: badgeColorFor(username) } : undefined}
    aria-hidden="true"
  >
    {username ? username.charAt(0).toUpperCase() : "?"}
  </span>
);
