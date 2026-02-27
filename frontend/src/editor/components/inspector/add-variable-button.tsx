import { useState } from "react";
import { useDispatch } from "react-redux";
import ButtonDropdown from "reactstrap/lib/ButtonDropdown";
import DropdownItem from "reactstrap/lib/DropdownItem";
import DropdownMenu from "reactstrap/lib/DropdownMenu";
import DropdownToggle from "reactstrap/lib/DropdownToggle";
import { Actor, Character } from "../../../types";
import { createCharacterVariable } from "../../actions/characters-actions";
import { createGlobal } from "../../actions/world-actions";

const VariablesAddButton = ({ character }: { character: Character; actor: Actor }) => {
  const [open, setOpen] = useState(false);
  const dispatch = useDispatch();

  const _onCreateVar = () => {
    dispatch(createCharacterVariable(character.id));
  };

  const _onCreateGlobal = () => {
    dispatch(createGlobal());
  };

  return (
    <ButtonDropdown
      isOpen={open}
      data-tutorial-id="inspector-add-rule"
      toggle={() => setOpen(!open)}
    >
      <DropdownToggle caret>
        <i className="fa fa-plus" />
      </DropdownToggle>
      <DropdownMenu right>
        <DropdownItem disabled={!character} onClick={_onCreateVar}>
          <span className="badge rule" /> Add Character Variable
        </DropdownItem>
        <DropdownItem divider />
        <DropdownItem onClick={_onCreateGlobal}>
          <span className="badge rule-flow" /> Add World Variable
        </DropdownItem>
      </DropdownMenu>
    </ButtonDropdown>
  );
};

export default VariablesAddButton;
