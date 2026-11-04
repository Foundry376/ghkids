import { useState } from "react";
import { useDispatch } from "react-redux";
import { ButtonDropdown, DropdownItem, DropdownMenu, DropdownToggle } from "reactstrap";
import { Character, RandomRange } from "../../../types";
import { createCharacterVariable } from "../../actions/characters-actions";
import { createGlobal, createStageVariable } from "../../actions/world-actions";
import { DEFAULT_RANDOM_RANGE } from "../../utils/stage-helpers";

export type VariablesSubTab = "character" | "level" | "world";

const VariablesAddButton = ({
  character,
  section,
}: {
  character: Character | null;
  section: VariablesSubTab;
}) => {
  const [open, setOpen] = useState(false);
  const dispatch = useDispatch();

  // The plus button adds a variable to whichever section the user is
  // currently looking at, so its behavior follows the active sub-tab.
  const _onAdd = (random?: RandomRange) => {
    const options = random ? { random: { ...random } } : {};
    if (section === "character") {
      if (!character) return;
      dispatch(createCharacterVariable(character.id, options));
    } else if (section === "level") {
      dispatch(createStageVariable(undefined, options));
    } else {
      dispatch(createGlobal(undefined, options));
    }
  };

  const noun = {
    character: "Character Variable",
    level: "Level Variable",
    world: "World Variable",
  }[section];

  return (
    <ButtonDropdown
      className="inspector-subnav-add"
      isOpen={open}
      toggle={() => setOpen(!open)}
    >
      <DropdownToggle caret title={`Add ${noun}`} disabled={section === "character" && !character}>
        <i className="fa fa-plus" />
      </DropdownToggle>
      <DropdownMenu right>
        <DropdownItem onClick={() => _onAdd()}>Add Variable</DropdownItem>
        <DropdownItem divider />
        <DropdownItem
          title="A variable that gets a new random number every tick"
          onClick={() => _onAdd(DEFAULT_RANDOM_RANGE)}
        >
          <span role="img" aria-hidden>
            🎲
          </span>{" "}
          Add Random Variable
        </DropdownItem>
      </DropdownMenu>
    </ButtonDropdown>
  );
};

export default VariablesAddButton;
