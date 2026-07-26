import { Stage } from "../../types";

/**
 * New games start on a plain blue stage rather than an illustrated one — you
 * pick a background later, once the game is about something.
 */
export const DEFAULT_STAGE_BACKGROUND = "#5b87b0";

const InitialStage: Stage = {
  id: "5233a60cfd685f755e000002",
  name: "Level 1",
  order: 0,
  actors: {},
  backgroundFade: false,
  variableValues: {
    width: "22",
    wrapX: "true",
    height: "13",
    wrapY: "true",
    tileSize: "40",
    background: DEFAULT_STAGE_BACKGROUND,
  },
};

export default InitialStage;
