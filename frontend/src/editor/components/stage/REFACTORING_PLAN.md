# Stage.tsx Refactoring Plan

## Goal
Refactor the 909-line Stage.tsx into smaller, testable hooks without modifying any existing behavior.

## Critical Capture Semantics to Preserve

### The Ref-Based Event Handler Pattern
The current code uses a critical pattern for document event listeners:

```typescript
const onMouseMove = useRef<(event: MouseEvent) => void>();
onMouseMove.current = (event: MouseEvent) => {
  // This function is reassigned every render to capture latest state
  if (selectionRect) { /* uses latest selectionRect */ }
};

const onMouseDown = (event: React.MouseEvent) => {
  document.addEventListener("mousemove", (e) => onMouseMove.current?.(e));
  // The ref indirection allows the document listener to always call the latest function
};
```

**Why this matters:** Document event listeners are created once in `onMouseDown` but need access to state that changes during the drag (like `selectionRect`). The ref indirection solves this.

### State Dependencies by Handler

| Handler | State Read | State Written | Refs Used |
|---------|-----------|---------------|-----------|
| `onMouseDown` | `playback.running`, `selectedToolId` | `selectionRect` | `mouse` |
| `onMouseMove` | `selectionRect`, `selectedToolId`, `stage`, `characters`, `actorSelectionPopover`, `selected` | `selectionRect`, `actorSelectionPopover` | `mouse` |
| `onMouseUp` | `selectionRect`, `selectedToolId`, `stage.actors`, `scale` | `selectionRect` | `mouse` |
| `onMouseUpActor` | `selectedToolId`, `stampToolItem`, `playback.running`, `stage.actors`, `characters`, `selected` | `actorSelectionPopover` | - |
| `onDragOver` | `recordingExtent` | - | `lastFiredExtent` |
| `onDrop` | - | - | - |
| `onDropSprite` | `stage.actors`, `characters`, `recordingExtent` | - | - |
| `onStampAtPosition` | `stampToolItem` | - | - |

### Tool-Specific Behaviors

#### TRASH Tool
- On first click with overlapping actors: show popover
- On drag: delete topmost actor (or selected actors if clicked actor is selected)
- Skip processing if popover is open
- Reset to POINTER after use (unless shift held)

#### STAMP Tool
- If no stampToolItem: clicking actor sets it as stamp source (show popover if overlap)
- If stampToolItem exists: drag creates copies
- Reset to POINTER after use (unless shift held)

#### PAINT Tool
- Click actor: copy its appearance to paint brush (show popover if overlap)
- Reset to POINTER after use

#### RECORD Tool
- Click actor: start recording for that actor (show popover if overlap)
- Reset to POINTER after use

#### POINTER Tool
- Click actor: select it (show popover if overlap)
- Shift+click: toggle in multi-selection
- During playback: record click for game state
- Drag on background: create selection rectangle

#### IGNORE_SQUARE Tool
- Drag: toggle squares as ignored in recording extent

#### ADD_CLICK_CONDITION Tool
- Click actor: add click condition for that actor

---

## Phase 1: Characterization Tests

Before any refactoring, write tests that capture current behavior. These tests will:
1. Verify the exact sequence of Redux actions dispatched
2. Verify state changes (selectionRect, popover)
3. Cover edge cases (shift key, overlapping actors, playback mode)

### Test File: `stage.test.tsx`

```typescript
describe('Stage mouse interactions', () => {
  describe('POINTER tool', () => {
    it('selects actor on click');
    it('shows popover when clicking overlapping actors');
    it('creates selection rectangle when dragging on background');
    it('selects all actors in rectangle on mouse up');
    it('toggles actor in selection with shift+click');
    it('records click during playback mode');
  });

  describe('TRASH tool', () => {
    it('deletes single actor on click');
    it('shows popover when clicking overlapping actors');
    it('deletes topmost actor on drag');
    it('deletes all selected actors if clicked actor is selected');
    it('skips processing when popover is open');
    it('resets to POINTER after delete');
    it('stays on TRASH when shift held');
  });

  describe('STAMP tool', () => {
    it('sets clicked actor as stamp source when no stampToolItem');
    it('shows popover when clicking overlapping actors for source');
    it('creates copies on drag when stampToolItem set');
    it('resets to POINTER after stamping');
  });

  // ... etc for each tool
});

describe('Stage drag and drop', () => {
  it('moves actors on drop');
  it('copies actors on alt+drop');
  it('creates new actor when dropping character from library');
  it('prevents drop outside recording extent');
  it('updates recording extent handles on drag');
});

describe('Stage keyboard', () => {
  it('records key presses during playback');
  it('deletes selected actors on Delete/Backspace');
  it('selects all actors with Cmd/Ctrl+A');
});
```

