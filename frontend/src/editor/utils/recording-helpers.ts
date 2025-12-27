import { MathOperation, Position, RuleExtent } from "../../types";

function isNumeric(value: number | string): boolean {
  return !isNaN(Number(value));
}

export function defaultOperationForValueChange(
  before: number | string,
  after: number | string,
): MathOperation {
  if (isNumeric(after) && isNumeric(before) && Number(after) === Number(before) + 1) {
    return "add";
  } else if (isNumeric(after) && isNumeric(before) && Number(after) === Number(before) - 1) {
    return "subtract";
  }
  return "set";
}

export function operandForValueChange(
  before: number | string,
  after: number | string,
  op: MathOperation,
) {
  if (isNumeric(after) && isNumeric(before) && op === "add") {
    return Number(after) - Number(before);
  } else if (isNumeric(after) && isNumeric(before) && op === "subtract") {
    return Number(before) - Number(after);
  } else if (op === "set") {
    return after;
  }
  throw new Error("Unknown op");
}

export function extentIgnoredPositions(extent: RuleExtent) {
  return Object.keys(extent.ignored).map((k) => {
    const coords = k.split(",").map(Number);
    if (coords.length !== 2) {
      throw new Error(`${k} is not in X,Y form`);
    }
    return { x: coords[0], y: coords[1] };
  });
}

export function extentByShiftingExtent(extent: RuleExtent, d: Position) {
  const ignored: RuleExtent["ignored"] = {};
  extentIgnoredPositions(extent).forEach(({ x, y }) => {
    ignored[`${x + d.x},${y + d.y}`] = true;
  });

  return {
    xmin: extent.xmin + d.x,
    xmax: extent.xmax + d.x,
    ymin: extent.ymin + d.y,
    ymax: extent.ymax + d.y,
    ignored: ignored,
  };
}
