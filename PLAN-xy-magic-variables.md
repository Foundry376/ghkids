# Implementation Plan: X/Y as Magic Variables

## Overview

Add X and Y position coordinates as "magic variables" accessible through the variable system, allowing them to be:
- Displayed in the Variables inspector panel
- Used in rule conditions (e.g., "if x > 5")
- Modified via variable actions (e.g., "set x to x + 1")

This follows the existing pattern used by `appearance` and `transform`.

---

## Phase 1: Type Definitions

### File: `frontend/src/types.ts`

**Task 1.1: Update RuleValue type (line ~156)**

```typescript
// Before
export type RuleValue =
  | { constant: string }
  | { actorId: string; variableId: string | "apperance" | "transform" }
  | { globalId: string };

// After
export type RuleValue =
  | { constant: string }
  | { actorId: string; variableId: string | "appearance" | "transform" | "x" | "y" }
  | { globalId: string };
```

Note: Also fix the "apperance" typo → "appearance" while here.

---

## Phase 2: Variable Resolution

### File: `frontend/src/editor/utils/stage-helpers.ts`

**Task 2.1: Update getVariableValue() (line ~176)**

Add x/y handling after the transform check:

```typescript
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

  // NEW: Handle position coordinates
  if (id === "x") {
    return String(actor.position.x);
  }
  if (id === "y") {
    return String(actor.position.y);
  }

  // ... rest of function unchanged
}
```

---

## Phase 3: Variable Actions in World Operator

### File: `frontend/src/editor/utils/world-operator.ts`

**Task 3.1: Handle x/y in variable action processing (line ~627)**

Update the variable action handler to recognize x/y and modify position:

```typescript
} else if (action.type === "variable") {
  // NEW: Check for position magic variables
  if (action.variable === "x" || action.variable === "y") {
    const coord = action.variable as "x" | "y";
    const current = String(stageActor.position[coord]);
    const value = resolveRuleValue(action.value, globals, characters, stageActorForId, "=") ?? "0";
    const next = Number(applyVariableOperation(current, action.operation, value));

    // Create new position and apply wrapping
    const newPosition = {
      ...stageActor.position,
      [coord]: next,
    };
    const wrappedPos = wrappedPosition(newPosition);
    if (wrappedPos) {
      stageActor.position = wrappedPos;
    }
    // If wrappedPosition returns null (out of bounds on non-wrapping stage),
    // position remains unchanged - or we could handle this differently
  } else {
    // Existing variable handling
    const current = getVariableValue(
      stageActor,
      characters[stageActor.characterId],
      action.variable,
      "=",
    ) ?? "0";
    const value = resolveRuleValue(action.value, globals, characters, stageActorForId, "=") ?? "";
    const next = applyVariableOperation(current, action.operation, value);
    stageActor.variableValues[action.variable] = next;
  }
}
```

**Task 3.2: Verify wrappedPosition is accessible**

Ensure `wrappedPosition` helper is available in the scope where variable actions are processed. It's already used for "move" actions, so should be in scope.

---

## Phase 4: Inspector Panel UI

### File: `frontend/src/editor/components/inspector/container-pane-variables.tsx`

**Task 4.1: Add X/Y grid items to the character variables section**

After the AppearanceGridItem (around line 211), add position grid items:

```typescript
{actor && (
  <>
    <AppearanceGridItem
      actor={actor}
      spritesheet={character.spritesheet}
      onChange={(appearance, transform) => {
        dispatch(changeActors(selectedActors!, { appearance, transform }));
      }}
    />
    {/* NEW: Position X */}
    <PositionGridItem
      actor={actor}
      coordinate="x"
      onChange={(x) => {
        dispatch(changeActors(selectedActors!, {
          position: { ...actor.position, x }
        }));
      }}
    />
    {/* NEW: Position Y */}
    <PositionGridItem
      actor={actor}
      coordinate="y"
      onChange={(y) => {
        dispatch(changeActors(selectedActors!, {
          position: { ...actor.position, y }
        }));
      }}
    />
  </>
)}
```

**Task 4.2: Create PositionGridItem component**

Create a new component (could be in same file or new file):

```typescript
const PositionGridItem = ({
  actor,
  coordinate,
  onChange,
}: {
  actor: Actor;
  coordinate: "x" | "y";
  onChange: (value: number) => void;
}) => {
  const _onDragStart = (event: React.DragEvent) => {
    event.dataTransfer.dropEffect = "copy";
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData(
      "variable",
      JSON.stringify({
        variableId: coordinate,
        actorId: actor.id,
        value: String(actor.position[coordinate]),
      }),
    );
  };

  return (
    <div
      className="variable-grid-item"
      draggable
      onDragStart={_onDragStart}
    >
      <div className="variable-name">{coordinate.toUpperCase()}</div>
      <input
        type="number"
        value={actor.position[coordinate]}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
};
```

