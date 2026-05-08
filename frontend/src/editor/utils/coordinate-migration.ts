/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Migrates v1 worlds (Y-down, 0-indexed) to v2 worlds (Y-up internal,
 * 1-indexed for absolute positions).
 *
 * v1 had top-left = (0, 0), bottom-right = (width-1, height-1).
 * v2 has bottom-left = (1, 1), top-right = (width, height) — what the kid sees
 * is what we store.
 *
 * Absolute conversions (stage actor positions, door destinations):
 *   x_new = x_old + 1
 *   y_new = stage.height - y_old   // flip + shift to 1-indexed
 *
 * Relative-Y offsets (rule actor positions, extents, deltas, action offsets):
 *   y_new = -y_old                 // direction-bearing, no shift
 *
 * The migration runs once on load. After migrating we set version: 2 and the
 * world is persisted in v2 form on the next save.
 */

import { DOOR_VARIABLE_IDS } from "./door-constants";

type AnyRecord = Record<string, any>;

function isObject(v: unknown): v is AnyRecord {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Flip a relative Y offset (e.g. action delta, action offset, rule actor position). */
function flipRelativeY<T extends { x: number; y: number }>(p: T): T {
  return { ...p, y: -p.y };
}

/** Flip an absolute Y on a stage of the given height (Y-down 0-indexed → Y-up 1-indexed). */
function flipAbsoluteY(y: number, stageHeight: number): number {
  return stageHeight - y;
}

/** Shift an absolute X (0-indexed → 1-indexed). */
function shiftAbsoluteX(x: number): number {
  return x + 1;
}

function migrateRuleExtent(extent: any): any {
  if (!extent) return extent;
  const next: any = {
    ...extent,
    xmin: extent.xmin,
    xmax: extent.xmax,
    ymin: -extent.ymax,
    ymax: -extent.ymin,
    ignored: {},
  };
  if (extent.ignored && typeof extent.ignored === "object") {
    for (const [key, v] of Object.entries(extent.ignored)) {
      const [xs, ys] = key.split(",");
      const x = Number(xs);
      const y = Number(ys);
      if (Number.isFinite(x) && Number.isFinite(y)) {
        next.ignored[`${x},${-y}`] = v;
      } else {
        next.ignored[key] = v;
      }
    }
  }
  return next;
}

function migrateRuleAction(action: any): any {
  if (!action || typeof action !== "object") return action;
  const next = { ...action };

  if (action.type === "move") {
    if (action.delta && typeof action.delta === "object") {
      next.delta = flipRelativeY(action.delta);
    }
    if (action.offset && typeof action.offset === "object") {
      next.offset = flipRelativeY(action.offset);
    }
  } else if (action.type === "create") {
    if (action.offset && typeof action.offset === "object") {
      next.offset = flipRelativeY(action.offset);
    }
  } else if (action.type === "variable" && action.variable === "y") {
    // For "set y = N" actions where N is a constant, the constant was an
    // internal Y-down value. Negating without stage-height context keeps
    // semantics for relative add/subtract operations; for "set" the value
    // is height-dependent and we leave it alone (with a warning) — kids
    // typing literal Y constants is rare and we'd need stage context.
    if (action.value && "constant" in action.value) {
      if (action.operation === "add" || action.operation === "subtract") {
        const num = Number(action.value.constant);
        if (Number.isFinite(num)) {
          next.value = { ...action.value, constant: String(-num) };
        }
      } else if (action.operation === "set") {
        // Best-effort: leave constant alone; warn so author can review.
        // (Stage-height-dependent; we can't know which stage runs this rule.)
        console.warn(
          `coordinate-migration: 'set y = ${action.value.constant}' may need manual review (Y-down constant in Y-up world).`,
        );
      }
    }
  }

  return next;
}

function migrateRule(rule: any): any {
  if (!rule || typeof rule !== "object") return rule;
  const next = { ...rule };

  if (rule.actors && typeof rule.actors === "object") {
    const actors: any = {};
    for (const [id, ruleActor] of Object.entries<any>(rule.actors)) {
      if (ruleActor && ruleActor.position && typeof ruleActor.position === "object") {
        actors[id] = { ...ruleActor, position: flipRelativeY(ruleActor.position) };
      } else {
        actors[id] = ruleActor;
      }
    }
    next.actors = actors;
  }

  if (rule.extent) {
    next.extent = migrateRuleExtent(rule.extent);
  }

  if (Array.isArray(rule.actions)) {
    next.actions = rule.actions.map(migrateRuleAction);
  }

  // Note: conditions are not adjusted automatically. A condition like
  // "actor.y > 3" had a Y-down meaning that we cannot reliably re-author
  // without knowing the stage height each rule runs against. The plan
  // accepts this and asks the migration to warn so authors can review.
  if (Array.isArray(rule.conditions)) {
    for (const cond of rule.conditions) {
      const refsY =
        ("variableId" in (cond.left || {}) && cond.left.variableId === "y") ||
        ("variableId" in (cond.right || {}) && cond.right.variableId === "y");
      if (refsY) {
        console.warn(
          `coordinate-migration: condition references 'y' — semantics may need manual review:`,
          JSON.stringify(cond),
        );
      }
    }
  }

  return next;
}

function migrateRulesTree(rules: any): any {
  if (!Array.isArray(rules)) return rules;
  return rules.map((node: any) => {
    if (!node || typeof node !== "object") return node;
    const next: any = { ...node };

    if (node.type === "rule") {
      Object.assign(next, migrateRule(node));
    } else {
      // Container types: group-event / group-flow. Recurse children.
      if (Array.isArray(node.rules)) {
        next.rules = migrateRulesTree(node.rules);
      }
      if (node.check) {
        next.check = migrateRule(node.check);
      }
    }
    return next;
  });
}

function migrateCharacter(character: any): any {
  if (!character || typeof character !== "object") return character;
  const next = { ...character };
  if (Array.isArray(character.rules)) {
    next.rules = migrateRulesTree(character.rules);
  }
  return next;
}

function migrateStage(stage: any, characters: AnyRecord, allStages: AnyRecord): any {
  if (!stage || typeof stage !== "object") return stage;
  const stageHeight = Number(stage.height);
  if (!Number.isFinite(stageHeight) || stageHeight <= 0) return stage;

  const nextActors: AnyRecord = {};
  for (const [id, actor] of Object.entries<any>(stage.actors || {})) {
    if (!actor) continue;

    const nextActor: any = { ...actor };

    if (actor.position && typeof actor.position === "object") {
      nextActor.position = {
        ...actor.position,
        x: shiftAbsoluteX(actor.position.x),
        y: flipAbsoluteY(actor.position.y, stageHeight),
      };
    }

    // Door destination Y migration: the destination is a position on a
    // (possibly other) stage. Use that stage's height when known.
    const character = characters[actor.characterId];
    if (character?.kind === "door" && actor.variableValues) {
      const vv: AnyRecord = { ...actor.variableValues };
      const destStageId = vv[DOOR_VARIABLE_IDS.destinationStage];
      const destStage =
        (destStageId && allStages[destStageId]) || stage; // fall back to source
      const destHeight = Number(destStage?.height) || stageHeight;
      const yRaw = vv[DOOR_VARIABLE_IDS.destinationY];
      const yNum = Number(yRaw);
      if (Number.isFinite(yNum)) {
        vv[DOOR_VARIABLE_IDS.destinationY] = String(flipAbsoluteY(yNum, destHeight));
      }
      const xRaw = vv[DOOR_VARIABLE_IDS.destinationX];
      const xNum = Number(xRaw);
      if (Number.isFinite(xNum)) {
        vv[DOOR_VARIABLE_IDS.destinationX] = String(shiftAbsoluteX(xNum));
      }
      nextActor.variableValues = vv;
    }

    nextActors[id] = nextActor;
  }

  return { ...stage, actors: nextActors };
}

/**
 * Migrate an EditorState (or the `data` blob within a Game) from v1 to v2.
 * Idempotent: a v2-or-newer state is returned unchanged.
 */
export function migrateCoordinatesV1ToV2<T extends AnyRecord>(state: T): T {
  if (!isObject(state)) return state;

  const version = (state as any).version;
  if (version !== undefined && version >= 2) {
    return state;
  }

  const next: AnyRecord = { ...state };

  // Migrate characters' rules first; we need the (already-migrated) characters'
  // door-kind info when migrating stages.
  const characters: AnyRecord = {};
  if (isObject(state.characters)) {
    for (const [id, char] of Object.entries<any>(state.characters)) {
      characters[id] = migrateCharacter(char);
    }
    next.characters = characters;
  }

  if (isObject(state.world) && isObject(state.world.stages)) {
    const nextStages: AnyRecord = {};
    for (const [id, stage] of Object.entries<any>(state.world.stages)) {
      nextStages[id] = migrateStage(stage, characters, state.world.stages);
    }
    next.world = { ...state.world, stages: nextStages };

    // History contains diffs that depend on v1 coordinate values. Drop it on
    // migration — undo across the migration boundary is not supported.
    if (Array.isArray(next.world.history) && next.world.history.length > 0) {
      next.world = { ...next.world, history: [] };
    }
  }

  // Discard any in-progress recording state — recordings are transient.
  if ("recording" in state) {
    delete (next as any).recording;
  }

  next.version = 2;
  return next as T;
}

/**
 * Wrapper that applies the migration to a Game-shaped object whose `data`
 * field carries the EditorState.
 */
export function migrateGameCoordinates<T extends AnyRecord>(game: T): T {
  if (!isObject(game)) return game;

  const next: AnyRecord = { ...game };

  if (isObject(game.data)) {
    next.data = migrateCoordinatesV1ToV2(game.data);
  }
  if (isObject(game.unsavedData)) {
    next.unsavedData = migrateCoordinatesV1ToV2(game.unsavedData);
  }

  return next as T;
}
