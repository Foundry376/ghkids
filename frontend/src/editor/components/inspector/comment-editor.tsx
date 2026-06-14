import { useEffect, useRef, useState } from "react";

/**
 * A small auto-growing text editor used for both free-standing comments and
 * comment annotations on rules. Supports three visual states:
 *
 * - **collapsed** (default): ~1 line with a fade mask hinting at more content.
 * - **expanded**: full text shown, focused. Blur returns to collapsed.
 * - **editing**: the familiar <textarea>. On blur, commits and collapses.
 *
 * Click once to expand+focus; click again to enter editing; blur to collapse.
 * New (empty) comments skip straight to editing mode.
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const divRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState(value);
  const [mode, setMode] = useState<"collapsed" | "expanded" | "editing">(
    value === "" ? "editing" : "collapsed",
  );

  useEffect(() => setText(value), [value]);

  // New comments mount empty — focus so the user can start typing immediately.
  useEffect(() => {
    if (value === "") {
      textareaRef.current?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-focus textarea when entering editing mode after initial mount.
  useEffect(() => {
    if (mode === "editing") {
      textareaRef.current?.focus();
    } else if (mode === "expanded") {
      divRef.current?.focus();
    }
  }, [mode]);

  const resize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };
  useEffect(resize, [mode, text]);

  const commit = () => {
    if (text.trim() === "") {
      onRemove?.();
    } else if (text !== value) {
      onCommit(text);
    }
    setMode("collapsed");
  };

  if (mode === "collapsed" || mode === "expanded") {
    return (
      <div
        ref={divRef}
        tabIndex={-1}
        className={`comment-text ${mode}`}
        onClick={(e) => {
          e.stopPropagation();
          if (mode === "collapsed") {
            // If the text fits in one line (not overflowing), skip straight to editing
            const el = divRef.current;
            if (el && el.scrollHeight <= el.clientHeight) {
              setMode("editing");
            } else {
              setMode("expanded");
            }
          } else {
            setMode("editing");
          }
        }}
        onBlur={() => {
          if (mode === "expanded") {
            setMode("collapsed");
          }
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onDragStart={(e) => e.stopPropagation()}
      >
        {text || placeholder || "Write a note…"}
      </div>
    );
  }

  return (
    <textarea
      ref={textareaRef}
      className="comment-text editing"
      value={text}
      placeholder={placeholder ?? "Write a note…"}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.currentTarget.blur();
        }
      }}
    />
  );
};
