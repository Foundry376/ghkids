import classNames from "classnames";
import React, { useEffect, useRef } from "react";
import { Dispatch } from "redux";

import Button from "reactstrap/lib/Button";
import ButtonGroup from "reactstrap/lib/ButtonGroup";
import { World } from "../../../types";
import {
  advanceGameState,
  restoreInitialGameState,
  saveInitialGameState,
  stepBackGameState,
} from "../../actions/stage-actions";
import { updatePlaybackState } from "../../actions/ui-actions";
import { SPEED_OPTIONS } from "../../constants/constants";
import { getCurrentStageForWorld } from "../../utils/selectors";
import { getStageScreenshot } from "../../utils/stage-helpers";
import TickClock from "./tick-clock";

interface StageControlsProps {
  readonly?: boolean;
  world: World;
  dispatch: Dispatch;
  speed: number;
  running: boolean;
  runningDirection: "forward" | "rewind";
}

const StageControls: React.FC<StageControlsProps> = ({
  readonly,
  world,
  dispatch,
  speed,
  running,
  runningDirection,
}) => {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerSpeedRef = useRef<number | null>(null);

  const rewinding = running && runningDirection === "rewind";

  const onTick = () => {
    if (runningDirection === "rewind") {
      dispatch(stepBackGameState(world.id));
    } else {
      dispatch(advanceGameState(world.id, { clearInput: true }));
    }
  };

  useEffect(() => {
    if (running && (!timerRef.current || timerSpeedRef.current !== speed)) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      timerSpeedRef.current = speed;
      timerRef.current = setInterval(onTick, speed);
    } else if (!running && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, runningDirection, speed, world.id]);

  // Auto-stop rewinding when history is exhausted
  useEffect(() => {
    if (rewinding && world.history?.length === 0) {
      dispatch(updatePlaybackState({ speed, running: false }));
    }
  }, [dispatch, rewinding, speed, world.history?.length]);

  const onRestoreInitialGameState = () => {
    const stage = getCurrentStageForWorld(world);
    if (!stage) return;

    if (window.confirm("Are you sure you want to reset the stage to the saved `Start` state?")) {
      dispatch(restoreInitialGameState(world.id, stage.id));
    }
  };

  const onSaveInitialGameState = () => {
    const stage = getCurrentStageForWorld(world);
    if (!stage) return;

    const thumbnail = getStageScreenshot(stage, { size: 160 });
    if (!thumbnail) return;

    dispatch(
      saveInitialGameState(world.id, stage.id, {
        actors: stage.actors,
        thumbnail,
      }),
    );
  };

  const renderRestartControl = () => {
    const stage = getCurrentStageForWorld(world);
    const startThumbnail = stage?.startThumbnail ?? "";
    return (
      <div className="left">
        <div className="start-thumbnail restart-button" onClick={onRestoreInitialGameState}>
          <img src={startThumbnail} />
          <div className="label">
            <i className="fa fa-fast-backward" /> Restart
          </div>
        </div>
      </div>
    );
  };

  const renderInitialStateControls = () => {
    const stage = getCurrentStageForWorld(world);
    const startThumbnail = stage?.startThumbnail ?? "";

    return (
      <div className="left">
        <div className="start-thumbnail">
          <img src={startThumbnail} />
        </div>
        <div className="start-buttons">
          <Button size="sm" onClick={onRestoreInitialGameState}>
            <i className="fa fa-arrow-up" />
          </Button>
          <Button size="sm" onClick={onSaveInitialGameState}>
            <i className="fa fa-arrow-down" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="stage-controls">
      {readonly ? renderRestartControl() : renderInitialStateControls()}

      <div style={{ flex: 1 }} />

      <div className="center" data-tutorial-id="controls">
        {!readonly && (
          <Button
            size="sm"
            disabled={world.history && world.history.length === 0}
            onClick={() => dispatch(stepBackGameState(world.id))}
          >
            <i className="fa fa-step-backward" /> Back
          </Button>
        )}{" "}
        {!readonly && (
          <Button
            className={classNames({ selected: rewinding })}
            disabled={!rewinding && world.history && world.history.length === 0}
            onClick={() =>
              dispatch(
                rewinding
                  ? updatePlaybackState({ speed, running: false })
                  : updatePlaybackState({ speed, running: true, runningDirection: "rewind" }),
              )
            }
          >
            <i className="fa fa-backward" />
          </Button>
        )}{" "}
        <Button
          className={classNames({ selected: !running })}
          onClick={() => dispatch(updatePlaybackState({ speed, running: false }))}
        >
          <i className="fa fa-stop" /> Stop
        </Button>{" "}
        <Button
          data-tutorial-id="play"
          className={classNames({ selected: running && runningDirection === "forward" })}
          onClick={() =>
            dispatch(updatePlaybackState({ speed, running: true, runningDirection: "forward" }))
          }
        >
          <i className="fa fa-play" /> Play
        </Button>{" "}
        {!readonly && (
          <Button size="sm" onClick={() => dispatch(advanceGameState(world.id))}>
            <i className="fa fa-step-forward" /> Forward
          </Button>
        )}{" "}
        <TickClock running={running} speed={speed} tickKey={world.evaluatedTickFrames?.[0]?.id} />
      </div>

      <div style={{ flex: 1 }} />

      <div className="right">
        <ButtonGroup>
          {Object.keys(SPEED_OPTIONS).map((name) => (
            <Button
              size="sm"
              key={name}
              style={{ minWidth: 0 }}
              className={classNames({
                selected: SPEED_OPTIONS[name as keyof typeof SPEED_OPTIONS] === speed,
              })}
              onClick={() =>
                dispatch(
                  updatePlaybackState({
                    speed: SPEED_OPTIONS[name as keyof typeof SPEED_OPTIONS],
                    running,
                  }),
                )
              }
            >
              {name}
            </Button>
          ))}
        </ButtonGroup>
      </div>
    </div>
  );
};

export default StageControls;
