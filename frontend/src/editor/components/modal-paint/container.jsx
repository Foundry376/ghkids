import PropTypes from "prop-types";
import React from "react";
import { connect } from "react-redux";
import Button from "reactstrap/lib/Button";
import ButtonDropdown from "reactstrap/lib/ButtonDropdown";
import DropdownItem from "reactstrap/lib/DropdownItem";
import DropdownMenu from "reactstrap/lib/DropdownMenu";
import DropdownToggle from "reactstrap/lib/DropdownToggle";
import Modal from "reactstrap/lib/Modal";
import ModalBody from "reactstrap/lib/ModalBody";
import ModalFooter from "reactstrap/lib/ModalFooter";

import { makeRequest } from "../../../helpers/api";

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
} from "./helpers";

import PixelCanvas from "./pixel-canvas";
import PixelColorPicker, { ColorOptions } from "./pixel-color-picker";
import { PixelToolSize } from "./pixel-tool-size";
import PixelToolbar from "./pixel-toolbar";
import SpriteVariablesPanel from "./sprite-variables-panel";
import VariableOverlay from "./variable-overlay";

const MAX_UNDO_STEPS = 30;

const TOOLS = [
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

const INITIAL_STATE = {
  color: ColorOptions[3],
  tool: TOOLS.find((t) => t.name === "pen"),
  spriteName: "",
  toolSize: 1,
  pixelSize: 11,
  anchorSquare: { x: 0, y: 0 },
  imageData: null,
  selectionImageData: null,
  selectionOffset: {
    x: 0,
    y: 0,
  },

  undoStack: [],
  redoStack: [],

  interaction: {},
  interactionPixels: null,
  
  showVariables: false,
  visibleVariables: {},
};

class Container extends React.Component {
  static propTypes = {
    dispatch: PropTypes.func,

    characters: PropTypes.object,
    characterId: PropTypes.string,
    appearanceId: PropTypes.string,
  };

  constructor(props, context) {
    super(props, context);
    this.state = Object.assign({}, INITIAL_STATE, {
      isGeneratingSprite: false,
    });
  }

  componentDidMount() {
    this.setImageDataFromProps();

    // add event listeners which can't be attached to our div
    document.body.addEventListener("cut", this._onGlobalCut);
    document.body.addEventListener("copy", this._onGlobalCopy);
    document.body.addEventListener("paste", this._onGlobalPaste);
  }

  componentWillReceiveProps(nextProps) {
    this.setImageDataFromProps(nextProps);
  }

  componentWillUnmount() {
    document.body.removeEventListener("cut", this._onGlobalCut);
    document.body.removeEventListener("copy", this._onGlobalCopy);
    document.body.removeEventListener("paste", this._onGlobalPaste);
  }

  setImageDataFromProps(props = this.props) {
    const { characterId, characters, appearanceId } = props;

    if (characterId) {
      const { appearances, appearanceInfo, appearanceNames } = characters[characterId].spritesheet;
      const anchorSquare = appearanceInfo?.[appearanceId]?.anchor || { x: 0, y: 0 };
      const spriteName = appearanceNames?.[appearanceId] || "Untitled";
      const frameDataURL = appearances[appearanceId][0];

      const variableOverlay = appearanceInfo?.[appearanceId]?.variableOverlay || {
        showVariables: false,
        visibleVariables: {},
      };

      getImageDataFromDataURL(frameDataURL, {}, (imageData) => {
        CreatePixelImageData.call(imageData);
        this.setState(
          Object.assign({}, INITIAL_STATE, {
            imageData,
            anchorSquare,
            pixelSize: pixelSizeToFit(imageData),
            showVariables: variableOverlay.showVariables,
            visibleVariables: variableOverlay.visibleVariables,
            spriteName,
          }),
        );
      });
    } else {
      this.setState(Object.assign({}, INITIAL_STATE));
    }
  }

  getCheckpoint(state = this.state) {
    return {
      imageData: state.imageData,
      selectionImageData: state.selectionImageData,
      selectionOffset: state.selectionOffset,
    };
  }

  setStateWithCheckpoint(nextState) {
    this.setState(
      Object.assign({}, nextState, {
        redoStack: [],
        undoStack: this.state.undoStack
          .slice(Math.max(0, this.state.undoStack.length - MAX_UNDO_STEPS))
          .concat([this.getCheckpoint()]),
      }),
    );
  }

  _onUndo = () => {
    const undoStack = [].concat(this.state.undoStack);
    const changes = undoStack.pop();
    if (!changes) {
      return;
    }
    const redoStack = [].concat(this.state.redoStack, [this.getCheckpoint()]);
    this.setState(Object.assign({}, changes, { redoStack, undoStack }));
  };

  _onRedo = () => {
    const redoStack = [].concat(this.state.redoStack);
    const changes = redoStack.pop();
    if (!changes) {
      return;
    }
    const undoStack = [].concat(this.state.undoStack, [this.getCheckpoint()]);
    this.setState(Object.assign({}, changes, { redoStack, undoStack }));
  };

  _onClose = () => {
    this.props.dispatch(paintCharacterAppearance(null));
  };

  _onCloseAndSave = async () => {
    const { dispatch, characterId, appearanceId, characters } = this.props;
    const flattened = getFlattenedImageData(this.state);
    // Trim inwards from all sides if an entire row / column of tiles is empty.
    // We want to "auto-shrink" the canvas if the kid goes wild with the + button.
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
    let { spriteName } = this.state;
    // If spriteName is empty, generate a name from the backend
    if (!spriteName) {
      try {
        const nameResp = await makeRequest("/generate-sprite-name", {
          method: "POST",
          json: { imageData: imageDataURL },
        });
        if (nameResp && nameResp.name) {
          spriteName = nameResp.name;
          this.setState({ spriteName });
        }
      } catch (err) {
        console.error("Failed to auto-generate sprite name:", err);
      }
    }

    let values = {
      spritesheet: { appearances: { [appearanceId]: [imageDataURL] } },
    };
    // Only update the name if it is still "Untitled" and we have a generated spriteName
    if (character && character.name === "Untitled" && spriteName) {
      values.name = spriteName;
    }

    // Close modal first
    dispatch(paintCharacterAppearance(null));

    // Then update character data after a small delay to prevent modal reopening
    setTimeout(() => {
      dispatch(
        upsertCharacter(characterId, {
          spritesheet: {
            appearances: { [appearanceId]: [imageDataURL] },
            appearanceNames: { [appearanceId]: values.name },
            appearanceInfo: {
              [appearanceId]: {
                anchor: this.state.anchorSquare,
                filled: getFilledSquares(flattened),
                width: flattened.width / 40,
                height: flattened.height / 40,
                variableOverlay: {
                  showVariables: this.state.showVariables,
                  visibleVariables: this.state.visibleVariables,
                },
              },
            },
          },
        }),
      );
    }, 10);
  };

  _onClearAll = () => {
    const empty = this.state.imageData.clone();
    empty.clearPixelsInRect(0, 0, empty.width, empty.height);
    this.setStateWithCheckpoint({
      spriteName: "",
      imageData: empty,
      selectionOffset: { x: 0, y: 0 },
      selectionImageData: null,
    });
  };

  _onSelectAll = () => {
    const empty = this.state.imageData.clone();
    empty.clearPixelsInRect(0, 0, empty.width, empty.height);
    this.setStateWithCheckpoint({
      imageData: empty,
      selectionOffset: { x: 0, y: 0 },
      selectionImageData: getFlattenedImageData(this.state),
    });
  };

  _onKeyDown = (event) => {
    if ((event.key === "y" || event.key === "Z") && (event.ctrlKey || event.metaKey)) {
      this._onRedo();
      event.preventDefault();
      event.stopPropagation();
    } else if (event.key === "z" && (event.ctrlKey || event.metaKey)) {
      this._onUndo();
      event.preventDefault();
      event.stopPropagation();
    } else if (event.key === "a" && (event.ctrlKey || event.metaKey)) {
      this._onSelectAll();
      event.preventDefault();
      event.stopPropagation();
    } else if (event.key === "Escape" || event.key === "Enter") {
      this.setStateWithCheckpoint({
        imageData: getFlattenedImageData(this.state),
        selectionImageData: null,
      });
    } else if (event.key === "Delete" || event.key === "Backspace") {
      this.setStateWithCheckpoint({
        selectionImageData: null,
      });
    } else if (event.key.startsWith("Arrow")) {
      const delta = event.shiftKey ? 5 : 1;
      this.setStateWithCheckpoint({
        selectionOffset: {
          x:
            this.state.selectionOffset.x +
            ({ ArrowLeft: -delta, ArrowRight: delta }[event.key] || 0),
          y: this.state.selectionOffset.y + ({ ArrowUp: -delta, ArrowDown: delta }[event.key] || 0),
        },
      });
    }
  };

  _onGlobalCopy = async (event) => {
    if (this.state.imageData === null) {
      return; // modal closed
    }
    event.preventDefault();

    const data = {
      "image/png": await getBlobFromImageData(this.state.selectionImageData),
      "text/plain": JSON.stringify(this.state.selectionOffset),
    };

    const clipboardItem = new ClipboardItem(data);
    await navigator.clipboard.write([clipboardItem]);
  };

  _onGlobalCut = (event) => {
    if (this.state.imageData === null) {
      return; // modal closed
    }
    this._onGlobalCopy(event);
    this.setStateWithCheckpoint({ selectionImageData: null });
  };

  _onGlobalPaste = async (event) => {
    if (this.state.imageData === null) {
      return; // modal closed
    }
    const items = await navigator.clipboard.read();
    const imageItem = items.find((i) => i.types.some((t) => t.includes("image")));
    const offsetItem = items.find((d) => d.types.includes("text/plain"));

    let offset = null;
    try {
      offset = offsetItem ? JSON.parse(offsetItem.getType("text/plain")) : undefined;
    } catch (err) {
      // not our data
    }

    let image = null;
    if (imageItem) {
      image = await imageItem.getType("image/png");
    }

    if (image) {
      this._onApplyExternalDataURL(URL.createObjectURL(image), offset);
    }
  };

  _onApplyExternalDataURL = (dataURL, offset) => {
    const { imageData } = this.state;
    getImageDataFromDataURL(
      dataURL,
      {
        maxWidth: imageData.width,
        maxHeight: imageData.height,
      },
      (nextSelectionImageData) => {
        CreatePixelImageData.call(nextSelectionImageData);

        this.setStateWithCheckpoint({
          imageData: getFlattenedImageData(this.state),
          selectionOffset: offset || { x: 0, y: 0 },
          selectionImageData: nextSelectionImageData,
          tool: TOOLS.find((t) => t.name === "select"),
        });
      },
    );
  };

  _onChooseTool = (tool) => {
    console.log(`[PixelToolbar] Tool clicked: ${tool.name}`);
    this.setState({
      tool: tool,
      imageData: getFlattenedImageData(this.state),
      selectionImageData: null,
    });
  };

  _onCanvasMouseDown = (event, pixel) => {
    const tool = this.state.tool;
    if (tool) {
      console.log(`[Canvas] MouseDown with tool: ${tool.name}, pixel:`, pixel, "event:", event);
      this.setStateWithCheckpoint(tool.mousedown(pixel, this.state, event));
    }
  };

  _onCanvasMouseMove = (event, pixel) => {
    const tool = this.state.tool;
    if (tool) {
      this.setState(tool.mousemove(pixel, this.state));
    }
  };

  _onCanvasMouseUp = (event, pixel) => {
    const tool = this.state.tool;
    if (tool) {
      console.log(`[Canvas] MouseUp with tool: ${tool.name}, pixel:`, pixel, "event:", event);
      this.setState(tool.mouseup(tool.mousemove(pixel, this.state)));
    }
  };

  _onApplyCoordinateTransform = (coordTransformCallback) => {
    const key = this.state.selectionImageData ? "selectionImageData" : "imageData";
    const clone = this.state[key].clone();

    for (let x = 0; x < clone.width; x++) {
      for (let y = 0; y < clone.height; y++) {
        const { x: nx, y: ny } = coordTransformCallback({ x, y });
        clone.fillPixelRGBA(x, y, ...this.state[key].getPixel(nx, ny));
      }
    }
    this.setStateWithCheckpoint({
      [key]: clone,
    });
  };

  _onChooseAnchorSquare = () => {
    this._onChooseTool(new Tools.ChooseAnchorSquareTool(this.state.tool));
  };

  _onChooseFile = (event) => {
    const reader = new FileReader();
    reader.addEventListener(
      "load",
      () => {
        this._onApplyExternalDataURL(reader.result);
      },
      false,
    );
    const file = event.target.files[0];
    if (file) {
      reader.readAsDataURL(file);
    }
  };

  _onGenerateSprite = async () => {
    const description = this.state.spriteDescription;
    const prompt = `Generate a pixel art sprite with a solid background based on the following description: ${description}`;
    console.log(prompt);

    this.setState({ isGeneratingSprite: true });
    try {
      const data = await makeRequest(`/generate-sprite?prompt=${encodeURIComponent(prompt)}`);
      if (data.imageUrl) {
        console.log("data.imageUrl", data.imageUrl);
        this._onApplyExternalDataURL(data.imageUrl);
      } else {
        console.error("Failed to generate sprite:", data.error);
      }

      if (data.name) {
        this.setState({ spriteName: data.name });
        console.log("spriteName", this.state.spriteName);
      } else {
        console.error("Failed to generate sprite name:", data.error);
      }
    } catch (error) {
      console.error("Error fetching sprite:", error);
    } finally {
      this.setState({ isGeneratingSprite: false });
    }

    // Wait for the image to be loaded and state to be updated before applying magic wand
    setTimeout(() => {
      if (this.state.imageData) {
        // Step 1: Clear any selection and set tool to magicWand
        const magicWandTool = TOOLS.find((t) => t.name === "magicWand");

        this.setState({
          tool: magicWandTool,
          imageData: getFlattenedImageData(this.state),
          selectionImageData: null,
          shouldDrag: true,
        });

        // Step 2: Simulate mousedown on (0,0)
        this.setStateWithCheckpoint(
          magicWandTool.mousedown(
            { x: 0, y: 0 },
            this.state,
            { altKey: false },
            { draggingSelection: true },
          ),
        );

        // Step 3: Simulate mouseup
        this.setState(magicWandTool.mouseup(magicWandTool.mousemove({ x: 0, y: 0 }, this.state)));

        // Step 4: Wait and clear selection to remove background
        this.setStateWithCheckpoint({ selectionImageData: null });
      } else {
      }
    }, 500);
  };

  _onDownloadImage = () => {
    const { imageData } = this.state;
    const { characterId, characters, appearanceId } = this.props;
    const canvas = document.createElement("canvas");
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext("2d");
    ctx.putImageData(imageData, 0, 0);

    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    const fileName =
      characterId && appearanceId
        ? `${characters[characterId].name}_${appearanceId}.png`
        : "sprite.png";
    link.download = fileName;
    link.click();
  };

  _onToggleVariableVisibility = (variableId) => {
    const newVisibleVariables = {
      ...this.state.visibleVariables,
      [variableId]: !this.state.visibleVariables[variableId],
    };
    
    // Automatically set showVariables to true if any variable is checked
    const hasVisibleVariables = Object.values(newVisibleVariables).some(Boolean);
    
    this.setState({
      visibleVariables: newVisibleVariables,
      showVariables: hasVisibleVariables,
    }, () => {
      // Immediately save the variable overlay settings to the character
      this._saveVariableOverlaySettings();
    });
  };

  _saveVariableOverlaySettings = () => {
    const { dispatch, characterId, appearanceId } = this.props;
    if (!characterId || !appearanceId) return;

    dispatch(
      changeCharacter(characterId, {
        spritesheet: {
          appearanceInfo: {
            [appearanceId]: {
              variableOverlay: {
                showVariables: this.state.showVariables,
                visibleVariables: this.state.visibleVariables,
              },
            },
          },
        },
      }),
    );
  };

  _onCanvasUpdateSize = (dSquaresX, dSquaresY, offsetX, offsetY) => {
    const imageData = getImageDataWithNewFrame(this.state.imageData, {
      width: this.state.imageData.width + 40 * dSquaresX,
      height: this.state.imageData.height + 40 * dSquaresY,
      offsetX: 40 * offsetX,
      offsetY: 40 * offsetY,
    });
    CreatePixelImageData.call(imageData);
    this.setStateWithCheckpoint(
      Object.assign({}, INITIAL_STATE, {
        pixelSize: pixelSizeToFit(imageData),
        anchorSquare: {
          x: this.state.anchorSquare.x + offsetX,
          y: this.state.anchorSquare.y + offsetY,
        },
        imageData,
      }),
    );
  };

  render() {
    const { imageData, tool, toolSize, color, undoStack, redoStack } = this.state;

    return (
      <Modal isOpen={imageData !== null} backdrop="static" toggle={() => {}} className="paint">
        <div tabIndex={0} onKeyDown={this._onKeyDown}>
          <input
            id="hiddenFileInput"
            accept="image/*"
            type="file"
            style={{ position: "fixed", top: -1000 }}
            onChange={this._onChooseFile}
            onFocus={(event) => event.target.parentNode.focus()}
          />
          <div className="modal-header" style={{ display: "flex" }}>
            <h4 style={{ flex: 1 }}>Edit Appearance</h4>
            <Button
              title="Undo"
              className="icon"
              onClick={this._onUndo}
              disabled={undoStack.length === 0}
            >
              <img src={new URL("../../img/icon_undo.png", import.meta.url).href} />
            </Button>
            <Button
              title="Redo"
              className="icon"
              onClick={this._onRedo}
              disabled={redoStack.length === 0}
            >
              <img src={new URL("../../img/icon_redo.png", import.meta.url).href} />
            </Button>
            <ButtonDropdown
              isOpen={this.state.dropdownOpen}
              toggle={() => this.setState({ dropdownOpen: !this.state.dropdownOpen })}
            >
              <DropdownMenu right>
                <DropdownItem onClick={() => this._onSelectAll()}>Select All</DropdownItem>
                {this.state.selectionImageData ? (
                  <DropdownItem
                    onClick={() => this.setStateWithCheckpoint({ selectionImageData: null })}
                  >
                    Clear Selection
                  </DropdownItem>
                ) : (
                  <DropdownItem onClick={() => this._onClearAll()}>Clear All</DropdownItem>
                )}
                <DropdownItem
                  disabled={!this.state.selectionImageData}
                  onClick={(e) => this._onGlobalCut(e.nativeEvent)}
                >
                  Cut Selection
                </DropdownItem>
                <DropdownItem
                  disabled={!this.state.selectionImageData}
                  onClick={(e) => this._onGlobalCopy(e.nativeEvent)}
                >
                  Copy Selection
                </DropdownItem>
                <DropdownItem onClick={(e) => this._onGlobalPaste(e.nativeEvent)}>
                  Paste
                </DropdownItem>
                <DropdownItem divider />
                <DropdownItem
                  onClick={() =>
                    this._onApplyCoordinateTransform(({ x, y }) => {
                      return { x: imageData.width - x, y };
                    })
                  }
                >
                  Flip Horizontally
                </DropdownItem>
                <DropdownItem
                  onClick={() =>
                    this._onApplyCoordinateTransform(({ x, y }) => {
                      return { x, y: imageData.height - y };
                    })
                  }
                >
                  Flip Vertically
                </DropdownItem>
                <DropdownItem
                  onClick={() =>
                    this._onApplyCoordinateTransform(({ x, y }) => {
                      return { x: y, y: imageData.width - x };
                    })
                  }
                >
                  Rotate 90º
                </DropdownItem>
                <DropdownItem
                  onClick={() =>
                    this._onApplyCoordinateTransform(({ x, y }) => {
                      return { x: imageData.height - y, y: x };
                    })
                  }
                >
                  Rotate -90º
                </DropdownItem>
                <DropdownItem divider />
                <DropdownItem
                  onClick={this._onChooseAnchorSquare}
                  disabled={imageData && imageData.width === 40 && imageData.height === 40}
                >
                  Choose Anchor Square
                </DropdownItem>
                <DropdownItem divider />
                <label htmlFor="hiddenFileInput" className="dropdown-item" style={{ margin: 0 }}>
                  Import Image from File...
                </label>
                <DropdownItem onClick={this._onDownloadImage}>Download Sprite as PNG</DropdownItem>
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
                  tool={tool}
                  color={color}
                  onColorChange={(c) => this.setState({ color: c })}
                />
                <PixelToolbar tools={TOOLS} tool={tool} onToolChange={this._onChooseTool} />
                <PixelToolSize
                  tool={tool}
                  size={toolSize}
                  onSizeChange={(toolSize) => this.setState({ toolSize })}
                />

                <Button size="sm" style={{ width: 114 }} onClick={this._onClearAll}>
                  Clear Canvas
                </Button>
                
                <SpriteVariablesPanel
                  character={this.props.characters[this.props.characterId]}
                  actor={this.props.currentActor}
                  showVariables={this.state.showVariables}
                  visibleVariables={this.state.visibleVariables}
                  onToggleVariableVisibility={this._onToggleVariableVisibility}
                />
              </div>
              <div className="canvas-arrows-flex">
                <Button
                  className="canvas-arrow"
                  size="sm"
                  onClick={() => this._onCanvasUpdateSize(0, 1, 0, 1)}
                >
                  +
                </Button>
                <div className="canvas-arrows-flex" style={{ flexDirection: "row" }}>
                  <Button
                    className="canvas-arrow"
                    size="sm"
                    onClick={() => this._onCanvasUpdateSize(1, 0, 1, 0)}
                  >
                    +
                  </Button>
                  <div style={{ position: "relative" }}>
                    <PixelCanvas
                      onMouseDown={this._onCanvasMouseDown}
                      onMouseMove={this._onCanvasMouseMove}
                      onMouseUp={this._onCanvasMouseUp}
                      {...this.state}
                    />
                    <VariableOverlay
                      character={this.props.characters[this.props.characterId]}
                      actor={this.props.currentActor}
                      showVariables={this.state.showVariables}
                      visibleVariables={this.state.visibleVariables}
                      pixelSize={this.state.pixelSize}
                      imageData={this.state.imageData}
                    />
                  </div>
                  <div
                    style={{
                      height: "100%",
                      display: "grid",
                      gap: 20,
                      gridTemplateRows: "1fr 22px 1fr",
                    }}
                  >
                    <span />
                    <Button
                      size="sm"
                      className="canvas-arrow"
                      onClick={() => this._onCanvasUpdateSize(1, 0, 0, 0)}
                    >
                      +
                    </Button>
                    <div>
                      <input
                        type="range"
                        min={1}
                        max={11}
                        style={{ writingMode: "vertical-rl", marginLeft: 3 }}
                        value={this.state.pixelSize}
                        onChange={(e) =>
                          this.setState({ ...this.state, pixelSize: Number(e.currentTarget.value) })
                        }
                      />
                    </div>
                  </div>
                </div>
                <Button
                  className="canvas-arrow"
                  size="sm"
                  onClick={() => this._onCanvasUpdateSize(0, 1, 0, 0)}
                >
                  +
                </Button>
                <div
                  className="ai-sprite-generator"
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <input
                    type="text"
                    style={{ flex: 1 }}
                    placeholder="Describe your sprite..."
                    value={this.state.spriteDescription || ""}
                    onChange={(e) => this.setState({ spriteDescription: e.target.value })}
                  />
                  <Button
                    size="sm"
                    onClick={this._onGenerateSprite}
                    disabled={this.state.isGeneratingSprite}
                  >
                    {this.state.isGeneratingSprite ? (
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
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button key="cancel" onClick={this._onClose}>
              Close without Saving
            </Button>{" "}
            <Button
              color="primary"
              key="save"
              data-tutorial-id="paint-save-and-close"
              onClick={async () => {
                await this._onCloseAndSave();
              }}
            >
              Save Changes
            </Button>
          </ModalFooter>
        </div>
      </Modal>
    );
  }
}

function mapStateToProps(state) {
  const { selectedActorPath } = state.ui;
  let currentActor = null;
  
  if (selectedActorPath.worldId && selectedActorPath.stageId && selectedActorPath.actorId) {
    const stage = state.world.stages[selectedActorPath.stageId];
    if (stage && stage.actors[selectedActorPath.actorId]) {
      currentActor = stage.actors[selectedActorPath.actorId];
    }
  }
  
  return Object.assign({}, state.ui.paint, { 
    characters: state.characters,
    currentActor: currentActor,
    selectedActorPath: selectedActorPath
  });
}

function pixelSizeToFit(imageData) {
  return Math.max(
    1,
    Math.min(Math.floor(455 / imageData.width), Math.floor(455 / imageData.height)),
  );
}

export default connect(mapStateToProps)(Container);
