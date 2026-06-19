import React, { useEffect, useRef, useState } from "react";

interface TickClockProps {
  running: boolean;
  speed: number;
  tickKey?: number;
}

const TickClock: React.FC<TickClockProps> = ({ running, speed, tickKey }) => {
  const [pulse, setPulse] = useState(false);
  const [tickCount, setTickCount] = useState(0);
  const prevTickKey = useRef(tickKey);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevTickKey.current = tickKey;
      return;
    }

    if (tickKey !== prevTickKey.current) {
      setTickCount((c) => c + 1);
      prevTickKey.current = tickKey;

      if (!running) {
        setPulse(true);
        const timer = setTimeout(() => setPulse(false), 200);
        return () => clearTimeout(timer);
      }
    }
  }, [tickKey, running]);

  // Drive the hand off real ticks in every mode. `tickCount` accumulates without
  // wrapping so the hand always rotates forward; a CSS transition glides it from
  // one notch to the next. While playing we stretch the glide across (most of) the
  // tick interval so the motion reads as continuous; while stopped/stepping we use
  // a short snap. Crucially this stays in sync with the simulation even when
  // high-speed ticks batch into a single render (the hand just glides 60° once
  // instead of blurring), rather than free-spinning on a CSS timer.
  const rotation = tickCount * 30;
  const transitionDuration = running ? Math.round(speed * 0.9) : 150;

  return (
    <div
      className={`tick-clock ${running ? "running" : ""} ${pulse ? "pulse" : ""}`}
      title={`Tick: ${tickCount}`}
    >
      <svg viewBox="0 0 32 32" width="28" height="28">
        <circle cx="16" cy="16" r="14" fill="#f8f9fa" stroke="#6c757d" strokeWidth="2" />
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
            transform: `rotate(${rotation}deg)`,
            transition: `transform ${transitionDuration}ms linear`,
          }}
        />
        <circle cx="16" cy="16" r="2" fill="#495057" />
      </svg>
    </div>
  );
};

export default TickClock;
