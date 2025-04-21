import { CSSProperties } from "react";
import { AppearanceInfo, Character } from "../../../types";

export const DEFAULT_APPEARANCE_INFO: AppearanceInfo = {
  anchor: { x: 0, y: 0 },
  width: 1,
  height: 1,
  filled: { "0,0": true },
};

export const SPRITE_TRANSFORM_CSS: { [key: string]: string } = {
  "90deg": `rotate(90deg)`,
  "180deg": `rotate(180deg)`,
  "270deg": `rotate(270deg)`,
  "flip-x": `scale(-1, 1)`,
  "flip-y": `scale(1, -1)`,
  "flip-xy": `scale(-1, -1)`,
  none: "",
};

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
  const { appearances, appearanceInfo } = spritesheet;

  let data = new URL("../../img/splat.png", import.meta.url).href;
  if (appearance && appearances[appearance]) {
    data = appearances[appearance][frame || 0];
  }
  const { anchor } = appearanceInfo?.[appearance] || DEFAULT_APPEARANCE_INFO;
  const transformValue = SPRITE_TRANSFORM_CSS[transform];

  const allstyle = Object.assign(
    fit
      ? {
          width: 40,
          height: 40,
          display: "inline-block",
          objectFit: "contain",
          transform: transformValue,
        }
      : {
          display: "inline-block",
          position: "relative",
          transform: `${transformValue}`,
          transformOrigin: `${(anchor.x + 0.5) * 40}px ${(anchor.y + 0.5) * 40}px 0px`,
        },
    style,
  );

  return <img src={data} draggable={false} className={`sprite ${className}`} style={allstyle} />;
};

export default Sprite;