---

## Phase 2: Extract Utility Hooks (No Behavior Change)

### 2.1 `useStageCoordinates`
Pure coordinate transformation - no state, no side effects.

```typescript
// hooks/useStageCoordinates.ts
export function useStageCoordinates(
  stageElRef: React.RefObject<HTMLDivElement>,
  scale: number
) {
  const getPxOffsetForEvent = useCallback(
    (event: MouseEvent | React.MouseEvent | React.DragEvent) => {
      const stageOffset = stageElRef.current!.getBoundingClientRect();
      return {
        left: event.clientX - stageOffset.left,
        top: event.clientY - stageOffset.top
      };
    },
    [] // stageElRef is stable
  );

  const getPositionForEvent = useCallback(
    (event: MouseEvent | React.MouseEvent | React.DragEvent): Position => {
      const dragOffset =
        "dataTransfer" in event && event.dataTransfer?.getData("drag-offset");
      const halfOffset = { dragTop: STAGE_CELL_SIZE / 2, dragLeft: STAGE_CELL_SIZE / 2 };
      const { dragLeft, dragTop } = dragOffset ? JSON.parse(dragOffset) : halfOffset;

      const px = getPxOffsetForEvent(event);
      return {
        x: Math.round((px.left - dragLeft) / STAGE_CELL_SIZE / scale),
        y: Math.round((px.top - dragTop) / STAGE_CELL_SIZE / scale),
      };
    },
    [getPxOffsetForEvent, scale]
  );

  return { getPxOffsetForEvent, getPositionForEvent };
}
```

**Verification:** Functions are pure, return same values for same inputs.

### 2.2 `useStageZoom`
Manages scale state and window resize listener.

```typescript
// hooks/useStageZoom.ts
export function useStageZoom(
  scrollElRef: React.RefObject<HTMLDivElement>,
  stageElRef: React.RefObject<HTMLDivElement>,
  stage: { width: number; height: number; scale?: number | "fit" },
  recordingCentered?: boolean
): number {
  const [scale, setScale] = useState(
    stage.scale && typeof stage.scale === "number" ? stage.scale : 1
  );

  useEffect(() => {
    const autofit = () => {
      const scrollEl = scrollElRef.current;
      const stageEl = stageElRef.current;
      if (!scrollEl || !stageEl) return;

      if (recordingCentered) {
        setScale(1);
      } else if (stage.scale === "fit") {
        stageEl.style.zoom = "1";
        const fit = Math.min(
          scrollEl.clientWidth / (stage.width * STAGE_CELL_SIZE),
          scrollEl.clientHeight / (stage.height * STAGE_CELL_SIZE)
        );
        const best = STAGE_ZOOM_STEPS.find((z) => z <= fit) || fit;
        stageEl.style.zoom = `${best}`;
        setScale(best);
      } else {
        setScale(stage.scale ?? 1);
      }
    };

    window.addEventListener("resize", autofit);
    autofit();
    return () => window.removeEventListener("resize", autofit);
  }, [stage.height, stage.scale, stage.width, recordingCentered, scrollElRef, stageElRef]);

  return scale;
}
```

**Verification:** Scale updates on resize, respects stage.scale prop.

---

## Phase 3: Extract State Management Hooks

### 3.1 `useStageSelection`
Manages selection rectangle state.

