import React, { useEffect, useRef } from "react";

import { useDispatch } from "react-redux";
import { Character, Rule, RuleTreeFlowItemCheck, RuleTreeItem } from "../../../types";
import { useEditorSelector } from "../../../hooks/redux";
import { upsertCharacter } from "../../actions/characters-actions";
import { editRuleRecording } from "../../actions/recording-actions";
import { selectToolId } from "../../actions/ui-actions";
import { TOOLS } from "../../constants/constants";
import { findRule } from "../../utils/stage-helpers";
import { deepClone, makeId } from "../../utils/utils";
import { RuleList } from "./rule-list";

// eslint-disable-next-line react-refresh/only-export-components
export const RuleActionsContext = React.createContext<{
  onRuleMoved: (movingRuleId: string, newParentId: string | null, newParentIdx: number) => void;
  onRuleStamped: (movingRuleId: string, newParentId: string | null, newParentIdx: number) => void;
  onRuleReRecord: (rule: Rule | RuleTreeFlowItemCheck) => void;
  onRuleChanged: (ruleId: string, changes: Partial<RuleTreeItem>) => void;
  onRuleDeleted: (ruleId: string, event: React.MouseEvent<unknown>) => void;
}>(new Error() as never);

export const ContainerPaneRules = ({ character }: { character: Character | null }) => {
  const dispatch = useDispatch();
  const { selectedToolId, stampToolItem } = useEditorSelector((state) => state.ui);
  const _scrollContainerEl = useRef<HTMLDivElement>(null);
  const _scrollId = useRef<number>(0);

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

  if (!character.rules || character.rules.length === 0) {
    return (
      <div className="empty">
        This character doesn&#39;t have any rules. Create a new rule by clicking the
        &#39;Record&#39; icon.
      </div>
    );
  }

  const onClickBackground = (e: React.MouseEvent) => {
    if (selectedToolId === TOOLS.STAMP && stampToolItem && "ruleId" in stampToolItem) {
      _onRuleStamped(stampToolItem.ruleId, null, character.rules.length);
      if (!e.shiftKey) {
        dispatch(selectToolId(TOOLS.POINTER));
      }
    }
  };

  return (
    <RuleActionsContext.Provider
      value={{
        onRuleReRecord: _onRuleReRecord,
        onRuleChanged: _onRuleChanged,
        onRuleMoved: _onRuleMoved,
        onRuleDeleted: _onRuleDeleted,
        onRuleStamped: _onRuleStamped,
      }}
    >
      <div className="scroll-container" ref={_scrollContainerEl} onClick={onClickBackground}>
        <div className="scroll-container-contents">
          <RuleList
            character={character}
            rules={character.rules}
            collapsed={false}
            parentId={null}
          />
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
