import React, { useCallback, useEffect, useRef, useState } from "react";
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
import { PaintCheckpoint, PixelImageData, PixelInteraction } from "./types";
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

interface PaintState {
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
  tool: TOOLS_LIST.find((t) => t.name === "pen")!,
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

const PaintContainer: React.FC = () => {
  const dispatch = useDispatch();

  // Redux selectors
  const { characterId, appearanceId } = useSelector<EditorState, { characterId: string | null; appearanceId: string | null }>(
    (state) => state.ui.paint
  );
  const characters = useSelector<EditorState, Characters>((state) => state.characters);
  const selectedActors = useSelector<EditorState, EditorState["ui"]["selectedActors"]>(
    (state) => state.ui.selectedActors
  );
  const world = useSelector<EditorState, EditorState["world"]>((state) => state.world);

  // Compute current actor from selection
  const currentActor: Actor | null = (() => {
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
  })();

  const [state, setState] = useState<PaintState>(INITIAL_STATE);

  const getCheckpoint = useCallback(
    (s: PaintState = state): PaintCheckpoint => ({
      imageData: s.imageData,
      selectionImageData: s.selectionImageData,
      selectionOffset: s.selectionOffset,
    }),
    [state]
  );

  const setStateWithCheckpoint = useCallback(
    (nextState: Partial<PaintState>) => {
      setState((prev) => ({
        ...prev,
        ...nextState,
        redoStack: [],
        undoStack: prev.undoStack
          .slice(Math.max(0, prev.undoStack.length - MAX_UNDO_STEPS))
          .concat([getCheckpoint(prev)]),
      }));
    },
    [getCheckpoint]
  );

  // Load image data when character/appearance changes
  useEffect(() => {
    if (characterId && characters[characterId]) {
      const { appearances, appearanceInfo } = characters[characterId].spritesheet;
      const anchorSquare = appearanceInfo?.[appearanceId!]?.anchor || { x: 0, y: 0 };
      const frameDataURL = appearances[appearanceId!]?.[0];

      if (!frameDataURL) return;

      const variableOverlay = appearanceInfo?.[appearanceId!]?.variableOverlay || {
        showVariables: false,
        visibleVariables: {},
      };

      getImageDataFromDataURL(frameDataURL, {}, (imageData) => {
        CreatePixelImageData.call(imageData as PixelImageData);
        setState({
          ...INITIAL_STATE,
          imageData: imageData as PixelImageData,
          anchorSquare,
          pixelSize: pixelSizeToFit(imageData),
          showVariables: variableOverlay.showVariables,
          visibleVariables: variableOverlay.visibleVariables,
        });
      });
    } else {
      setState(INITIAL_STATE);
    }
  }, [characterId, appearanceId, characters]);

  // Clipboard event handlers
  const handleGlobalCopy = useCallback(
    async (event: ClipboardEvent) => {
      if (state.imageData === null) {
        return; // modal closed
      }
      event.preventDefault();

      const data: Record<string, Blob | string> = {
        "text/plain": JSON.stringify(state.selectionOffset),
      };

      const blob = await getBlobFromImageData(state.selectionImageData);
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
    [state.imageData, state.selectionImageData, state.selectionOffset]
  );

  const handleGlobalCut = useCallback(
    (event: ClipboardEvent) => {
      if (state.imageData === null) {
        return; // modal closed
      }
      handleGlobalCopy(event);
      setStateWithCheckpoint({ selectionImageData: null });
    },
    [state.imageData, handleGlobalCopy, setStateWithCheckpoint]
  );

  const applyExternalDataURL = useCallback(
    (dataURL: string, offset?: Point | null, options?: { fill?: boolean }) => {
      const { imageData } = state;
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

          setStateWithCheckpoint({
            imageData: getFlattenedImageData(state),
            selectionOffset: offset || { x: 0, y: 0 },
            selectionImageData: nextSelectionImageData as PixelImageData,
            tool: TOOLS_LIST.find((t) => t.name === "select"),
          });
        }
      );
    },
    [state, setStateWithCheckpoint]
  );

