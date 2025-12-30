# World Operator Architecture Reference

## Complete Type Definitions

### Actor (`types.ts:183-194`)

```typescript
type Actor = {
  id: string;
  characterId: string;
  variableValues: Record<string, string>;
  appearance: string;
  position: PositionRelativeToWorld;  // {x, y}
  transform?: ActorTransform;         // "0"|"90"|"180"|"270"|"flip-x"|"flip-y"|"d1"|"d2"

  // Set by world operator during animation
  frameCount?: number;
  animationStyle?: RuleActionAnimationStyle;
};
```

### Character (`types.ts:226-245`)

```typescript
type Character = {
  id: string;
  name: string;
  rules: RuleTreeItem[];
  spritesheet: {
    appearances: { [appearanceId: string]: ImageData[] };
    appearanceNames: { [appearanceId: string]: string };
    appearanceInfo?: { [appearanceId: string]: AppearanceInfo };
  };
  variables: Record<string, {
    id: string;
    name: string;
    defaultValue: string;
  }>;
};
```

### Rule (`types.ts:172-181`)

```typescript
type Rule = {
  type: "rule";
  mainActorId: string;
  conditions: RuleCondition[];
  actors: { [actorIdInRule: string]: Actor };
  actions: RuleAction[];
  extent: RuleExtent;
  id: string;
  name: string;
};
```

### RuleExtent (`types.ts:90-96`)

```typescript
type RuleExtent = {
  xmin: number;
  xmax: number;
  ymin: number;
  ymax: number;
  ignored: Record<string, boolean>;  // [`${x},${y}`] - squares to ignore extra actors
};
```

### RuleCondition (`types.ts:148-154`)

```typescript
type RuleCondition = {
  key: string;
  enabled: boolean;
  left: RuleValue;
  comparator: VariableComparator;
  right: RuleValue;
};

type VariableComparator = "=" | "!=" | ">=" | "<=" | ">" | "<"
                        | "contains" | "starts-with" | "ends-with";
```

### RuleValue (`types.ts:156-159`)

```typescript
type RuleValue =
  | { constant: string }
  | { actorId: string; variableId: string | "appearance" | "transform" }
  | { globalId: string };
```

### RuleAction (`types.ts:43-84`)

```typescript
type RuleAction = (
  | { type: "appearance"; actorId: string; value: RuleValue }
  | { type: "variable"; actorId: string; variable: string; operation: MathOperation; value: RuleValue }
  | { type: "global"; global: string; operation: MathOperation; value: RuleValue }
  | { type: "delete"; actorId: string }
  | { type: "create"; actor: Actor; actorId: string; offset: PositionRelativeToMainActor }
  | { type: "move"; actorId: string; delta?: {x, y}; offset?: PositionRelativeToMainActor }
  | { type: "transform"; actorId: string; operation: MathOperation; value: RuleValue }
) & { animationStyle?: "linear" | "none" | "skip" };

type MathOperation = "add" | "set" | "subtract";
```

### Rule Tree Containers (`types.ts:98-146`)

```typescript
type RuleTreeEventItem = {
  type: "group-event";
  rules: RuleTreeItem[];
  event: "idle" | "key" | "click";
  code?: number;  // for key events
  id: string;
};

type RuleTreeFlowItem = RuleTreeFlowItemBase & (
  | { behavior: "first" }
  | { behavior: "all" }
  | { behavior: "random" }
  | { behavior: "loop"; loopCount: { constant: number } | { variableId: string } }
);

type RuleTreeFlowItemBase = {
  type: "group-flow";
  name: string;
  rules: RuleTreeItem[];
  id: string;
  check?: RuleTreeFlowItemCheck;  // Optional pre-condition
};
```

### World and Stage (`types.ts:196-307`)

