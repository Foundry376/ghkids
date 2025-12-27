import Toolbar from "./components/toolbar";

import { InspectorContainer } from "./components/inspector/container";
import StageContainer from "./components/stage/container";
import TutorialContainer from "./components/tutorial/container";

import ExploreCharactersContainer from "./components/modal-explore-characters/container";
import KeypickerContainer from "./components/modal-keypicker/container";
import PaintContainer from "./components/modal-paint/container";
import { PublishContainer } from "./components/modal-publish/container";
import { StagesContainer } from "./components/modal-stages/container";
import VideosContainer from "./components/modal-videos/container";
import { StageImagesLoader } from "./components/stage/stage-images-loader";

import { useSelector } from "react-redux";
import { EditorState } from "../types";
import { StampCursorSupport } from "./components/cursor-support";
import "./styles/editor.scss";

const RootEditor = () => {
  const selectedToolId = useSelector<EditorState>((state) => state.ui.selectedToolId);

  return (
    <div className={`editor tool-${selectedToolId}`}>
      <div className="editor-wrap">
        <div className="editor-horizontal-flex">
          <Toolbar />
        </div>
        <div className="editor-horizontal-flex" style={{ flex: 1, minHeight: 0 }}>
          <StageContainer />
          <InspectorContainer />
        </div>

        <TutorialContainer />
        <PaintContainer />
        <KeypickerContainer />
        <StagesContainer />
        <VideosContainer />
        <ExploreCharactersContainer />
        <PublishContainer />

        {/**behaviors / hooks / weird stuff */}
        <StageImagesLoader />
        <StampCursorSupport />
      </div>
    </div>
  );
};

export default RootEditor;