```typescript
// hooks/useStageSelection.ts
export function useStageSelection() {
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null);

  const startSelection = useCallback((startPx: { left: number; top: number }) => {
    setSelectionRect({ start: startPx, end: startPx });
  }, []);

  const updateSelection = useCallback((endPx: { left: number; top: number }) => {
    setSelectionRect((prev) => prev ? { ...prev, end: endPx } : null);
  }, []);

  const finishSelection = useCallback(
    (
      scale: number,
      actors: { [id: string]: Actor },
      onSelect: (characterId: string | null, actorIds: string[]) => void
    ) => {
      if (!selectionRect) return;

      const [minLeft, maxLeft] = [selectionRect.start.left, selectionRect.end.left].sort((a, b) => a - b);
      const [minTop, maxTop] = [selectionRect.start.top, selectionRect.end.top].sort((a, b) => a - b);

      const min = {
        x: Math.floor(minLeft / STAGE_CELL_SIZE / scale),
        y: Math.floor(minTop / STAGE_CELL_SIZE / scale),
      };
      const max = {
        x: Math.floor(maxLeft / STAGE_CELL_SIZE / scale),
        y: Math.floor(maxTop / STAGE_CELL_SIZE / scale),
      };

      const selectedActors = Object.values(actors).filter(
        (actor) =>
          actor.position.x >= min.x &&
          actor.position.x <= max.x &&
          actor.position.y >= min.y &&
          actor.position.y <= max.y
      );

      const characterId =
        selectedActors.length &&
        selectedActors.every((a) => a.characterId === selectedActors[0].characterId)
          ? selectedActors[0].characterId
          : null;

      onSelect(characterId, selectedActors.map((a) => a.id));
      setSelectionRect(null);
    },
    [selectionRect]
  );

  const cancelSelection = useCallback(() => {
    setSelectionRect(null);
  }, []);

  return {
    selectionRect,
    startSelection,
    updateSelection,
    finishSelection,
    cancelSelection,
  };
}
```

### 3.2 `useStagePopover`
Manages actor selection popover state.

```typescript
// hooks/useStagePopover.ts
export interface PopoverState {
  actors: Actor[];
  position: { x: number; y: number };
  toolId: string;
}

export function useStagePopover() {
  const [popover, setPopover] = useState<PopoverState | null>(null);

  const showPopover = useCallback(
    (actors: Actor[], position: { x: number; y: number }, toolId: string) => {
      setPopover({ actors, position, toolId });
    },
    []
  );

  const closePopover = useCallback(() => {
    setPopover(null);
  }, []);

  return { popover, showPopover, closePopover };
}
```

---

## Phase 4: Tool Behavior Strategy Pattern

### 4.1 `tool-behaviors.ts`

Define tool behaviors declaratively. This is the key abstraction that simplifies the event handlers.

```typescript
// tools/tool-behaviors.ts
export interface ToolContext {
  // Redux
  dispatch: AppDispatch;

  // Props/State
  stage: StageType;
  world: WorldMinimal;
  characters: Characters;
  recordingExtent?: RuleExtent;

  // Derived
  selected: Actor[];
  selFor: (actorIds: string[]) => ActorSelection;

  // UI State
  stampToolItem: UIState["stampToolItem"];
  playback: UIState["playback"];

  // Popover control (for showing overlap popover)
  showPopover: (actors: Actor[], clientPos: { x: number; y: number }) => void;
  isPopoverOpen: boolean;
}

export interface ToolBehavior {
  /**
   * Called when clicking on an actor. Return true if handled.
   */
  onActorClick?: (
    actor: Actor,
    event: React.MouseEvent,
    ctx: ToolContext
  ) => boolean;

  /**
   * Called when dragging across a grid position.
   * Only called once per position per drag operation.
   */
  onDragPosition?: (
    position: Position,
    isFirstPosition: boolean,
    event: MouseEvent,
    ctx: ToolContext
  ) => void;

  /**
   * If true, shows popover when clicking overlapping actors.
   * The selected actor from popover is passed to onActorClick.
   */
  showPopoverOnOverlap?: boolean;

  /**
   * If true, tool resets to POINTER after use (unless shift held).
   */
  resetAfterUse?: boolean;
}
```

### 4.2 Implement Each Tool

