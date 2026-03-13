import Toolbar from "./components/toolbar";

import { InspectorContainer } from "./components/inspector/container";
import StageContainer from "./components/stage/container";
import TutorialContainer from "./components/tutorial/container";

import CharacterZOrderModal from "./components/modal-character-z-order/container";
import ExploreCharactersContainer from "./components/modal-explore-characters/container";
import KeypickerContainer from "./components/modal-keypicker/container";
import PaintContainer from "./components/modal-paint/container";
import { PublishContainer } from "./components/modal-publish/container";
import { StagesContainer } from "./components/modal-stages/container";
import VideosContainer from "./components/modal-videos/container";
import { StageImagesLoader } from "./components/stage/stage-images-loader";

import { useEditorSelector } from "../hooks/redux";
import { StampCursorSupport } from "./components/cursor-support";
import "./styles/editor.scss";

const RootEditor = () => {
  const selectedToolId = useEditorSelector((state) => state.ui.selectedToolId);

  return (
    <div className={`editor tool-${selectedToolId}`}>
      <Toolbar />
      <div className="editor-main-row">
        <StageContainer immersive />
        <InspectorContainer />
      </div>

      <TutorialContainer />
      <PaintContainer />
      <KeypickerContainer />
      <StagesContainer />
      <VideosContainer />
      <ExploreCharactersContainer />
      <CharacterZOrderModal />
      <PublishContainer />

      {/**behaviors / hooks / weird stuff */}
      <StageImagesLoader />
      <StampCursorSupport />
    </div>
  );
};

export default RootEditor;
