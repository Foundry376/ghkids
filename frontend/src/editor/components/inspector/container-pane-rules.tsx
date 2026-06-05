import React, { useEffect, useRef } from "react";

import { useDispatch } from "react-redux";
import {
  Actor,
  Character,
  Rule,
  RuleTreeComment,
  RuleTreeFlowItemCheck,
  RuleTreeItem,
} from "../../../types";
import { useEditorSelector } from "../../../hooks/redux";
import { upsertCharacter } from "../../actions/characters-actions";
import { editRuleRecording } from "../../actions/recording-actions";
import { selectRule, selectToolId, selectToolItem } from "../../actions/ui-actions";
import { TOOLS } from "../../constants/constants";
import { findRule } from "../../utils/stage-helpers";
import { deepClone, makeId } from "../../utils/utils";
import AddRuleButton from "./add-rule-button";
import CommentToolButton from "./comment-tool-button";
import DisableRuleToolButton from "./disable-rule-tool-button";
import { RuleList } from "./rule-list";

// eslint-disable-next-line react-refresh/only-export-components
export const RuleActionsContext = React.createContext<{
  onRuleMoved: (movingRuleId: string, newParentId: string | null, newParentIdx: number) => void;
  onRuleStamped: (movingRuleId: string, newParentId: string | null, newParentIdx: number) => void;
  onRuleReRecord: (rule: Rule | RuleTreeFlowItemCheck) => void;
  onRuleChanged: (ruleId: string, changes: Partial<RuleTreeItem>) => void;
  onRuleDeleted: (ruleId: string, event: React.MouseEvent<unknown>) => void;
  onCommentInserted: (parentId: string | null, index: number) => void;
  onCommentRemoved: (id: string) => void;
}>(new Error() as never);

// In-app clipboard for rule copy/paste, shared across mounts of the rules pane.
let ruleClipboard: RuleTreeItem | null = null;

const cloneRuleWithFreshIds = (item: RuleTreeItem): RuleTreeItem => {
  const copy = deepClone(item);
  const rewrite = (node: RuleTreeItem) => {
    node.id = makeId("rule");
    if (node.type === "group-flow" && node.check) {
      node.check.id = `${node.id}-check`;
    }
    if ("rules" in node) {
      node.rules.forEach(rewrite);
    }
  };
  rewrite(copy);
  return copy;
};

