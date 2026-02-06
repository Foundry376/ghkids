import { CSSProperties } from "react";
import { ActorTransform, AppearanceInfo, Character } from "../../../types";

// eslint-disable-next-line react-refresh/only-export-components
export const DEFAULT_APPEARANCE_INFO: AppearanceInfo = {
  anchor: { x: 0, y: 0 },
  width: 1,
  height: 1,
  filled: { "0,0": true },
};

// eslint-disable-next-line react-refresh/only-export-components
export const SPRITE_TRANSFORM_CSS: { [key: string]: string } = {
  "0": `rotate(0deg)`,
  "90": `rotate(90deg)`,
  "180": `rotate(180deg)`,
  "270": `rotate(270deg)`,
  "flip-x": `scale(-1, 1)`,
  "flip-y": `scale(1, -1)`,
  d1: `rotate(90deg) scale(1, -1)`, // reflect over y = x
  d2: `rotate(-90deg) scale(1, -1)`, // reflect over y = -x
};

const Sprite = ({
  style,
  className,
  transform = "0",
  spritesheet,
  appearance,
  frame,
  fit,
}: {
  spritesheet: Character["spritesheet"];
  appearance: string;
  className?: string;
  transform?: ActorTransform;
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
