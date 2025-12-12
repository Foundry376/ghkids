import classNames from "classnames";
import { useContext, useState } from "react";
import { useDispatch } from "react-redux";
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
import { useEditorSelector } from "../../hooks/redux";

const Toolbar = () => {
  const dispatch = useDispatch();
  const selectedToolId = useEditorSelector((state) => state.ui.selectedToolId);
  const stageName = useEditorSelector((state) => getCurrentStage(state)?.name);
  const metadata = useEditorSelector((state) => state.world.metadata);
  const isInTutorial = useEditorSelector((state) => state.ui.tutorial.stepIndex === 0);

  const {
    usingLocalStorage,
    saveWorldAnd,
    saveWorld,
    save,
    saveDraft,
    saveAndExit,
    exitWithoutSaving,
    hasUnsavedChanges,
  } = useContext(EditorContext);
  const [open, setOpen] = useState(false);

  const renderTool = (toolId: TOOLS) => {
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

  const onNameChange = (name: string) => {
    dispatch(updateWorldMetadata("root", { ...metadata, name }));
  };

  const onUnpublish = () => {
    dispatch(updateWorldMetadata("root", { ...metadata, published: false }));
    saveWorld();
  };

  const renderLeft = () => {
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
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
            {metadata.published ? (
              <DropdownItem onClick={onUnpublish}>
                <i className="fa fa-eye-slash" style={{ marginRight: 8 }} />
                Unpublish Game
              </DropdownItem>
            ) : (
              <DropdownItem onClick={() => dispatch(actions.showModal(MODALS.PUBLISH))}>
                <i className="fa fa-globe" style={{ marginRight: 8 }} />
                Publish Game...
              </DropdownItem>
            )}
          </DropdownMenu>
        </ButtonDropdown>
        <TapToEditLabel className="world-name" value={metadata.name} onChange={onNameChange} />
        {hasUnsavedChanges && (
          <span style={{ fontSize: "12px", color: "#ff9800", marginLeft: "8px" }}>
            Unsaved changes
          </span>
        )}
        <Button color="primary" size="sm" onClick={() => save()}>
          Save
        </Button>
        <Button color="success" size="sm" onClick={() => saveAndExit("/dashboard")}>
          Save &amp; Exit
        </Button>
        <Button color="secondary" size="sm" onClick={() => exitWithoutSaving("/dashboard")}>
          Exit Without Saving
        </Button>
      </div>
    );
  };

  return (
    <div className="toolbar">
      <div style={{ flex: 1, textAlign: "left" }}>{renderLeft()}</div>

      <div style={{ display: "flex", alignItems: "center" }}>
        <div className="button-group">
          {[TOOLS.POINTER, TOOLS.STAMP, TOOLS.TRASH, TOOLS.RECORD, TOOLS.PAINT].map(renderTool)}
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

export default Toolbar;
