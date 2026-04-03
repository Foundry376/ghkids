import { ButtonDropdown, DropdownItem, DropdownMenu, DropdownToggle } from "reactstrap";
import React, { useState } from "react";

interface WorldOptionsMenuProps {
  onDuplicate: () => void;
  onDelete: () => void;
}

const WorldOptionsMenu: React.FC<WorldOptionsMenuProps> = ({ onDuplicate, onDelete }) => {
  const [open, setOpen] = useState(false);

  return (
    <ButtonDropdown isOpen={open} toggle={() => setOpen(!open)}>
      <DropdownToggle className="btn-link btn-sm" outline>
        <i className="fa fa-ellipsis-v" />
      </DropdownToggle>
      <DropdownMenu right>
        <DropdownItem onClick={onDuplicate}>Duplicate World</DropdownItem>
        <DropdownItem divider />
        <DropdownItem onClick={onDelete}>Delete World</DropdownItem>
      </DropdownMenu>
    </ButtonDropdown>
  );
};

export default WorldOptionsMenu;
