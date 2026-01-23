import { makeRequest } from "../../../helpers/api";
import { Character } from "../../../types";
import CreatePixelImageData from "./create-pixel-image-data";
import {
  getBlobFromImageData,
  getDataURLFromImageData,
  getFilledSquares,
  getFlattenedImageData,
  getImageDataFromDataURL,
  getImageDataWithNewFrame,
  Point,
} from "./helpers";
import { ColorOptions } from "./pixel-color-picker";
import * as Tools from "./tools";
import { PixelImageData, PixelInteraction } from "./types";

const MAX_UNDO_STEPS = 30;

const TOOLS_LIST: Tools.PixelTool[] = [
  new Tools.PixelPenTool(),
  new Tools.PixelLineTool(),
  new Tools.PixelEraserTool(),
  new Tools.PixelFillRectTool(),
  new Tools.PixelFillEllipseTool(),
  new Tools.PixelPaintbucketTool(),
  new Tools.PixelRectSelectionTool(),
  new Tools.PixelMagicSelectionTool(),
  new Tools.EyedropperTool(),
];

export { TOOLS_LIST };

const DEFAULT_TOOL = TOOLS_LIST.find((t) => t.name === "pen") ?? TOOLS_LIST[0];

export interface PaintCheckpoint {
  imageData: PixelImageData | null;
  selectionImageData: PixelImageData | null;
  selectionOffset: Point;
}

export interface PaintState {
  color: string;
  tool: Tools.PixelTool;
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
  spriteDescription: string;
  dropdownOpen: boolean;
  spriteName: string;
}

const INITIAL_STATE: PaintState = {
  color: ColorOptions[3],
  tool: DEFAULT_TOOL,
  toolSize: 1,
  pixelSize: 11,
  anchorSquare: { x: 0, y: 0 },
  imageData: null,
  selectionImageData: null,
  selectionOffset: { x: 0, y: 0 },
  undoStack: [],
  redoStack: [],
  interaction: { s: null, e: null, points: [] },
  interactionPixels: null,
  showVariables: false,
  visibleVariables: {},
  isGeneratingSprite: false,
  spriteDescription: "",
  dropdownOpen: false,
  spriteName: "",
};

function pixelSizeToFit(imageData: ImageData): number {
  return Math.max(
    1,
    Math.min(Math.floor(455 / imageData.width), Math.floor(455 / imageData.height))
  );
}

type Listener = () => void;

/**
 * PaintModel encapsulates all business logic for the paint editor.
 * The React component subscribes to changes and renders based on getState().
 */
export class PaintModel {
  private state: PaintState;
  private listeners: Set<Listener> = new Set();

  constructor() {
    this.state = { ...INITIAL_STATE };
  }

  // --- State Access ---

  getState(): PaintState {
    return this.state;
  }

