import React, { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import Button from "reactstrap/lib/Button";
import ButtonDropdown from "reactstrap/lib/ButtonDropdown";
import DropdownItem from "reactstrap/lib/DropdownItem";
import DropdownMenu from "reactstrap/lib/DropdownMenu";
import DropdownToggle from "reactstrap/lib/DropdownToggle";
import Modal from "reactstrap/lib/Modal";
import ModalBody from "reactstrap/lib/ModalBody";
import ModalFooter from "reactstrap/lib/ModalFooter";

import { makeRequest } from "../../../helpers/api";
import { Actor, Characters, EditorState } from "../../../types";

import * as Tools from "./tools";

import { upsertCharacter } from "../../actions/characters-actions";
import { paintCharacterAppearance } from "../../actions/ui-actions";

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

import PixelCanvas from "./pixel-canvas";
import PixelColorPicker, { ColorOptions } from "./pixel-color-picker";
import { PixelToolSize } from "./pixel-tool-size";
import PixelToolbar from "./pixel-toolbar";
import SpriteVariablesPanel from "./sprite-variables-panel";
import { createCheckpoint, getToolState, PaintCheckpoint, PaintState, PixelImageData } from "./types";
import VariableOverlay from "./variable-overlay";

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

const DEFAULT_TOOL = TOOLS_LIST.find((t) => t.name === "pen") ?? TOOLS_LIST[0];

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

// Action types for the reducer
type PaintAction =
  | { type: "RESET"; payload: Partial<PaintState> }
  | { type: "SET_STATE"; payload: Partial<PaintState> }
  | { type: "SET_STATE_WITH_CHECKPOINT"; payload: Partial<PaintState> }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "APPLY_TOOL_RESULT"; payload: Partial<PaintState>; withCheckpoint: boolean };

function paintReducer(state: PaintState, action: PaintAction): PaintState {
  switch (action.type) {
    case "RESET":
      return { ...INITIAL_STATE, ...action.payload };

    case "SET_STATE":
      return { ...state, ...action.payload };

    case "SET_STATE_WITH_CHECKPOINT": {
      const checkpoint = createCheckpoint(state);
      return {
        ...state,
        ...action.payload,
        redoStack: [],
        undoStack: state.undoStack
          .slice(Math.max(0, state.undoStack.length - MAX_UNDO_STEPS))
          .concat([checkpoint]),
      };
    }

    case "UNDO": {
      const undoStack = [...state.undoStack];
      const changes = undoStack.pop();
      if (!changes) return state;
      const checkpoint = createCheckpoint(state);
      return {
        ...state,
        ...changes,
        undoStack,
        redoStack: [...state.redoStack, checkpoint],
      };
    }

    case "REDO": {
      const redoStack = [...state.redoStack];
      const changes = redoStack.pop();
      if (!changes) return state;
      const checkpoint = createCheckpoint(state);
      return {
        ...state,
        ...changes,
        redoStack,
        undoStack: [...state.undoStack, checkpoint],
      };
    }

    case "APPLY_TOOL_RESULT": {
      if (action.withCheckpoint) {
        const checkpoint = createCheckpoint(state);
        return {
          ...state,
          ...action.payload,
          redoStack: [],
          undoStack: state.undoStack
            .slice(Math.max(0, state.undoStack.length - MAX_UNDO_STEPS))
            .concat([checkpoint]),
        };
      }
      return { ...state, ...action.payload };
    }

    default:
      return state;
  }
}

function pixelSizeToFit(imageData: ImageData): number {
  return Math.max(
    1,
    Math.min(Math.floor(455 / imageData.width), Math.floor(455 / imageData.height))
  );
}

