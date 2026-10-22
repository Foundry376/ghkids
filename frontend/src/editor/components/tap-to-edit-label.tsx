import { useState } from "react";

export const TapToEditLabel = ({
  value,
  onChange,
  className,
}: {
  value: string;
  className: string;
  onChange?: (str: string) => void;
}) => {
  const [editing, setEditing] = useState(false);

  // Focus and select synchronously inside the tap/click handler. iOS Safari only
  // shows the on-screen keyboard when focus() is called during a user gesture, so
  // deferring this to an effect after setEditing(true) selects the text without
  // bringing up the keyboard.
  const beginEditing = (node: HTMLDivElement) => {
    node.contentEditable = "true";
    node.focus();
    const selection = window.getSelection();
    if (selection) {
      const range = document.createRange();
      range.selectNodeContents(node);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    setEditing(true);
  };

  const commit = (text: string) => {
    setEditing(false);
    if (onChange) {
      onChange(text.trim());
    }
  };

  const isUntitled = `${value}`.toLowerCase().startsWith("untitled");

  if (!onChange) {
    return <div className={`tap-to-edit editing-false ${className}`}>{value}</div>;
  }

  return (
    <div
      contentEditable={editing}
      suppressContentEditableWarning
      className={`tap-to-edit editing-${editing} enabled ${isUntitled ? "untitled" : ""} ${className}`}
      onDragStart={(e) => {
        e.stopPropagation();
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (!editing) {
          beginEditing(e.currentTarget);
          e.preventDefault();
        }
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
      }}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      onBlur={(e) => {
        commit(e.currentTarget.textContent || "");
      }}
    >
      {value}
    </div>
  );
};
