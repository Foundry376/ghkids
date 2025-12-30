# Appearance Editor TypeScript Conversion Plan

## Overview
Convert the appearance editor (modal-paint) from JavaScript class components with PropTypes and `connect()` to TypeScript functional components using `useSelector`/`useDispatch` hooks, following the pattern established in `container-pane-rules.tsx`.

## Files to Convert (9 total)

### Phase 1: Type Definitions & Utilities (Foundation)
These files have no React components and are dependencies for everything else.

1. **`helpers.js` → `helpers.ts`**
   - Add TypeScript types for all functions
   - Define `Point`, `PixelCallback` types
   - Export helper function signatures with proper types

2. **`create-pixel-image-data.js` → `create-pixel-image-data.ts`**
   - Define `PixelImageData` interface extending ImageData
   - Type all methods: `clone()`, `fillPixel()`, `getPixel()`, etc.
   - Use TypeScript module augmentation or interface approach

3. **`create-pixel-context.js` → `create-pixel-context.ts`**
   - Define `PixelContext` interface extending CanvasRenderingContext2D
   - Type all methods: `fillPixel()`, `drawGrid()`, `drawTransparentPattern()`, etc.

4. **`tools.js` → `tools.ts`**
   - Define `PixelToolState` interface for the state shape tools work with
   - Define `PixelInteraction` interface for interaction tracking
   - Convert all tool classes with proper typed methods
   - Export `PixelTool` as a proper TypeScript class

### Phase 2: Simple Components (Presentational)
Convert simpler components first as they have fewer dependencies.

5. **`pixel-color-picker.jsx` → `pixel-color-picker.tsx`**
   - Convert class to functional component
   - Define `PixelColorPickerProps` interface
   - Export `ColorOptions` with proper type

6. **`sprite-variables-panel.jsx` → `sprite-variables-panel.tsx`**
   - Convert class to functional component
   - Define `SpriteVariablesPanelProps` interface
   - Use `Character`, `Actor` types from types.ts

7. **`variable-overlay.jsx` → `variable-overlay.tsx`**
   - Convert class to functional component
   - Define `VariableOverlayProps` interface
   - Use existing types for character/actor

### Phase 3: Complex Components

8. **`pixel-canvas.jsx` → `pixel-canvas.tsx`**
   - Convert class to functional component with `useRef`, `useEffect`
   - Define `PixelCanvasProps` interface
   - Handle canvas ref and context typing
   - Type all event handlers

9. **`container.jsx` → `container.tsx`** (Main component)
   - Convert from `connect()` to `useSelector`/`useDispatch` hooks
   - Convert class to functional component
   - Define `PaintContainerState` interface for local state
   - Define `PaintEditorCheckpoint` interface for undo/redo
   - Use proper Redux state selectors
   - Handle all keyboard/clipboard events with proper typing

## Type Definitions to Create