  const handleGlobalPaste = useCallback(
    async (event: ClipboardEvent) => {
      if (state.imageData === null) {
        return; // modal closed
      }
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
      } catch (err) {
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
    [state.imageData, applyExternalDataURL]
  );

  // Attach clipboard event listeners
  useEffect(() => {
    document.body.addEventListener("cut", handleGlobalCut as EventListener);
    document.body.addEventListener("copy", handleGlobalCopy as EventListener);
    document.body.addEventListener("paste", handleGlobalPaste as EventListener);

    return () => {
      document.body.removeEventListener("cut", handleGlobalCut as EventListener);
      document.body.removeEventListener("copy", handleGlobalCopy as EventListener);
      document.body.removeEventListener("paste", handleGlobalPaste as EventListener);
    };
  }, [handleGlobalCut, handleGlobalCopy, handleGlobalPaste]);

  const handleUndo = useCallback(() => {
    const undoStack = [...state.undoStack];
    const changes = undoStack.pop();
    if (!changes) {
      return;
    }
    const redoStack = [...state.redoStack, getCheckpoint()];
    setState((prev) => ({ ...prev, ...changes, redoStack, undoStack }));
  }, [state.undoStack, state.redoStack, getCheckpoint]);

  const handleRedo = useCallback(() => {
    const redoStack = [...state.redoStack];
    const changes = redoStack.pop();
    if (!changes) {
      return;
    }
    const undoStack = [...state.undoStack, getCheckpoint()];
    setState((prev) => ({ ...prev, ...changes, redoStack, undoStack }));
  }, [state.undoStack, state.redoStack, getCheckpoint]);

  const handleClose = useCallback(() => {
    dispatch(paintCharacterAppearance(null));
  }, [dispatch]);

  const handleCloseAndSave = useCallback(async () => {
    if (!characterId || !appearanceId) return;

    const flattened = getFlattenedImageData(state);
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
    const character = characters[characterId];

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
    dispatch(paintCharacterAppearance(null));

    // Then update character data after a small delay to prevent modal reopening
    setTimeout(() => {
      dispatch(
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
                anchor: state.anchorSquare,
                filled: getFilledSquares(flattened),
                width: flattened.width / 40,
                height: flattened.height / 40,
                variableOverlay: {
                  showVariables: state.showVariables,
                  visibleVariables: state.visibleVariables,
                },
              },
            },
          },
        })
      );
    }, 10);
  }, [characterId, appearanceId, characters, state, dispatch]);

  const handleClearAll = useCallback(() => {
    if (!state.imageData) return;
    const empty = state.imageData.clone();
    empty.clearPixelsInRect(0, 0, empty.width, empty.height);
    setStateWithCheckpoint({
      spriteName: "",
      imageData: empty,
      selectionOffset: { x: 0, y: 0 },
      selectionImageData: null,
    });
  }, [state.imageData, setStateWithCheckpoint]);

  const handleSelectAll = useCallback(() => {
    if (!state.imageData) return;
    const empty = state.imageData.clone();
    empty.clearPixelsInRect(0, 0, empty.width, empty.height);
    setStateWithCheckpoint({
      imageData: empty,
      selectionOffset: { x: 0, y: 0 },
      selectionImageData: getFlattenedImageData(state),
    });
  }, [state, setStateWithCheckpoint]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
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
        setStateWithCheckpoint({
          imageData: getFlattenedImageData(state),
          selectionImageData: null,
        });
      } else if (event.key === "Delete" || event.key === "Backspace") {
        setStateWithCheckpoint({
          selectionImageData: null,
        });
      } else if (event.key.startsWith("Arrow")) {
        const delta = event.shiftKey ? 5 : 1;
        setStateWithCheckpoint({
          selectionOffset: {
            x:
              state.selectionOffset.x +
              ({ ArrowLeft: -delta, ArrowRight: delta }[event.key] || 0),
            y:
              state.selectionOffset.y +
              ({ ArrowUp: -delta, ArrowDown: delta }[event.key] || 0),
          },
        });
      }
    },
    [handleRedo, handleUndo, handleSelectAll, setStateWithCheckpoint, state]
  );

  const handleChooseTool = useCallback(
    (tool: Tools.PixelTool) => {
      console.log(`[PixelToolbar] Tool clicked: ${tool.name}`);
      setState((prev) => ({
        ...prev,
        tool: tool,
        imageData: getFlattenedImageData(prev),
        selectionImageData: null,
      }));
    },
    []
  );

  const handleCanvasMouseDown = useCallback(
    (event: React.MouseEvent, pixel: Point) => {
      const tool = state.tool;
      if (tool) {
        console.log(`[Canvas] MouseDown with tool: ${tool.name}, pixel:`, pixel, "event:", event);
        const result = tool.mousedown(pixel, state as any, event);
        setState((prev) => ({
          ...prev,
          ...result,
          redoStack: [],
          undoStack: prev.undoStack
            .slice(Math.max(0, prev.undoStack.length - MAX_UNDO_STEPS))
            .concat([getCheckpoint(prev)]),
        } as PaintState));
      }
    },
    [state, getCheckpoint]
  );

  const handleCanvasMouseMove = useCallback(
    (event: MouseEvent | React.MouseEvent, pixel: Point) => {
      const tool = state.tool;
      if (tool) {
        const result = tool.mousemove(pixel, state as any);
        setState((prev) => ({ ...prev, ...result } as PaintState));
      }
    },
    [state]
  );

  const handleCanvasMouseUp = useCallback(
    (event: MouseEvent | React.MouseEvent, pixel: Point) => {
      const tool = state.tool;
      if (tool) {
        console.log(`[Canvas] MouseUp with tool: ${tool.name}, pixel:`, pixel, "event:", event);
        const moved = tool.mousemove(pixel, state as any);
        const result = tool.mouseup({ ...state, ...moved } as any);
        setState((prev) => ({ ...prev, ...result } as PaintState));
      }
    },
    [state]
  );

  const handleApplyCoordinateTransform = useCallback(
    (coordTransformCallback: (p: Point) => Point) => {
      const key = state.selectionImageData ? "selectionImageData" : "imageData";
      const source = state[key];
      if (!source) return;

      const clone = source.clone();

      for (let x = 0; x < clone.width; x++) {
        for (let y = 0; y < clone.height; y++) {
          const { x: nx, y: ny } = coordTransformCallback({ x, y });
          clone.fillPixelRGBA(x, y, ...source.getPixel(nx, ny));
        }
      }
      setStateWithCheckpoint({
        [key]: clone,
      });
    },
    [state, setStateWithCheckpoint]
  );

  const handleChooseAnchorSquare = useCallback(() => {
    handleChooseTool(new Tools.ChooseAnchorSquareTool(state.tool));
  }, [state.tool, handleChooseTool]);

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

  const handleGenerateSprite = useCallback(async () => {
    const description = state.spriteDescription;
    const prompt = `Generate a pixel art sprite with a solid background based on the following description: ${description}`;

    const { imageData } = state;
    if (!imageData) return;

    const canvasWidth = imageData.width;
    const canvasHeight = imageData.height;

    setState((prev) => ({ ...prev, isGeneratingSprite: true }));
    try {
      const data = await makeRequest(
        `/generate-sprite?prompt=${encodeURIComponent(prompt)}&width=${canvasWidth}&height=${canvasHeight}`
      );
      if (data.imageUrl) {
        console.log("data.imageUrl", data.imageUrl);
        applyExternalDataURL(data.imageUrl, null, { fill: true });
      } else {
        console.error("Failed to generate sprite:", data.error);
      }

      if (data.name) {
        setState((prev) => ({ ...prev, spriteName: data.name }));
        console.log("spriteName", data.name);
      } else {
        console.error("Failed to generate sprite name:", data.error);
      }
    } catch (error) {
      console.error("Error fetching sprite:", error);
    } finally {
      setState((prev) => ({ ...prev, isGeneratingSprite: false }));
    }

    // Wait for the image to be loaded and state to be updated before applying magic wand
    setTimeout(() => {
      setState((prev) => {
        if (!prev.imageData) return prev;

        const magicWandTool = TOOLS_LIST.find((t) => t.name === "magicWand")!;
        const flattened = getFlattenedImageData(prev);

        // Apply magic wand at (0,0) to select background
        const stateWithTool = {
          ...prev,
          tool: magicWandTool,
          imageData: flattened,
          selectionImageData: null,
        };

        const afterMousedown = magicWandTool.mousedown(
          { x: 0, y: 0 },
          stateWithTool as any,
          { altKey: false } as any
        );

        const afterMousemove = magicWandTool.mousemove(
          { x: 0, y: 0 },
          { ...stateWithTool, ...afterMousedown } as any
        );

        const afterMouseup = magicWandTool.mouseup({
          ...stateWithTool,
          ...afterMousedown,
          ...afterMousemove,
        } as any);

        // Clear the selection to remove background
        return {
          ...prev,
          ...afterMouseup,
          selectionImageData: null,
          undoStack: prev.undoStack.concat([
            {
              imageData: prev.imageData,
              selectionImageData: prev.selectionImageData,
              selectionOffset: prev.selectionOffset,
            },
          ]),
          redoStack: [],
        } as PaintState;
      });
    }, 500);
  }, [state.spriteDescription, state.imageData, applyExternalDataURL]);

  const handleDownloadImage = useCallback(() => {
    const { imageData } = state;
    if (!imageData || !characterId || !appearanceId) return;

    const canvas = document.createElement("canvas");
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext("2d")!;
    ctx.putImageData(imageData, 0, 0);

    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    const fileName = `${characters[characterId].name}_${appearanceId}.png`;
    link.download = fileName;
    link.click();
  }, [state.imageData, characterId, appearanceId, characters]);

  const handleToggleVariableVisibility = useCallback(
    (variableId: string) => {
      const newVisibleVariables = {
        ...state.visibleVariables,
        [variableId]: !state.visibleVariables[variableId],
      };

      const hasVisibleVariables = Object.values(newVisibleVariables).some(Boolean);

      setState((prev) => ({
        ...prev,
        visibleVariables: newVisibleVariables,
        showVariables: hasVisibleVariables,
      }));
    },
    [state.visibleVariables]
  );

  const handleCanvasUpdateSize = useCallback(
    (dSquaresX: number, dSquaresY: number, offsetX: number, offsetY: number) => {
      if (!state.imageData) return;

      const imageData = getImageDataWithNewFrame(state.imageData, {
        width: state.imageData.width + 40 * dSquaresX,
        height: state.imageData.height + 40 * dSquaresY,
        offsetX: 40 * offsetX,
        offsetY: 40 * offsetY,
      });
      if (!imageData) return;

      CreatePixelImageData.call(imageData as PixelImageData);
      setStateWithCheckpoint({
        ...INITIAL_STATE,
        pixelSize: pixelSizeToFit(imageData),
        anchorSquare: {
          x: state.anchorSquare.x + offsetX,
          y: state.anchorSquare.y + offsetY,
        },
        imageData: imageData as PixelImageData,
      });
    },
    [state.imageData, state.anchorSquare, setStateWithCheckpoint]
  );

  const handleCanvasShrink = useCallback(
    (dSquaresX: number, dSquaresY: number, offsetX: number, offsetY: number) => {
      if (!state.imageData) return;

      const newWidth = state.imageData.width + 40 * dSquaresX;
      const newHeight = state.imageData.height + 40 * dSquaresY;

      if (newWidth < 40 || newHeight < 40) {
        return;
      }

      handleCanvasUpdateSize(dSquaresX, dSquaresY, offsetX, offsetY);
    },
    [state.imageData, handleCanvasUpdateSize]
  );

  const { imageData, tool, toolSize, color, undoStack, redoStack } = state;
  const character = characterId ? characters[characterId] : null;

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
            toggle={() => setState((prev) => ({ ...prev, dropdownOpen: !prev.dropdownOpen }))}
          >
            <DropdownMenu right>
              <DropdownItem onClick={() => handleSelectAll()}>Select All</DropdownItem>
              {state.selectionImageData ? (
                <DropdownItem
                  onClick={() => setStateWithCheckpoint({ selectionImageData: null })}
                >
                  Clear Selection
                </DropdownItem>
              ) : (
                <DropdownItem onClick={() => handleClearAll()}>Clear All</DropdownItem>
              )}
              <DropdownItem
                disabled={!state.selectionImageData}
                onClick={(e) => handleGlobalCut(e.nativeEvent as unknown as ClipboardEvent)}
              >
                Cut Selection
              </DropdownItem>
              <DropdownItem
                disabled={!state.selectionImageData}
                onClick={(e) => handleGlobalCopy(e.nativeEvent as unknown as ClipboardEvent)}
              >
                Copy Selection
              </DropdownItem>
              <DropdownItem onClick={(e) => handleGlobalPaste(e.nativeEvent as unknown as ClipboardEvent)}>
                Paste
              </DropdownItem>
              <DropdownItem divider />
              <DropdownItem
                onClick={() =>
                  handleApplyCoordinateTransform(({ x, y }) => {
                    return { x: imageData!.width - x, y };
                  })
                }
              >
                Flip Horizontally
              </DropdownItem>
              <DropdownItem
                onClick={() =>
                  handleApplyCoordinateTransform(({ x, y }) => {
                    return { x, y: imageData!.height - y };
                  })
                }
              >
                Flip Vertically
              </DropdownItem>
              <DropdownItem
                onClick={() =>
                  handleApplyCoordinateTransform(({ x, y }) => {
                    return { x: y, y: imageData!.width - x };
                  })
                }
              >
                Rotate 90º
              </DropdownItem>
              <DropdownItem
                onClick={() =>
                  handleApplyCoordinateTransform(({ x, y }) => {
                    return { x: imageData!.height - y, y: x };
                  })
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
                onColorChange={(c) => setState((prev) => ({ ...prev, color: c }))}
                supported={tool.supportsColor()}
              />
              <PixelToolbar tools={TOOLS_LIST} tool={tool} onToolChange={handleChooseTool} />
              <PixelToolSize
                tool={tool}
                size={toolSize}
                onSizeChange={(toolSize) => setState((prev) => ({ ...prev, toolSize }))}
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
                        setState((prev) => ({ ...prev, pixelSize: Number(e.currentTarget.value) }))
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
              onChange={(e) => setState((prev) => ({ ...prev, spriteDescription: e.target.value }))}
            />
            <Button
              size="sm"
              onClick={handleGenerateSprite}
              disabled={state.isGeneratingSprite}
            >
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
            onClick={async () => {
              await handleCloseAndSave();
            }}
          >
            Save Changes
          </Button>
        </ModalFooter>
      </div>
    </Modal>
  );
};

export default PaintContainer;
