import { forwardRef, useState } from "react";

import { KidTextField, KidTextFieldProps } from "./kid";

import "./password-input.scss";

export type PasswordInputProps = Omit<KidTextFieldProps, "type" | "trailing">;

/**
 * A KidTextField for passwords, with a Show / Hide button inside the box so
 * kids can check what they typed. Takes every KidTextField prop (label, hint,
 * error…) and forwards the ref to the <input>.
 */
const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>((props, ref) => {
  const [visible, setVisible] = useState(false);

  return (
    <KidTextField
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      {...props}
      ref={ref}
      type={visible ? "text" : "password"}
      trailing={
        <button
          type="button"
          className="password-toggle"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
        >
          {visible ? "Hide" : "Show"}
        </button>
      }
    />
  );
});

PasswordInput.displayName = "PasswordInput";

export default PasswordInput;
