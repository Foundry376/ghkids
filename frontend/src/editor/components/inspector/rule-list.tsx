import React, { useContext, useEffect, useRef, useState } from "react";

import { ContentEventGroup } from "./content-event-group";
import { ContentFlowGroup } from "./content-flow-group";
import { ContentRule } from "./content-rule";

import { useDispatch, useSelector } from "react-redux";
import { Character, EditorState, RuleTreeItem, UIState } from "../../../types";
import { selectToolId, selectToolItem } from "../../actions/ui-actions";
import { TOOLS } from "../../constants/constants";
import { CONTAINER_TYPES } from "../../utils/world-constants";
import { RuleActionsContext } from "./container-pane-rules";

const DROP_INDEX_NA = 1000;
const DROP_INDEX_INSIDE_BUT_INDETERMINATE = -1;

class RuleDropPlaceholder extends React.Component {
  render() {
    return <div style={{ height: 30 }} />;
  }
}

export const RuleList = ({
  parentId,
  rules,
  character,
  collapsed,
}: {
  parentId: string | null;
  rules: RuleTreeItem[];
  character: Character;
  collapsed: boolean;
}) => {
  const { onRuleMoved, onRuleReRecord, onRuleDeleted, onRuleStamped } =
    useContext(RuleActionsContext);
  const selectedToolId = useSelector<EditorState, TOOLS>((state) => state.ui.selectedToolId);
  const stampToolItem = useSelector<EditorState, UIState["stampToolItem"]>(
    (s) => s.ui.stampToolItem,
  );

  const dispatch = useDispatch();

  const [dragState, setDragState] = useState<{
    dragIndex: number;
    dropIndex: number;
    hovering: string | false;
  }>({
    dragIndex: -1,
    dropIndex: -1,
    hovering: false,
  });

  const _el = useRef<HTMLUListElement>(null);
  const _leaveTimeout = useRef<number>();

  useEffect(() => {
    if (dragState.dragIndex) {
      setDragState({ dragIndex: -1, dropIndex: -1, hovering: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentId, rules, character]);

  useEffect(() => {
    clearTimeout(_leaveTimeout.current);
  }, []);

  const _dropIndexForEvent = (event: React.DragEvent<unknown> | React.MouseEvent<unknown>) => {
    const hasRuleId =
      "dataTransfer" in event ? event.dataTransfer?.types.includes("rule-id") : true;
    if (!hasRuleId) {
      return DROP_INDEX_NA;
    }

    if (!_el.current) {
      return;
    }

    const all = Array.from(_el.current.children).filter((c) =>
      c.classList.contains("rule-container"),
    );
    for (let i = 0; i < all.length; i++) {
      const { top, height } = all[i].getBoundingClientRect();
      if (event.clientY < top + Math.min(50, height * 0.33)) {
        return i;
      }

      // create a dead zone within the item. This is crucial for the drop-zones
      // within the item (ala nested rule list).
      if (event.clientY < top + Math.max(height - 50, height * 0.66)) {
        return DROP_INDEX_INSIDE_BUT_INDETERMINATE;
      }
    }

    return all.length;
  };

  const _onRuleClicked = (event: React.MouseEvent<unknown>, rule: RuleTreeItem) => {
    if (selectedToolId === TOOLS.TRASH) {
      event.stopPropagation();
      onRuleDeleted(rule.id, event);
    }
    if (selectedToolId === TOOLS.STAMP && !stampToolItem) {
      event.stopPropagation();
      dispatch(selectToolItem({ ruleId: rule.id }));
    }
  };

  const _onRuleDoubleClick = (event: React.MouseEvent<unknown>, rule: RuleTreeItem) => {
    event.stopPropagation();

    if (rule.type === CONTAINER_TYPES.FLOW && rule.check) {
      onRuleReRecord(rule.check);
    }
    if (rule.type === "rule") {
      onRuleReRecord(rule);
    }
  };

  const _onDragStart = (event: React.DragEvent<unknown>, rule: RuleTreeItem) => {
    event.stopPropagation();
    event.dataTransfer.setData("rule-id", rule.id);
    setDragState({ ...dragState, dragIndex: rules.indexOf(rule), dropIndex: -1 });
  };

  const _onDragEnd = () => {
    setDragState({ dragIndex: -1, dropIndex: -1, hovering: false });
  };

  const _onDragOver = (event: React.DragEvent<unknown>) => {
    clearTimeout(_leaveTimeout.current);

    const dropIndex = _dropIndexForEvent(event);
    if (dropIndex === undefined || dropIndex === DROP_INDEX_NA) {
      return;
    }

    event.stopPropagation();
    event.preventDefault();
    if (dropIndex !== dragState.dropIndex) {
      setDragState({ ...dragState, dropIndex });
    }
  };

  const _onDragLeave = () => {
    _leaveTimeout.current = setTimeout(() => {
      if (dragState.dropIndex !== -1) {
        setDragState({ ...dragState, dropIndex: -1 });
      }
    }, 1);
  };

  const _onDrop = (event: React.DragEvent<unknown>) => {
    const ruleId = event.dataTransfer.getData("rule-id");
    const dropIndex = _dropIndexForEvent(event);

    event.stopPropagation();
    event.preventDefault();

    if (!ruleId || dropIndex === -1 || dropIndex === undefined) {
      return;
    }

    if (event.altKey) {
      onRuleStamped(ruleId, parentId, dropIndex);
    } else {
      onRuleMoved(ruleId, parentId, dropIndex);
    }

    setDragState({ ...dragState, dragIndex: -1, dropIndex: -1 });
  };

  const _onListClick = (event: React.MouseEvent<unknown>) => {
    if (selectedToolId === TOOLS.STAMP && stampToolItem && "ruleId" in stampToolItem) {
      const dropIndex = _dropIndexForEvent(event);
      if (dropIndex === undefined || dropIndex === -1) {
        return;
      }
      onRuleStamped(stampToolItem.ruleId, parentId, dropIndex);
      if (!event.shiftKey) {
        dispatch(selectToolId(TOOLS.POINTER));
      }
    }
  };

  const _onMouseOver = (event: React.MouseEvent<unknown>, rule: RuleTreeItem) => {
    event.stopPropagation();
    setDragState({ ...dragState, hovering: rule.id });
  };

  const _onMouseOut = (event: React.MouseEvent<unknown>) => {
    event.stopPropagation();
    if (dragState.hovering) {
      setDragState({ ...dragState, hovering: false });
    }
  };

  if (collapsed || !rules) {
    return <span />;
  }

  const items = rules.map((r) => {
    return (
      <li
        draggable
        key={r.id}
        data-rule-id={r.id}
        className={`rule-container tool-supported ${r.type} ${dragState.hovering === r.id && "hovering"}`}
        onClick={(event) => _onRuleClicked(event, r)}
        onDoubleClick={(event) => _onRuleDoubleClick(event, r)}
        onDragStart={(event) => _onDragStart(event, r)}
        onDragEnd={() => _onDragEnd()}
        onMouseOver={(event) => _onMouseOver(event, r)}
        onMouseOut={(event) => _onMouseOut(event)}
      >
        {r.type === CONTAINER_TYPES.EVENT ? (
          <ContentEventGroup rule={r} character={character} />
        ) : r.type === CONTAINER_TYPES.FLOW ? (
          <ContentFlowGroup rule={r} character={character} />
        ) : (
          <ContentRule rule={r} />
        )}
      </li>
    );
  });

  if (
    dragState.dropIndex !== -1 &&
    (items.length === 0 || dragState.dragIndex !== dragState.dropIndex)
  ) {
    items.splice(dragState.dropIndex, 0, <RuleDropPlaceholder key={"drop"} />);
  }

  return (
    <ul
      className="rules-list"
      ref={_el}
      onDragOver={_onDragOver}
      onDragLeave={_onDragLeave}
      onDrop={_onDrop}
      onClick={_onListClick}
    >
      {items}
    </ul>
  );
};