```typescript
// In a new file: types.ts (within modal-paint) or add to existing types.ts

// Point type for pixel coordinates
interface Point {
  x: number;
  y: number;
}

// Interaction state during tool usage
interface PixelInteraction {
  s: Point | null;  // start point
  e: Point | null;  // end point
  points: Point[];
}

// Extended ImageData with helper methods
interface PixelImageData extends ImageData {
  clone(): PixelImageData;
  fillPixel(x: number, y: number): void;
  fillPixelRGBA(x: number, y: number, r: number, g: number, b: number, a: number): void;
  fillToolSize(x: number, y: number, size: number): void;
  getPixel(x: number, y: number): [number, number, number, number];
  clearPixelsInRect(startX: number, startY: number, endX: number, endY: number): void;
  getContiguousPixels(startPixel: Point, callback?: (p: Point) => void): Record<string, boolean>;
  getOpaquePixels(): Record<string, boolean>;
  maskUsingPixels(mask: Record<string, boolean>): void;
  applyPixelsFromData(
    imageData: ImageData,
    startX: number, startY: number,
    endX: number, endY: number,
    offsetX: number, offsetY: number,
    options?: { ignoreClearPixels?: boolean }
  ): void;
  fillStyle: string;
}

// Extended canvas context
interface PixelContext extends CanvasRenderingContext2D {
  fillPixel(x: number, y: number): void;
  fillToolSize(x: number, y: number, size: number): void;
  clearPixel(x: number, y: number): void;
  getPixelExtent(): { xMax: number; yMax: number };
  getPixelSize(): number;
  drawTransparentPattern(): void;
  drawGrid(): void;
  applyPixelsFromData(
    imageData: ImageData,
    startX: number, startY: number,
    endX: number, endY: number,
    offsetX: number, offsetY: number,
    options?: { ignoreClearPixels?: boolean }
  ): void;
}

// State managed by the paint container
interface PaintEditorState {
  color: string;
  tool: PixelTool;
  toolSize: number;
  pixelSize: number;
  anchorSquare: Point;
  imageData: PixelImageData | null;
  selectionImageData: PixelImageData | null;
  selectionOffset: Point;
  undoStack: PaintCheckpoint[];
  redoStack: PaintCheckpoint[];
  interaction: PixelInteraction;
  interactionPixels: Record<string, boolean> | null;
  showVariables: boolean;
  visibleVariables: Record<string, boolean>;
  isGeneratingSprite: boolean;
  spriteDescription?: string;
  dropdownOpen?: boolean;
}

interface PaintCheckpoint {
  imageData: PixelImageData | null;
  selectionImageData: PixelImageData | null;
  selectionOffset: Point;
}

// Anchor square info for sprites larger than 40x40
interface AnchorSquare {
  x: number;
  y: number;
}

// Variable overlay configuration
interface VariableOverlayConfig {
  showVariables: boolean;
  visibleVariables: Record<string, boolean>;
}
```

## Key Pattern Changes

### Before (class component with connect):
```javascript
class Container extends React.Component {
  static propTypes = { ... };

  constructor(props, context) {
    super(props, context);
    this.state = { ... };
  }

  componentDidMount() { ... }

  render() { ... }
}

export default connect(mapStateToProps)(Container);
```

### After (functional component with hooks):
```typescript
interface PaintContainerProps {
  // props from parent, if any
}

const PaintContainer: React.FC<PaintContainerProps> = () => {
  const dispatch = useDispatch();
  const { characterId, appearanceId } = useSelector<EditorState, UIState['paint']>(
    (state) => state.ui.paint
  );
  const characters = useSelector<EditorState, Characters>((state) => state.characters);

  const [state, setState] = useState<PaintEditorState>(INITIAL_STATE);

  useEffect(() => {
    // componentDidMount logic
  }, []);

  return ( ... );
};

export default PaintContainer;
```

## Conversion Order (Recommended)

1. `helpers.ts` - No dependencies, pure functions
2. `create-pixel-image-data.ts` - Depends on helpers
3. `create-pixel-context.ts` - Standalone
4. `tools.ts` - Depends on helpers, create-pixel-image-data
5. `pixel-color-picker.tsx` - Depends on helpers
6. `sprite-variables-panel.tsx` - Standalone presentational
7. `variable-overlay.tsx` - Standalone presentational
8. `pixel-canvas.tsx` - Depends on create-pixel-context, helpers
9. `container.tsx` - Depends on all above

## Notes

- The existing `pixel-toolbar.tsx` and `pixel-tool-size.tsx` are already TypeScript - they can serve as reference patterns
- Import `PixelTool` class in toolbar files already works - we just need to export proper types from tools.ts
- The `create-pixel-image-data.js` and `create-pixel-context.js` use the `this` pattern to extend native objects - this will need careful typing
- Container's state is complex with undo/redo stacks - consider using useReducer instead of useState for cleaner state management
