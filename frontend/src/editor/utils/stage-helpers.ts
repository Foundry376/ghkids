import {
  Actor,
  Character,
  Characters,
  MathOperation,
  Position,
  RuleCondition,
  RuleConditionAppearance,
  RuleConditionTransform,
  RuleConditionVariable,
  RuleExtent,
  RuleTreeItem,
  Stage,
} from "../../types";
import { DEFAULT_APPEARANCE_INFO } from "../components/sprites/sprite";

export function buildActorPath(worldId: string, stageId: string, actorId: string) {
  return { worldId, stageId, actorId };
}

export function nullActorPath() {
  return { worldId: null, stageId: null, actorId: null };
}

export function applyAnchorAdjustment(
  position: Position,
  character: Character,
  { appearance, transform }: Pick<Actor, "appearance" | "transform">,
) {
  const info = character.spritesheet.appearanceInfo?.[appearance] || DEFAULT_APPEARANCE_INFO;
  const [x, y] = pointApplyingTransform(info.anchor.x, info.anchor.y, info, transform);
  position.x += x;
  position.y += y;
}

export function actorFillsPoint(actor: Actor, characters: Characters, point: Position): boolean {
  return actorFilledPoints(actor, characters).some((p) => p.x === point.x && p.y === point.y);
}

export function actorFilledPoints(actor: Actor, characters: Characters) {
  const character = characters[actor.characterId];
  const info = character?.spritesheet.appearanceInfo?.[actor.appearance];
  const { x, y } = actor.position;
  if (!info) {
    return [{ x, y }];
  }
  const results: Position[] = [];
  const [ix, iy] = pointApplyingTransform(info.anchor.x, info.anchor.y, info, actor.transform);

  for (let dx = 0; dx < info.width; dx++) {
    for (let dy = 0; dy < info.height; dy++) {
      if (info.filled[`${dx},${dy}`]) {
        const [sx, sy] = pointApplyingTransform(dx, dy, info, actor.transform);
        results.push({ x: x + sx - ix, y: y + sy - iy });
      }
    }
  }
  console.log(info);
  console.log(results);
  return results;
}

export function pointIsOutside({ x, y }: Position, { xmin, xmax, ymin, ymax }: RuleExtent) {
  return x < xmin || x > xmax || y < ymin || y > ymax;
}

export function pointIsInside(a: Position, b: RuleExtent) {
  return !pointIsOutside(a, b);
}

export function pointByAdding({ x, y }: Position, { x: dx, y: dy }: Position) {
  return { x: x + dx, y: y + dy };
}

export function pointApplyingTransform(
  x: number,
  y: number,
  { width, height }: { width: number; height: number },
  transform: Actor["transform"],
) {
  if (transform === "90deg") {
    return [height - 1 - y, x];
  }
  if (transform === "270deg") {
    return [width - 1 - x, y];
  }
  if (transform === "180deg") {
    return [width - 1 - x, height - 1 - y];
  }
  if (transform === "flip-x") {
    return [width - 1 - x, y];
  }
  if (transform === "flip-y") {
    return [x, height - 1 - y];
  }

  return [x, y];
}

export function shuffleArray<T>(d: Array<T>): Array<T> {
  for (let c = d.length - 1; c > 0; c--) {
    const b = Math.floor(Math.random() * (c + 1));
    const a = d[c];
    d[c] = d[b];
    d[b] = a;
  }
  return d;
}

export function getVariableValue(actor: Actor, character: Character, id: string) {
  if (actor.variableValues[id] !== undefined) {
    return Number(actor.variableValues[id]);
  }
  if (character.variables[id] !== undefined) {
    return Number(character.variables[id].defaultValue);
  }
  return null;
}

export function toV2Condition(
  id: string,
  condition: RuleCondition,
): RuleConditionVariable | RuleConditionTransform | RuleConditionAppearance | null {
  if (!condition) {
    return null;
  }
  if ("type" in condition && condition.type) {
    return condition; // v2 already
  }
  if (id === "appearance") {
    return { ...condition, comparator: "=", value: {}, type: id };
  }
  if (id === "transform") {
    return { ...condition, comparator: "=", value: {}, type: id };
  }
  return { comparator: "=", ...condition, value: {}, type: "variable", variableId: id };
}

export function applyVariableOperation(
  existing: number | string,
  operation: MathOperation,
  value: number | string,
) {
  if (operation === "add") {
    return Number(existing) + Number(value);
  }
  if (operation === "subtract") {
    return Number(existing) - Number(value);
  }
  if (operation === "set") {
    return value;
  }

  throw new Error(`applyVariableOperation unknown operation ${operation}`);
}

export function findRule(
  node: { rules: RuleTreeItem[] },
  id: string,
): [RuleTreeItem, { rules: RuleTreeItem[] }, number] | null {
  if (!("rules" in node)) {
    return null;
  }
  for (let idx = 0; idx < node.rules.length; idx++) {
    const n = node.rules[idx];
    if (n.id === id) {
      return [n, node, idx];
    } else if ("rules" in n && n.rules) {
      const rval = findRule(n, id);
      if (rval) {
        return rval;
      }
    }
  }
  return null;
}

let bgImages: { [url: string]: HTMLImageElement } = {};

function cssURLToURL(cssUrl: string) {
  if (cssUrl.includes("/Layer0_2.png")) {
    return new URL(`/src/editor/img/backgrounds/Layer0_2.png`, import.meta.url).href;
  }
  if (cssUrl.includes("url(")) {
    return cssUrl.split("url(").pop()!.slice(0, -1).replace(/['"]$/, "").replace(/^['"]/, "");
  }
  return null;
}

export function prepareCrossoriginImages(stages: Stage[]) {
  const next: { [url: string]: HTMLImageElement } = {};

  for (const stage of stages) {
    const url = cssURLToURL(stage.background);
    if (!url) continue;

    next[url] = bgImages[url];
    if (!next[url]) {
      const background = new Image();
      background.crossOrigin = "anonymous";
      background.src = url;
      next[url] = background;
    }
  }
  bgImages = next;
}

export function getStageScreenshot(stage: Stage, { size }: { size: number }) {
  const { characters } = window.editorStore.getState();

  const scale = Math.min(size / (stage.width * 40), size / (stage.height * 40));
  const pxPerSquare = Math.round(40 * scale);

  const canvas = document.createElement("canvas");
  canvas.width = stage.width * pxPerSquare;
  canvas.height = stage.height * pxPerSquare;
  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }
  const backgroundUrl = cssURLToURL(stage.background);
  if (backgroundUrl) {
    const backgroundImage = bgImages[backgroundUrl];
    if (backgroundImage) {
      context.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
    }
  } else {
    context.fillStyle = stage.background;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  Object.values(stage.actors).forEach((actor) => {
    const i = new Image();
    i.src = characters[actor.characterId].spritesheet.appearances[actor.appearance];
    context.drawImage(
      i,
      Math.floor(actor.position.x * pxPerSquare),
      Math.floor(actor.position.y * pxPerSquare),
      pxPerSquare,
      pxPerSquare,
    );
  });

  try {
    return canvas.toDataURL("image/jpeg", 0.8);
  } catch (err) {
    console.warn(`getStageScreenshot: ${err}`);
  }
  return null;
}
