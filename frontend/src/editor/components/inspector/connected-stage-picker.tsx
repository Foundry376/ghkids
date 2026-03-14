import { ButtonDropdown, DropdownItem, DropdownMenu, DropdownToggle } from "reactstrap";
import { useState } from "react";
import { connect } from "react-redux";

import { EditorState, World } from "../../../types";
import { getStages } from "../../utils/selectors";

const StagePicker = (props: {
  onChange: (e: { target: { value: string } }) => void;
  disabled: boolean;
  value: string;
  stages: World["stages"];
}) => {
  const { stages, disabled, value, onChange } = props;
  const [open, setOpen] = useState(false);

  return (
    <ButtonDropdown size="sm" disabled={disabled} isOpen={open} toggle={() => setOpen(!open)}>
      <DropdownToggle caret>{stages[value] ? stages[value].name : "None"}</DropdownToggle>
      <DropdownMenu>
        {Object.values(stages)
          .sort((a, b) => a.order - b.order)
          .map((s) => (
            <DropdownItem onClick={() => onChange({ target: { value: s.id } })} key={s.id}>
              {s.name}
            </DropdownItem>
          ))}
      </DropdownMenu>
    </ButtonDropdown>
  );
};

function mapStateToProps(state: EditorState) {
  return {
    stages: getStages(state),
  };
}

export default connect(mapStateToProps)(StagePicker);
