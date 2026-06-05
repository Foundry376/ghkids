import { useEffect, useRef, useState } from "react";

/**
 * A small auto-growing text editor used for both free-standing comments and
 * comment annotations on rules. Edits are committed on blur (matching the
 * rest of the rule editor). A comment that's left empty is removed.
 */
export const CommentTextEditor = ({
  value,
  placeholder,
  onCommit,
  onRemove,
}: {
  value: string;
  placeholder?: string;
  onCommit: (text: string) => void;
  onRemove?: () => void;
}) => {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState(value);

  useEffect(() => setText(value), [value]);

  // New comments mount empty — focus so the user can start typing immediately.
  useEffect(() => {
    if (value === "") {
      ref.current?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };
  useEffect(resize, [text]);

  const commit = () => {
    if (text.trim() === "") {
      onRemove?.();
    } else if (text !== value) {
      onCommit(text);
    }
  };

  return (
    <textarea
      ref={ref}
      className="comment-text"
      rows={1}
      value={text}
      placeholder={placeholder ?? "Write a note…"}
      onChange={(e) => setText(e.target.value)}
      // Keep clicks/drags from reaching the rule-list tool handlers while editing.
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onDragStart={(e) => e.stopPropagation()}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.currentTarget.blur();
        }
      }}
    />
  );
};
