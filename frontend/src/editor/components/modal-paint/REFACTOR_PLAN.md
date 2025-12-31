# Paint Editor Model Refactor Plan

## Goal

Extract business logic from React components into a `PaintModel` class to:
1. Eliminate complex ref/callback patterns required by hooks
2. Restore readability comparable to original class component
3. Make business logic testable independent of React
4. Keep React components as thin rendering layers

## Approach

- **Reference**: Original JavaScript for clean imperative patterns
- **Types**: Use existing TypeScript types (PaintState, PixelToolState, etc.)
- **Pattern**: Model holds state, emits changes; React subscribes and renders

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    PaintModel                            │
│  - state: PaintState                                     │
│  - mousedown(pixel, event)                              │
│  - mousemove(pixel)                                      │
│  - mouseup(pixel)                                        │
│  - undo(), redo()                                        │
│  - copy(), cut(), paste()                               │
│  - chooseTool(), setColor(), etc.                       │
│  - subscribe(listener): unsubscribe                     │
└─────────────────────────────────────────────────────────┘
           │ emits changes
           ▼
┌─────────────────────────────────────────────────────────┐
│                 PaintContainer                           │
│  - Creates/holds PaintModel instance                    │
│  - Subscribes to model changes                          │
│  - Renders UI based on model.getState()                 │
│  - Delegates all events to model methods                │
└─────────────────────────────────────────────────────────┘
           │ passes props
           ▼
┌─────────────────────────────────────────────────────────┐
│                   PixelCanvas                            │
│  - Pure rendering component                             │
│  - Handles canvas drawing                               │
│  - Manages mouse event → pixel coordinate translation   │
│  - Calls onMouseDown/Move/Up with pixel coords          │
└─────────────────────────────────────────────────────────┘
```

## Files to Create/Modify

### Phase 1: Create PaintModel

**New file: `paint-model.ts`**

```typescript
import { PaintState, PaintCheckpoint, PixelToolState, getToolState, createCheckpoint } from './types';
import * as Tools from './tools';
import { Point, getFlattenedImageData, ... } from './helpers';

type Listener = () => void;

export class PaintModel {
  private state: PaintState;
  private listeners: Set<Listener> = new Set();

  constructor() {
    this.state = { ...INITIAL_STATE };
  }

  // --- State Access ---
  getState(): PaintState { return this.state; }

  // --- Subscription ---
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit() {
    this.listeners.forEach(l => l());
  }

  private setState(changes: Partial<PaintState>) {
    this.state = { ...this.state, ...changes };
    this.emit();
  }

  private setStateWithCheckpoint(changes: Partial<PaintState>) {
    const checkpoint = createCheckpoint(this.state);
    this.state = {
      ...this.state,
      ...changes,
      redoStack: [],
      undoStack: this.state.undoStack
        .slice(Math.max(0, this.state.undoStack.length - MAX_UNDO_STEPS))
        .concat([checkpoint]),
    };
    this.emit();
  }

  // --- Initialization ---
  loadFromCharacter(character: Character, appearanceId: string) { ... }
  reset() { ... }

  // --- Mouse Events (from original _onCanvasMouseDown, etc.) ---
  mousedown(pixel: Point, event: MouseEvent | React.MouseEvent) {
    const { tool } = this.state;
    if (tool) {
      this.setStateWithCheckpoint(tool.mousedown(pixel, this.state, event));
    }
  }

  mousemove(pixel: Point) {
    const { tool } = this.state;
    if (tool) {
      this.setState(tool.mousemove(pixel, this.state));
    }
  }

  mouseup(pixel: Point) {
    const { tool } = this.state;
    if (tool) {
      this.setState(tool.mouseup(tool.mousemove(pixel, this.state)));
    }
  }

  // --- Undo/Redo ---
  undo() { ... }
  redo() { ... }

  // --- Clipboard ---
  async copy(): Promise<void> { ... }
  cut() { ... }
  async paste(): Promise<void> { ... }

  // --- Tools ---
  chooseTool(tool: PixelTool) { ... }
  setColor(color: string) { ... }
  setToolSize(size: number) { ... }

  // --- Canvas Operations ---
  clearAll() { ... }
  selectAll() { ... }
  updateCanvasSize(dSquaresX, dSquaresY, offsetX, offsetY) { ... }
  applyCoordinateTransform(transform: (p: Point) => Point) { ... }

  // --- Keyboard ---
  handleKeyDown(event: KeyboardEvent) { ... }

