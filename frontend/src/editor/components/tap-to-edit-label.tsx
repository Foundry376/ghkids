import { useEffect, useRef, useState } from "react";

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
  const el = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (editing && el.current) {
      el.current.focus();
      const selection = window.getSelection();
      if (selection) {
        const range = document.createRange();
        range.selectNodeContents(el.current);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  }, [editing]);

  const commit = (text: string) => {
    setEditing(false);
    if (onChange) {
      onChange(text.trim());
    }
  };

  const isUntitled = `${value}`.startsWith("Untitled");

  if (!onChange) {
    return <div className={`tap-to-edit editing-false ${className}`}>{value}</div>;
  }

  return (
    <div
      contentEditable={editing}
      suppressContentEditableWarning
      ref={el}
      className={`tap-to-edit editing-${editing} enabled ${isUntitled ? "untitled" : ""} ${className}`}
      onDragStart={(e) => {
        e.stopPropagation();
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (!editing) {
          setEditing(true);
          e.preventDefault();
        }
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