```typescript
type Stage = {
  id: string;
  order: number;
  name: string;
  actors: { [actorId: string]: Actor };
  background: ImageData | string;
  width: number;
  height: number;
  wrapX: boolean;
  wrapY: boolean;
  scale?: number | "fit";
  startThumbnail: ImageData;
  startActors: { [actorId: string]: Actor };
};

type WorldMinimal = {
  id: WORLDS;
  stages: { [stageId: string]: Stage };
  globals: Globals;
  input: FrameInput;
  evaluatedRuleDetails: EvaluatedRuleDetailsMap;  // Detailed per-rule evaluation data
  evaluatedTickFrames?: Frame[];
};

type World = WorldMinimal & {
  history: HistoryItem[];
  metadata: { name: string; id: number };
};
```

### Globals (`types.ts:253-283`)

```typescript
type Globals = {
  click: Global;       // { id: "click", value: actorId, type: "actor" }
  keypress: Global;    // { id: "keypress", value: keyNames, type: "key" }
  selectedStageId: Global;
  [globalId: string]: Global;
};
```

---

## WorldOperator Implementation Details

### tick() Method (`world-operator.ts:569-623`)

```
┌─────────────────────────────────────────────────────────────────┐
│  1. SNAPSHOT PREVIOUS STATE (for undo)                         │
│     historyItem = {                                             │
│       input, globals, evaluatedRuleIds,                         │
│       stages: { [stageId]: { actors } }                         │
│     }                                                           │
├─────────────────────────────────────────────────────────────────┤
│  2. PREPARE MUTABLE COPIES                                      │
│     globals = deepClone(previousWorld.globals)                  │
│     actors = deepClone(stage.actors)                            │
│     globals.keypress.value = Object.keys(input.keys).join(",")  │
│     globals.click.value = Object.keys(input.clicks)[0]          │
├─────────────────────────────────────────────────────────────────┤
│  3. INITIALIZE DEBUG TRACKERS                                   │
│     evaluatedRuleDetails = {}                                   │
│     frameAccumulator = new FrameAccumulator(stage.actors)       │
├─────────────────────────────────────────────────────────────────┤
│  4. EVALUATE ALL ACTORS                                         │
│     Object.values(actors).forEach(actor =>                      │
│       ActorOperator(actor).tickAllRules()                       │
│     )                                                           │
├─────────────────────────────────────────────────────────────────┤
│  5. RETURN NEW WORLD (immutable via updeep)                     │
│     u({                                                         │
│       input: { keys: {}, clicks: {} },                          │
│       stages: { [id]: { actors: u.constant(actors) } },         │
│       globals: u.constant(globals),                             │
│       evaluatedRuleDetails: u.constant(evaluatedRuleDetails),   │
│       evaluatedTickFrames: frameAccumulator.getFrames(),        │
│       history: evaluatedSomeRule ? [..., historyItem] : same    │
│     }, previousWorld)                                           │
└─────────────────────────────────────────────────────────────────┘
```

### ActorOperator Pattern (`world-operator.ts:129-512`)

```typescript
function ActorOperator(me: Actor) {
  function tickAllRules() {
    const struct = characters[actors[me.id].characterId];
    tickRulesTree(struct);  // Character acts as root container
  }

  function tickRulesTree(struct) {
    let rules = [...struct.rules];

    // Random behavior shuffles first
    if (struct.behavior === "random") rules = shuffleArray(rules);

    // Loop behavior repeats
    let iterations = 1;
    if (struct.behavior === "loop") {
      iterations = resolveLoopCount(struct.loopCount);
    }

    for (let ii = 0; ii < iterations; ii++) {
      for (const rule of rules) {
        const details = tickRule(rule);  // Returns EvaluatedRuleDetails

        // Track in evaluatedRuleDetails - always update to avoid stale data
        evaluatedRuleDetails[me.id] ||= {};
        evaluatedRuleDetails[me.id][rule.id] = details;

        // "first" and "random" stop after first match
        if (details.passed && struct.behavior !== "all") break;
      }
    }
  }

  function tickRule(rule: RuleTreeItem) {
    if (rule.type === "group-event") {
      return checkEvent(rule) && tickRulesTree(rule);
    }
    if (rule.type === "group-flow") {
      const checkMet = !rule.check || !!checkRuleScenario(rule.check);
      return checkMet && tickRulesTree(rule);
    }
    // Actual rule
    const stageActorForId = checkRuleScenario(rule);
    if (stageActorForId) {
      applyRule(rule, { stageActorForId, createActorIds: true });
      return true;
    }
    return false;
  }

  return { tickAllRules, checkRuleScenario, applyRule };
}
```