  // --- Save ---
  async save(dispatch: Dispatch, characterId: string, ...): Promise<void> { ... }
}
```

### Phase 2: Simplify Container

**Modify: `container.tsx`**

```typescript
const PaintContainer: React.FC = () => {
  const reduxDispatch = useDispatch();

  // Redux selectors (unchanged)
  const { characterId, appearanceId } = useSelector(...);
  const characters = useSelector(...);

  // Create model once
  const modelRef = useRef<PaintModel | null>(null);
  if (!modelRef.current) {
    modelRef.current = new PaintModel();
  }
  const model = modelRef.current;

  // Subscribe to model changes
  const [, forceUpdate] = useReducer(x => x + 1, 0);
  useEffect(() => model.subscribe(forceUpdate), [model]);

  // Load character data when it changes
  useEffect(() => {
    if (character && appearanceId) {
      model.loadFromCharacter(character, appearanceId);
    } else {
      model.reset();
    }
  }, [character, appearanceId, model]);

  // Clipboard events
  useEffect(() => {
    const onCopy = () => model.copy();
    const onCut = () => model.cut();
    const onPaste = () => model.paste();
    document.body.addEventListener('copy', onCopy);
    document.body.addEventListener('cut', onCut);
    document.body.addEventListener('paste', onPaste);
    return () => { /* cleanup */ };
  }, [model]);

  const state = model.getState();

  const handleSave = useCallback(() => {
    model.save(reduxDispatch, characterId, appearanceId, character);
  }, [model, reduxDispatch, characterId, appearanceId, character]);

  return (
    <Modal isOpen={state.imageData !== null}>
      <div tabIndex={0} onKeyDown={(e) => model.handleKeyDown(e.nativeEvent)}>
        {/* ... header with undo/redo buttons calling model.undo(), model.redo() */}

        <PixelCanvas
          state={state}
          onMouseDown={(pixel, e) => model.mousedown(pixel, e)}
          onMouseMove={(pixel) => model.mousemove(pixel)}
          onMouseUp={(pixel) => model.mouseup(pixel)}
        />

        <PixelToolbar
          tool={state.tool}
          onToolChange={(t) => model.chooseTool(t)}
        />

        {/* ... rest of UI */}
      </div>
    </Modal>
  );
};
```

### Phase 3: Simplify PixelCanvas

**Modify: `pixel-canvas.tsx`**

The canvas becomes much simpler - it just:
1. Renders the canvas based on props
2. Translates mouse events to pixel coordinates
3. Manages document-level mouse tracking during drag

```typescript
interface PixelCanvasProps {
  state: PaintState;  // or individual props
  onMouseDown: (pixel: Point, event: React.MouseEvent) => void;
  onMouseMove: (pixel: Point) => void;
  onMouseUp: (pixel: Point) => void;
}

const PixelCanvas: React.FC<PixelCanvasProps> = ({ state, onMouseDown, onMouseMove, onMouseUp }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Pixel coordinate calculation
  const pixelForEvent = useCallback((e: MouseEvent | React.MouseEvent): Point => {
    // ... same logic
  }, [state.pixelSize]);

  // Document-level mouse tracking for drag
  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e: MouseEvent) => onMouseMove(pixelForEvent(e));
    const handleUp = (e: MouseEvent) => {
      onMouseUp(pixelForEvent(e));
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
  }, [isDragging, onMouseMove, onMouseUp, pixelForEvent]);

  const handleMouseDown = (e: React.MouseEvent) => {
    onMouseDown(pixelForEvent(e), e);
    setIsDragging(true);
  };

  // Canvas rendering (unchanged)
  useEffect(() => { renderToCanvas(); }, [/* deps */]);

  return <canvas ref={canvasRef} onMouseDown={handleMouseDown} />;
};
```

## Implementation Order

1. **Create `paint-model.ts`** with core functionality:
   - State management (get/set/checkpoint)
   - Mouse event handlers
   - Undo/redo

2. **Add remaining model methods**:
   - Clipboard operations
   - Tool selection
   - Canvas resize
   - Keyboard handling

3. **Update `container.tsx`**:
   - Create and subscribe to model
   - Replace all business logic with model method calls
   - Remove useReducer, stateRef, complex callbacks

4. **Simplify `pixel-canvas.tsx`**:
   - Remove propsRef pattern
   - Use simple isDragging state for document events
   - Keep rendering logic

5. **Test and verify**:
   - All tools work (pen, eraser, selection, etc.)
   - Undo/redo works
   - Clipboard works
   - Mouse can drag outside canvas
   - No stale state issues

## Benefits After Refactor

| Before (Hooks) | After (Model) |
|----------------|---------------|
| `stateRef.current = state` | `this.state` |
| `propsRef.current = {...}` | `this.props` (via closure) |
| `useCallback(..., [deps])` | Regular methods |
| `dispatch({ type: ... })` | `this.setState(...)` |
| Complex ref gymnastics | Simple imperative code |
| ~400 lines container | ~150 lines container |
| Hard to test | Easy to unit test model |

## Questions to Resolve

1. Should PaintModel handle Redux dispatch for save, or return data for container to dispatch?
   - **Recommendation**: Model returns save data, container dispatches (keeps model Redux-free)

2. Should PixelCanvas receive full state or individual props?
   - **Recommendation**: Individual props for clearer interface, memoization potential

3. Should we keep the existing types.ts or consolidate into paint-model.ts?
   - **Recommendation**: Keep types.ts, import into paint-model.ts