const PaintContainer: React.FC = () => {
  const reduxDispatch = useDispatch();

  // Redux selectors
  const { characterId, appearanceId } = useSelector<
    EditorState,
    { characterId: string | null; appearanceId: string | null }
  >((s) => s.ui.paint);
  const characters = useSelector<EditorState, Characters>((s) => s.characters);
  const selectedActors = useSelector<EditorState, EditorState["ui"]["selectedActors"]>(
    (s) => s.ui.selectedActors
  );
  const world = useSelector<EditorState, EditorState["world"]>((s) => s.world);

  // Memoize the current character to avoid unnecessary effect triggers
  const character = useMemo(
    () => (characterId ? characters[characterId] : null),
    [characterId, characters]
  );

  // Compute current actor from selection
  const currentActor: Actor | null = useMemo(() => {
    if (
      selectedActors &&
      selectedActors.worldId &&
      selectedActors.stageId &&
      selectedActors.actorIds.length === 1
    ) {
      const stage = world.stages[selectedActors.stageId];
      if (stage && stage.actors[selectedActors.actorIds[0]]) {
        return stage.actors[selectedActors.actorIds[0]];
      }
    }
    return null;
  }, [selectedActors, world.stages]);

  const [state, dispatch] = useReducer(paintReducer, INITIAL_STATE);

  // Use ref to access current state in callbacks without recreating them
  const stateRef = useRef<PaintState>(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Load image data when character/appearance changes
  useEffect(() => {
    if (character && appearanceId) {
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
        dispatch({
          type: "RESET",
          payload: {
            imageData: imageData as PixelImageData,
            anchorSquare,
            pixelSize: pixelSizeToFit(imageData),
            showVariables: variableOverlay.showVariables,
            visibleVariables: variableOverlay.visibleVariables,
          },
        });
      });
    } else {
      dispatch({ type: "RESET", payload: {} });
    }
  }, [character, appearanceId]);

  // Stable clipboard event handlers using refs
  const clipboardHandlersRef = useRef({
    copy: async (event: ClipboardEvent) => {
      const currentState = stateRef.current;
      if (currentState.imageData === null) return;
      event.preventDefault();

      const data: Record<string, Blob | string> = {
        "text/plain": JSON.stringify(currentState.selectionOffset),
      };

      const blob = await getBlobFromImageData(currentState.selectionImageData);
      if (blob) {
        data["image/png"] = blob;
      }

      try {
        const clipboardItem = new ClipboardItem(data as Record<string, Blob>);
        await navigator.clipboard.write([clipboardItem]);
      } catch (err) {
        console.error(err);
      }
    },
    cut: (event: ClipboardEvent) => {
      const currentState = stateRef.current;
      if (currentState.imageData === null) return;
      clipboardHandlersRef.current.copy(event);
      dispatch({ type: "SET_STATE_WITH_CHECKPOINT", payload: { selectionImageData: null } });
    },
    paste: async (_event: ClipboardEvent) => {
      const currentState = stateRef.current;
      if (currentState.imageData === null) return;

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
        applyExternalDataURL(URL.createObjectURL(image), offset);
      }
    },
  });

  const applyExternalDataURL = useCallback(
    (dataURL: string, offset?: Point | null, options?: { fill?: boolean }) => {
      const currentState = stateRef.current;
      const { imageData } = currentState;
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
          dispatch({
            type: "SET_STATE_WITH_CHECKPOINT",
            payload: {
              imageData: getFlattenedImageData(stateRef.current),
              selectionOffset: offset || { x: 0, y: 0 },
              selectionImageData: nextSelectionImageData as PixelImageData,
              tool: TOOLS_LIST.find((t) => t.name === "select"),
            },
          });
        }
      );
    },
    []
  );

  // Attach clipboard event listeners (stable, no dependencies)
  useEffect(() => {
    const handleCopy = (e: Event) => clipboardHandlersRef.current.copy(e as ClipboardEvent);
    const handleCut = (e: Event) => clipboardHandlersRef.current.cut(e as ClipboardEvent);
    const handlePaste = (e: Event) => clipboardHandlersRef.current.paste(e as ClipboardEvent);

    document.body.addEventListener("copy", handleCopy);
    document.body.addEventListener("cut", handleCut);
    document.body.addEventListener("paste", handlePaste);

    return () => {
      document.body.removeEventListener("copy", handleCopy);
      document.body.removeEventListener("cut", handleCut);
      document.body.removeEventListener("paste", handlePaste);
    };
  }, []);

  const handleUndo = useCallback(() => {
    dispatch({ type: "UNDO" });
  }, []);

  const handleRedo = useCallback(() => {
    dispatch({ type: "REDO" });
  }, []);

  const handleClose = useCallback(() => {
    reduxDispatch(paintCharacterAppearance(null));
  }, [reduxDispatch]);

  const handleCloseAndSave = useCallback(async () => {
    if (!characterId || !appearanceId || !character) return;

    const currentState = stateRef.current;
    const flattened = getFlattenedImageData(currentState);
    if (!flattened) {
      alert(
        `Sorry, an error occurred and we're unable to save your image. Did you copy/paste,` +
          ` import from a file, or use the AI Generation feature? Please let me know at` +
          ` ben@foundry376.com and include what browser you're using!`
      );
      return;
    }

    // Trim inwards from all sides if an entire row / column of tiles is empty.
    const filledTiles = Object.keys(getFilledSquares(flattened)).map((str) => str.split(","));
    const minXFilled = filledTiles.reduce((min, [x]) => Math.min(min, Number(x)), 100);
    const minYFilled = filledTiles.reduce((min, [, y]) => Math.min(min, Number(y)), 100);
    const maxXFilled = filledTiles.reduce((max, [x]) => Math.max(max, Number(x)), 0);
    const maxYFilled = filledTiles.reduce((max, [, y]) => Math.max(max, Number(y)), 0);

    const trimmed = getImageDataWithNewFrame(flattened, {
      width: (maxXFilled - minXFilled + 1) * 40,
      height: (maxYFilled - minYFilled + 1) * 40,
      offsetX: -minXFilled * 40,
      offsetY: -minYFilled * 40,
    });

    const imageDataURL = getDataURLFromImageData(trimmed);

    // If character name is "Untitled", generate a name from the backend
    let generatedSpriteName = "";

    if (character.name === "Untitled") {
      try {
        const nameResp = await makeRequest("/generate-sprite-name", {
          method: "POST",
          json: { imageData: imageDataURL },
        });
        if (nameResp && nameResp.name) {
          generatedSpriteName = nameResp.name;
        }
      } catch (err) {
        console.error("Failed to auto-generate sprite name:", err);
      }
    }

    // Close modal first
    reduxDispatch(paintCharacterAppearance(null));

    // Then update character data after a small delay to prevent modal reopening
    setTimeout(() => {
      reduxDispatch(
        upsertCharacter(characterId, {
          name: generatedSpriteName || character.name,
          spritesheet: {
            appearances: {
              [appearanceId]: [imageDataURL],
            },
            appearanceNames: {
              [appearanceId]:
                generatedSpriteName || character.spritesheet.appearanceNames?.[appearanceId],
            },
            appearanceInfo: {
              [appearanceId]: {
                anchor: currentState.anchorSquare,
                filled: getFilledSquares(flattened),
                width: flattened.width / 40,
                height: flattened.height / 40,
                variableOverlay: {
                  showVariables: currentState.showVariables,
                  visibleVariables: currentState.visibleVariables,
                },
              },
            },
          },
        })
      );
    }, 10);
  }, [characterId, appearanceId, character, reduxDispatch]);

  const handleClearAll = useCallback(() => {
    const currentState = stateRef.current;
    if (!currentState.imageData) return;
    const empty = currentState.imageData.clone();
    empty.clearPixelsInRect(0, 0, empty.width, empty.height);
    dispatch({
      type: "SET_STATE_WITH_CHECKPOINT",
      payload: {
        spriteName: "",
        imageData: empty,
        selectionOffset: { x: 0, y: 0 },
        selectionImageData: null,
      },
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    const currentState = stateRef.current;
    if (!currentState.imageData) return;
    const empty = currentState.imageData.clone();
    empty.clearPixelsInRect(0, 0, empty.width, empty.height);
    dispatch({
      type: "SET_STATE_WITH_CHECKPOINT",
      payload: {
        imageData: empty,
        selectionOffset: { x: 0, y: 0 },
        selectionImageData: getFlattenedImageData(currentState),
      },
    });
  }, []);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const currentState = stateRef.current;
      if ((event.key === "y" || event.key === "Z") && (event.ctrlKey || event.metaKey)) {
        handleRedo();
        event.preventDefault();
        event.stopPropagation();
      } else if (event.key === "z" && (event.ctrlKey || event.metaKey)) {
        handleUndo();
        event.preventDefault();
        event.stopPropagation();
      } else if (event.key === "a" && (event.ctrlKey || event.metaKey)) {
        handleSelectAll();
        event.preventDefault();
        event.stopPropagation();
      } else if (event.key === "Escape" || event.key === "Enter") {
        dispatch({
          type: "SET_STATE_WITH_CHECKPOINT",
          payload: {
            imageData: getFlattenedImageData(currentState),
            selectionImageData: null,
          },
        });
      } else if (event.key === "Delete" || event.key === "Backspace") {
        dispatch({
          type: "SET_STATE_WITH_CHECKPOINT",
          payload: { selectionImageData: null },
        });
      } else if (event.key.startsWith("Arrow")) {
        const delta = event.shiftKey ? 5 : 1;
        dispatch({
          type: "SET_STATE_WITH_CHECKPOINT",
          payload: {
            selectionOffset: {
              x:
                currentState.selectionOffset.x +
                ({ ArrowLeft: -delta, ArrowRight: delta }[event.key] || 0),
              y:
                currentState.selectionOffset.y +
                ({ ArrowUp: -delta, ArrowDown: delta }[event.key] || 0),
            },
          },
        });
      }
    },
    [handleRedo, handleUndo, handleSelectAll]
  );

  const handleChooseTool = useCallback((tool: Tools.PixelTool) => {
    const currentState = stateRef.current;
    dispatch({
      type: "SET_STATE",
      payload: {
        tool,
        imageData: getFlattenedImageData(currentState),
        selectionImageData: null,
      },
    });
  }, []);

  // Canvas event handlers using refs for stable callbacks
  const handleCanvasMouseDown = useCallback((event: React.MouseEvent, pixel: Point) => {
    const currentState = stateRef.current;
    const { tool } = currentState;
    if (!tool) return;

    const toolState = getToolState(currentState);
    const result = tool.mousedown(pixel, toolState, event);
    dispatch({ type: "APPLY_TOOL_RESULT", payload: result, withCheckpoint: true });
  }, []);

  const handleCanvasMouseMove = useCallback((_event: MouseEvent | React.MouseEvent, pixel: Point) => {
    const currentState = stateRef.current;
    const { tool } = currentState;
    if (!tool) return;

    const toolState = getToolState(currentState);
    const result = tool.mousemove(pixel, toolState);
    dispatch({ type: "APPLY_TOOL_RESULT", payload: result, withCheckpoint: false });
  }, []);

  const handleCanvasMouseUp = useCallback((_event: MouseEvent | React.MouseEvent, pixel: Point) => {
    const currentState = stateRef.current;
    const { tool } = currentState;
    if (!tool) return;

    const toolState = getToolState(currentState);
    const moved = tool.mousemove(pixel, toolState);
    const result = tool.mouseup({ ...toolState, ...moved });
    dispatch({ type: "APPLY_TOOL_RESULT", payload: result, withCheckpoint: false });
  }, []);

  const handleApplyCoordinateTransform = useCallback((coordTransformCallback: (p: Point) => Point) => {
    const currentState = stateRef.current;
    const key = currentState.selectionImageData ? "selectionImageData" : "imageData";
    const source = currentState[key];
    if (!source) return;

    const clone = source.clone();
    for (let x = 0; x < clone.width; x++) {
      for (let y = 0; y < clone.height; y++) {
        const { x: nx, y: ny } = coordTransformCallback({ x, y });
        clone.fillPixelRGBA(x, y, ...source.getPixel(nx, ny));
      }
    }
    dispatch({ type: "SET_STATE_WITH_CHECKPOINT", payload: { [key]: clone } });
  }, []);

  const handleChooseAnchorSquare = useCallback(() => {
    const currentState = stateRef.current;
    handleChooseTool(new Tools.ChooseAnchorSquareTool(currentState.tool));
  }, [handleChooseTool]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChooseFile = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const reader = new FileReader();
      reader.addEventListener(
        "load",
        () => {
          applyExternalDataURL(reader.result as string);
        },
        false
      );
      const file = event.target.files?.[0];
      if (file) {
        reader.readAsDataURL(file);
      }
    },
    [applyExternalDataURL]
  );

  // Track if magic wand operation is still valid
  const magicWandOperationIdRef = useRef(0);

  const handleGenerateSprite = useCallback(async () => {
    const currentState = stateRef.current;
    const description = currentState.spriteDescription;
    const prompt = `Generate a pixel art sprite with a solid background based on the following description: ${description}`;

    const { imageData } = currentState;
    if (!imageData) return;

    const canvasWidth = imageData.width;
    const canvasHeight = imageData.height;

    dispatch({ type: "SET_STATE", payload: { isGeneratingSprite: true } });

    // Track this specific operation
    const operationId = ++magicWandOperationIdRef.current;

    try {
      const data = await makeRequest(
        `/generate-sprite?prompt=${encodeURIComponent(prompt)}&width=${canvasWidth}&height=${canvasHeight}`
      );
      if (data.imageUrl) {
        applyExternalDataURL(data.imageUrl, null, { fill: true });
      } else {
        console.error("Failed to generate sprite:", data.error);
      }

      if (data.name) {
        dispatch({ type: "SET_STATE", payload: { spriteName: data.name } });
      }
    } catch (error) {
      console.error("Error fetching sprite:", error);
    } finally {
      dispatch({ type: "SET_STATE", payload: { isGeneratingSprite: false } });
    }

    // Wait for the image to be loaded before applying magic wand
    // Use the operation ID to ensure we don't apply stale operations
    setTimeout(() => {
      // Check if this operation is still the current one
      if (operationId !== magicWandOperationIdRef.current) return;

      const latestState = stateRef.current;
      if (!latestState.imageData) return;

      const magicWandTool = TOOLS_LIST.find((t) => t.name === "magicWand");
      if (!magicWandTool) return;

      const flattened = getFlattenedImageData(latestState);
      if (!flattened) return;

      // Build a proper tool state for the magic wand
      const toolState = {
        ...getToolState(latestState),
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

      // Clear the selection to remove background
      dispatch({
        type: "SET_STATE_WITH_CHECKPOINT",
        payload: {
          ...afterMouseup,
          selectionImageData: null,
        },
      });
    }, 500);
  }, [applyExternalDataURL]);

  const handleDownloadImage = useCallback(() => {
    const currentState = stateRef.current;
    const { imageData } = currentState;
    if (!imageData || !characterId || !appearanceId || !character) return;

    const canvas = document.createElement("canvas");
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext("2d")!;
    ctx.putImageData(imageData, 0, 0);

    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    const fileName = `${character.name}_${appearanceId}.png`;
    link.download = fileName;
    link.click();
  }, [characterId, appearanceId, character]);

  const handleToggleVariableVisibility = useCallback((variableId: string) => {
    const currentState = stateRef.current;
    const newVisibleVariables = {
      ...currentState.visibleVariables,
      [variableId]: !currentState.visibleVariables[variableId],
    };
    const hasVisibleVariables = Object.values(newVisibleVariables).some(Boolean);

    dispatch({
      type: "SET_STATE",
      payload: {
        visibleVariables: newVisibleVariables,
        showVariables: hasVisibleVariables,
      },
    });
  }, []);

  const handleCanvasUpdateSize = useCallback(
    (dSquaresX: number, dSquaresY: number, offsetX: number, offsetY: number) => {
      const currentState = stateRef.current;
      if (!currentState.imageData) return;

      const newImageData = getImageDataWithNewFrame(currentState.imageData, {
        width: currentState.imageData.width + 40 * dSquaresX,
        height: currentState.imageData.height + 40 * dSquaresY,
        offsetX: 40 * offsetX,
        offsetY: 40 * offsetY,
      });
      if (!newImageData) return;

      CreatePixelImageData.call(newImageData as PixelImageData);
      dispatch({
        type: "SET_STATE_WITH_CHECKPOINT",
        payload: {
          pixelSize: pixelSizeToFit(newImageData),
          anchorSquare: {
            x: currentState.anchorSquare.x + offsetX,
            y: currentState.anchorSquare.y + offsetY,
          },
          imageData: newImageData as PixelImageData,
          // Reset these to avoid issues
          selectionImageData: null,
          selectionOffset: { x: 0, y: 0 },
          interaction: { s: null, e: null, points: [] },
          interactionPixels: null,
        },
      });
    },
    []
  );

  const handleCanvasShrink = useCallback(
    (dSquaresX: number, dSquaresY: number, offsetX: number, offsetY: number) => {
      const currentState = stateRef.current;
      if (!currentState.imageData) return;

      const newWidth = currentState.imageData.width + 40 * dSquaresX;
      const newHeight = currentState.imageData.height + 40 * dSquaresY;

      if (newWidth < 40 || newHeight < 40) {
        return;
      }

      handleCanvasUpdateSize(dSquaresX, dSquaresY, offsetX, offsetY);
    },
    [handleCanvasUpdateSize]
  );

  const { imageData, tool, toolSize, color, undoStack, redoStack } = state;

  return (
    <Modal isOpen={imageData !== null} backdrop="static" toggle={() => {}} className="paint">
      <div tabIndex={0} onKeyDown={handleKeyDown}>
        <input
          id="hiddenFileInput"
          ref={fileInputRef}
          accept="image/*"
          type="file"
          style={{ position: "fixed", top: -1000 }}
          onChange={handleChooseFile}
          onFocus={(event) => (event.target.parentNode as HTMLElement)?.focus()}
        />
        <div className="modal-header" style={{ display: "flex", alignItems: "center" }}>
          <h4 style={{ flex: 1 }}>Edit Appearance</h4>
          <Button
            title="Undo"
            className="icon"
            onClick={handleUndo}
            disabled={undoStack.length === 0}
          >
            <img src={new URL("../../img/icon_undo.png", import.meta.url).href} />
          </Button>
          <Button
            title="Redo"
            className="icon"
            onClick={handleRedo}
            disabled={redoStack.length === 0}
          >
            <img src={new URL("../../img/icon_redo.png", import.meta.url).href} />
          </Button>
          <ButtonDropdown
            isOpen={state.dropdownOpen}
            toggle={() => dispatch({ type: "SET_STATE", payload: { dropdownOpen: !state.dropdownOpen } })}
          >
            <DropdownMenu right>
              <DropdownItem onClick={handleSelectAll}>Select All</DropdownItem>
              {state.selectionImageData ? (
                <DropdownItem
                  onClick={() =>
                    dispatch({ type: "SET_STATE_WITH_CHECKPOINT", payload: { selectionImageData: null } })
                  }
                >
                  Clear Selection
                </DropdownItem>
              ) : (
                <DropdownItem onClick={handleClearAll}>Clear All</DropdownItem>
              )}
              <DropdownItem
                disabled={!state.selectionImageData}
                onClick={() => clipboardHandlersRef.current.cut(new ClipboardEvent("cut"))}
              >
                Cut Selection
              </DropdownItem>
              <DropdownItem
                disabled={!state.selectionImageData}
                onClick={() => clipboardHandlersRef.current.copy(new ClipboardEvent("copy"))}
              >
                Copy Selection
              </DropdownItem>
              <DropdownItem onClick={() => clipboardHandlersRef.current.paste(new ClipboardEvent("paste"))}>
                Paste
              </DropdownItem>
              <DropdownItem divider />
              <DropdownItem
                onClick={() =>
                  handleApplyCoordinateTransform(({ x, y }) => ({
                    x: (stateRef.current.imageData?.width ?? 0) - x,
                    y,
                  }))
                }
              >
                Flip Horizontally
              </DropdownItem>
              <DropdownItem
                onClick={() =>
                  handleApplyCoordinateTransform(({ x, y }) => ({
                    x,
                    y: (stateRef.current.imageData?.height ?? 0) - y,
                  }))
                }
              >
                Flip Vertically
              </DropdownItem>
              <DropdownItem
                onClick={() =>
                  handleApplyCoordinateTransform(({ x, y }) => ({
                    x: y,
                    y: (stateRef.current.imageData?.width ?? 0) - x,
                  }))
                }
              >
                Rotate 90º
              </DropdownItem>
              <DropdownItem
                onClick={() =>
                  handleApplyCoordinateTransform(({ x, y }) => ({
                    x: (stateRef.current.imageData?.height ?? 0) - y,
                    y: x,
                  }))
                }
              >
                Rotate -90º
              </DropdownItem>
              <DropdownItem divider />
              <DropdownItem
                onClick={handleChooseAnchorSquare}
                disabled={imageData !== null && imageData.width === 40 && imageData.height === 40}
              >
                Choose Anchor Square
              </DropdownItem>
              <DropdownItem divider />
              <label htmlFor="hiddenFileInput" className="dropdown-item" style={{ margin: 0 }}>
                Import Image from File...
              </label>
              <DropdownItem onClick={handleDownloadImage}>Download Sprite as PNG</DropdownItem>
            </DropdownMenu>
            <DropdownToggle className="icon">
              <i className="fa fa-ellipsis-v" />
            </DropdownToggle>
          </ButtonDropdown>
        </div>
        <ModalBody>
          <div className="flex-horizontal" style={{ gap: 8 }}>
            <div className="paint-sidebar">
              <PixelColorPicker
                color={color}
                onColorChange={(c) => dispatch({ type: "SET_STATE", payload: { color: c } })}
                supported={tool.supportsColor()}
              />
              <PixelToolbar tools={TOOLS_LIST} tool={tool} onToolChange={handleChooseTool} />
              <PixelToolSize
                tool={tool}
                size={toolSize}
                onSizeChange={(size) => dispatch({ type: "SET_STATE", payload: { toolSize: size } })}
              />

              <Button size="sm" style={{ width: 114 }} onClick={handleClearAll}>
                Clear Canvas
              </Button>

              <SpriteVariablesPanel
                character={character}
                actor={currentActor}
                showVariables={state.showVariables}
                visibleVariables={state.visibleVariables}
                onToggleVariableVisibility={handleToggleVariableVisibility}
              />
            </div>
            <div className="canvas-arrows-flex">
              <Button
                className="canvas-arrow"
                size="sm"
                onClick={() => handleCanvasUpdateSize(0, 1, 0, 1)}
              >
                +
              </Button>
              <Button
                className="canvas-arrow"
                size="sm"
                disabled={imageData !== null && imageData.height <= 40}
                onClick={() => handleCanvasShrink(0, -1, 0, -1)}
              >
                −
              </Button>
              <div className="canvas-arrows-flex" style={{ flexDirection: "row" }}>
                <Button
                  className="canvas-arrow"
                  size="sm"
                  onClick={() => handleCanvasUpdateSize(1, 0, 1, 0)}
                >
                  +
                </Button>
                <Button
                  className="canvas-arrow"
                  size="sm"
                  disabled={imageData !== null && imageData.width <= 40}
                  onClick={() => handleCanvasShrink(-1, 0, -1, 0)}
                >
                  −
                </Button>
                <div style={{ position: "relative" }}>
                  <PixelCanvas
                    onMouseDown={handleCanvasMouseDown}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    tool={tool}
                    color={color}
                    pixelSize={state.pixelSize}
                    anchorSquare={state.anchorSquare}
                    imageData={state.imageData}
                    selectionImageData={state.selectionImageData}
                    selectionOffset={state.selectionOffset}
                    interactionPixels={state.interactionPixels}
                  />
                  <VariableOverlay
                    character={character}
                    actor={currentActor}
                    showVariables={state.showVariables}
                    visibleVariables={state.visibleVariables}
                    pixelSize={state.pixelSize}
                    imageData={state.imageData}
                  />
                </div>
                <div
                  style={{
                    height: "100%",
                    display: "grid",
                    gap: 20,
                    gridTemplateRows: "1fr auto 1fr",
                  }}
                >
                  <span />
                  <div className="canvas-arrows-flex" style={{ flexDirection: "row" }}>
                    <Button
                      size="sm"
                      className="canvas-arrow"
                      disabled={imageData !== null && imageData.width <= 40}
                      onClick={() => handleCanvasShrink(-1, 0, 0, 0)}
                    >
                      −
                    </Button>
                    <Button
                      size="sm"
                      className="canvas-arrow"
                      onClick={() => handleCanvasUpdateSize(1, 0, 0, 0)}
                    >
                      +
                    </Button>
                  </div>
                  <div>
                    <input
                      type="range"
                      min={1}
                      max={11}
                      style={{ writingMode: "vertical-rl", marginLeft: 14 }}
                      value={state.pixelSize}
                      onChange={(e) =>
                        dispatch({ type: "SET_STATE", payload: { pixelSize: Number(e.currentTarget.value) } })
                      }
                    />
                  </div>
                </div>
              </div>
              <Button
                className="canvas-arrow"
                size="sm"
                disabled={imageData !== null && imageData.height <= 40}
                onClick={() => handleCanvasShrink(0, -1, 0, 0)}
              >
                −
              </Button>
              <Button
                className="canvas-arrow"
                size="sm"
                onClick={() => handleCanvasUpdateSize(0, 1, 0, 0)}
              >
                +
              </Button>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <div
            className="ai-sprite-generator"
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <input
              type="text"
              style={{ flex: 1 }}
              placeholder="Describe your sprite..."
              value={state.spriteDescription || ""}
              onChange={(e) =>
                dispatch({ type: "SET_STATE", payload: { spriteDescription: e.target.value } })
              }
            />
            <Button size="sm" onClick={handleGenerateSprite} disabled={state.isGeneratingSprite}>
              {state.isGeneratingSprite ? (
                <span>
                  <i className="fa fa-spinner fa-spin" /> Drawing...
                </span>
              ) : (
                <span>
                  <i className="fa fa-magic" /> Draw with AI
                </span>
              )}
            </Button>
          </div>
          <div style={{ flex: 1 }} />
          <Button key="cancel" onClick={handleClose}>
            Close without Saving
          </Button>{" "}
          <Button
            color="primary"
            key="save"
            data-tutorial-id="paint-save-and-close"
            onClick={handleCloseAndSave}
          >
            Save Changes
          </Button>
        </ModalFooter>
      </div>
    </Modal>
  );
};

export default PaintContainer;
