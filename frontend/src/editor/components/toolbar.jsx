import React from 'react'; import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import {Link} from 'react-router';
import classNames from 'classnames';

import Button from 'reactstrap/lib/Button';
import ButtonDropdown from 'reactstrap/lib/ButtonDropdown';
import DropdownMenu from 'reactstrap/lib/DropdownMenu';
import DropdownToggle from 'reactstrap/lib/DropdownToggle';
import DropdownItem from 'reactstrap/lib/DropdownItem';

import * as actions from '../actions/ui-actions';
import {updateWorldMetadata} from '../actions/world-actions';
import {getCurrentStage} from '../utils/selectors';
import {TOOL_POINTER, TOOL_TRASH, TOOL_RECORD, TOOL_PAINT, MODALS} from '../constants/constants';
import UndoRedoControls from './undo-redo-controls';
import TapToEditLabel from './tap-to-edit-label';


class Toolbar extends React.Component {
  static propTypes = {
    stageName: PropTypes.string,
    metadata: PropTypes.object,
    selectedToolId: PropTypes.string.isRequired,
    dispatch: PropTypes.func.isRequired,
    isInTutorial: PropTypes.bool,
  };

  static contextTypes = {
    usingLocalStorage: PropTypes.bool,
    saveWorldAnd: PropTypes.func,
  };

  constructor(props, context) {
    super(props, context);
    this.state = {open: false};
  }

  _renderTool = (toolId) => {
    const {selectedToolId, dispatch} = this.props;
    const classes = classNames({
      'tool-option': true,
      'enabled': true,
      'selected': selectedToolId === toolId,
    });

    return (
      <Button
        key={toolId}
        className={classes}
        data-tutorial-id={`toolbar-tool-${toolId}`}
        onClick={() => dispatch(actions.selectToolId(toolId))}
      >
        <img src={new URL(`../img/sidebar_${toolId}.png`, import.meta.url).href} />
      </Button>
    );
  }

  _onNameChange = (e) => {
    this.props.dispatch(updateWorldMetadata('root', {name: e.target.value}));
  }

  _renderLeft() {
    const {metadata, isInTutorial} = this.props;

    if (this.context.usingLocalStorage) {
      return (
        <div className="create-account-notice">
          <span>
            Your work has not been saved!
          </span>
          <Link to={{
            pathname: `/join`,
            state: {
              why: ` to save "${metadata.name}"`,
              redirectTo: `/join-send-world?storageKey=${metadata.id}`,
            },
          }}>
            <Button color="success">
              Create Account
            </Button>
          </Link>
        </div>
      );
    }

    return (
      <div style={{display: 'flex', alignItems: 'center'}}>
        <ButtonDropdown
          data-tutorial-id="main-menu"
          isOpen={this.state.open}
          toggle={() => this.setState({open: !this.state.open})}
        >
          <DropdownToggle>
            <i className="fa fa-ellipsis-v" />
          </DropdownToggle>
          <DropdownMenu>
            <DropdownItem onClick={() => this.context.saveWorldAnd(`/play/${metadata.id}`)}>
              Switch to Player View...
            </DropdownItem>
            <DropdownItem divider />
            <DropdownItem onClick={() => this.props.dispatch(actions.showModal(MODALS.VIDEOS))}>
              Tips &amp; Tricks Videos...
            </DropdownItem>
            {!isInTutorial && (
              <DropdownItem onClick={() => {
                alert("Your current game will be saved - you can open it later from 'My Games'.");
                this.context.saveWorldAnd('tutorial');
              }}>
                Start Tutorial...
              </DropdownItem>
            )}
            <DropdownItem divider />
            <DropdownItem onClick={() => this.context.saveWorldAnd('/dashboard')}>
              Save &amp; Exit
            </DropdownItem>
          </DropdownMenu>
        </ButtonDropdown>
        <TapToEditLabel
          className="world-name"
          value={metadata.name}
          onChange={this._onNameChange}
        />
      </div>
    );
  }

  render() {
    const {stageName, dispatch} = this.props;

    return (
      <div className="toolbar">
        <div style={{flex: 1, textAlign: 'left'}}>
          {this._renderLeft()}
        </div>

        <div style={{display: 'flex', alignItems: 'center'}}>
          <div className="button-group">
            {[TOOL_POINTER, TOOL_TRASH, TOOL_RECORD, TOOL_PAINT].map(this._renderTool)}
          </div>
          <UndoRedoControls />
        </div>

        <div style={{flex: 1, textAlign: 'right'}}>
          <Button onClick={() => dispatch(actions.showModal(MODALS.STAGES))} className="dropdown-toggle">
            <img src={new URL('../img/sidebar_choose_background.png', import.meta.url).href} />
            <span className="title">{stageName || "Untitled Stage"}</span>
          </Button>
        </div>
      </div>
    );
  }
}

function mapStateToProps(state) {
  return {
    selectedToolId: state.ui.selectedToolId,
    stageName: getCurrentStage(state).name,
    metadata: state.world.metadata,
    isInTutorial: state.ui.tutorial.stepSet === 'base',
  };
}

export default connect(
  mapStateToProps,
)(Toolbar);
