import { TypedUseSelectorHook, useSelector } from "react-redux";
import { MainState } from "../reducers/initial-state";
import { EditorState } from "../types";

// Typed selector hook for MainState (app-level state: me, worlds, profiles, network)
export const useAppSelector: TypedUseSelectorHook<MainState> = useSelector;

// Typed selector hook for EditorState (editor-level state: characters, world, ui, recording)
export const useEditorSelector: TypedUseSelectorHook<EditorState> = useSelector;
