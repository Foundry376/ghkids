import { MathOperation } from "../../../../types";

export const TransformActionPicker = (props: {
  operation: MathOperation;
  onChangeOperation: (op: MathOperation) => void;
}) => {
  const { operation, onChangeOperation } = props;

  return (
    <select
      value={operation ?? "set"}
      className="variable-operation-select"
      onChange={(e) => onChangeOperation(e.target.value as MathOperation)}
    >
      <option value="set">to</option>
      <option value="add">by</option>
    </select>
  );
};
