import React from 'react'; import PropTypes from 'prop-types';
import Button from 'reactstrap/lib/Button';
import {undo, redo} from '../utils/undo-redo';
import {connect} from 'react-redux';

class UndoRedoControls extends React.Component {
  static propTypes = {
    dispatch: PropTypes.func,
    undoDepth: PropTypes.number,
    redoDepth: PropTypes.number,
  }

  constructor(props, context) {
    super(props, context);
  }

  componentDidMount() {
    document.body.addEventListener("keydown", this._onGlobalKeydown);
  }

  componentWillUnmount() {
    document.body.removeEventListener("keydown", this._onGlobalKeydown);
    clearTimeout(this._hideTimeout);
  }

  _onGlobalKeydown = (event) => {
    if (event.target.closest('.modal')) {
      return;
    }

    if (event.which === 89 && (event.ctrlKey || event.metaKey)) {
      this._dispatch(undo());
      event.preventDefault();
      event.stopPropagation();
    }
    else if (event.which === 90 && (event.ctrlKey || event.metaKey)) {
      this._dispatch(event.shiftKey ? redo() : undo());
      event.preventDefault();
      event.stopPropagation();
    }
  }

  _dispatch = (action) => {
    this.props.dispatch(action);
  }

  render() {
    const {undoDepth, redoDepth} = this.props;

    return (
      <div className={`button-group`}>
        <Button
          className="icon"
          data-tutorial-id="undo-button"
          onClick={() => this._dispatch(undo())}
          disabled={undoDepth === 0}
        >
          <img src={new URL('../img/icon_undo.png', import.meta.url).href} />
        </Button>
        <Button
          className="icon"
          onClick={() => this._dispatch(redo())}
          disabled={redoDepth === 0}
        >
          <img src={new URL('../img/icon_redo.png', import.meta.url).href} />
        </Button>
      </div>
    );
  }
}

function mapStateToProps(state) {
  return {
    undoDepth: state.undoStack.length,
    redoDepth: state.redoStack.length,
  };
}

export default connect(
  mapStateToProps,
)(UndoRedoControls);
