# Camera Follow Feature Implementation Plan

## Overview

Add a new global variable `cameraFollow` that stores an actor ID. When the game is running and the stage viewport is overflowing (scrollbars visible), the stage should automatically center on the followed actor at the end of each game tick.

## Research Summary

### How Global Variables Work

- **Definition**: Globals are defined in `frontend/src/types.ts` as a union type with built-in globals (`click`, `keypress`, `selectedStageId`)
- **Initial State**: Set in `frontend/src/editor/reducers/initial-state.ts`
- **Usage**: The `click` global stores an actor ID as a string value and is updated during `tick()` in `world-operator.ts:734`

### How Stage Viewport Works

- **Offset State**: The Stage component (`frontend/src/editor/components/stage/stage.tsx:83`) maintains `{ top, left }` offset state
- **Centering Logic**: `centerOnExtent()` function (lines 151-162) shows how to calculate CSS positioning to center on a point
- **CSS Transform**: Uses `calc(-${x * STAGE_CELL_SIZE}px + 50%)` pattern for centering

### How Ticks Work

- **Tick Trigger**: `ADVANCE_GAME_STATE` action triggers `WorldOperator.tick()`
- **Frame Animation**: After tick, `StageContainer` animates through `evaluatedTickFrames`
- **Playback Loop**: `StageControls` runs an interval calling `advanceGameState()` when `playback.running`

---

## Implementation Steps

### Step 1: Add `cameraFollow` Global Type

**File**: `frontend/src/types.ts`

Add new global type to the `Global` union:

```typescript
| {
    id: "cameraFollow";
    name: "Camera Follow";
    value: string;  // actor ID or empty string
    type: "actor";
  }
```

Update the `Globals` type:

```typescript
export type Globals = {
  click: Global;
  keypress: Global;
  selectedStageId: Global;
  cameraFollow: Global;  // Add this
  [globalId: string]: Global;
};
```

---

### Step 2: Add Initial State for `cameraFollow`

**File**: `frontend/src/editor/reducers/initial-state.ts`

Add to the `globals` object in `initialEditorState`:

```typescript
globals: {
  click: { ... },
  keypress: { ... },
  selectedStageId: { ... },
  cameraFollow: {
    id: "cameraFollow",
    name: "Camera Follow",
    value: "",
    type: "actor",
  },
},
```

---

### Step 3: Implement Camera Centering in Stage Component

**File**: `frontend/src/editor/components/stage/stage.tsx`

#### 3a. Add helper function to calculate actor center position

```typescript
const centerOnActor = (actorId: string): Offset | null => {
  if (!actorId) return null;

  const actor = stage.actors[actorId];
  if (!actor) return null;

  // Calculate actor center position
  const xCenter = actor.position.x + 0.5;
  const yCenter = actor.position.y + 0.5;

  return {
    left: `calc(-${xCenter * STAGE_CELL_SIZE}px + 50%)`,
    top: `calc(-${yCenter * STAGE_CELL_SIZE}px + 50%)`,
  };
};
```

#### 3b. Add effect to center camera when tick completes during playback

```typescript
// Camera follow effect - center on followed actor after each tick
useEffect(() => {
  if (!playback.running) return;

  const cameraFollowId = world.globals?.cameraFollow?.value;
  if (!cameraFollowId) return;

  // Check if stage is overflowing (needs scrolling)
  const scrollWrapper = scrollEl.current;
  if (!scrollWrapper) return;

  const stageWidth = stage.width * STAGE_CELL_SIZE * scale;
  const stageHeight = stage.height * STAGE_CELL_SIZE * scale;
  const isOverflowing =
    stageWidth > scrollWrapper.clientWidth ||
    stageHeight > scrollWrapper.clientHeight;

  if (!isOverflowing) return;

  const newOffset = centerOnActor(cameraFollowId);
  if (newOffset) {
    setOffset(newOffset);
  }
}, [playback.running, stage.actors, world.globals?.cameraFollow?.value, scale]);
```

#### 3c. Dependencies to add

The Stage component needs access to `world.globals` - verify this is passed through props or accessible via selector.

---

### Step 4: Allow Setting cameraFollow in Rule Actions (Optional Enhancement)

**File**: `frontend/src/editor/utils/world-operator.ts`

The `cameraFollow` global can be set via the existing "set global variable" action mechanism. No changes needed if the global is properly typed - it will be available in the globals dropdown for rule actions.

---

### Step 5: Add UI for Setting Camera Follow Actor

**File**: `frontend/src/editor/components/inspector/` (relevant inspector component)

Add ability to set the camera follow actor:
- Could be a dropdown in the stage/world inspector
- Could be set via right-click context menu on an actor
- Could be set via a rule action (already supported via globals)

**Minimal approach**: Just allow setting via rule actions using the existing globals system. Users can create a rule that sets `cameraFollow` to an actor.

---

## File Changes Summary

| File | Change |
|------|--------|
| `frontend/src/types.ts` | Add `cameraFollow` to Global union and Globals type |
| `frontend/src/editor/reducers/initial-state.ts` | Add initial `cameraFollow` global state |
| `frontend/src/editor/components/stage/stage.tsx` | Add `centerOnActor()` helper and useEffect for camera follow |

---

## Testing Plan

1. **Basic camera follow**: Set cameraFollow global to an actor ID, verify stage centers on actor during playback
2. **Non-overflowing stage**: Verify camera follow does nothing when stage fits in viewport
3. **Actor movement**: Verify camera smoothly follows actor as it moves each tick
4. **Actor deletion**: Verify graceful handling when followed actor is deleted
5. **Empty value**: Verify no errors when cameraFollow value is empty string
6. **Recording mode**: Verify camera follow doesn't interfere with rule recording

---

## Future Enhancements (Out of Scope)

- Smooth animation/lerping between positions instead of instant snap
- Camera bounds (don't scroll past stage edges)
- Camera zoom to keep multiple actors in view
- Camera shake effects
