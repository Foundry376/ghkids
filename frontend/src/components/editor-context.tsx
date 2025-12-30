/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";

export const EditorContext = React.createContext<{
  usingLocalStorage: boolean;
  saveWorldAnd: (dest: string) => void;
  saveWorld: () => Promise<void>;
}>({
  usingLocalStorage: false,
  saveWorldAnd: () => new Error(),
  saveWorld: () => Promise.resolve(),
});
