import React from 'react'; import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import Modal from 'reactstrap/lib/Modal';
import ModalBody from 'reactstrap/lib/ModalBody';
import ModalFooter from 'reactstrap/lib/ModalFooter';
import Button from 'reactstrap/lib/Button';
import ButtonDropdown from 'reactstrap/lib/ButtonDropdown';
import DropdownItem from 'reactstrap/lib/DropdownItem';
import DropdownMenu from 'reactstrap/lib/DropdownMenu';
import DropdownToggle from 'reactstrap/lib/DropdownToggle';



import * as Tools from './tools';

import {paintCharacterAppearance} from '../../actions/ui-actions';
import {changeCharacter} from '../../actions/characters-actions';

import {getImageDataFromDataURL, getDataURLFromImageData, getFlattenedImageData} from './helpers';
import CreatePixelImageData from './create-pixel-image-data';
import PixelCanvas from './pixel-canvas';
import PixelToolbar from './pixel-toolbar';
import PixelColorPicker, {ColorOptions} from './pixel-color-picker';

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
  tool: TOOLS.find(t => t.name === 'pen'),

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
    this.state = Object.assign({}, INITIAL_STATE);
  }

  componentDidMount() {
    this.setImageDataFromProps();

    // add event listeners which can't be attached to our div
    document.body.addEventListener('cut', this._onGlobalCut);
    document.body.addEventListener('copy', this._onGlobalCopy);
    document.body.addEventListener('paste', this._onGlobalPaste);
  }

  componentWillReceiveProps(nextProps) {
    this.setImageDataFromProps(nextProps);
  }

  componentWillUnmount() {
    document.body.removeEventListener('cut', this._onGlobalCut);
    document.body.removeEventListener('copy', this._onGlobalCopy);
    document.body.removeEventListener('paste', this._onGlobalPaste);
  }

  setImageDataFromProps(props = this.props) {
    const {characterId, characters, appearanceId} = props;
    if (characterId) {
      const {spritesheet} = characters[characterId];
      const frameDataURL = spritesheet.appearances[appearanceId][0];
      getImageDataFromDataURL(frameDataURL, {}, (imageData) => {
        CreatePixelImageData.call(imageData);
        this.setState(Object.assign({}, INITIAL_STATE, {imageData}));
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
    this.setState(Object.assign({}, nextState, {
      redoStack: [],
      undoStack: this.state.undoStack
        .slice(Math.max(0, this.state.undoStack.length - MAX_UNDO_STEPS))
        .concat([this.getCheckpoint()]),
    }));
  }

  _onUndo = () => {
    const undoStack = [].concat(this.state.undoStack);
    const changes = undoStack.pop();
    if (!changes) { return; }
    const redoStack = [].concat(this.state.redoStack, [this.getCheckpoint()]);
    this.setState(Object.assign({}, changes, {redoStack, undoStack}));
  }

  _onRedo = () => {
    const redoStack = [].concat(this.state.redoStack);
    const changes = redoStack.pop();
    if (!changes) { return; }
    const undoStack = [].concat(this.state.undoStack, [this.getCheckpoint()]);
    this.setState(Object.assign({}, changes, {redoStack, undoStack}));
  }

  _onClose = () => {
    this.props.dispatch(paintCharacterAppearance(null));
  }

  _onCloseAndSave = () => {
    const {dispatch, characterId, appearanceId} = this.props;
    const imageDataURL = getDataURLFromImageData(getFlattenedImageData(this.state));
    dispatch(changeCharacter(characterId, {spritesheet: {appearances: {[appearanceId]: [imageDataURL]}}}));
    dispatch(paintCharacterAppearance(null));
  }

  _onKeyDown = (event) => {
    if ((event.key === 'y' || event.key === 'Z') && (event.ctrlKey || event.metaKey)){
      this._onRedo();
      event.preventDefault();
      event.stopPropagation();
    }
    else if (event.key === 'z' && (event.ctrlKey || event.metaKey)){
      this._onUndo();
      event.preventDefault();
      event.stopPropagation();
    }
    else if (event.key === 'a' && (event.ctrlKey || event.metaKey)){
      const empty = this.state.imageData.clone();
      empty.clearPixelsInRect(0, 0, empty.width, empty.height);
      this.setStateWithCheckpoint({
        imageData: empty,
        selectionOffset: {x: 0, y: 0},
        selectionImageData: getFlattenedImageData(this.state),
      });
      event.preventDefault();
      event.stopPropagation();
    }
    else if ((event.key === 'Escape') || (event.key === 'Enter')) {
      this.setStateWithCheckpoint({
        imageData: getFlattenedImageData(this.state),
        selectionImageData: null,
      });
    }
    else if ((event.key === 'Delete') || (event.key === 'Backspace')) {
      this.setStateWithCheckpoint({
        selectionImageData: null,
      });
    }
    else if (event.key.startsWith('Arrow')) {
      const delta = event.shiftKey ? 5 : 1;
      this.setStateWithCheckpoint({
        selectionOffset: {
          x: this.state.selectionOffset.x + ({ArrowLeft: -delta, ArrowRight: delta}[event.key] || 0),
          y: this.state.selectionOffset.y + ({ArrowUp: -delta, ArrowDown: delta}[event.key] || 0),
        }
      });
    }
  }

  _onGlobalCopy = (event) => {
    event.clipboardData.setData('dataurl', getDataURLFromImageData(this.state.selectionImageData));
    event.clipboardData.setData('offset', JSON.stringify(this.state.selectionOffset));
    event.preventDefault();
  }

  _onGlobalCut = (event) => {
    this._onGlobalCopy(event);
    this.setStateWithCheckpoint({
      selectionImageData: null,
    });
  }

  _onGlobalPaste = (event) => {
    const items = Array.from(event.clipboardData.items);

    let dataURL = event.clipboardData.getData('dataurl');
    const offset = event.clipboardData.getData('offset');

    const imageItem = items && items.find(i => i.type.includes("image"));
    if (imageItem) {
      dataURL = URL.createObjectURL(imageItem.getAsFile());
    }

    if (dataURL) {
      this._onApplyExternalDataURL(dataURL, offset);
    }
  }

  _onApplyExternalDataURL = (dataURL, offset) => {
    const {imageData} = this.state;
    getImageDataFromDataURL(dataURL, {
      maxWidth: imageData.width,
      maxHeight: imageData.height,
    }, (nextSelectionImageData) => {
      CreatePixelImageData.call(nextSelectionImageData);

      this.setStateWithCheckpoint({
        imageData: getFlattenedImageData(this.state),
        selectionOffset: JSON.parse(offset || `{"x":0,"y":0}`),
        selectionImageData: nextSelectionImageData,
        tool: TOOLS.find(t => t.name === 'select')
      });
    });
  }

  _onChooseTool = (tool) => {
    this.setState({
      tool: tool,
      imageData: getFlattenedImageData(this.state),
      selectionImageData: null,
    });
  }

  _onCanvasMouseDown = (event, pixel) => {
    const tool = this.state.tool;
    if (tool) {
      this.setStateWithCheckpoint(tool.mousedown(pixel, this.state, event));
    }
  }

  _onCanvasMouseMove = (event, pixel) => {
    const tool = this.state.tool;
    if (tool) {
      this.setState(tool.mousemove(pixel, this.state));
    }
  }

  _onCanvasMouseUp = (event, pixel) => {
    const tool = this.state.tool;
    if (tool) {
      this.setState(tool.mouseup(tool.mousemove(pixel, this.state)));
    }
  }

  _onApplyCoordinateTransform = (coordTransformCallback) => {
    const key = this.state.selectionImageData ? 'selectionImageData' : 'imageData';
    const clone = this.state[key].clone();

    for (let x = 0; x < clone.width; x ++) {
      for (let y = 0; y < clone.height; y ++) {
        const {x: nx, y: ny} = coordTransformCallback({x, y});
        clone.fillPixelRGBA(x, y, ...this.state[key].getPixel(nx, ny));
      }
    }
    this.setStateWithCheckpoint({
      [key]: clone,
    });
  }

  _onChooseFile = (event) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      this._onApplyExternalDataURL(reader.result);
    }, false);
    const file = event.target.files[0];
    if (file) {
      reader.readAsDataURL(file);
    }
  }

  render() {
    const {imageData, tool, color, undoStack, redoStack} = this.state;

    return (
      <Modal
        isOpen={imageData !== null}
        backdrop="static"
        toggle={() => {}}
        className="paint"
      >
        <div tabIndex={0} onKeyDown={this._onKeyDown}>
          <input
            id="hiddenFileInput"
            accept="image/*"
            type="file"
            style={{position:'fixed', top: -1000}}
            onChange={this._onChooseFile}
            onFocus={(event) => event.target.parentNode.focus()}
          />
          <div className="modal-header" style={{display: 'flex'}}>
            <h4 style={{flex: 1}}>Edit Appearance</h4>
            <Button
              title="Undo"
              className="icon"
              onClick={this._onUndo}
              disabled={undoStack.length === 0}
            >
              <img src={new URL('../../img/icon_undo.png', import.meta.url).href} />
            </Button>
            <Button
              title="Redo"
              className="icon"
              onClick={this._onRedo}
              disabled={redoStack.length === 0}
            >
              <img src={new URL('../../img/icon_redo.png', import.meta.url).href} />
            </Button>
            <ButtonDropdown
              isOpen={this.state.dropdownOpen}
              toggle={() => this.setState({dropdownOpen: !this.state.dropdownOpen})}
            >
              <DropdownToggle className="icon">
                <i className="fa fa-ellipsis-v" />
              </DropdownToggle>
              <DropdownMenu right>
                <DropdownItem onClick={() => this._onApplyCoordinateTransform(({x, y}) => { return {x: imageData.width - x, y}; })}>
                  Flip Horizontally
                </DropdownItem>
                <DropdownItem onClick={() => this._onApplyCoordinateTransform(({x, y}) => { return {x, y: imageData.height - y }; })}>
                  Flip Vertically
                </DropdownItem>
                <DropdownItem onClick={() => this._onApplyCoordinateTransform(({x, y}) => { return {x: y, y: imageData.width - x}; })}>
                  Rotate 90º
                </DropdownItem>
                <DropdownItem onClick={() => this._onApplyCoordinateTransform(({x, y}) => { return {x: imageData.height - y, y: x}; })}>
                  Rotate -90º
                </DropdownItem>
                <DropdownItem divider />
                <label htmlFor="hiddenFileInput" className="dropdown-item">
                  Import Image from File...
                </label>
              </DropdownMenu>
            </ButtonDropdown>
          </div>
          <ModalBody>
            <div className="flex-horizontal">
              <div className="paint-sidebar">
                <PixelColorPicker
                  color={color}
                  onColorChange={(c) => this.setState({color: c})}
                />
                <PixelToolbar
                  tools={TOOLS}
                  tool={tool}
                  onToolChange={this._onChooseTool}
                />
              </div>
              <PixelCanvas
                pixelSize={11}
                onMouseDown={this._onCanvasMouseDown}
                onMouseMove={this._onCanvasMouseMove}
                onMouseUp={this._onCanvasMouseUp}
                {...this.state}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button key="cancel" onClick={this._onClose}>Close without Saving</Button>{' '}
            <Button color="primary" key="save" data-tutorial-id="paint-save-and-close" onClick={this._onCloseAndSave}>Save Changes</Button>
          </ModalFooter>
        </div>
      </Modal>
    );
  }
}

function mapStateToProps(state) {
  return Object.assign({}, state.ui.paint, {characters: state.characters});
}

export default connect(
  mapStateToProps,
)(Container);
