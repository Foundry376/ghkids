/* eslint-disable import/default */

import React from 'react';

import Toolbar from './components/toolbar';
import Library from './components/library';

import StageContainer from './components/stage/container';
import TutorialContainer from './components/tutorial/container';
import InspectorContainer from './components/inspector/container';

import VideosContainer from './components/modal-videos/container';
import PaintContainer from './components/modal-paint/container';
import KeypickerContainer from './components/modal-keypicker/container';
import StagesContainer from './components/modal-stages/container';
import ExploreCharactersContainer from './components/modal-explore-characters/container';

import './styles/editor.scss';


export default class RootEditor extends React.Component {
  render() {
    return (
      <div className="editor">
        <div className="editor-centered-flex">
          <div className="editor-horizontal-flex">
            <Toolbar />
          </div>
          <div className="editor-horizontal-flex" style={{flex: '1 1 85vh'}}>
            <div className="stage-container">
              <StageContainer />
              <Library />
            </div>
            <InspectorContainer />
          </div>

          <TutorialContainer />
          <PaintContainer />
          <KeypickerContainer />
          <StagesContainer />
          <VideosContainer />
          <ExploreCharactersContainer />
        </div>
      </div>
    );
  }
}