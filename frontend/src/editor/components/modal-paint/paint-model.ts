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
  isEditingSprite: boolean;
  spriteEditDescription: string;
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
  isEditingSprite: false,
  spriteEditDescription: "",
  dropdownOpen: false,
  spriteName: "",
};

function pixelSizeToFit(imageData: ImageData): number {
  return Math.max(
    1,
    Math.min(Math.floor(455 / imageData.width), Math.floor(455 / imageData.height)),
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
    } catch {
      alert(
        `Codako doesn't have permission to view your clipboard. ` +
<<<<<<< Updated upstream
          `Please grant permission in your browser and try again!`,
=======
        `Please grant permission in your browser and try again!`
>>>>>>> Stashed changes
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
      tool: TOOLS_LIST.find((t) => t.name === "select"),
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

    // Flatten selection into the canvas before resizing
    const flattenedImageData = getFlattenedImageData(this.state) || this.state.imageData;

    const newImageData = getImageDataWithNewFrame(flattenedImageData, {
      width: flattenedImageData.width + 40 * dSquaresX,
      height: flattenedImageData.height + 40 * dSquaresY,
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
      },
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
      false,
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

  setSpriteEditDescription(description: string): void {
    this.setState({ spriteEditDescription: description });
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
        `/generate-sprite?prompt=${encodeURIComponent(prompt)}&width=${canvasWidth}&height=${canvasHeight}`,
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
      const afterMousemove = magicWandTool.mousemove(
        { x: 0, y: 0 },
        {
          ...toolState,
          ...afterMousedown,
        },
      );
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

  // --- AI Sprite Editing ---

  async editSprite(): Promise<void> {
    const { imageData, spriteEditDescription } = this.state;
    if (!imageData || !spriteEditDescription.trim()) {
      console.log("[editSprite] Missing imageData or description", { imageData: !!imageData, description: spriteEditDescription });
      return;
    }

    console.log("[editSprite] Starting edit", {
      originalSize: `${imageData.width}x${imageData.height}`,
      description: spriteEditDescription,
    });

    // Get current image as data URL
    const currentImageDataURL = getDataURLFromImageData(imageData);
    if (!currentImageDataURL) {
      console.error("[editSprite] Failed to get data URL from imageData");
      return;
    }

    // OpenAI image edit API requires square images of exactly 1024x1024
    // We need to scale the sprite to 1024x1024 square, then scale back
    const targetSize = 1024;
    const canvasWidth = imageData.width;
    const canvasHeight = imageData.height;

    const keyColor = { r: 254, g: 247, b: 231 }; // off-white background key, replaces transparent background

    // Create a temporary canvas to scale the image to exactly 1024x1024 square
    // OpenAI requires exactly 1024x1024 square images
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = targetSize;
    tempCanvas.height = targetSize;
    const tempCtx = tempCanvas.getContext("2d")!;
    // Preserve crisp pixel edges when scaling up
    tempCtx.imageSmoothingEnabled = false;

    // Fill with a key background color so we can restore transparency later
    tempCtx.fillStyle = `rgb(${keyColor.r}, ${keyColor.g}, ${keyColor.b})`;
    tempCtx.fillRect(0, 0, targetSize, targetSize);

    // Calculate scaling to fit within square while maintaining aspect ratio (contain)
    // This ensures no cropping, but may have transparent padding
    const scale = Math.min(targetSize / canvasWidth, targetSize / canvasHeight);
    const scaledWidth = canvasWidth * scale;
    const scaledHeight = canvasHeight * scale;
    const offsetX = (targetSize - scaledWidth) / 2;
    const offsetY = (targetSize - scaledHeight) / 2;

    console.log("[editSprite] Scaling image", {
      original: `${canvasWidth}x${canvasHeight}`,
      scale,
      scaled: `${scaledWidth}x${scaledHeight}`,
      offset: `${offsetX},${offsetY}`,
      target: `${targetSize}x${targetSize}`,
    });

    // Draw the sprite centered in the square canvas
    const img = new Image();
    img.src = currentImageDataURL;

    await new Promise<void>((resolve, reject) => {
      img.onerror = (err) => {
        console.error("[editSprite] Error loading image:", err);
        reject(err);
      };
      img.onload = () => {
        tempCtx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
        console.log("[editSprite] Image drawn to canvas with transparent background");
        resolve();
      };
    });

    // Get the scaled square image as data URL
    const scaledImageDataURL = tempCanvas.toDataURL("image/png");
    console.log("[editSprite] Scaled image data URL length:", scaledImageDataURL.length);

    console.log("[editSprite] Key background color set", keyColor);

    // Verify the canvas is exactly 1024x1024
    if (tempCanvas.width !== targetSize || tempCanvas.height !== targetSize) {
      console.error("[editSprite] Canvas size mismatch!", {
        width: tempCanvas.width,
        height: tempCanvas.height,
        expected: targetSize,
      });
    } else {
      console.log("[editSprite] Canvas verified as 1024x1024");
    }

    this.setState({ isEditingSprite: true });

    try {
      const prompt = [
        "Keep the background solid off-white (RGB 254,247,231).",
        spriteEditDescription.trim(),
      ]
        .filter(Boolean)
        .join(" ");

      console.log("[editSprite] Sending request to API (no mask, keyed background)", {
        prompt,
        promptVersion: "v3-simple-offwhite",
      });
      const data = await makeRequest<{ imageUrl?: string; error?: string }>(
        "/edit-sprite",
        {
          method: "POST",
          json: {
            imageData: scaledImageDataURL,
            prompt,
          },
        }
      );

      console.log("[editSprite] Received response", { hasImageUrl: !!data.imageUrl, error: data.error });

      if (data.imageUrl) {
        console.log("[editSprite] Processing edited image");

        // Load the edited image and scale it back to original dimensions
        const editedImg = new Image();
        editedImg.src = data.imageUrl;

        await new Promise<void>((resolve, reject) => {
          editedImg.onerror = (err) => {
            console.error("[editSprite] Error loading edited image:", err);
            reject(err);
          };
          editedImg.onload = () => {
            console.log("[editSprite] Edited image loaded", {
              editedSize: `${editedImg.width}x${editedImg.height}`,
              targetSize: `${canvasWidth}x${canvasHeight}`,
              originalScaled: `${scaledWidth}x${scaledHeight}`,
              originalOffset: `${offsetX},${offsetY}`,
            });

            // The edited image is 1024x1024 with the sprite centered and keyed padding
            // We need to extract the sprite area (same bounds as when we scaled up) and scale it back

            // Create a temporary canvas to extract the sprite area
            const extractCanvas = document.createElement("canvas");
            extractCanvas.width = scaledWidth;
            extractCanvas.height = scaledHeight;
            const extractCtx = extractCanvas.getContext("2d")!;
            extractCtx.imageSmoothingEnabled = false;

            // Extract the sprite area from the edited image (same position as when we placed it)
            extractCtx.drawImage(
              editedImg,
              offsetX, offsetY, scaledWidth, scaledHeight, // Source: sprite area in 1024x1024
              0, 0, scaledWidth, scaledHeight // Destination: full extract canvas
            );

            // Now scale the extracted sprite back to original canvas dimensions
            const finalCanvas = document.createElement("canvas");
            finalCanvas.width = canvasWidth;
            finalCanvas.height = canvasHeight;
            const finalCtx = finalCanvas.getContext("2d")!;
            finalCtx.imageSmoothingEnabled = false; // Use nearest neighbor for pixel art

            // Clear canvas with transparent background
            finalCtx.clearRect(0, 0, canvasWidth, canvasHeight);

            // Scale the extracted sprite back to original size
            finalCtx.drawImage(extractCanvas, 0, 0, canvasWidth, canvasHeight);

            // Get the final image data
            const editImageData = finalCtx.getImageData(0, 0, canvasWidth, canvasHeight);

            // Convert key background color to transparent
            const tolerance = 8;
            for (let y = 0; y < canvasHeight; y++) {
              for (let x = 0; x < canvasWidth; x++) {
                const idx = (y * canvasWidth + x) * 4;
                const r = editImageData.data[idx];
                const g = editImageData.data[idx + 1];
                const b = editImageData.data[idx + 2];
                const isKey =
                  Math.abs(r - keyColor.r) <= tolerance &&
                  Math.abs(g - keyColor.g) <= tolerance &&
                  Math.abs(b - keyColor.b) <= tolerance;
                if (isKey) {
                  editImageData.data[idx + 3] = 0;
                }
              }
            }

            // Convert to PixelImageData and replace the current image
            CreatePixelImageData.call(editImageData as PixelImageData);

            console.log("[editSprite] Applying edited image directly to canvas", {
              finalSize: `${editImageData.width}x${editImageData.height}`,
            });

            // Directly replace the imageData (not as a selection)
            this.setStateWithCheckpoint({
              imageData: editImageData as PixelImageData,
              selectionImageData: null,
              selectionOffset: { x: 0, y: 0 },
            });

            console.log("[editSprite] Edit complete - image replaced");
            resolve();
          };
        });
      } else {
        console.error("[editSprite] Failed to edit sprite:", data.error);
      }
    } catch (error) {
      console.error("[editSprite] Error editing sprite:", error);
    } finally {
      this.setState({ isEditingSprite: false });
    }
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
  getSaveData(
    _character: Character,
    _appearanceId: string,
  ): {
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