  // --- Subscription ---

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    this.listeners.forEach((l) => l());
  }

  private setState(changes: Partial<PaintState>): void {
    this.state = { ...this.state, ...changes };
    this.emit();
  }

  private getCheckpoint(): PaintCheckpoint {
    return {
      imageData: this.state.imageData,
      selectionImageData: this.state.selectionImageData,
      selectionOffset: this.state.selectionOffset,
    };
  }

  private setStateWithCheckpoint(changes: Partial<PaintState>): void {
    const checkpoint = this.getCheckpoint();
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

  loadFromCharacter(character: Character, appearanceId: string): void {
    const { appearances, appearanceInfo } = character.spritesheet;
    const anchorSquare = appearanceInfo?.[appearanceId]?.anchor || { x: 0, y: 0 };
    const frameDataURL = appearances[appearanceId]?.[0];

    if (!frameDataURL) return;

    const variableOverlay = appearanceInfo?.[appearanceId]?.variableOverlay || {
      showVariables: false,
      visibleVariables: {},
    };

    getImageDataFromDataURL(frameDataURL, {}, (imageData) => {
      CreatePixelImageData.call(imageData as PixelImageData);
      this.state = {
        ...INITIAL_STATE,
        imageData: imageData as PixelImageData,
        anchorSquare,
        pixelSize: pixelSizeToFit(imageData),
        showVariables: variableOverlay.showVariables,
        visibleVariables: variableOverlay.visibleVariables,
      };
      this.emit();
    });
  }

  reset(): void {
    this.state = { ...INITIAL_STATE };
    this.emit();
  }

  // --- Mouse Events ---

  mousedown(pixel: Point, event: MouseEvent | React.MouseEvent): void {
    const { tool } = this.state;
    if (tool) {
      this.setStateWithCheckpoint(tool.mousedown(pixel, this.state, event));
    }
  }

  mousemove(pixel: Point): void {
    const { tool } = this.state;
    if (tool) {
      this.setState(tool.mousemove(pixel, this.state));
    }
  }

  mouseup(pixel: Point): void {
    const { tool } = this.state;
    if (tool) {
      const movedState = { ...this.state, ...tool.mousemove(pixel, this.state) };
      this.setState(tool.mouseup(movedState) as Partial<PaintState>);
    }
  }

  // --- Undo/Redo ---

  undo(): void {
    const undoStack = [...this.state.undoStack];
    const changes = undoStack.pop();
    if (!changes) return;

    const redoStack = [...this.state.redoStack, this.getCheckpoint()];
    this.state = { ...this.state, ...changes, redoStack, undoStack };
    this.emit();
  }

  redo(): void {
    const redoStack = [...this.state.redoStack];
    const changes = redoStack.pop();
    if (!changes) return;

    const undoStack = [...this.state.undoStack, this.getCheckpoint()];
    this.state = { ...this.state, ...changes, redoStack, undoStack };
    this.emit();
  }

  // --- Clipboard ---

  async copy(): Promise<void> {
    if (this.state.imageData === null) return;

    const data: Record<string, Blob | string> = {
      "text/plain": JSON.stringify(this.state.selectionOffset),
    };

    const blob = await getBlobFromImageData(this.state.selectionImageData);
    if (blob) {
      data["image/png"] = blob;
    }

    try {
      const clipboardItem = new ClipboardItem(data as Record<string, Blob>);
      await navigator.clipboard.write([clipboardItem]);
    } catch (err) {
      console.error(err);
    }
  }

  cut(): void {
    if (this.state.imageData === null) return;
    this.copy();
    this.setStateWithCheckpoint({ selectionImageData: null });
  }

  async paste(): Promise<void> {
    if (this.state.imageData === null) return;

    let items: ClipboardItems;
    try {
      items = await navigator.clipboard.read();
    } catch (err) {
      alert(
        `Codako doesn't have permission to view your clipboard. ` +
          `Please grant permission in your browser and try again!`
      );
      return;
    }

    const imageItem = items.find((i) => i.types.some((t) => t.includes("image")));
    const offsetItem = items.find((d) => d.types.includes("text/plain"));

    let offset: Point | null = null;
    try {
      if (offsetItem) {
        const blob = await offsetItem.getType("text/plain");
        const text = await blob.text();
        offset = JSON.parse(text);
      }
    } catch {
      // not our data
    }

    let image: Blob | null = null;
    if (imageItem) {
      image = await imageItem.getType("image/png");
    }

    if (image) {
      this.applyExternalDataURL(URL.createObjectURL(image), offset);
    }
  }

  // --- Tools ---

  chooseTool(tool: Tools.PixelTool): void {
    this.setState({
      tool,
      imageData: getFlattenedImageData(this.state),
      selectionImageData: null,
    });
  }

  setColor(color: string): void {
    this.setState({ color });
  }

  setToolSize(toolSize: number): void {
    this.setState({ toolSize });
  }

  setPixelSize(pixelSize: number): void {
    this.setState({ pixelSize });
  }

  // --- Selection Operations ---

  clearAll(): void {
    if (!this.state.imageData) return;
    const empty = this.state.imageData.clone();
    empty.clearPixelsInRect(0, 0, empty.width, empty.height);
    this.setStateWithCheckpoint({
      spriteName: "",
      imageData: empty,
      selectionOffset: { x: 0, y: 0 },
      selectionImageData: null,
    });
  }

  selectAll(): void {
    if (!this.state.imageData) return;
    const empty = this.state.imageData.clone();
    empty.clearPixelsInRect(0, 0, empty.width, empty.height);
    this.setStateWithCheckpoint({
      imageData: empty,
      selectionOffset: { x: 0, y: 0 },
      selectionImageData: getFlattenedImageData(this.state),
    });
  }

  clearSelection(): void {
    this.setStateWithCheckpoint({ selectionImageData: null });
  }

  deleteSelection(): void {
    this.setStateWithCheckpoint({
      selectionImageData: null,
      interactionPixels: null,
      interaction: { s: null, e: null, points: [] },
    });
  }

  flattenSelection(): void {
    this.setStateWithCheckpoint({
      imageData: getFlattenedImageData(this.state),
      selectionImageData: null,
    });
  }

  moveSelection(dx: number, dy: number): void {
    this.setStateWithCheckpoint({
      selectionOffset: {
        x: this.state.selectionOffset.x + dx,
        y: this.state.selectionOffset.y + dy,
      },
    });
  }

  // --- Coordinate Transforms ---

  applyCoordinateTransform(coordTransformCallback: (p: Point) => Point): void {
    const key = this.state.selectionImageData ? "selectionImageData" : "imageData";
    const source = this.state[key];
    if (!source) return;

    const clone = source.clone();
    for (let x = 0; x < clone.width; x++) {
      for (let y = 0; y < clone.height; y++) {
        const { x: nx, y: ny } = coordTransformCallback({ x, y });
        clone.fillPixelRGBA(x, y, ...source.getPixel(nx, ny));
      }
    }
    this.setStateWithCheckpoint({ [key]: clone });
  }

  flipHorizontally(): void {
    const width = this.state.selectionImageData?.width ?? this.state.imageData?.width ?? 0;
    this.applyCoordinateTransform(({ x, y }) => ({ x: width - x, y }));
  }

  flipVertically(): void {
    const height = this.state.selectionImageData?.height ?? this.state.imageData?.height ?? 0;
    this.applyCoordinateTransform(({ x, y }) => ({ x, y: height - y }));
  }

  rotate90(): void {
    const width = this.state.selectionImageData?.width ?? this.state.imageData?.width ?? 0;
    this.applyCoordinateTransform(({ x, y }) => ({ x: y, y: width - x }));
  }

  rotateNeg90(): void {
    const height = this.state.selectionImageData?.height ?? this.state.imageData?.height ?? 0;
    this.applyCoordinateTransform(({ x, y }) => ({ x: height - y, y: x }));
  }

  // --- Anchor Square ---

  chooseAnchorSquare(): void {
    this.chooseTool(new Tools.ChooseAnchorSquareTool(this.state.tool));
  }

  // --- Canvas Size ---

  updateCanvasSize(dSquaresX: number, dSquaresY: number, offsetX: number, offsetY: number): void {
    if (!this.state.imageData) return;

    const newImageData = getImageDataWithNewFrame(this.state.imageData, {
      width: this.state.imageData.width + 40 * dSquaresX,
      height: this.state.imageData.height + 40 * dSquaresY,
      offsetX: 40 * offsetX,
      offsetY: 40 * offsetY,
    });
    if (!newImageData) return;

    CreatePixelImageData.call(newImageData as PixelImageData);
    this.setStateWithCheckpoint({
      pixelSize: pixelSizeToFit(newImageData),
      anchorSquare: {
        x: this.state.anchorSquare.x + offsetX,
        y: this.state.anchorSquare.y + offsetY,
      },
      imageData: newImageData as PixelImageData,
      selectionImageData: null,
      selectionOffset: { x: 0, y: 0 },
      interaction: { s: null, e: null, points: [] },
      interactionPixels: null,
    });
  }

  shrinkCanvas(dSquaresX: number, dSquaresY: number, offsetX: number, offsetY: number): void {
    if (!this.state.imageData) return;

    const newWidth = this.state.imageData.width + 40 * dSquaresX;
    const newHeight = this.state.imageData.height + 40 * dSquaresY;

    if (newWidth < 40 || newHeight < 40) return;

    this.updateCanvasSize(dSquaresX, dSquaresY, offsetX, offsetY);
  }

  // --- External Image ---

  applyExternalDataURL(dataURL: string, offset?: Point | null, options?: { fill?: boolean }): void {
    const { imageData } = this.state;
    if (!imageData) return;

    getImageDataFromDataURL(
      dataURL,
      {
        maxWidth: imageData.width,
        maxHeight: imageData.height,
        fill: options?.fill,
      },
      (nextSelectionImageData) => {
        CreatePixelImageData.call(nextSelectionImageData as PixelImageData);
        this.setStateWithCheckpoint({
          imageData: getFlattenedImageData(this.state),
          selectionOffset: offset || { x: 0, y: 0 },
          selectionImageData: nextSelectionImageData as PixelImageData,
          tool: TOOLS_LIST.find((t) => t.name === "select"),
        });
      }
    );
  }

  // --- File Operations ---

  handleFileSelect(file: File): void {
    const reader = new FileReader();
    reader.addEventListener(
      "load",
      () => {
        this.applyExternalDataURL(reader.result as string);
      },
      false
    );
    reader.readAsDataURL(file);
  }

  downloadImage(characterName: string, appearanceId: string): void {
    const { imageData } = this.state;
    if (!imageData) return;

    const canvas = document.createElement("canvas");
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext("2d")!;
    ctx.putImageData(imageData, 0, 0);

    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `${characterName}_${appearanceId}.png`;
    link.click();
  }

  // --- Variable Overlay ---

  toggleVariableVisibility(variableId: string): void {
    const newVisibleVariables = {
      ...this.state.visibleVariables,
      [variableId]: !this.state.visibleVariables[variableId],
    };
    const hasVisibleVariables = Object.values(newVisibleVariables).some(Boolean);

    this.setState({
      visibleVariables: newVisibleVariables,
      showVariables: hasVisibleVariables,
    });
  }

  // --- UI State ---

  setDropdownOpen(open: boolean): void {
    this.setState({ dropdownOpen: open });
  }

  setSpriteDescription(description: string): void {
    this.setState({ spriteDescription: description });
  }

  // --- AI Sprite Generation ---

  async generateSprite(): Promise<void> {
    const { imageData, spriteDescription } = this.state;
    if (!imageData) return;

    const prompt = `Generate a pixel art sprite with a solid background based on the following description: ${spriteDescription}`;
    const canvasWidth = imageData.width;
    const canvasHeight = imageData.height;

    this.setState({ isGeneratingSprite: true });

    try {
      const data = await makeRequest<{ imageUrl?: string; name?: string; error?: string }>(
        `/generate-sprite?prompt=${encodeURIComponent(prompt)}&width=${canvasWidth}&height=${canvasHeight}`
      );
      if (data.imageUrl) {
        this.applyExternalDataURL(data.imageUrl, null, { fill: true });
      } else {
        console.error("Failed to generate sprite:", data.error);
      }

      if (data.name) {
        this.setState({ spriteName: data.name });
      }
    } catch (error) {
      console.error("Error fetching sprite:", error);
    } finally {
      this.setState({ isGeneratingSprite: false });
    }

    // Wait for image to load before applying magic wand to remove background
    setTimeout(() => {
      if (!this.state.imageData) return;

      const magicWandTool = TOOLS_LIST.find((t) => t.name === "magicWand");
      if (!magicWandTool) return;

      const flattened = getFlattenedImageData(this.state);
      if (!flattened) return;

      // Build tool state for magic wand
      const toolState = {
        ...this.state,
        tool: magicWandTool,
        imageData: flattened,
        selectionImageData: null,
      };

      const afterMousedown = magicWandTool.mousedown({ x: 0, y: 0 }, toolState);
      const afterMousemove = magicWandTool.mousemove({ x: 0, y: 0 }, {
        ...toolState,
        ...afterMousedown,
      });
      const afterMouseup = magicWandTool.mouseup({
        ...toolState,
        ...afterMousedown,
        ...afterMousemove,
      });

      // Clear selection to remove background
      this.setStateWithCheckpoint({
        ...afterMouseup,
        selectionImageData: null,
      });
    }, 500);
  }

  // --- Keyboard Handling ---

  handleKeyDown(event: KeyboardEvent): boolean {
    if ((event.key === "y" || event.key === "Z") && (event.ctrlKey || event.metaKey)) {
      this.redo();
      return true;
    } else if (event.key === "z" && (event.ctrlKey || event.metaKey)) {
      this.undo();
      return true;
    } else if (event.key === "a" && (event.ctrlKey || event.metaKey)) {
      this.selectAll();
      return true;
    } else if (event.key === "Escape" || event.key === "Enter") {
      this.flattenSelection();
      return true;
    } else if (event.key === "Delete" || event.key === "Backspace") {
      this.deleteSelection();
      return true;
    } else if (event.key.startsWith("Arrow")) {
      const delta = event.shiftKey ? 5 : 1;
      const dx = { ArrowLeft: -delta, ArrowRight: delta }[event.key] || 0;
      const dy = { ArrowUp: -delta, ArrowDown: delta }[event.key] || 0;
      this.moveSelection(dx, dy);
      return true;
    }
    return false;
  }

  // --- Save Data ---

  /**
   * Returns the data needed to save the current state.
   * The React component is responsible for dispatching to Redux.
   */
  getSaveData(_character: Character, _appearanceId: string): {
    imageDataURL: string;
    anchorSquare: Point;
    filled: Record<string, boolean>;
    width: number;
    height: number;
    variableOverlay: { showVariables: boolean; visibleVariables: Record<string, boolean> };
  } | null {
    const flattened = getFlattenedImageData(this.state);
    if (!flattened) return null;

    // Trim inwards from all sides if entire row/column of tiles is empty
    const filledSquares = getFilledSquares(flattened);
    const filledTiles = Object.keys(filledSquares).map((str) => str.split(","));
    const minXFilled = filledTiles.reduce((min, [x]) => Math.min(min, Number(x)), 100);
    const minYFilled = filledTiles.reduce((min, [, y]) => Math.min(min, Number(y)), 100);
    const maxXFilled = filledTiles.reduce((max, [x]) => Math.max(max, Number(x)), 0);
    const maxYFilled = filledTiles.reduce((max, [, y]) => Math.max(max, Number(y)), 0);

    const trimmedWidth = maxXFilled - minXFilled + 1;
    const trimmedHeight = maxYFilled - minYFilled + 1;

    const trimmed = getImageDataWithNewFrame(flattened, {
      width: trimmedWidth * 40,
      height: trimmedHeight * 40,
      offsetX: -minXFilled * 40,
      offsetY: -minYFilled * 40,
    });

    if (!trimmed) return null;

    // Adjust anchor position relative to trimmed image bounds
    // and clamp to ensure it's within the trimmed image area
    const adjustedAnchor: Point = {
      x: Math.max(0, Math.min(trimmedWidth - 1, this.state.anchorSquare.x - minXFilled)),
      y: Math.max(0, Math.min(trimmedHeight - 1, this.state.anchorSquare.y - minYFilled)),
    };

    // Adjust filled squares map to be relative to trimmed image
    const adjustedFilled: Record<string, boolean> = {};
    for (const key of Object.keys(filledSquares)) {
      const [x, y] = key.split(",").map(Number);
      adjustedFilled[`${x - minXFilled},${y - minYFilled}`] = true;
    }

    return {
      imageDataURL: getDataURLFromImageData(trimmed)!,
      anchorSquare: adjustedAnchor,
      filled: adjustedFilled,
      width: trimmedWidth,
      height: trimmedHeight,
      variableOverlay: {
        showVariables: this.state.showVariables,
        visibleVariables: this.state.visibleVariables,
      },
    };
  }
}