### checkRuleScenario Algorithm (`world-operator.ts:212-346`)

```
For each (x, y) in rule.extent:
  │
  ├─ unwrappedStagePos = mainActor.position + {x, y}
  ├─ wrappedStagePos = wrappedPosition(unwrappedStagePos)
  │
  ├─ If wrappedStagePos is null → return false (offscreen, no wrap)
  │
  ├─ stageActorsAtPos = actors filling this point
  ├─ ruleActorsAtPos = rule.actors filling this point
  │
  ├─ If counts differ AND not ignored → return false
  │
  └─ For each stageActor at position:
       ├─ Find matching ruleActor (same character + conditions pass)
       ├─ If found → record mapping stageActorForRuleActorIds[ruleId] = stageActor
       └─ If not found AND not ignored → return false

Verify all actors in conditions/actions were found
Verify all action offsets are valid positions
Check global-to-global conditions

Return stageActorForRuleActorIds or false
```

### actorsMatch Function (`world-operator.ts:66-118`)

```typescript
function actorsMatch(stageActor, ruleActor, conditions, stageActorsForId) {
  // Must be same character type
  if (ruleActor.characterId !== stageActor.characterId) return false;

  // Check all conditions that reference this actor
  const rconditions = conditions.filter(c =>
    c.enabled && (
      ("actorId" in c.left && c.left.actorId === ruleActor.id) ||
      ("actorId" in c.right && c.right.actorId === ruleActor.id)
    )
  );

  for (const { left, right, comparator } of rconditions) {
    // Resolve values, potentially looking up other actors
    const leftValue = resolveValue(left, stageActorsForId);
    const rightValue = resolveValue(right, stageActorsForId);

    if (!comparatorMatches(comparator, leftValue, rightValue)) {
      return false;
    }
  }
  return true;
}
```

---

## Stage Helpers Reference

### Position Helpers (`stage-helpers.ts`)

```typescript
// Add two positions
pointByAdding({x, y}, {dx, dy}) → {x: x+dx, y: y+dy}

// Check if actor fills a specific grid point (handles multi-tile sprites)
actorFillsPoint(actor, characters, point) → boolean

// Get all points an actor fills
actorFilledPoints(actor, characters) → Position[]

// Check if actor intersects a rule extent
actorIntersectsExtent(actor, characters, extent) → boolean
```

### Value Resolution (`stage-helpers.ts:126-158`)

```typescript
function resolveRuleValue(val, globals, characters, actors, comparator) {
  if ("constant" in val) return val.constant;
  if ("actorId" in val) {
    const actor = actors[val.actorId];
    const character = characters[actor.characterId];
    return getVariableValue(actor, character, val.variableId, comparator);
  }
  if ("globalId" in val) return globals[val.globalId]?.value;
}
```

### Variable Value Retrieval (`stage-helpers.ts:168-190`)

```typescript
function getVariableValue(actor, character, id, comparator) {
  if (id === "appearance") {
    // For = and !=, return appearance ID; otherwise return name
    return ["=", "!="].includes(comparator)
      ? actor.appearance
      : character.spritesheet.appearanceNames[actor.appearance];
  }
  if (id === "transform") return actor.transform ?? null;

  // Check instance values, then character defaults
  if (actor.variableValues[id] !== undefined) return actor.variableValues[id];
  if (character.variables[id] !== undefined) return character.variables[id].defaultValue;
  return null;
}
```

### Comparator Matching (`stage-helpers.ts:427-458`)

