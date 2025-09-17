import { useState } from "react";

import ButtonDropdown from "reactstrap/lib/ButtonDropdown";
import DropdownItem from "reactstrap/lib/DropdownItem";
import DropdownMenu from "reactstrap/lib/DropdownMenu";
import DropdownToggle from "reactstrap/lib/DropdownToggle";

import { useDispatch } from "react-redux";
import { Actor, Character } from "../../../types";
import { createCharacterFlowContainer } from "../../actions/characters-actions";
import {
  setupRecordingForActor,
  setupRecordingForCharacter,
} from "../../actions/recording-actions";
import { selectToolId } from "../../actions/ui-actions";
import { TOOLS } from "../../constants/constants";
import { makeId } from "../../utils/utils";

const RuleAddButton = ({
  character,
  isRecording,
  actor,
}: {
  character: Character;
  actor: Actor;
  isRecording: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const dispatch = useDispatch();

  const _onCreateRule = () => {
    if (actor) {
      dispatch(setupRecordingForActor({ characterId: character.id, actor }));
      dispatch(selectToolId(TOOLS.POINTER));
    } else {
      dispatch(setupRecordingForCharacter({ characterId: character.id }));
      dispatch(selectToolId(TOOLS.POINTER));
    }
  };

  const _onCreateFlowContainer = () => {
    const id = makeId("rule");
    dispatch(createCharacterFlowContainer(character.id, { id }));
  };

  return (
    <ButtonDropdown
      isOpen={open}
      data-tutorial-id="inspector-add-rule"
      toggle={() => setOpen(!open)}
    >
      <DropdownToggle caret disabled={!character || isRecording}>
        <i className="fa fa-tasks" /> Add
      </DropdownToggle>
      <DropdownMenu right>
        <DropdownItem onClick={_onCreateRule}>
          <span className="badge rule" /> Add Rule
        </DropdownItem>
        <DropdownItem divider />
        <DropdownItem onClick={_onCreateFlowContainer}>
          <span className="badge rule-flow" /> Add Rule Container
        </DropdownItem>
      </DropdownMenu>
    </ButtonDropdown>
  );
};

export default RuleAddButton;
