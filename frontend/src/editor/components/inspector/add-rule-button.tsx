import { ButtonDropdown, DropdownItem, DropdownMenu, DropdownToggle } from "reactstrap";
import { useState } from "react";


import { useDispatch } from "react-redux";
import { Actor, Character } from "../../../types";
import {
  createCharacterEventContainer,
  createCharacterFlowContainer,
} from "../../actions/characters-actions";
import {
  setupRecordingForActor,
  setupRecordingForCharacter,
} from "../../actions/recording-actions";
import { pickKeyForEventContainer, selectToolId } from "../../actions/ui-actions";
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

  const _onCreateFlowContainerWithClick = () => {
    dispatch(
      createCharacterEventContainer(character.id, {
        id: makeId("rule"),
        eventType: "click",
        eventCode: undefined,
      }),
    );
  };

  const _onCreateFlowContainerWithKeyPress = () => {
    dispatch(pickKeyForEventContainer(true, character.id));
  };

  return (
    <ButtonDropdown
      isOpen={open}
      data-tutorial-id="inspector-add-rule"
      toggle={() => setOpen(!open)}
    >
      <DropdownToggle caret disabled={!character || isRecording}>
        <i className="fa fa-plus" />
      </DropdownToggle>
      <DropdownMenu right>
        <DropdownItem onClick={_onCreateRule}>
          <span className="badge rule" /> Add Rule
        </DropdownItem>
        <DropdownItem divider />
        <DropdownItem onClick={_onCreateFlowContainer}>
          <span className="badge rule-flow" /> Add Container
        </DropdownItem>
        <DropdownItem onClick={_onCreateFlowContainerWithClick}>
          <span className="badge rule-flow" /> Add Container with Click Test
        </DropdownItem>
        <DropdownItem onClick={_onCreateFlowContainerWithKeyPress}>
          <span className="badge rule-flow" /> Add Container with Key Test
        </DropdownItem>
      </DropdownMenu>
    </ButtonDropdown>
  );
};

export default RuleAddButton;