```typescript
function comparatorMatches(comparator, a, b) {
  switch (comparator) {
    case "=":  return `${a}` === `${b}`;
    case "!=": return `${a}` != `${b}`;
    case ">=": return Number(a) >= Number(b);
    case "<=": return Number(a) <= Number(b);
    case ">":  return Number(a) > Number(b);
    case "<":  return Number(a) < Number(b);
    case "contains":
      // Special case: comma-separated list (for keypress)
      if (`${a}`.includes(",")) {
        return a?.split(",").some(v => v === b) ?? false;
      }
      return `${a}`.includes(`${b}`);
    case "ends-with":   return `${a}`.endsWith(`${b}`);
    case "starts-with": return `${a}`.startsWith(`${b}`);
  }
}
```

### Transform Operations (`stage-helpers.ts:204-221`)

```typescript
function applyTransformOperation(existing, operation, value) {
  if (operation === "add") {
    return RELATIVE_TRANSFORMS[existing][value];  // Composition
  }
  if (operation === "subtract") {
    return RELATIVE_TRANSFORMS[existing][INVERSE_TRANSFORMS[value]];
  }
  if (operation === "set") {
    return value;
  }
}
```

---

## Frame Accumulator (`frame-accumulator.ts`)

Tracks animation frames within a tick:

```typescript
class FrameAccumulator {
  changes: { [actorId: string]: FrameActor[] } = {};
  initial: Frame;

  push(actor: FrameActor) {
    this.changes[actor.id] ||= [];
    this.changes[actor.id].push(deepClone(actor));
  }

  getFrames(): Frame[] {
    // Interleaves actions: all actors' 1st action in frame 1,
    // all actors' 2nd action in frame 2, etc.
    const frames: Frame[] = [];
    let current = deepClone(this.initial);

    while (Object.keys(remaining).length > 0) {
      for (const actorId of Object.keys(remaining)) {
        const actorVersion = remaining[actorId].shift();
        actorVersion.frameCount = totalActionsForThisActor;

        if (actorVersion.deleted) {
          delete current.actors[actorId];
        } else {
          current.actors[actorId] = actorVersion;
        }
      }
      frames.push(current);
      current = deepClone(current);
    }
    return frames;
  }
}
```

---

## UI Integration

### Rule State Indicator (`inspector/rule-state-circle.tsx`)

```tsx
const RuleStateCircle = ({ rule }) => {
  const { evaluatedRuleDetailsForActor } = useContext(InspectorContext);
  const details = evaluatedRuleDetailsForActor?.[rule.id];
  return <div className={`circle ${details?.passed}`} />;  // CSS shows green/red/gray
};
```

See `granular-rule-tracking.md` for details on condition status dots and square overlays.

### Animation Playback (`stage/container.tsx:77-117`)

```tsx
useEffect(() => {
  if (world.evaluatedTickFrames) {
    const frames = world.evaluatedTickFrames;
    const setNext = () => {
      setCurrent(current => {
        const nextIdx = frames.findIndex(f => current.frameId === f.id) + 1;
        if (nextIdx < frames.length) {
          return { actors: frames[nextIdx].actors, frameId: frames[nextIdx].id };
        }
        return { actors: stage.actors, frameId: frames[frames.length-1]?.id };
      });
    };
    intervalRef.current = setTimeout(setNext, playback.speed);
  }
}, [playback.running, playback.speed, stage, world.evaluatedTickFrames]);
```

---

## Common Patterns

### Immutable State Updates

```typescript
import u from "updeep";

// Replace nested value
u({ stages: { [stageId]: { actors: u.constant(newActors) } } }, world)

// u.constant() prevents deep merge, replacing entirely
```

### Deep Cloning Before Mutation

```typescript
import { deepClone } from "./utils";

actors = deepClone(stage.actors);  // Now safe to mutate
actors[id].position = newPosition;
```

### Position Wrapping

```typescript
function wrappedPosition({ x, y }) {
  const o = {
    x: stage.wrapX ? ((x % stage.width) + stage.width) % stage.width : x,
    y: stage.wrapY ? ((y % stage.height) + stage.height) % stage.height : y,
  };
  if (o.x < 0 || o.y < 0 || o.x >= stage.width || o.y >= stage.height) {
    return null;  // Offscreen on non-wrapping stage
  }
  return o;
}
```
