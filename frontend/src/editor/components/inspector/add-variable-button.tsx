import { Button } from "reactstrap";
import { useDispatch } from "react-redux";
import { Character } from "../../../types";
import { createCharacterVariable } from "../../actions/characters-actions";
import { createGlobal, createStageVariable } from "../../actions/world-actions";

export type VariablesSubTab = "character" | "level" | "world";

const VariablesAddButton = ({
  character,
  section,
}: {
  character: Character | null;
  section: VariablesSubTab;
}) => {
  const dispatch = useDispatch();

  // The plus button adds a variable to whichever section the user is
  // currently looking at, so its behavior follows the active sub-tab.
  const _onClick = () => {
    if (section === "character") {
      if (!character) return;
      dispatch(createCharacterVariable(character.id));
    } else if (section === "level") {
      dispatch(createStageVariable());
    } else {
      dispatch(createGlobal());
    }
  };

  const label = {
    character: "Add Character Variable",
    level: "Add Level Variable",
    world: "Add World Variable",
  }[section];

  return (
    <Button
      className="inspector-subnav-add"
      title={label}
      disabled={section === "character" && !character}
      onClick={_onClick}
    >
      <i className="fa fa-plus" />
    </Button>
  );
};

export default VariablesAddButton;
