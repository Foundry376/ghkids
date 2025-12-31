import React, { useCallback, useEffect, useReducer, useRef } from "react";
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
import { Actor, Character, Characters, EditorState } from "../../../types";

import { upsertCharacter } from "../../actions/characters-actions";
import { paintCharacterAppearance } from "../../actions/ui-actions";

import { PaintModel, TOOLS_LIST } from "./paint-model";
import PixelCanvas from "./pixel-canvas";
import PixelColorPicker from "./pixel-color-picker";
import { PixelToolSize } from "./pixel-tool-size";
import PixelToolbar from "./pixel-toolbar";
import SpriteVariablesPanel from "./sprite-variables-panel";
import VariableOverlay from "./variable-overlay";

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

  // Get current character
  const character: Character | null = characterId ? characters[characterId] : null;

  // Get current actor from selection
  const currentActor: Actor | null = (() => {
    if (selectedActors?.worldId && selectedActors?.stageId && selectedActors.actorIds.length === 1) {
      const stage = world.stages[selectedActors.stageId];
      if (stage?.actors[selectedActors.actorIds[0]]) {
        return stage.actors[selectedActors.actorIds[0]];
      }
    }
    return null;
  })();

  // Create model once and subscribe to changes
  const modelRef = useRef<PaintModel | null>(null);
  if (!modelRef.current) {
    modelRef.current = new PaintModel();
  }
  const model = modelRef.current;

  // Force re-render when model state changes
  const [, forceUpdate] = useReducer((x) => x + 1, 0);
  useEffect(() => model.subscribe(forceUpdate), [model]);

  // Load character data when it changes
  useEffect(() => {
    if (character && appearanceId) {
      model.loadFromCharacter(character, appearanceId);
    } else {
      model.reset();
    }
  }, [character, appearanceId, model]);

  // Clipboard event handlers
  useEffect(() => {
    const handleCopy = (e: Event) => {
      e.preventDefault();
      model.copy();
    };
    const handleCut = (e: Event) => {
      e.preventDefault();
      model.cut();
    };
    const handlePaste = (e: Event) => {
      e.preventDefault();
      model.paste();
    };

    document.body.addEventListener("copy", handleCopy);
    document.body.addEventListener("cut", handleCut);
    document.body.addEventListener("paste", handlePaste);

    return () => {
      document.body.removeEventListener("copy", handleCopy);
      document.body.removeEventListener("cut", handleCut);
      document.body.removeEventListener("paste", handlePaste);
    };
  }, [model]);

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Event handlers - simple delegation to model
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (model.handleKeyDown(event.nativeEvent)) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    [model]
  );

  const handleClose = useCallback(() => {
    reduxDispatch(paintCharacterAppearance(null));
  }, [reduxDispatch]);

  const handleCloseAndSave = useCallback(async () => {
    if (!characterId || !appearanceId || !character) return;

    const saveData = model.getSaveData(character, appearanceId);
    if (!saveData) {
      alert(
        `Sorry, an error occurred and we're unable to save your image. Did you copy/paste,` +
          ` import from a file, or use the AI Generation feature? Please let me know at` +
          ` ben@foundry376.com and include what browser you're using!`
      );
      return;
    }

    // Generate name if untitled
    let generatedSpriteName = "";
    if (character.name === "Untitled") {
      try {
        const nameResp = await makeRequest<{ name?: string }>("/generate-sprite-name", {
          method: "POST",
          json: { imageData: saveData.imageDataURL },
        });
        if (nameResp?.name) {
          generatedSpriteName = nameResp.name;
        }
      } catch (err) {
        console.error("Failed to auto-generate sprite name:", err);
      }
    }

    // Close modal first
    reduxDispatch(paintCharacterAppearance(null));

    // Update character data after small delay
    setTimeout(() => {
      reduxDispatch(
        upsertCharacter(characterId, {
          name: generatedSpriteName || character.name,
          spritesheet: {
            appearances: {
              [appearanceId]: [saveData.imageDataURL],
            },
            appearanceNames: {
              [appearanceId]:
                generatedSpriteName || character.spritesheet.appearanceNames?.[appearanceId],
            },
            appearanceInfo: {
              [appearanceId]: {
                anchor: saveData.anchorSquare,
                filled: saveData.filled,
                width: saveData.width,
                height: saveData.height,
                variableOverlay: saveData.variableOverlay,
              },
            },
          },
        })
      );
    }, 10);
  }, [characterId, appearanceId, character, reduxDispatch, model]);

  const handleChooseFile = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        model.handleFileSelect(file);
      }
    },
    [model]
  );

  const handleDownloadImage = useCallback(() => {
    if (character && appearanceId) {
      model.downloadImage(character.name, appearanceId);
    }
  }, [model, character, appearanceId]);

  // Get current state from model
  const state = model.getState();
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
            onClick={() => model.undo()}
            disabled={undoStack.length === 0}
          >
            <img src={new URL("../../img/icon_undo.png", import.meta.url).href} />
          </Button>
          <Button
            title="Redo"
            className="icon"
            onClick={() => model.redo()}
            disabled={redoStack.length === 0}
          >
            <img src={new URL("../../img/icon_redo.png", import.meta.url).href} />
          </Button>
          <ButtonDropdown
            isOpen={state.dropdownOpen}
            toggle={() => model.setDropdownOpen(!state.dropdownOpen)}
          >
            <DropdownMenu right>
              <DropdownItem onClick={() => model.selectAll()}>Select All</DropdownItem>
              {state.selectionImageData ? (
                <DropdownItem onClick={() => model.clearSelection()}>Clear Selection</DropdownItem>
              ) : (
                <DropdownItem onClick={() => model.clearAll()}>Clear All</DropdownItem>
              )}
              <DropdownItem
                disabled={!state.selectionImageData}
                onClick={() => model.cut()}
              >
                Cut Selection
              </DropdownItem>
              <DropdownItem
                disabled={!state.selectionImageData}
                onClick={() => model.copy()}
              >
                Copy Selection
              </DropdownItem>
              <DropdownItem onClick={() => model.paste()}>Paste</DropdownItem>
              <DropdownItem divider />
              <DropdownItem onClick={() => model.flipHorizontally()}>
                Flip Horizontally
              </DropdownItem>
              <DropdownItem onClick={() => model.flipVertically()}>
                Flip Vertically
              </DropdownItem>
              <DropdownItem onClick={() => model.rotate90()}>Rotate 90º</DropdownItem>
              <DropdownItem onClick={() => model.rotateNeg90()}>Rotate -90º</DropdownItem>
              <DropdownItem divider />
              <DropdownItem
                onClick={() => model.chooseAnchorSquare()}
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
                onColorChange={(c) => model.setColor(c)}
                supported={tool.supportsColor()}
              />
              <PixelToolbar
                tools={TOOLS_LIST}
                tool={tool}
                onToolChange={(t) => model.chooseTool(t)}
              />
              <PixelToolSize
                tool={tool}
                size={toolSize}
                onSizeChange={(size) => model.setToolSize(size)}
              />

              <Button size="sm" style={{ width: 114 }} onClick={() => model.clearAll()}>
                Clear Canvas
              </Button>

              <SpriteVariablesPanel
                character={character}
                actor={currentActor}
                showVariables={state.showVariables}
                visibleVariables={state.visibleVariables}
                onToggleVariableVisibility={(id) => model.toggleVariableVisibility(id)}
              />
            </div>
            <div className="canvas-arrows-flex">
              <Button
                className="canvas-arrow"
                size="sm"
                onClick={() => model.updateCanvasSize(0, 1, 0, 1)}
              >
                +
              </Button>
              <Button
                className="canvas-arrow"
                size="sm"
                disabled={imageData !== null && imageData.height <= 40}
                onClick={() => model.shrinkCanvas(0, -1, 0, -1)}
              >
                −
              </Button>
              <div className="canvas-arrows-flex" style={{ flexDirection: "row" }}>
                <Button
                  className="canvas-arrow"
                  size="sm"
                  onClick={() => model.updateCanvasSize(1, 0, 1, 0)}
                >
                  +
                </Button>
                <Button
                  className="canvas-arrow"
                  size="sm"
                  disabled={imageData !== null && imageData.width <= 40}
                  onClick={() => model.shrinkCanvas(-1, 0, -1, 0)}
                >
                  −
                </Button>
                <div style={{ position: "relative" }}>
                  <PixelCanvas
                    model={model}
                    tool={tool}
                    color={color}
                    toolSize={toolSize}
                    pixelSize={state.pixelSize}
                    anchorSquare={state.anchorSquare}
                    imageData={state.imageData}
                    selectionImageData={state.selectionImageData}
                    selectionOffset={state.selectionOffset}
                    interaction={state.interaction}
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
                      onClick={() => model.shrinkCanvas(-1, 0, 0, 0)}
                    >
                      −
                    </Button>
                    <Button
                      size="sm"
                      className="canvas-arrow"
                      onClick={() => model.updateCanvasSize(1, 0, 0, 0)}
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
                      onChange={(e) => model.setPixelSize(Number(e.currentTarget.value))}
                    />
                  </div>
                </div>
              </div>
              <Button
                className="canvas-arrow"
                size="sm"
                disabled={imageData !== null && imageData.height <= 40}
                onClick={() => model.shrinkCanvas(0, -1, 0, 0)}
              >
                −
              </Button>
              <Button
                className="canvas-arrow"
                size="sm"
                onClick={() => model.updateCanvasSize(0, 1, 0, 0)}
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
              onChange={(e) => model.setSpriteDescription(e.target.value)}
            />
            <Button size="sm" onClick={() => model.generateSprite()} disabled={state.isGeneratingSprite}>
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
