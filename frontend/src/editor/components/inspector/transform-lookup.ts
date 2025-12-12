import { ActorTransform } from "../../../types";

export const RELATIVE_TRANSFORMS: {
  [key in ActorTransform]: {
    "flip-x": ActorTransform;
    "flip-y": ActorTransform;
    "0": ActorTransform;
    "90": ActorTransform;
    "180": ActorTransform;
    "270": ActorTransform;
    d1: ActorTransform;
    d2: ActorTransform;
  };
} = {
  "0": {
    "0": "0",
    "90": "90",
    "180": "180",
    "270": "270",
    "flip-x": "flip-x",
    "flip-y": "flip-y",
    d1: "d1",
    d2: "d2",
  },
  "90": {
    "0": "90",
    "90": "180",
    "180": "270",
    "270": "0",
    "flip-x": "d1",
    "flip-y": "d2",
    d1: "flip-y",
    d2: "flip-x",
  },
  "180": {
    "0": "180",
    "90": "270",
    "180": "0",
    "270": "90",
    "flip-x": "flip-y",
    "flip-y": "flip-x",
    d1: "d2",
    d2: "d1",
  },
  "270": {
    "0": "270",
    "90": "0",
    "180": "90",
    "270": "180",
    "flip-x": "d2",
    "flip-y": "d1",
    d1: "flip-x",
    d2: "flip-y",
  },
  "flip-x": {
    "0": "flip-x",
    "90": "d2",
    "180": "flip-y",
    "270": "d1",
    "flip-x": "0",
    "flip-y": "180",
    d1: "270",
    d2: "90",
  },
  "flip-y": {
    "0": "flip-y",
    "90": "d1",
    "180": "flip-x",
    "270": "d2",
    "flip-x": "180",
    "flip-y": "0",
    d1: "90",
    d2: "270",
  },
  d1: {
    "0": "d1",
    "90": "flip-x",
    "180": "d2",
    "270": "flip-y",
    "flip-x": "90",
    "flip-y": "270",
    d1: "0",
    d2: "180",
  },
  d2: {
    "0": "d2",
    "90": "flip-y",
    "180": "d1",
    "270": "flip-x",
    "flip-x": "270",
    "flip-y": "90",
    d1: "180",
    d2: "0",
  },
} as const;
