import classNames from "classnames";
import React, { forwardRef, useState } from "react";

import { PixelIcon } from "../common/pixel-icon";

import "./kid-kit.scss";

// React 16 has no useId, so fields number themselves once, on first render.
let nextFieldId = 0;
const useFieldId = (id: string | undefined) => {
  const [generated] = useState(() => `kid-field-${++nextFieldId}`);
  return id ?? generated;
};

type KidFieldOwnProps = {
  label: React.ReactNode;
  /** Small print under the input: "At least 6 letters or numbers." */
  hint?: React.ReactNode;
  /** Replaces the hint and marks the field invalid. */
  error?: React.ReactNode;
  /** Sits inside the box after the input, e.g. a "Show" button for passwords. */
  trailing?: React.ReactNode;
  /** Applied to the wrapper; everything else goes to the <input>. */
  className?: string;
};

export type KidTextFieldProps = KidFieldOwnProps &
  Omit<React.InputHTMLAttributes<HTMLInputElement>, keyof KidFieldOwnProps>;

/**
 * A labelled, chunky text input. The ref and every input prop (type, name,
 * autoComplete, value/onChange, required…) go straight to the <input>.
 */
export const KidTextField = forwardRef<HTMLInputElement, KidTextFieldProps>(
  ({ label, hint, error, trailing, className, id, ...inputProps }, ref) => {
    const fieldId = useFieldId(id);
    const noteId = `${fieldId}-note`;
    const note = error ?? hint;

    return (
      <div
        className={classNames(
          "kid-field",
          { "kid-field--invalid": !!error, "kid-field--disabled": inputProps.disabled },
          className,
        )}
      >
        <label className="kid-field__label" htmlFor={fieldId}>
          {label}
        </label>
        <div className="kid-field__control">
          <input
            {...inputProps}
            ref={ref}
            id={fieldId}
            className="kid-field__input"
            aria-invalid={error ? true : inputProps["aria-invalid"]}
            aria-describedby={
              classNames(inputProps["aria-describedby"], { [noteId]: !!note }) || undefined
            }
          />
          {trailing && <div className="kid-field__trailing">{trailing}</div>}
        </div>
        {note && (
          <div
            id={noteId}
            className={error ? "kid-field__error" : "kid-field__hint"}
            role={error ? "alert" : undefined}
          >
            {note}
          </div>
        )}
      </div>
    );
  },
);
KidTextField.displayName = "KidTextField";

type KidSearchOwnProps = {
  /** Read out to screen readers; shown only if `showLabel` is set, since the
   *  magnifier and placeholder already say what the box is for. */
  label: string;
  showLabel?: boolean;
  className?: string;
};

export type KidSearchFieldProps = KidSearchOwnProps &
  Omit<React.InputHTMLAttributes<HTMLInputElement>, keyof KidSearchOwnProps | "type">;

/** A search box with a pixel magnifier, e.g. for finding published games. */
export const KidSearchField = forwardRef<HTMLInputElement, KidSearchFieldProps>(
  ({ label, showLabel, className, id, ...inputProps }, ref) => {
    const fieldId = useFieldId(id);
    return (
      <div className={classNames("kid-field", "kid-field--search", className)} role="search">
        <label className={showLabel ? "kid-field__label" : "kid-sr-only"} htmlFor={fieldId}>
          {label}
        </label>
        <div className="kid-field__control">
          <span className="kid-field__leading">
            <PixelIcon name="search" size={28} />
          </span>
          <input
            autoComplete="off"
            {...inputProps}
            ref={ref}
            id={fieldId}
            type="search"
            className="kid-field__input"
          />
        </div>
      </div>
    );
  },
);
KidSearchField.displayName = "KidSearchField";
