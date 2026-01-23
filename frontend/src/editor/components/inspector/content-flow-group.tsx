import { useContext, useState } from "react";
import { TapToEditLabel } from "../tap-to-edit-label";
import { RuleList } from "./rule-list";
import { RuleStateCircle } from "./rule-state-circle";

import { Character, RuleTreeFlowItem, RuleTreeFlowItemCheck } from "../../../types";
import { defaultAppearanceId } from "../../utils/character-helpers";
import { FLOW_BEHAVIORS } from "../../utils/world-constants";
import { isCollapsePersisted, persistCollapsedState } from "./collapse-state-storage";
import { RuleActionsContext } from "./container-pane-rules";
import { ContentFlowGroupCheck } from "./content-flow-group-check";
import { DisclosureTriangle } from "./disclosure-triangle";

export const ContentFlowGroup = ({
  rule,
  character,
}: {
  rule: RuleTreeFlowItem;
  character: Character;
}) => {
  const [checkCollapsed, setCheckCollapsed] = useState(isCollapsePersisted(rule.id));
  const [collapsed, setCollapsed] = useState(isCollapsePersisted(rule.id));
  const { onRuleChanged, onRuleReRecord } = useContext(RuleActionsContext);

  const _onNameChange = (name: string) => {
    onRuleChanged(rule.id, { name });
  };

  const _onBehaviorChanged = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onRuleChanged(rule.id, { behavior: event.target.value as RuleTreeFlowItem["behavior"] });
  };

  const _onLoopCountChanged = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onRuleChanged(rule.id, { loopCount: JSON.parse(event.target.value) });
  };

  const _onAddCheck = () => {
    const check: RuleTreeFlowItemCheck = {
      id: `${rule.id}-check`,
      mainActorId: "main",
      conditions: [
        {
          left: { actorId: "main", variableId: "appearance" },
          right: { constant: defaultAppearanceId(character.spritesheet) },
          comparator: "=",
          key: "main-appearance",
          enabled: true,
        },
      ],
      extent: {
        xmax: 0,
        ymax: 0,
        xmin: 0,
        ymin: 0,
        ignored: {},
      },
      actors: {
        main: {
          id: "main",
          characterId: character.id,
          variableValues: {},
          appearance: defaultAppearanceId(character.spritesheet),
          position: { x: 0, y: 0 },
        },
      },
    };
    onRuleChanged(rule.id, { check });
    onRuleReRecord(check);
  };
  const variables = Object.values(character.variables);

  return (
    <div>
      <div className={`${rule.behavior}`}>
        <div style={{ display: "flex", gap: 4, alignItems: "baseline" }}>
          <RuleStateCircle
            rule={rule}
            onToggle={() => onRuleChanged(rule.id, { enabled: rule.enabled === false })}
          />
          <TapToEditLabel className="name" value={rule.name} onChange={_onNameChange} />
        </div>

        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          <DisclosureTriangle
            onClick={() => {
              setCheckCollapsed(!checkCollapsed);
              if (rule.check) {
                persistCollapsedState(rule.check.id, !collapsed);
              }
            }}
            enabled={!!rule.check}
            collapsed={!rule.check || checkCollapsed}
          />
          <select
            value={rule.check ? "when" : "always"}
            onChange={(e) => {
              if (e.target.value === "when") {
                _onAddCheck();
              } else {
                onRuleChanged(rule.id, { check: undefined });
              }
            }}
          >
            <option value="always">Always</option>
            <option value="when">When</option>
          </select>
        </div>

        {rule.check && !checkCollapsed && <ContentFlowGroupCheck check={rule.check} />}

        <div
          style={{
            paddingLeft: rule.check ? 16 : 0,
            display: "flex",
            alignItems: "baseline",
            gap: 4,
          }}
        >
          <DisclosureTriangle
            collapsed={collapsed}
            onClick={() => {
              setCollapsed(!collapsed);
              persistCollapsedState(rule.id, !collapsed);
            }}
          />
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <select onChange={_onBehaviorChanged} value={rule.behavior}>
              <option key={FLOW_BEHAVIORS.FIRST} value={FLOW_BEHAVIORS.FIRST}>
                Do First Match
              </option>
              <option key={FLOW_BEHAVIORS.LOOP} value={FLOW_BEHAVIORS.LOOP}>
                Do First Match &amp; Repeat
              </option>
              <option key={FLOW_BEHAVIORS.ALL} value={FLOW_BEHAVIORS.ALL}>
                Do All &amp; Continue
              </option>
              <option key={FLOW_BEHAVIORS.RANDOM} value={FLOW_BEHAVIORS.RANDOM}>
                Randomize &amp; Do First
              </option>
            </select>
            {rule.behavior === FLOW_BEHAVIORS.LOOP ? (
              <select
                onChange={_onLoopCountChanged}
                value={JSON.stringify(rule.loopCount) || `{"constant":2}`}
              >
                <option value={`{"constant":2}`}>2 Times</option>
                <option value={`{"constant":3}`}>3 Times</option>
                <option value={`{"constant":4}`}>4 Times</option>
                <option value={`{"constant":5}`}>5 Times</option>
                <option value={`{"constant":6}`}>6 Times</option>
                <option value={`{"constant":7}`}>7 Times</option>
                <option value={`{"constant":8}`}>8 Times</option>
                <option value={`{"constant":9}`}>9 Times</option>
                <option value={`{"constant":10}`}>10 Times</option>
                <option disabled>_____</option>
                {variables.map(({ id, name }) => (
                  <option value={`{"variableId":"${id}"}`} key={id}>
                    "{name}" Times
                  </option>
                ))}
                {variables.length === 0 ? (
                  <option disabled>No variables defined</option>
                ) : undefined}
              </select>
            ) : undefined}
          </div>
        </div>

        <div style={{ paddingLeft: rule.check ? 16 : 0 }}>
          <RuleList
            parentId={rule.id}
            rules={rule.rules}
            collapsed={collapsed}
            character={character}
          />
        </div>
      </div>
    </div>
  );
};
