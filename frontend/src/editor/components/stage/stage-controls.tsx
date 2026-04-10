import { Button, ButtonGroup } from "reactstrap";
import classNames from "classnames";
import React, { useEffect, useRef } from "react";
import { Dispatch } from "redux";

import { World } from "../../../types";
import {
  advanceGameState,
  rewindAllGameState,
  stepBackGameState,
} from "../../actions/stage-actions";
import { updatePlaybackState } from "../../actions/ui-actions";
import { SPEED_OPTIONS } from "../../constants/constants";
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

  return (
    <div className="stage-controls">
      <div className="left" style={{ width: 122 }} />

      <div style={{ flex: 1 }} />

      <div className="center transport-controls" data-tutorial-id="controls">
        {/* Reset - green, farthest left: most change backward */}
        {!readonly && (
          <button
            className="transport-btn transport-green"
            disabled={world.history && world.history.length === 0}
            onClick={() => dispatch(rewindAllGameState(world.id))}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <rect x="0" y="1" width="2.5" height="12" />
              <polygon points="12,1 12,13 3,7" />
            </svg>
          </button>
        )}
        {/* Rewind - green, continuous backward play */}
        {!readonly && (
          <button
            className={classNames("transport-btn transport-green", { selected: rewinding })}
            disabled={!rewinding && world.history && world.history.length === 0}
            onClick={() =>
              dispatch(
                rewinding
                  ? updatePlaybackState({ speed, running: false })
                  : updatePlaybackState({ speed, running: true, runningDirection: "rewind" }),
              )
            }
          >
            <svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor">
              <polygon points="12,1 12,13 0,7" />
            </svg>
          </button>
        )}
        {/* Step Backward - yellow, one tick back */}
        {!readonly && (
          <button
            className="transport-btn transport-yellow"
            disabled={world.history && world.history.length === 0}
            onClick={() => dispatch(stepBackGameState(world.id))}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <polygon points="12,1 12,13 2,7" />
              <rect x="0" y="1" width="2.5" height="12" />
            </svg>
          </button>
        )}
        {/* Stop - red, center */}
        <button
          className={classNames("transport-btn transport-red", { selected: !running })}
          onClick={() => dispatch(updatePlaybackState({ speed, running: false }))}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <rect x="0" y="0" width="12" height="12" rx="1" />
          </svg>
        </button>
        {/* Step Forward - yellow, one tick forward */}
        {!readonly && (
          <button
            className="transport-btn transport-yellow"
            onClick={() => dispatch(advanceGameState(world.id))}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <polygon points="2,1 2,13 12,7" />
              <rect x="11.5" y="1" width="2.5" height="12" />
            </svg>
          </button>
        )}
        {/* Play - green, continuous forward play */}
        <button
          data-tutorial-id="play"
          className={classNames("transport-btn transport-green", {
            selected: running && runningDirection === "forward",
          })}
          onClick={() =>
            dispatch(updatePlaybackState({ speed, running: true, runningDirection: "forward" }))
          }
        >
          <svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor">
            <polygon points="0,1 0,13 12,7" />
          </svg>
        </button>
        {/* Clock */}
        <TickClock running={running} speed={speed} tickKey={world.evaluatedTickFrames?.[0]?.id} />
      </div>

      <div style={{ flex: 1 }} />

      <div className="right" style={{ width: 122 }}>
        <ButtonGroup>
          {Object.keys(SPEED_OPTIONS).map((name) => (
            <Button
              size="sm"
              key={name}
              style={{ minWidth: 0, fontSize: "1.2rem", padding: "0 8px" }}
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
              {name === "Slow" ? "🐢" : name === "Super" ? "🐇" : "•"}
            </Button>
          ))}
        </ButtonGroup>
      </div>
    </div>
  );
};

export default StageControls;
