import { Button, ButtonDropdown, DropdownItem, DropdownMenu, DropdownToggle } from "reactstrap";
import classNames from "classnames";
import { useContext, useState } from "react";
import { useDispatch } from "react-redux";
import { Link } from "react-router-dom";

import * as actions from "../actions/ui-actions";
import { updateWorldMetadata } from "../actions/world-actions";
import { MODALS, TOOLS } from "../constants/constants";
import StageSwitcher from "./stage-switcher";
import { TapToEditLabel } from "./tap-to-edit-label";
import UndoRedoControls from "./undo-redo-controls";

import { createWorld } from "../../actions/main-actions";
import { EditorContext } from "../../components/editor-context";
import { useEditorSelector } from "../../hooks/redux";

const Toolbar = () => {
  const dispatch = useDispatch();
  const selectedToolId = useEditorSelector((state) => state.ui.selectedToolId);
  const metadata = useEditorSelector((state) => state.world.metadata);
  const isInTutorial = useEditorSelector((state) => state.ui.tutorial.stepIndex === 0);

  const {
    usingLocalStorage,
    saveWorldAnd,
    saveWorld,
    save,
    saveAndExit,
    exitWithoutSaving,
    revertToSaved,
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
      <div style={{ display: "flex", alignItems: "center" }}>
        <ButtonDropdown data-tutorial-id="main-menu" isOpen={open} toggle={() => setOpen(!open)}>
          <DropdownToggle>
            <i className="fa fa-ellipsis-v" />
          </DropdownToggle>
          <DropdownMenu>
            <DropdownItem onClick={() => save()}>
              <i className="fa fa-floppy-o fa-fw" style={{ marginRight: 8 }} />
              Done
              {hasUnsavedChanges && <i className="fa fa-circle" style={{ fontSize: "8px", color: "#ff9800", marginLeft: 8, verticalAlign: "middle" }} />}
            </DropdownItem>
            <DropdownItem onClick={() => saveAndExit("/dashboard")}>
              <i className="fa fa-sign-out fa-fw fa-flip-horizontal" style={{ marginRight: 8 }} />
              Save &amp; Exit
            </DropdownItem>
            <DropdownItem
              onClick={() => {
                if (window.confirm("Exit without saving? Your unsaved changes will be lost.")) {
                  exitWithoutSaving("/dashboard");
                }
              }}
            >
              <i className="fa fa-fw" style={{ marginRight: 8 }} />
              Exit Without Saving
            </DropdownItem>
            <DropdownItem
              disabled={!hasUnsavedChanges}
              onClick={() => {
                if (window.confirm("Discard all unsaved changes and return to the last saved version?")) {
                  revertToSaved();
                }
              }}
            >
              <i className="fa fa-fw" style={{ marginRight: 8 }} />
              Discard Unsaved Changes
            </DropdownItem>
            <DropdownItem divider />
            <DropdownItem
              onClick={() => {
                save().then(() => dispatch(createWorld({ from: metadata.id })));
              }}
            >
              <i className="fa fa-fw" style={{ marginRight: 8 }} />
              Duplicate This World
            </DropdownItem>
            <DropdownItem divider />
            <DropdownItem onClick={() => saveWorldAnd(`/play/${metadata.id}`)}>
              <i className="fa fa-play fa-fw" style={{ marginRight: 8 }} />
              Switch to Player View...
            </DropdownItem>
            <DropdownItem divider />
            <DropdownItem onClick={() => dispatch(actions.showModal(MODALS.VIDEOS))}>
              <i className="fa fa-fw" style={{ marginRight: 8 }} />
              Tips &amp; Tricks Videos...
            </DropdownItem>
            {!isInTutorial && (
              <DropdownItem
                onClick={() => {
                  alert("Your current game will be saved - you can open it later from 'My Games'.");
                  saveWorldAnd("tutorial");
                }}
              >
                <i className="fa fa-fw" style={{ marginRight: 8 }} />
                Start Tutorial...
              </DropdownItem>
            )}
            <DropdownItem divider />
            {metadata.published ? (
              <DropdownItem onClick={onUnpublish}>
                <i className="fa fa-eye-slash fa-fw" style={{ marginRight: 8 }} />
                Unpublish Game
              </DropdownItem>
            ) : (
              <DropdownItem onClick={() => dispatch(actions.showModal(MODALS.PUBLISH))}>
                <i className="fa fa-globe fa-fw" style={{ marginRight: 8 }} />
                Publish Game...
              </DropdownItem>
            )}
          </DropdownMenu>
        </ButtonDropdown>
        <TapToEditLabel className="world-name" value={metadata.name} onChange={onNameChange} />
        {hasUnsavedChanges && (
          <i className="fa fa-circle" style={{ fontSize: "16px", color: "#ff9800", marginLeft: "8px" }} title="Unsaved changes" />
        )}
      </div>
    );
  };

  return (
    <div className="toolbar">
      <div style={{ flex: 1, textAlign: "left" }}>{renderLeft()}</div>

      <div style={{ display: "flex", alignItems: "center" }}>
        <div className="button-group">{[TOOLS.POINTER].map(renderTool)}</div>
        <div className="button-group">
          {[TOOLS.CREATE_CHARACTER, TOOLS.PAINT, TOOLS.RECORD].map(renderTool)}
        </div>
        <div className="button-group">{[TOOLS.STAMP, TOOLS.TRASH].map(renderTool)}</div>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
        <UndoRedoControls />
        <StageSwitcher />
      </div>
    </div>
  );
};

export default Toolbar;
