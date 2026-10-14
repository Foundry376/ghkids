import classNames from "classnames";
import React, { useState } from "react";
import { ButtonDropdown, DropdownItem, DropdownMenu, DropdownToggle } from "reactstrap";

import { PixelIcon } from "./pixel-icon";

export type WorldMenuItem = {
  label: string;
  onSelect: () => void;
  /** Can't be undone (delete): drawn in red, after a divider. */
  danger?: boolean;
};

/**
 * The square "⋮" on a game tile, for the things you do to a game less often
 * than playing or editing it: making a copy, deleting it.
 */
const WorldOptionsMenu: React.FC<{ worldName: string; items: WorldMenuItem[] }> = ({
  worldName,
  items,
}) => {
  const [open, setOpen] = useState(false);
  const safe = items.filter((i) => !i.danger);
  const danger = items.filter((i) => i.danger);

  const renderItem = (item: WorldMenuItem) => (
    <DropdownItem
      key={item.label}
      className={classNames({ "game-tile__menu-item--danger": item.danger })}
      onClick={item.onSelect}
    >
      {item.danger && <PixelIcon name="trash" size={20} tint="currentColor" />}
      {item.label}
    </DropdownItem>
  );

  return (
    <ButtonDropdown className="game-tile__menu" isOpen={open} toggle={() => setOpen(!open)}>
      <DropdownToggle
        tag="button"
        type="button"
        className="kid-button kid-button--secondary game-tile__more"
        aria-label={`More for ${worldName}`}
        title="More"
      >
        <PixelIcon name="more" size={24} tint="currentColor" />
      </DropdownToggle>
      <DropdownMenu right>
        {safe.map(renderItem)}
        {safe.length > 0 && danger.length > 0 && <DropdownItem divider />}
        {danger.map(renderItem)}
      </DropdownMenu>
    </ButtonDropdown>
  );
};

export default WorldOptionsMenu;
