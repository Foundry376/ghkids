import PropTypes from "prop-types";
import React from "react";

class SpriteVariablesPanel extends React.Component {
  static propTypes = {
    character: PropTypes.object,
    actor: PropTypes.object,
    showVariables: PropTypes.bool,
    visibleVariables: PropTypes.object,
    onToggleVariableVisibility: PropTypes.func,
  };

  render() {
    const { character, actor, showVariables, visibleVariables, onToggleVariableVisibility } = this.props;

    if (!character) {
      return null;
    }

    const variables = character.variables || {};
    const variableKeys = Object.keys(variables);

    if (variableKeys.length === 0) {
      return (
        <div className="sprite-variables-panel" style={{ marginTop: 8 }}>
          <div style={{ fontSize: 12, color: "#666" }}>
            No variables defined for this sprite
          </div>
        </div>
      );
    }

    return (
      <div className="sprite-variables-panel" style={{ marginTop: 8 }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
          <h6 style={{ margin: 0, flex: 1 }}>Sprite Variables</h6>
        </div>
        
        <div style={{ maxHeight: 150, overflowY: "auto" }}>
          {variableKeys.map((variableId) => {
            const variable = variables[variableId];
            const value = actor?.variableValues?.[variableId] || variable.defaultValue || "";
            const isVisible = visibleVariables[variableId];
            
            return (
              <div
                key={variableId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: 4,
                  padding: "2px 4px",
                  backgroundColor: isVisible ? "#e3f2fd" : "#f5f5f5",
                  borderRadius: 3,
                  fontSize: 11,
                }}
              >
                <input
                  type="checkbox"
                  checked={isVisible}
                  onChange={() => onToggleVariableVisibility(variableId)}
                  style={{ marginRight: 6 }}
                />
                <span style={{ flex: 1, fontWeight: 500 }}>
                  {variable.name}:
                </span>
                <span style={{ color: "#666", marginLeft: 4 }}>
                  {value}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
}

export default SpriteVariablesPanel;