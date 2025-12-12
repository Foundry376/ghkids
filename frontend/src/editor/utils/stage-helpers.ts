import {
  Actor,
  ActorTransform,
  Character,
  Characters,
  Globals,
  MathOperation,
  Position,
  RuleExtent,
  RuleTreeItem,
  RuleValue,
  Stage,
  VariableComparator,
} from "../../types";
import { RELATIVE_TRANSFORMS } from "../components/inspector/transform-lookup";
import { DEFAULT_APPEARANCE_INFO } from "../components/sprites/sprite";

export function buildActorSelection(worldId: string, stageId: string, actorIds: string[]) {
  return { worldId, stageId, actorIds };
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

export function actorIntersectsExtent(actor: Actor, characters: Characters, extent: RuleExtent) {
  const points = new Set(actorFilledPoints(actor, characters).map((p) => `${p.x},${p.y}`));
  for (let x = extent.xmin; x <= extent.xmax; x++) {
    for (let y = extent.ymin; y <= extent.ymax; y++) {
      if (points.has(`${x},${y}`)) return true;
    }
  }
  return false;
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
  if (transform === "90") {
    return [height - 1 - y, x];
  }
  if (transform === "270") {
    return [y, width - 1 - x];
  }
  if (transform === "180") {
    return [width - 1 - x, height - 1 - y];
  }
  if (transform === "flip-x") {
    return [width - 1 - x, y];
  }
  if (transform === "flip-y") {
    return [x, height - 1 - y];
  }
  if (transform === "d1") {
    return [y, x];
  }
  if (transform === "d2") {
    return [height - 1 - y, width - 1 - x];
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

export function resolveRuleValue(
  val: RuleValue,
  globals: Globals,
  characters: Characters,
  actors: Stage["actors"],
  comparator: VariableComparator,
): string | null {
  if (!val) {
    console.warn(`A rule value is missing?`);
    return "";
  }
  if ("constant" in val) {
    return val.constant;
  }
  if ("actorId" in val) {
    return getVariableValue(
      actors[val.actorId],
      characters[actors[val.actorId].characterId],
      val.variableId,
      comparator,
    );
  }
  if ("globalId" in val) {
    return globals[val.globalId]?.value;
  }
  isNever(val);
  return "";
}

/** Why does the value of a variable depend on `comparator`? It's gross, but we
 * want to allow an appearances to be compared-by-identity against an appearance ID,
 * or compared-by-name against a string. They can be renamed, and renaming one shouldn't
 * break rules saying "appearance = foo".
 *
 * Alternatively we could make "= foo" a dynamic lookup of the appearance name, but the
 * game doesn't currently enforce that appearances need to have unique names.
 */
export function getVariableValue(
  actor: Actor,
  character: Character,
  id: string,
  comparator: VariableComparator,
) {
  if (id === "appearance") {
    if (["=", "!="].includes(comparator)) {
      return actor.appearance ?? null;
    }
    return character.spritesheet.appearanceNames[actor.appearance];
  }
  if (id === "transform") {
    return actor.transform ?? null;
  }
  if (actor.variableValues[id] !== undefined) {
    return actor.variableValues[id] ?? null;
  }
  if (character.variables[id] !== undefined) {
    return character.variables[id].defaultValue ?? null;
  }
  return null;
}

export function applyTransformOperation(
  existing: ActorTransform,
  operation: MathOperation,
  value: ActorTransform,
) {
  if (operation === "add") {
    return RELATIVE_TRANSFORMS[existing][value];
  }
  if (operation === "set") {
    return value;
  }

  throw new Error(`applyTransformOperation unknown operation ${operation}`);
}

export function applyVariableOperation(existing: string, operation: MathOperation, value: string) {
  if (operation === "add") {
    return `${Number(existing) + Number(value)}`;
  }
  if (operation === "subtract") {
    return `${Number(existing) - Number(value)}`;
  }
  if (operation === "set") {
    return `${value}`;
  }

  throw new Error(`applyVariableOperation unknown operation ${operation}`);
}

export function findRule(
  node: { rules: RuleTreeItem[] },
  id: string,
): [RuleTreeItem | null, { rules: RuleTreeItem[] }, number] {
  if (!("rules" in node)) {
    return [null, { rules: [] }, 0] as const;
  }
  for (let idx = 0; idx < node.rules.length; idx++) {
    const n = node.rules[idx];
    if (n.id === id) {
      return [n, node, idx];
    } else if ("rules" in n && n.rules) {
      const rval = findRule(n, id);
      if (rval[0] !== null) {
        return rval;
      }
    }
  }
  return [null, { rules: [] }, 0] as const;
}
type HTMLImageElementLoaded = HTMLImageElement & { _codakoloaded?: boolean };

let bgImages: { [url: string]: HTMLImageElementLoaded } = {};

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
  const next: { [url: string]: HTMLImageElementLoaded } = {};

  for (const stage of stages) {
    const url = cssURLToURL(stage.background);
    if (!url) continue;

    next[url] = bgImages[url];
    if (!next[url]) {
      const background = new Image() as HTMLImageElementLoaded;
      background.crossOrigin = "anonymous";
      background._codakoloaded = false;
      background.onload = () => {
        background._codakoloaded = true;
      };
      background.onerror = (e) => {
        console.error(`Failed to load image: ${background.src}: ${e}`);
      };
      background.src = url;
      next[url] = background;
    }
  }
  bgImages = next;
}

export function applyActorTransformToContext(
  context: CanvasRenderingContext2D,
  transform: ActorTransform,
) {
  switch (transform || "0") {
    case "90":
      context.rotate((90 * Math.PI) / 180);
      break;
    case "180":
      context.rotate((180 * Math.PI) / 180);
      break;
    case "270":
      context.rotate((270 * Math.PI) / 180);
      break;
    case "flip-x":
      context.scale(-1, 1);
      break;
    case "flip-y":
      context.scale(1, -1);
      break;
    case "d1":
      context.rotate((90 * Math.PI) / 180);
      context.scale(1, -1);
      break;
    case "d2":
      context.rotate((-90 * Math.PI) / 180);
      context.scale(1, -1);
      break;
    case "0":
      break;
    default:
      throw new Error(`Unsupported transform ${transform}`);
  }
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
    if (backgroundImage && backgroundImage._codakoloaded) {
      context.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
    }
  } else {
    context.fillStyle = stage.background;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  Object.values(stage.actors).forEach((actor) => {
    const i = new Image();
    const { appearances, appearanceInfo } = characters[actor.characterId].spritesheet;
    i.src = appearances[actor.appearance];
    const info = appearanceInfo?.[actor.appearance] || DEFAULT_APPEARANCE_INFO;

    context.save();
    context.translate(
      Math.floor((actor.position.x + 0.5) * pxPerSquare),
      Math.floor((actor.position.y + 0.5) * pxPerSquare),
    );
    applyActorTransformToContext(context, actor.transform ?? "0");
    context.drawImage(
      i,
      -(info.anchor.x + 0.5) * pxPerSquare,
      -(info.anchor.y + 0.5) * pxPerSquare,
      info.width * pxPerSquare,
      info.height * pxPerSquare,
    );
    context.restore();
  });

  try {
    return canvas.toDataURL("image/jpeg", 0.8);
  } catch (err) {
    console.warn(`getStageScreenshot: ${err}`);
  }
  return null;
}

export function isNever(val: never) {
  throw new Error(`Expected var to be never but it is ${JSON.stringify(val)}.`);
}