```typescript
export const TOOL_BEHAVIORS: Partial<Record<TOOLS, ToolBehavior>> = {
  [TOOLS.POINTER]: {
    showPopoverOnOverlap: true,
    onActorClick: (actor, event, ctx) => {
      if (ctx.playback.running) {
        ctx.dispatch(recordClickForGameState(ctx.world.id, actor.id));
        return true;
      }

      if (event.shiftKey) {
        const selectedIds = ctx.selected.map((a) => a.id);
        const newIds = selectedIds.includes(actor.id)
          ? selectedIds.filter((id) => id !== actor.id)
          : [...selectedIds, actor.id];
        ctx.dispatch(select(actor.characterId, ctx.selFor(newIds)));
      } else {
        ctx.dispatch(select(actor.characterId, ctx.selFor([actor.id])));
      }
      return true;
    },
  },

  [TOOLS.TRASH]: {
    showPopoverOnOverlap: true,
    resetAfterUse: true,
    onActorClick: (actor, _event, ctx) => {
      const selectedIds = ctx.selected.map((a) => a.id);
      if (selectedIds.includes(actor.id)) {
        ctx.dispatch(deleteActors(ctx.selFor(selectedIds)));
      } else {
        ctx.dispatch(deleteActors(ctx.selFor([actor.id])));
      }
      return true;
    },
    onDragPosition: (position, isFirstPosition, event, ctx) => {
      // Skip if popover open
      if (ctx.isPopoverOpen) return;

      const overlapping = actorsAtPoint(ctx.stage.actors, ctx.characters, position);

      // On first position with overlap, show popover instead of deleting
      if (isFirstPosition && overlapping.length > 1) {
        ctx.showPopover(overlapping, { x: event.clientX, y: event.clientY });
        return;
      }

      const actor = overlapping[overlapping.length - 1];
      if (!actor) return;

      const selectedIds = ctx.selected.map((a) => a.id);
      if (selectedIds.includes(actor.id)) {
        ctx.dispatch(deleteActors(ctx.selFor(selectedIds)));
      } else {
        ctx.dispatch(deleteActors(ctx.selFor([actor.id])));
      }
    },
  },

  [TOOLS.STAMP]: {
    showPopoverOnOverlap: true,
    resetAfterUse: true,
    onActorClick: (actor, _event, ctx) => {
      if (!ctx.stampToolItem) {
        ctx.dispatch(selectToolItem(ctx.selFor([actor.id])));
        return true;
      }
      return false;
    },
    onDragPosition: (position, _isFirst, _event, ctx) => {
      if (!ctx.stampToolItem) return;

      if ("actorIds" in ctx.stampToolItem) {
        const ids = {
          actorIds: ctx.stampToolItem.actorIds,
          dragAnchorActorId: ctx.stampToolItem.actorIds[0],
        };
        // Call existing drop logic
        onDropActorsAtPosition(ids, position, "stamp-copy", ctx);
      } else if ("characterId" in ctx.stampToolItem) {
        onDropCharacterAtPosition(ctx.stampToolItem, position, ctx);
      }
    },
  },

  [TOOLS.PAINT]: {
    showPopoverOnOverlap: true,
    resetAfterUse: true,
    onActorClick: (actor, _event, ctx) => {
      ctx.dispatch(paintCharacterAppearance(actor.characterId, actor.appearance));
      return true;
    },
  },

  [TOOLS.RECORD]: {
    showPopoverOnOverlap: true,
    resetAfterUse: true,
    onActorClick: (actor, _event, ctx) => {
      ctx.dispatch(setupRecordingForActor({ characterId: actor.characterId, actor }));
      ctx.dispatch(selectToolId(TOOLS.POINTER));
      return true;
    },
  },

  [TOOLS.ADD_CLICK_CONDITION]: {
    showPopoverOnOverlap: true,
    resetAfterUse: true,
    onActorClick: (actor, _event, ctx) => {
      ctx.dispatch(
        upsertRecordingCondition({
          key: makeId("condition"),
          left: { globalId: "click" },
          right: { constant: actor.id },
          comparator: "=",
          enabled: true,
        })
      );
      ctx.dispatch(selectToolId(TOOLS.POINTER));
      return true;
    },
  },

  [TOOLS.IGNORE_SQUARE]: {
    onDragPosition: (position, _isFirst, _event, ctx) => {
      ctx.dispatch(toggleSquareIgnored(position));
    },
  },
};
```

---

## Phase 5: Extract Mouse Handler Hook

### 5.1 `useStageMouseHandlers`

This is the most complex hook because it needs to:
1. Maintain the ref-based pattern for document listeners
2. Coordinate with selection and popover hooks
3. Delegate to tool behaviors

