import { useState } from "react";
import { DisclosureTriangle } from "./disclosure-triangle";
import { RuleList } from "./rule-list";
import { RuleStateCircle } from "./rule-state-circle";

import { Character, RuleTreeEventItem } from "../../../types";
import { nameForKey } from "../../utils/event-helpers";
import { isCollapsePersisted, persistCollapsedState } from "./collapse-state-storage";

export const ContentEventGroup = ({
  rule,
  character,
}: {
  rule: RuleTreeEventItem;
  character: Character;
}) => {
  const [collapsed, setCollapsed] = useState(isCollapsePersisted(rule.id));

  const _name = () => {
    const { event, code } = rule;

    if (event === "key") {
      return (
        <span>
          When the
          <span className="keycode">{code ? nameForKey(code) : "No"} Key</span>
          is Pressed
        </span>
      );
    }
    if (event === "click") {
      return "When I'm Clicked";
    }
    return "When I'm Idle";
  };

  return (
    <div>
      <div className="header">
        <div style={{ float: "left", width: 20, lineHeight: "1.15em" }}>
          <RuleStateCircle rule={rule} />
          <DisclosureTriangle
            onClick={() => {
              setCollapsed(!collapsed);
              persistCollapsedState(rule.id, !collapsed);
            }}
            collapsed={collapsed}
          />
        </div>
        <img
          className="icon"
          src={new URL(`../../img/icon_event_${rule.event}.png`, import.meta.url).href}
        />
        <div className="name">{_name()}</div>
      </div>
      <RuleList parentId={rule.id} rules={rule.rules} collapsed={collapsed} character={character} />
    </div>
  );
};
