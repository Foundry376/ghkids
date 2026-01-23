/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";

export const EditorContext = React.createContext<{
  usingLocalStorage: boolean;
  saveWorldAnd: (dest: string) => void;
  saveWorld: () => Promise<void>;
  save: () => Promise<any>;
  saveDraft: () => Promise<any>;
  saveAndExit: (dest: string) => void;
  exitWithoutSaving: (dest: string) => void;
  hasUnsavedChanges: boolean;
}>({
  usingLocalStorage: false,
  saveWorldAnd: () => new Error(),
  saveWorld: () => Promise.resolve(),
  save: () => Promise.resolve(),
  saveDraft: () => Promise.resolve(),
  saveAndExit: () => new Error(),
  exitWithoutSaving: () => new Error(),
  hasUnsavedChanges: false,
});