---

## Phase 5: Condition/Action Display

### File: `frontend/src/editor/components/stage/recording/condition-rows.tsx`

**Task 5.1: Update ActorVariableBlock (line ~54)**

Add x/y to the display logic:

```typescript
export const ActorVariableBlock = ({
  character,
  actor,
  disambiguate,
  variableId,
}: {
  character: Character;
  actor: Actor;
  disambiguate?: boolean;
  variableId: string;
}) => {
  const getVariableLabel = () => {
    if (variableId === "transform") return "direction";
    if (variableId === "appearance") return "appearance";
    if (variableId === "x") return "X";  // NEW
    if (variableId === "y") return "Y";  // NEW
    return <VariableBlock name={character.variables[variableId]?.name || ""} />;
  };

  return (
    <div className={...}>
      <ActorBlock character={character} actor={actor} disambiguate={disambiguate} />
      {getVariableLabel()}
    </div>
  );
};
```

### File: `frontend/src/editor/components/stage/recording/blocks.tsx`

**Task 5.2: Update any variable display logic**

Check if there's similar logic in blocks.tsx that needs x/y handling.

---

## Phase 6: Action Recording/Creation

### File: `frontend/src/editor/components/stage/recording/panel-actions.tsx`

**Task 6.1: Handle x/y when creating actions from drag (line ~239)**

Update the action creation logic to handle position variables:

```typescript
const newAction: RuleAction | null =
  variableId === "appearance"
    ? { type: "appearance", actorId, value }
    : variableId === "x" || variableId === "y"
    ? { type: "variable", actorId, variable: variableId, operation: "set", value }  // NEW
    : globalId
      ? { type: "global", operation: "set", global: globalId, value }
      : variableId
        ? { type: "variable", actorId, variable: variableId, operation: "set", value }
        : null;
```

Note: X/Y use the standard "variable" action type - the world operator handles the magic.

---

## Phase 7: Edge Cases & Polish

**Task 7.1: Handle position when no actor is selected**

In the variables panel, X/Y should only show when an actor is selected (not for "defaults" view) since position is inherently instance-specific.

**Task 7.2: Consider read-only during recording**

Decide if X/Y should be editable in the inspector during rule recording, or if changes should only happen through demonstrated actions.

**Task 7.3: Stage bounds validation**

When setting X/Y via variable action:
- On wrapping stages: wrap to valid range
- On non-wrapping stages: clamp to bounds or reject out-of-bounds values

**Task 7.4: Animation considerations**

The "move" action supports animation. Variable-based position changes could either:
- Skip animation (instant teleport)
- Trigger simple animation
- Remain as a "direct set" while "move" handles animated movement

Recommend: Variable actions = instant, "move" action = animated. This gives users both options.

---

## Testing Checklist

- [ ] X/Y appear in variables panel when actor selected
- [ ] X/Y are draggable to condition left/right sides
- [ ] X/Y are draggable to action panel
- [ ] Conditions using x/y evaluate correctly (=, !=, <, >, etc.)
- [ ] Variable actions can set/add/subtract x and y
- [ ] Position wrapping works correctly on wrapping stages
- [ ] Position bounds respected on non-wrapping stages
- [ ] X/Y display correctly in rule condition/action UI
- [ ] Existing "move" actions continue to work
- [ ] World save/load works with x/y in rules

---

## Files Modified Summary

| File | Changes |
|------|---------|
| `frontend/src/types.ts` | Add "x" \| "y" to RuleValue variableId |
| `frontend/src/editor/utils/stage-helpers.ts` | Handle x/y in getVariableValue() |
| `frontend/src/editor/utils/world-operator.ts` | Handle x/y in variable action processing |
| `frontend/src/editor/components/inspector/container-pane-variables.tsx` | Add PositionGridItem components |
| `frontend/src/editor/components/stage/recording/condition-rows.tsx` | Display x/y labels in ActorVariableBlock |
| `frontend/src/editor/components/stage/recording/panel-actions.tsx` | Handle x/y drag-to-create actions |

---

## Implementation Order

1. **Types** (Phase 1) - Foundation for type safety
2. **Resolution** (Phase 2) - X/Y readable in conditions
3. **World Operator** (Phase 3) - X/Y writable in actions
4. **Display** (Phase 5) - X/Y show correctly in rules
5. **Inspector UI** (Phase 4) - X/Y appear in panel and are draggable
6. **Recording** (Phase 6) - Creating rules with x/y works
7. **Polish** (Phase 7) - Edge cases and testing
