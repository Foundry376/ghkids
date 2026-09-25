import { MutableRefObject, useEffect, useMemo } from "react";
import { Provider } from "react-redux";
import { Store } from "redux";
import u from "updeep";

import StageContainer from "./components/stage/container";
import initialState from "./reducers/initial-state";
import configureStore from "./store/configureStore";

import { EditorState, Game } from "../types";
import { applyDataMigrations } from "./data-migrations";
import "./styles/editor.scss";

interface RootPlayerProps {
  world: Game;
  editorStoreRef?: MutableRefObject<Store | null>;
  immersive?: boolean;
  /** Changing this starts the game over from the saved world. */
  session?: number;
}

export const RootPlayer = ({
  world: gameWorld,
  editorStoreRef,
  immersive,
  session = 0,
}: RootPlayerProps) => {
  const editorStore = useMemo(() => {
    const migrated = applyDataMigrations(gameWorld);
    const { world, characters, characterZOrder } = migrated.data;
    const state = u({ world, characters, characterZOrder }, initialState) as EditorState;
    const editorStore = configureStore(state);
    window.editorStore = editorStore;
    return editorStore;
    // `session` isn't read here - it's a request to rebuild from the saved world.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameWorld, session]);

  // Expose the editor store to the parent via ref
  useEffect(() => {
    if (editorStoreRef) {
      editorStoreRef.current = editorStore;
    }
  }, [editorStore, editorStoreRef]);

  return (
    <Provider store={editorStore}>
      <div className={`stage-container ${immersive ? "stage-container--immersive" : ""}`}>
        <StageContainer readonly immersive={immersive} />
      </div>
    </Provider>
  );
};
