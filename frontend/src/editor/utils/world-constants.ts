export const FLOW_BEHAVIORS = {
  FIRST: "first" as const,
  LOOP: "loop" as const,
  ALL: "all" as const,
  RANDOM: "random" as const,
};

export const CONTAINER_TYPES = {
  EVENT: "group-event" as const,
  FLOW: "group-flow" as const,
};

/**
 * Ceiling on how many times a `loop` container runs in one tick when its count
 * comes from a variable. The variable can hold anything a rule wrote into it,
 * and an unbounded count blocks the tab for the whole tick.
 */
export const MAX_LOOP_ITERATIONS = 1000;
