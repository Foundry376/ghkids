import PropTypes from "prop-types";
import React from "react";

class VariableOverlay extends React.Component {
  static propTypes = {
    character: PropTypes.object,
    actor: PropTypes.object,
    showVariables: PropTypes.bool,
    visibleVariables: PropTypes.object,
    pixelSize: PropTypes.number,
    imageData: PropTypes.object,
    stageContext: PropTypes.bool,
  };

  render() {
    const { character, actor, showVariables, visibleVariables, pixelSize, imageData, stageContext } = this.props;

    if (!character || !imageData) {
      return null;
    }

    const variables = character.variables || {};
    const variableKeys = Object.keys(variables);
    const visibleVariableKeys = variableKeys.filter(key => visibleVariables[key]);

    if (visibleVariableKeys.length === 0) {
      return null;
    }

    // If in stage context, render smaller and above the sprite
    if (stageContext) {
      return (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: -22 - (visibleVariableKeys.length - 1) * 18, // stack above sprite
            transform: "translateX(-50%)",
            pointerEvents: "none",
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {visibleVariableKeys.map((variableId, index) => {
            const variable = variables[variableId];
            const displayValue = actor?.variableValues?.[variableId] || variable.defaultValue || "";
            return (
              <div
                key={variableId}
                style={{
                  marginBottom: 2,
                  backgroundColor: "rgba(0, 0, 0, 0.7)",
                  color: "white",
                  padding: "1px 4px",
                  borderRadius: 2,
                  fontSize: 9,
                  fontFamily: "monospace",
                  whiteSpace: "nowrap",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
                }}
              >
                {variable.name}: {displayValue}
              </div>
            );
          })}
        </div>
      );
    }
    // Default (paint modal etc)
    return (
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          pointerEvents: "none",
          zIndex: 10,
          width: imageData.width * pixelSize,
          height: imageData.height * pixelSize,
        }}
      >
        {visibleVariableKeys.map((variableId, index) => {
          const variable = variables[variableId];
          const displayValue = actor?.variableValues?.[variableId] || variable.defaultValue || "";
          const x = 10 + (index % 2) * 120;
          const y = 15 + Math.floor(index / 2) * 20;
          return (
            <div
              key={variableId}
              style={{
                position: "absolute",
                left: x,
                top: y,
                backgroundColor: "rgba(0, 0, 0, 0.7)",
                color: "white",
                padding: "2px 6px",
                borderRadius: 3,
                fontSize: 10,
                fontFamily: "monospace",
                whiteSpace: "nowrap",
                border: "1px solid rgba(255, 255, 255, 0.2)",
              }}
            >
              {variable.name}: {displayValue}
            </div>
          );
        })}
      </div>
    );
  }
}

export default VariableOverlay;