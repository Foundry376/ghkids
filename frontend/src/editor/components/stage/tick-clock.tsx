import React, { useEffect, useRef, useState } from "react";

interface TickClockProps {
  running: boolean;
  speed: number;
  /** A key/id that changes each time a tick occurs (e.g., first frame ID) */
  tickKey?: number;
}

/**
 * A small circular clock indicator that shows the game is ticking.
 * - When running, the hand spins continuously at the playback speed
 * - When paused, shows the current tick position
 * - Pulses briefly when a new tick occurs (Forward button)
 */
const TickClock: React.FC<TickClockProps> = ({ running, speed, tickKey }) => {
  const [pulse, setPulse] = useState(false);
  const [tickCount, setTickCount] = useState(0);
  const prevTickKey = useRef(tickKey);
  const isFirstRender = useRef(true);

  // Increment tick count when tickKey changes (new tick occurred)
  useEffect(() => {
    // Skip incrementing on first render
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevTickKey.current = tickKey;
      return;
    }

    if (tickKey !== prevTickKey.current) {
      setTickCount((c) => c + 1);
      prevTickKey.current = tickKey;

      // Trigger pulse animation when tick count changes while not running
      if (!running) {
        setPulse(true);
        const timer = setTimeout(() => setPulse(false), 200);
        return () => clearTimeout(timer);
      }
    }
  }, [tickKey, running]);

  // Calculate rotation for the clock hand (12 ticks = full rotation)
  const staticRotation = (tickCount % 12) * 30;

  // Animation duration based on speed (one full rotation per tick when running)
  const animationDuration = `${speed}ms`;

  return (
    <div
      className={`tick-clock ${running ? "running" : ""} ${pulse ? "pulse" : ""}`}
      title={`Tick: ${tickCount}`}
    >
      <svg viewBox="0 0 32 32" width="28" height="28">
        {/* Clock face */}
        <circle
          cx="16"
          cy="16"
          r="14"
          fill="#f8f9fa"
          stroke="#6c757d"
          strokeWidth="2"
        />

        {/* Tick marks */}
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => {
          const angle = (i * 30 - 90) * (Math.PI / 180);
          const x1 = 16 + Math.cos(angle) * 10;
          const y1 = 16 + Math.sin(angle) * 10;
          const x2 = 16 + Math.cos(angle) * 12;
          const y2 = 16 + Math.sin(angle) * 12;
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#adb5bd"
              strokeWidth={i % 3 === 0 ? 2 : 1}
            />
          );
        })}

        {/* Clock hand */}
        <line
          className="clock-hand"
          x1="16"
          y1="16"
          x2="16"
          y2="6"
          stroke="#495057"
          strokeWidth="2"
          strokeLinecap="round"
          style={{
            transformOrigin: "16px 16px",
            transform: running ? undefined : `rotate(${staticRotation}deg)`,
            animation: running
              ? `tick-clock-spin ${animationDuration} linear infinite`
              : undefined,
          }}
        />

        {/* Center dot */}
        <circle cx="16" cy="16" r="2" fill="#495057" />
      </svg>
    </div>
  );
};

export default TickClock;
