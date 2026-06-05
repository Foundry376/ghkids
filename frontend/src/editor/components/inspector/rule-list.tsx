import React, { useContext, useEffect, useRef, useState } from "react";

import { ContentComment, RuleCommentAnnotation } from "./content-comment";
import { ContentEventGroup } from "./content-event-group";
import { ContentFlowGroup } from "./content-flow-group";
import { ContentRule } from "./content-rule";

import { useDispatch } from "react-redux";
import { Character, RuleTreeItem } from "../../../types";
import { useEditorSelector } from "../../../hooks/redux";
import { selectRule, selectToolId, selectToolItem } from "../../actions/ui-actions";
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
  const {
    onRuleMoved,
    onRuleReRecord,
    onRuleDeleted,
    onRuleStamped,
    onRuleChanged,
    onCommentInserted,
  } = useContext(RuleActionsContext);
  const selectedToolId = useEditorSelector((state) => state.ui.selectedToolId);
  const stampToolItem = useEditorSelector((s) => s.ui.stampToolItem);
  const selectedRuleId = useEditorSelector((s) => s.ui.selectedRuleId);
  const isRecording = useEditorSelector((s) => !!s.recording.characterId);

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
      const isLastItem = i === all.length - 1;

      if (event.clientY < top + Math.min(50, height * 0.33)) {
        return i;
      }

      // create a dead zone within the item. This is crucial for the drop-zones
      // within the item (ala nested rule list). For the last item, the dead zone
      // ends at 50% to make it easier to drop at the end of the list.
      const deadZoneEnd = isLastItem
        ? top + height * 0.5
        : top + Math.max(height - 50, height * 0.66);

      if (event.clientY < deadZoneEnd) {
        return DROP_INDEX_INSIDE_BUT_INDETERMINATE;
      }
    }

    return all.length;
  };

  const _onRuleClicked = (event: React.MouseEvent<unknown>, rule: RuleTreeItem) => {
    if (selectedToolId === TOOLS.COMMENT) {
      event.stopPropagation();
      // Clicking a rule attaches an (empty, focused) comment annotation. If it
      // already has one — or it's itself a free-standing comment — do nothing.
      if (rule.type !== "comment" && rule.comment === undefined) {
        onRuleChanged(rule.id, { comment: "" });
      }
      return;
    }
    if (selectedToolId === TOOLS.DISABLE_RULE) {
      // Clicking a rule (or container) flips whether it's enabled. Stay in the
      // tool so several rules can be toggled in a row.
      event.stopPropagation();
      onRuleChanged(rule.id, { enabled: rule.enabled === false });
      return;
    }
    if (selectedToolId === TOOLS.TRASH) {
      event.stopPropagation();
      onRuleDeleted(rule.id, event);
      return;
    }
    if (selectedToolId === TOOLS.STAMP && !stampToolItem) {
      event.stopPropagation();
      dispatch(selectToolItem({ ruleId: rule.id }));
      return;
    }
    if (selectedToolId === TOOLS.POINTER) {
      // While recording, the rule being edited is referenced by recording state.
      // Skipping selection here keeps Delete/Cut shortcuts inert and avoids
      // misleading the user about what's actionable.
      if (isRecording) return;
      event.stopPropagation();
      dispatch(selectRule(rule.id));
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
    if (selectedToolId === TOOLS.COMMENT) {
      // Clicks land here only when they miss a rule (clicks on a rule are
      // stopped in _onRuleClicked). Drop a free-standing comment at that gap.
      event.stopPropagation();
      const dropIndex = _dropIndexForEvent(event);
      const insertAt =
        dropIndex === undefined || dropIndex < 0 ? rules.length : Math.min(dropIndex, rules.length);
      onCommentInserted(parentId, insertAt);
      return;
    }
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
        className={`rule-container tool-supported ${r.type} ${dragState.hovering === r.id && "hovering"} ${r.enabled === false && "rule-disabled"} ${selectedRuleId === r.id ? "selected" : ""}`}
        onClick={(event) => _onRuleClicked(event, r)}
        onDoubleClick={(event) => _onRuleDoubleClick(event, r)}
        onDragStart={(event) => _onDragStart(event, r)}
        onDragEnd={() => _onDragEnd()}
        onMouseOver={(event) => _onMouseOver(event, r)}
        onMouseOut={(event) => _onMouseOut(event)}
      >
        {r.type !== "comment" && r.comment !== undefined && (
          <RuleCommentAnnotation ruleId={r.id} text={r.comment} />
        )}
        {r.type === CONTAINER_TYPES.EVENT ? (
          <ContentEventGroup rule={r} character={character} />
        ) : r.type === CONTAINER_TYPES.FLOW ? (
          <ContentFlowGroup rule={r} character={character} />
        ) : r.type === "comment" ? (
          <ContentComment comment={r} />
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