export const ContainerPaneRules = ({
  character,
  actor,
}: {
  character: Character | null;
  actor?: Actor | null;
}) => {
  const dispatch = useDispatch();
  const { selectedToolId, stampToolItem, selectedRuleId } = useEditorSelector(
    (state) => state.ui,
  );
  const isRecording = useEditorSelector((s) => !!s.recording.characterId);
  const _scrollContainerEl = useRef<HTMLDivElement>(null);
  const _scrollId = useRef<number>(0);

  const latestRef = useRef({ character, selectedRuleId, stampToolItem, isRecording });
  latestRef.current = { character, selectedRuleId, stampToolItem, isRecording };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable)
    ) {
      return;
    }
    const { character, selectedRuleId, stampToolItem, isRecording } = latestRef.current;
    if (!character) return;
    // Don't allow rule mutations while recording — the recording's rule reference
    // could be left dangling and corrupt sibling rules on commit.
    if (isRecording) return;

    const isShortcut = event.metaKey || event.ctrlKey;

    const clearStampIfMatches = (ruleId: string) => {
      if (stampToolItem && "ruleId" in stampToolItem && stampToolItem.ruleId === ruleId) {
        dispatch(selectToolItem(null));
      }
    };

    if (!isShortcut && (event.key === "Delete" || event.key === "Backspace")) {
      if (!selectedRuleId) return;
      const rules = deepClone(character.rules);
      const [, parentRule, parentIdx] = findRule({ rules }, selectedRuleId);
      if (!parentRule.rules[parentIdx]) return;
      parentRule.rules.splice(parentIdx, 1);
      dispatch(upsertCharacter(character.id, { rules }));
      dispatch(selectRule(null));
      clearStampIfMatches(selectedRuleId);
      event.preventDefault();
      return;
    }

    if (isShortcut && (event.key === "c" || event.key === "C")) {
      if (!selectedRuleId) return;
      const [rule] = findRule({ rules: character.rules }, selectedRuleId);
      if (!rule) return;
      ruleClipboard = deepClone(rule);
      event.preventDefault();
      return;
    }

    if (isShortcut && (event.key === "x" || event.key === "X")) {
      if (!selectedRuleId) return;
      const rules = deepClone(character.rules);
      const [rule, parentRule, parentIdx] = findRule({ rules }, selectedRuleId);
      if (!rule) return;
      ruleClipboard = deepClone(rule);
      parentRule.rules.splice(parentIdx, 1);
      dispatch(upsertCharacter(character.id, { rules }));
      dispatch(selectRule(null));
      clearStampIfMatches(selectedRuleId);
      event.preventDefault();
      return;
    }

    if (isShortcut && (event.key === "v" || event.key === "V")) {
      if (!ruleClipboard) return;
      const rules = deepClone(character.rules);
      const newRule = cloneRuleWithFreshIds(ruleClipboard);

      if (selectedRuleId) {
        const [foundRule, parentRule, parentIdx] = findRule({ rules }, selectedRuleId);
        if (foundRule) {
          parentRule.rules.splice(parentIdx + 1, 0, newRule);
        } else {
          rules.push(newRule);
        }
      } else {
        rules.push(newRule);
      }
      dispatch(upsertCharacter(character.id, { rules }));
      dispatch(selectRule(newRule.id));
      event.preventDefault();
      return;
    }
  };

  const onMouseDownContainer = () => {
    // Move focus into the pane so the keyboard shortcuts on the scroll-container
    // see the events. tabIndex={-1} keeps it out of the tab order.
    if (
      _scrollContainerEl.current &&
      !_scrollContainerEl.current.contains(document.activeElement)
    ) {
      _scrollContainerEl.current.focus({ preventScroll: true });
    }
  };

  const prevRulesJSON = useRef<string>();
  useEffect(() => {
    if (!character?.rules) {
      return;
    }
    const curRulesJSON = JSON.stringify(character.rules);
    if (prevRulesJSON.current && curRulesJSON !== prevRulesJSON.current) {
      const prevRules = JSON.parse(prevRulesJSON.current);

      // look for a newly created rule or conatainer
      const oldIds = flattenRules(prevRules).map((r) => r.id);
      const nextIds = flattenRules(character.rules).map((r) => r.id);
      if (oldIds.length >= nextIds.length) {
        return;
      }
      const newId = nextIds.find((id) => !oldIds.includes(id));
      if (newId) {
        _scrollToRuleId(newId);
      }
    }
    prevRulesJSON.current = curRulesJSON;
  }, [character?.rules]);

  if (!character) {
    return <div className="empty">Please select a character.</div>;
  }

  const _scrollToRuleId = (ruleId: string) => {
    const el = document.querySelector(`[data-rule-id="${ruleId}"]`);
    const container = _scrollContainerEl.current;
    if (!el || !(el instanceof HTMLElement) || !container) {
      return;
    }
    const scrollTopTarget = Math.round(
      Math.min(el.offsetTop, container.scrollHeight - container.clientHeight),
    );
    const scrollId = (_scrollId.current = Date.now());

    let lastAssigned: number | null = null;
    const step = () => {
      if (lastAssigned !== null && container.scrollTop !== lastAssigned) {
        // user has interrupted the scrolling somehow, abort!
        return;
      }
      if (_scrollId.current !== scrollId) {
        // another scroll has started, this one is no longer current
        return;
      }
      if (container.scrollTop !== scrollTopTarget) {
        const d = Math.abs(scrollTopTarget - container.scrollTop);
        const dsign = Math.sign(scrollTopTarget - container.scrollTop);
        container.scrollTop = lastAssigned =
          Math.round(container.scrollTop) + dsign * Math.max(Math.min(40, d / 10.0), 1);
        window.requestAnimationFrame(step);
      }
    };
    step();
  };

  const _onRuleReRecord = (rule: Rule | RuleTreeFlowItemCheck) => {
    dispatch(editRuleRecording({ characterId: character.id, rule: rule }));
  };

  const _onRuleMoved = (movingRuleId: string, newParentId: string | null, newParentIdx: number) => {
    const rules = deepClone(character.rules);
    const root = { rules };

    const [movingRule, oldParentRule, oldIdx] = findRule(root, movingRuleId);
    if (!movingRule) {
      throw new Error(`Couldn't find moving rule ID: ${movingRuleId}`);
    }
    const [newParentRule] = newParentId ? findRule(root, newParentId) : [root];
    if (!newParentRule) {
      throw new Error(`Couldn't find new parent rule ID: ${newParentId}`);
    }

    if (!("rules" in oldParentRule) || !("rules" in newParentRule)) {
      throw new Error(`Parent rules are not rule containers`);
    }

    // check that the rule isn't moving down into itself, which causes it to be detached
    if (
      "rules" in movingRule &&
      (movingRuleId === newParentId || (newParentId && findRule(movingRule, newParentId)[0]))
    ) {
      return;
    }

    let newIdx = newParentIdx;
    if (oldParentRule === newParentRule && newIdx > oldIdx) {
      newIdx -= 1;
    }
    oldParentRule.rules.splice(oldIdx, 1);
    newParentRule.rules.splice(newIdx, 0, movingRule);
    dispatch(upsertCharacter(character.id, root));
  };

  const _onRuleDeleted = (ruleId: string, event: React.MouseEvent<unknown>) => {
    const rules = deepClone(character.rules);
    const [, parentRule, parentIdx] = findRule({ rules }, ruleId);
    parentRule.rules.splice(parentIdx, 1);
    dispatch(upsertCharacter(character.id, { rules }));
    if (selectedRuleId === ruleId) {
      dispatch(selectRule(null));
    }
    if (stampToolItem && "ruleId" in stampToolItem && stampToolItem.ruleId === ruleId) {
      dispatch(selectToolItem(null));
    }
    if (!event.shiftKey) {
      dispatch(selectToolId(TOOLS.POINTER));
    }
  };

  const _onRuleChanged = (ruleId: string, changes: Partial<RuleTreeItem>) => {
    const rules = deepClone(character.rules);
    const [rule] = findRule({ rules }, ruleId);
    if (!rule) return;
    Object.assign(rule, changes);
    dispatch(upsertCharacter(character.id, { rules }));
  };

  const _onCommentInserted = (parentId: string | null, index: number) => {
    const rules = deepClone(character.rules);
    const root = { rules };
    const [parentRule] = parentId ? findRule(root, parentId) : [root];
    if (!parentRule || !("rules" in parentRule)) {
      return;
    }
    const comment: RuleTreeComment = { type: "comment", id: makeId("comment"), text: "" };
    parentRule.rules.splice(index, 0, comment);
    dispatch(upsertCharacter(character.id, root));
  };

  const _onCommentRemoved = (id: string) => {
    const rules = deepClone(character.rules);
    const [, parentRule, parentIdx] = findRule({ rules }, id);
    if (!parentRule.rules[parentIdx]) {
      return;
    }
    parentRule.rules.splice(parentIdx, 1);
    dispatch(upsertCharacter(character.id, { rules }));
    if (selectedRuleId === id) {
      dispatch(selectRule(null));
    }
  };

  const _onRuleStamped = (
    sourceRuleId: string,
    newParentId: string | null,
    newParentIdx: number,
  ) => {
    const rules = deepClone(character.rules);
    const root = { rules };

    const [sourceRule] = findRule(root, sourceRuleId);
    if (!sourceRule) {
      throw new Error(`Couldn't find moving rule ID: ${sourceRuleId}`);
    }
    const [newParentRule] = newParentId ? findRule(root, newParentId) : [root];
    if (!newParentRule) {
      throw new Error(`Couldn't find new parent rule ID: ${newParentId}`);
    }

    if (!("rules" in newParentRule)) {
      throw new Error(`Parent rules are not rule containers`);
    }

    const copyOfRule = { ...sourceRule, id: makeId("rule") };
    if ("name" in copyOfRule) {
      copyOfRule.name = `${copyOfRule.name} Copy`;
    }
    newParentRule.rules.splice(newParentIdx, 0, copyOfRule);
    dispatch(upsertCharacter(character.id, root));
  };

  const onClickBackground = (e: React.MouseEvent) => {
    if (selectedToolId === TOOLS.STAMP && stampToolItem && "ruleId" in stampToolItem) {
      _onRuleStamped(stampToolItem.ruleId, null, character.rules?.length ?? 0);
      if (!e.shiftKey) {
        dispatch(selectToolId(TOOLS.POINTER));
      }
      return;
    }
    if (selectedToolId === TOOLS.POINTER) {
      // Only deselect on clicks that landed in the empty space — clicks that
      // bubbled up from inside a rule (e.g., on a <select> or condition row)
      // shouldn't clear the selection that the rule-list click handler set.
      const target = e.target as HTMLElement | null;
      if (target && target.closest(".rule-container")) {
        return;
      }
      dispatch(selectRule(null));
    }
  };

  const isEmpty = !character.rules || character.rules.length === 0;

  return (
    <RuleActionsContext.Provider
      value={{
        onRuleReRecord: _onRuleReRecord,
        onRuleChanged: _onRuleChanged,
        onRuleMoved: _onRuleMoved,
        onRuleDeleted: _onRuleDeleted,
        onRuleStamped: _onRuleStamped,
        onCommentInserted: _onCommentInserted,
        onCommentRemoved: _onCommentRemoved,
      }}
    >
      <div className="inspector-subnav">
        <div className="inspector-subnav-spacer" />
        <CommentToolButton disabled={!character || isRecording} />
        <DisableRuleToolButton disabled={!character || isRecording} />
        <AddRuleButton character={character!} actor={actor!} isRecording={isRecording} />
      </div>
      <div
        className="scroll-container"
        ref={_scrollContainerEl}
        tabIndex={-1}
        onClick={onClickBackground}
        onMouseDown={onMouseDownContainer}
        onKeyDown={onKeyDown}
      >
        <div className="scroll-container-contents">
          {isEmpty ? (
            <div className="empty">
              This character doesn&#39;t have any rules. Create a new rule by clicking the
              &#39;Record&#39; icon.
            </div>
          ) : (
            <RuleList
              character={character}
              rules={character.rules}
              collapsed={false}
              parentId={null}
            />
          )}
        </div>
      </div>
    </RuleActionsContext.Provider>
  );
};

const flattenRules = (rules: RuleTreeItem[]): RuleTreeItem[] => {
  const result = [];
  for (const rule of rules) {
    result.push(rule);
    if ("rules" in rule) {
      result.push(...flattenRules(rule.rules));
    }
  }
  return result;
};
