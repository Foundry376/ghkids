import PropTypes from 'prop-types';
import React from 'react';
import TapToEditLabel from '../tap-to-edit-label';
import ConnectedStagePicker from './connected-stage-picker';

export default class VariableGridItem extends React.Component {
  static propTypes = {
    actorId: PropTypes.string,
    value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    definition: PropTypes.shape({
      id: PropTypes.string,
      name: PropTypes.string,
      defaultValue: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    }),

    onChangeValue: PropTypes.func,
    onChangeDefinition: PropTypes.func,
    onBlurValue: PropTypes.func,
    onClick: PropTypes.func,
  };

  static contextTypes = {
    selectedToolId: PropTypes.string,
  };

  _onDragStart = (event) => {
    const { value, definition } = this.props;
    const displayValue = value !== undefined ? value : definition.defaultValue;

    event.dataTransfer.dropEffect = "copy";
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData(
      "variable",
      JSON.stringify({
        type: "variable",
        actorId: this.props.actorId,
        variableId: this.props.definition.id,
        value: { constant: displayValue || 0 },
      })
    );
  };

  render() {
    const {
      value,
      actorId,
      definition,
      onChangeDefinition,
      onChangeValue,
      onBlurValue,
      onClick,
    } = this.props;
    const displayValue = value !== undefined ? value : definition.defaultValue;
    const disabled = this.context.selectedToolId === "trash";

    let content = null;

    if (disabled) {
      content = <div className="value">{displayValue}</div>;
    } else if (definition.type === "number") {
      content = (
        <input
          className="value"
          value={displayValue}
          onChange={(e) => onChangeValue(definition.id, e.target.value)}
          onBlur={(e) => onBlurValue(definition.id, e.target.value)}
        />
      );
    } else if (definition.type === "stage") {
      content = (
        <ConnectedStagePicker
          value={displayValue}
          onChange={(e) => onChangeValue(definition.id, e.target.value)}
        />
      );
    }

    return (
      <div
        className={`variable-box variable-set-${value !== undefined}`}
        onClick={(e) => onClick(definition.id, e)}
        draggable={!!actorId}
        onDragStart={this._onDragStart}
      >
        <TapToEditLabel
          className="name"
          value={definition.name}
          onChange={
            disabled
              ? null
              : (e) =>
                  onChangeDefinition(definition.id, { name: e.target.value })
          }
        />
        {content}
      </div>
    );
  }
}