```typescript
// hooks/useStageMouseHandlers.ts
export function useStageMouseHandlers(
  stageElRef: React.RefObject<HTMLDivElement>,
  coords: ReturnType<typeof useStageCoordinates>,
  selection: ReturnType<typeof useStageSelection>,
  popover: ReturnType<typeof useStagePopover>,
  toolContext: ToolContext,
  selectedToolId: TOOLS,
  stage: StageType,
  scale: number
) {
  const mouse = useRef<{ isDown: boolean; visited: { [key: string]: true } }>({
    isDown: false,
    visited: {},
  });

  const behavior = TOOL_BEHAVIORS[selectedToolId];

  // ============================================================
  // CRITICAL: These refs are reassigned every render to capture
  // the latest state. Document event listeners call through the
  // ref to get current behavior.
  // ============================================================

  const onMouseMoveRef = useRef<(event: MouseEvent) => void>();
  onMouseMoveRef.current = (event: MouseEvent) => {
    if (!mouse.current.isDown) return;

    // Selection rectangle mode
    if (selection.selectionRect) {
      selection.updateSelection(coords.getPxOffsetForEvent(event));
      return;
    }

    // Tool drag mode
    if (!behavior?.onDragPosition) return;

    const pos = coords.getPositionForEvent(event);
    if (pos.x < 0 || pos.x >= stage.width || pos.y < 0 || pos.y >= stage.height) {
      return;
    }

    const posKey = `${pos.x},${pos.y}`;
    if (mouse.current.visited[posKey]) return;

    const isFirstPosition = Object.keys(mouse.current.visited).length === 0;
    mouse.current.visited[posKey] = true;

    behavior.onDragPosition(pos, isFirstPosition, event, toolContext);
  };

  const onMouseUpRef = useRef<(event: MouseEvent) => void>();
  onMouseUpRef.current = (event: MouseEvent) => {
    // Process final position as a move
    onMouseMoveRef.current?.(event);

    mouse.current = { isDown: false, visited: {} };

    // Finish selection rectangle
    if (selection.selectionRect) {
      selection.finishSelection(scale, stage.actors, (characterId, actorIds) => {
        toolContext.dispatch(select(characterId, toolContext.selFor(actorIds)));
      });
    }

    // Auto-reset tool
    if (!event.shiftKey && behavior?.resetAfterUse) {
      toolContext.dispatch(selectToolId(TOOLS.POINTER));
    }
  };

  const onMouseDown = useCallback(
    (event: React.MouseEvent) => {
      if (toolContext.playback.running) return;

      // Setup document listeners with cleanup
      const onMouseUpAnywhere = (e: MouseEvent) => {
        document.removeEventListener("mouseup", onMouseUpAnywhere);
        document.removeEventListener("mousemove", onMouseMoveAnywhere);
        onMouseUpRef.current?.(e);
      };
      const onMouseMoveAnywhere = (e: MouseEvent) => {
        onMouseMoveRef.current?.(e);
      };
      document.addEventListener("mouseup", onMouseUpAnywhere);
      document.addEventListener("mousemove", onMouseMoveAnywhere);

      mouse.current = { isDown: true, visited: {} };

      // Start selection rectangle for pointer tool on background
      const isClickOnBackground = event.target === event.currentTarget;
      if (selectedToolId === TOOLS.POINTER && isClickOnBackground) {
        selection.startSelection(coords.getPxOffsetForEvent(event));
      } else {
        selection.cancelSelection();
      }
    },
    [toolContext.playback.running, selectedToolId, selection, coords]
  );

  const onActorMouseUp = useCallback(
    (actor: Actor, event: React.MouseEvent) => {
      if (!behavior) return;

      // Check for overlapping actors
      if (behavior.showPopoverOnOverlap) {
        const overlapping = actorsAtPoint(
          stage.actors,
          toolContext.characters,
          actor.position
        );
        if (overlapping.length > 1) {
          popover.showPopover(overlapping, { x: event.clientX, y: event.clientY }, selectedToolId);
          event.preventDefault();
          event.stopPropagation();
          return;
        }
      }

      // Delegate to tool behavior
      const handled = behavior.onActorClick?.(actor, event, toolContext);
      if (handled) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    [behavior, stage.actors, toolContext, popover, selectedToolId]
  );

  return {
    onMouseDown,
    onActorMouseUp,
  };
}
```

