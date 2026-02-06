import { MutableRefObject, useEffect, useMemo } from "react";
import { Provider } from "react-redux";
import { Store } from "redux";
import u from "updeep";

import { restoreInitialGameState } from "./actions/stage-actions";
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
}

export const RootPlayer = ({ world: gameWorld, editorStoreRef, immersive }: RootPlayerProps) => {
  const editorStore = useMemo(() => {
    const migrated = applyDataMigrations(gameWorld);
    const { world, characters } = migrated.data;
    const state = u({ world, characters }, initialState) as EditorState;
    const editorStore = configureStore(state);
    window.editorStore = editorStore;
    // immediately dispatch actions to reset every stage to the initial play state
    Object.keys(state.world.stages).forEach((stageId) => {
      editorStore.dispatch(restoreInitialGameState(state.world.id, stageId));
    });
    return editorStore;
  }, [gameWorld]);

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
