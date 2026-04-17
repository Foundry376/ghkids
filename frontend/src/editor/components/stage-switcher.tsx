import { Button, ButtonDropdown, DropdownItem, DropdownMenu, DropdownToggle } from "reactstrap";
import { useState } from "react";
import { useDispatch } from "react-redux";

import * as actions from "../actions/ui-actions";
import { MODALS, WORLDS } from "../constants/constants";
import { useEditorSelector } from "../../hooks/redux";
import { getCurrentStage, getStagesList } from "../utils/selectors";
import { getStageScreenshot } from "../utils/stage-helpers";

const GearIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm0 1.8a1.7 1.7 0 1 1 0 3.4 1.7 1.7 0 0 1 0-3.4Z"
      fill="currentColor"
    />
    <path
      d="M10.4 2.4a1.4 1.4 0 0 1 1.36-1.1h.48a1.4 1.4 0 0 1 1.36 1.1l.27 1.26c.5.16.97.38 1.4.66l1.12-.65a1.4 1.4 0 0 1 1.7.22l.34.34a1.4 1.4 0 0 1 .22 1.7l-.65 1.12c.28.43.5.9.66 1.4l1.26.27a1.4 1.4 0 0 1 1.1 1.36v.48a1.4 1.4 0 0 1-1.1 1.36l-1.26.27a6.8 6.8 0 0 1-.66 1.4l.65 1.12a1.4 1.4 0 0 1-.22 1.7l-.34.34a1.4 1.4 0 0 1-1.7.22l-1.12-.65c-.43.28-.9.5-1.4.66l-.27 1.26a1.4 1.4 0 0 1-1.36 1.1h-.48a1.4 1.4 0 0 1-1.36-1.1l-.27-1.26a6.8 6.8 0 0 1-1.4-.66l-1.12.65a1.4 1.4 0 0 1-1.7-.22l-.34-.34a1.4 1.4 0 0 1-.22-1.7l.65-1.12a6.8 6.8 0 0 1-.66-1.4l-1.26-.27a1.4 1.4 0 0 1-1.1-1.36v-.48a1.4 1.4 0 0 1 1.1-1.36l1.26-.27c.16-.5.38-.97.66-1.4l-.65-1.12a1.4 1.4 0 0 1 .22-1.7l.34-.34a1.4 1.4 0 0 1 1.7-.22l1.12.65c.43-.28.9-.5 1.4-.66l.27-1.26Zm1.6.7-.35 1.64a.9.9 0 0 1-.63.68 5 5 0 0 0-1.74.82.9.9 0 0 1-.93.08l-1.46-.84-.17.17.84 1.46a.9.9 0 0 1-.08.93 5 5 0 0 0-.82 1.74.9.9 0 0 1-.68.63l-1.64.35v.24l1.64.35a.9.9 0 0 1 .68.63 5 5 0 0 0 .82 1.74.9.9 0 0 1 .08.93l-.84 1.46.17.17 1.46-.84a.9.9 0 0 1 .93.08 5 5 0 0 0 1.74.82.9.9 0 0 1 .63.68l.35 1.64h.24l.35-1.64a.9.9 0 0 1 .63-.68 5 5 0 0 0 1.74-.82.9.9 0 0 1 .93-.08l1.46.84.17-.17-.84-1.46a.9.9 0 0 1 .08-.93 5 5 0 0 0 .82-1.74.9.9 0 0 1 .68-.63l1.64-.35v-.24l-1.64-.35a.9.9 0 0 1-.68-.63 5 5 0 0 0-.82-1.74.9.9 0 0 1-.08-.93l.84-1.46-.17-.17-1.46.84a.9.9 0 0 1-.93-.08 5 5 0 0 0-1.74-.82.9.9 0 0 1-.63-.68L12.12 3.1h-.24Z"
      fill="currentColor"
    />
  </svg>
);

export const StageSwitcher = () => {
  const dispatch = useDispatch();
  const stage = useEditorSelector(getCurrentStage);
  const stages = useEditorSelector(getStagesList);
  const [open, setOpen] = useState(false);

  if (!stage) {
    return null;
  }

  return (
    <div className="stage-switcher">
      <ButtonDropdown isOpen={open} toggle={() => setOpen(!open)}>
        <DropdownToggle caret className="stage-switcher-toggle">
          <img className="thumb" src={getStageScreenshot(stage, { size: 40 })!} alt="" />
          <span className="title">{stage.name || "Untitled"}</span>
        </DropdownToggle>
        <DropdownMenu right className="stage-switcher-menu">
          {stages.map((s) => (
            <DropdownItem
              key={s.id}
              active={s.id === stage.id}
              onClick={() => dispatch(actions.selectStageId(WORLDS.ROOT, s.id))}
            >
              <img src={getStageScreenshot(s, { size: 120 })!} alt="" />
              <span>{s.name || "Untitled"}</span>
            </DropdownItem>
          ))}
        </DropdownMenu>
      </ButtonDropdown>
      <Button
        className="stage-switcher-settings"
        title="Stage settings"
        aria-label="Stage settings"
        onClick={() => dispatch(actions.showModal(MODALS.STAGES))}
      >
        <GearIcon />
      </Button>
    </div>
  );
};

export default StageSwitcher;
