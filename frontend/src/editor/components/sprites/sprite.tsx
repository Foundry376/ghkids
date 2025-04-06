import { CSSProperties } from "react";
import { Character } from "../../../types";

const Sprite = ({
  style,
  className,
  transform = "none",
  spritesheet,
  appearance,
  frame,
  fit,
}: {
  spritesheet: Character["spritesheet"];
  appearance: string;
  className?: string;
  transform?: string;
  style?: CSSProperties;
  frame?: number;
  fit?: boolean;
}) => {
  const { appearances, appearanceAnchorSquare } = spritesheet;

  let data = new URL("../../img/splat.png", import.meta.url).href;
  if (appearance && appearances[appearance]) {
    data = appearances[appearance][frame || 0];
  }
  let anchor = { x: 0, y: 0 };
  if (appearanceAnchorSquare && appearanceAnchorSquare[appearance]) {
    anchor = appearanceAnchorSquare[appearance];
  }

  const allstyle = Object.assign(
    {
      width: fit ? 40 : undefined,
      height: fit ? 40 : undefined,
      display: "inline-block",
      objectFit: fit ? "contain" : undefined,
      positition: "relative",
      top: -anchor.y * 40,
      left: -anchor.x * 40,
      transform: {
        "90deg": "rotate(90deg)",
        "180deg": "rotate(180deg)",
        "270deg": "rotate(270deg)",
        "flip-x": "scale(-1, 1)",
        "flip-y": "scale(1, -1)",
        "flip-xy": "scale(-1, -1)",
        none: undefined,
      }[transform],
    },
    style,
  );

  return <img src={data} draggable={false} className={`sprite ${className}`} style={allstyle} />;
};

export default Sprite;
