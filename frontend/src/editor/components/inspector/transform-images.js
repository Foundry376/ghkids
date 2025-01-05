import React from "react";

export const TransformImages = {
  none: (
    <img
      draggable={false}
      src={require(`../../img/transform_0.png`)}
      style={{ height: 40, width: 40 }}
    />
  ),
  "90deg": (
    <img
      draggable={false}
      src={require(`../../img/transform_90.png`)}
      style={{ height: 40, width: 40 }}
    />
  ),
  "180deg": (
    <img
      draggable={false}
      src={require(`../../img/transform_180.png`)}
      style={{ height: 40, width: 40 }}
    />
  ),
  "270deg": (
    <img
      draggable={false}
      src={require(`../../img/transform_270.png`)}
      style={{ height: 40, width: 40 }}
    />
  ),
  "flip-x": (
    <img
      draggable={false}
      src={require(`../../img/transform_flipx.png`)}
      style={{ height: 40, width: 40 }}
    />
  ),
  "flip-y": (
    <img
      draggable={false}
      src={require(`../../img/transform_flipy.png`)}
      style={{ height: 40, width: 40 }}
    />
  ),
};

export const TransformLabels = {
  none: "0º",
  "90deg": "90º",
  "180deg": "180º",
  "270deg": "-90º",
  "flip-x": "Flipped horizontally",
  "flip-y": "Flipped vertically",
};
