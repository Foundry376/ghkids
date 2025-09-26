import classNames from "classnames";
import { useContext, useState } from "react";
import { connect } from "react-redux";
import { Link } from "react-router-dom";

import Button from "reactstrap/lib/Button";
import ButtonDropdown from "reactstrap/lib/ButtonDropdown";
import DropdownItem from "reactstrap/lib/DropdownItem";
import DropdownMenu from "reactstrap/lib/DropdownMenu";
import DropdownToggle from "reactstrap/lib/DropdownToggle";

import * as actions from "../actions/ui-actions";
import { updateWorldMetadata } from "../actions/world-actions";
import { MODALS, TOOLS } from "../constants/constants";
import { getCurrentStage } from "../utils/selectors";
import { TapToEditLabel } from "./tap-to-edit-label";
import UndoRedoControls from "./undo-redo-controls";

import { EditorContext } from "../../components/editor-context";

const Toolbar = ({ selectedToolId, dispatch, metadata, stageName, isInTutorial }) => {
  // static propTypes = {
  //   stageName: PropTypes.string,
  //   metadata: PropTypes.object,
  //   selectedToolId: PropTypes.string.isRequired,
  //   dispatch: PropTypes.func.isRequired,
  //   isInTutorial: PropTypes.bool,
  // };

  const { usingLocalStorage, saveWorldAnd } = useContext(EditorContext);
  const [open, setOpen] = useState(false);

  const _renderTool = (toolId) => {
    const classes = classNames({
      "tool-option": true,
      enabled: true,
      selected: selectedToolId === toolId,
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
  };

  const _onNameChange = (name) => {
    dispatch(updateWorldMetadata("root", { name }));
  };

  const _renderLeft = () => {
    if (usingLocalStorage) {
      return (
        <div className="create-account-notice">
          <span>Your work has not been saved!</span>
          <Link
            to={{
              pathname: `/join`,
              search: new URLSearchParams({
                why: ` to save "${metadata.name}"`,
                redirectTo: `/join-send-world?storageKey=${metadata.id}`,
              }).toString(),
            }}
          >
            <Button color="success">Create Account</Button>
          </Link>
        </div>
      );
    }

    return (
      <div style={{ display: "flex", alignItems: "center" }}>
        <ButtonDropdown data-tutorial-id="main-menu" isOpen={open} toggle={() => setOpen(!open)}>
          <DropdownToggle>
            <i className="fa fa-ellipsis-v" />
          </DropdownToggle>
          <DropdownMenu>
            <DropdownItem onClick={() => saveWorldAnd(`/play/${metadata.id}`)}>
              Switch to Player View...
            </DropdownItem>
            <DropdownItem divider />
            <DropdownItem onClick={() => dispatch(actions.showModal(MODALS.VIDEOS))}>
              Tips &amp; Tricks Videos...
            </DropdownItem>
            {!isInTutorial && (
              <DropdownItem
                onClick={() => {
                  alert("Your current game will be saved - you can open it later from 'My Games'.");
                  saveWorldAnd("tutorial");
                }}
              >
                Start Tutorial...
              </DropdownItem>
            )}
            <DropdownItem divider />
            <DropdownItem onClick={() => saveWorldAnd("/dashboard")}>Save &amp; Exit</DropdownItem>
          </DropdownMenu>
        </ButtonDropdown>
        <TapToEditLabel className="world-name" value={metadata.name} onChange={_onNameChange} />
      </div>
    );
  };

  return (
    <div className="toolbar">
      <div style={{ flex: 1, textAlign: "left" }}>{_renderLeft()}</div>

      <div style={{ display: "flex", alignItems: "center" }}>
        <div className="button-group">
          {[TOOLS.POINTER, TOOLS.STAMP, TOOLS.TRASH, TOOLS.RECORD, TOOLS.PAINT].map(_renderTool)}
        </div>
        <UndoRedoControls />
      </div>

      <div style={{ flex: 1, textAlign: "right" }}>
        <Button
          onClick={() => dispatch(actions.showModal(MODALS.STAGES))}
          className="dropdown-toggle"
        >
          <img src={new URL("../img/sidebar_choose_background.png", import.meta.url).href} />
          <span className="title">{stageName || "Untitled Stage"}</span>
        </Button>
      </div>
    </div>
  );
};

function mapStateToProps(state) {
  return {
    selectedToolId: state.ui.selectedToolId,
    stageName: getCurrentStage(state)?.name,
    metadata: state.world.metadata,
    isInTutorial: state.ui.tutorial.stepSet === "base",
  };
}

export default connect(mapStateToProps)(Toolbar);