---

## Phase 6: Integration

### 6.1 Simplified Stage Component

```typescript
export const Stage = ({
  stage,
  world,
  recordingExtent,
  recordingCentered,
  evaluatedSquares,
  readonly,
  style,
}: StageProps) => {
  const dispatch = useDispatch();
  const scrollElRef = useRef<HTMLDivElement>(null);
  const stageElRef = useRef<HTMLDivElement>(null);

  // Redux state
  const characters = useSelector((state: EditorState) => state.characters);
  const { selectedActors, selectedToolId, stampToolItem, playback } = useSelector(
    (state: EditorState) => ({
      selectedActors: state.ui.selectedActors,
      selectedToolId: state.ui.selectedToolId,
      stampToolItem: state.ui.stampToolItem,
      playback: state.ui.playback,
    })
  );

  // Derived state
  const selected = useMemo(
    () =>
      selectedActors?.worldId === world.id && selectedActors?.stageId === stage.id
        ? selectedActors.actorIds.map((id) => stage.actors[id]).filter(Boolean)
        : [],
    [selectedActors, world.id, stage.id, stage.actors]
  );

  const selFor = useCallback(
    (actorIds: string[]) => buildActorSelection(world.id, stage.id, actorIds),
    [world.id, stage.id]
  );

  // Hooks
  const scale = useStageZoom(scrollElRef, stageElRef, stage, recordingCentered);
  const coords = useStageCoordinates(stageElRef, scale);
  const selection = useStageSelection();
  const popoverHook = useStagePopover();

  // Build tool context
  const toolContext: ToolContext = useMemo(
    () => ({
      dispatch,
      stage,
      world,
      characters,
      recordingExtent,
      selected,
      selFor,
      stampToolItem,
      playback,
      showPopover: (actors, pos) => popoverHook.showPopover(actors, pos, selectedToolId),
      isPopoverOpen: !!popoverHook.popover,
    }),
    [dispatch, stage, world, characters, recordingExtent, selected, selFor, stampToolItem, playback, popoverHook, selectedToolId]
  );

  const mouseHandlers = useStageMouseHandlers(
    stageElRef,
    coords,
    selection,
    popoverHook,
    toolContext,
    selectedToolId,
    stage,
    scale
  );

  const dragDropHandlers = useStageDragDrop(stageElRef, coords, toolContext, recordingExtent);
  const keyboardHandlers = useStageKeyboard(stageElRef, stage, world, selected, selFor, playback, dispatch);

  // ... rest of render logic (mostly unchanged)
};
```

---

## Verification Checklist

For each extracted hook, verify:

- [ ] All state dependencies are correctly captured
- [ ] Ref-based handlers are reassigned every render
- [ ] Document event listeners are properly cleaned up
- [ ] Tool behaviors match exactly (compare action sequences)
- [ ] Edge cases work: shift key, overlapping actors, playback mode
- [ ] No regressions in drag and drop
- [ ] Selection rectangle works correctly
- [ ] Popover shows and selects correctly

---

## File Structure After Refactoring

```
frontend/src/editor/components/stage/
├── stage.tsx                    # Main component (~200 lines)
├── hooks/
│   ├── useStageCoordinates.ts   # Coordinate transforms
│   ├── useStageZoom.ts          # Scale/fit management
│   ├── useStageSelection.ts     # Selection rectangle
│   ├── useStagePopover.ts       # Actor selection popover
│   ├── useStageMouseHandlers.ts # Mouse event handling
│   ├── useStageDragDrop.ts      # Drag and drop
│   └── useStageKeyboard.ts      # Keyboard handling
├── tools/
│   └── tool-behaviors.ts        # Tool strategy pattern
├── container.tsx
├── stage-controls.tsx
└── ... (other existing files)
```

---

## Risk Mitigation

1. **Write tests first** - Lock in current behavior before any changes
2. **Extract one hook at a time** - Verify after each extraction
3. **Keep original code commented** - Easy to compare and revert
4. **Test each tool individually** - Don't assume if one works, all work
5. **Test keyboard modifiers** - Shift, Alt, Ctrl have specific meanings
