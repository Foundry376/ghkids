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
    width="22"
    height="22"
    viewBox="0 0 16 16"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path d="M9.405 1.05c-.413-1.4-2.397-1.4-2.81 0l-.1.34a1.464 1.464 0 0 1-2.105.872l-.31-.17c-1.283-.698-2.686.705-1.987 1.987l.169.311c.446.82.023 1.841-.872 2.105l-.34.1c-1.4.413-1.4 2.397 0 2.81l.34.1a1.464 1.464 0 0 1 .872 2.105l-.17.31c-.698 1.283.705 2.686 1.987 1.987l.311-.169a1.464 1.464 0 0 1 2.105.872l.1.34c.413 1.4 2.397 1.4 2.81 0l.1-.34a1.464 1.464 0 0 1 2.105-.872l.31.17c1.283.698 2.686-.705 1.987-1.987l-.169-.311a1.464 1.464 0 0 1 .872-2.105l.34-.1c1.4-.413 1.4-2.397 0-2.81l-.34-.1a1.464 1.464 0 0 1-.872-2.105l.17-.31c.698-1.283-.705-2.686-1.987-1.987l-.311.169a1.464 1.464 0 0 1-2.105-.872l-.1-.34zM8 10.93a2.929 2.929 0 1 1 0-5.858 2.929 2.929 0 0 1 0 5.858z" />
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
        title="Level settings"
        aria-label="Level settings"
        onClick={() => dispatch(actions.showModal(MODALS.STAGES))}
      >
        <GearIcon />
      </Button>
    </div>
  );
};

export default StageSwitcher;
