# Granular Rule Evaluation Tracking

This document describes the granular rule evaluation tracking system, which provides detailed feedback about why rules pass or fail.

## Overview

The system tracks evaluation results at three levels of granularity:

1. **Rule level**: Did the rule pass/fail overall?
2. **Square level**: Did each grid square in the "before" pattern match?
3. **Condition level**: Did each individual condition pass/fail?

This replaces the simpler `evaluatedRuleIds: { [actorId]: { [ruleId]: boolean } }` with the more detailed `evaluatedRuleDetails` map.

## Types (`types.ts`)

```typescript
/** Detailed evaluation result for a single condition */
type EvaluatedCondition = {
  conditionKey: string;
  passed: boolean;
  leftValue?: string | null;   // Resolved value for debugging
  rightValue?: string | null;  // Resolved value for debugging
};

/** Detailed evaluation result for a single extent square */
type EvaluatedSquare = {
  x: number;  // Relative to rule extent (not absolute stage position)
  y: number;
  passed: boolean;
  reason?: "offscreen" | "actor-count-mismatch" | "actor-match-failed" | "ok";
  expectedActorCount?: number;
  actualActorCount?: number;
};

/** Detailed evaluation result for a rule */
type EvaluatedRuleDetails = {
  passed: boolean;
  failedAt?: "extent-square" | "missing-required-actor" | "action-offset-invalid" | "condition-failed";
  conditions: EvaluatedCondition[];
  squares: EvaluatedSquare[];
  matchedActors: { [ruleActorId: string]: string };  // ruleActorId -> stageActorId
};

/** Granular evaluation data per actor per rule */
type EvaluatedRuleDetailsMap = {
  [actorId: string]: {
    [ruleId: string]: EvaluatedRuleDetails;
  };
};
```

## Two-Phase Actor Matching

The `checkRuleScenario` function uses a two-phase matching strategy when checking if stage actors match rule actors:

### Phase 1: Full Match (Character + Conditions)
Uses `actorsMatch()` which checks:
1. Character ID must match
2. All conditions referencing the actor must pass

This is needed to **disambiguate** when multiple actors of the same character exist in a rule. For example, if a rule has two zombies with different appearances, conditions help determine which stage zombie corresponds to which rule zombie.

### Phase 2: Character-Only Fallback
If no full match is found, tries matching by character ID only.

This provides better **UI feedback**: squares show green when the right character is present, even if conditions fail. Conditions are then evaluated separately and shown with their own status indicators.

```typescript
// In checkRuleScenario, for each stage actor at a position:
let match = ruleActorsAtPos.find((r) =>
  actorsMatch(s, r, rule.conditions, stageActorsForReferencedActorId),
);

// Fallback: character-only match for UI feedback
if (!match) {
  match = ruleActorsAtPos.find(
    (r) => r.characterId === s.characterId && !ruleActorsUsed.has(...),
  );
}
```

**Key insight**: For actual rule execution, the full match with conditions is still required - a rule won't fire unless all conditions pass. The fallback only improves diagnostic feedback shown in the UI.

## Evaluation Flow in checkRuleScenario

```
1. For each (x, y) in rule.extent:
   ├─ Check position validity → may add square with reason="offscreen"
   ├─ Check actor counts → may add square with reason="actor-count-mismatch"
   └─ Match actors (two-phase) → may add square with reason="actor-match-failed" or "ok"

2. Check required actors found → may set failedAt="missing-required-actor"

3. Check action offsets valid → may set failedAt="action-offset-invalid"

4. Evaluate ALL conditions (if actors matched):
   For each condition:
   ├─ Resolve left and right values
   ├─ Check if comparator matches
   └─ Add to conditions[] with passed status

5. Return details with all collected data
```

## Data Storage

Evaluation details are stored per-actor per-rule and always updated (no stale data):

```typescript
// In tickRulesTree, after evaluating each rule:
evaluatedRuleDetails[me.id] = evaluatedRuleDetails[me.id] || {};
evaluatedRuleDetails[me.id][rule.id] = details;  // Always update
```

**Important**: Previously, details were only updated when `passed === true`, which caused stale data when a previously-passing rule started failing.

## UI Integration

### InspectorContext

Provides `evaluatedRuleDetailsForActor` (the per-rule details for the selected actor):

```typescript
const InspectorContext = React.createContext<{
  world: WorldMinimal;
  characters: Characters;
  evaluatedRuleDetailsForActor: EvaluatedRuleDetailsMap[""];  // { [ruleId]: EvaluatedRuleDetails }
}>();
```

### Rule State Circle (`rule-state-circle.tsx`)

Shows overall pass/fail for a rule:

```typescript
const RuleStateCircle = ({ rule }) => {
  const { evaluatedRuleDetailsForActor } = useContext(InspectorContext);
  const details = evaluatedRuleDetailsForActor?.[rule.id];
  return <div className={`circle ${details?.passed}`} />;
};
```

### Condition Status Dots

Both the recording panel and right sidebar show per-condition status:

```typescript
// Build condition status map
const conditionStatusMap: { [conditionKey: string]: EvaluatedCondition } = {};
const ruleDetails = evaluatedRuleDetailsForActor?.[rule.id];
if (ruleDetails?.conditions) {
  for (const cond of ruleDetails.conditions) {
    conditionStatusMap[cond.conditionKey] = cond;
  }
}

// Pass to each condition row
<FreeformConditionRow
  condition={condition}
  conditionStatus={conditionStatusMap[condition.key]}
  ...
/>
```

### Square Status Overlay (`recording-square-status.tsx`)

Renders colored overlays on the "before" stage when editing a rule:

```typescript
const RecordingSquareStatus = ({ squares, extentXMin, extentYMin }) => (
  <>
    {squares.map((square) => {
      const x = extentXMin + square.x;
      const y = extentYMin + square.y;
      const color = square.passed
        ? "rgba(116, 229, 53, 0.35)"  // green
        : "rgba(255, 0, 0, 0.35)";    // red
      return (
        <div
          key={`square-status-${square.x}-${square.y}`}
          style={{
            position: "absolute",
            left: x * STAGE_CELL_SIZE,
            top: y * STAGE_CELL_SIZE,
            width: STAGE_CELL_SIZE,
            height: STAGE_CELL_SIZE,
            backgroundColor: color,
            pointerEvents: "none",
            zIndex: 10,
          }}
        />
      );
    })}
  </>
);
```

### Getting Square Data for UI

The `StageContainer` passes `evaluatedSquares` to the `Stage` component only for the "before" stage during rule editing:

```typescript
function getEvaluatedSquares(
  ruleId: string | null,
  evaluatedRuleDetails: EvaluatedRuleDetailsMap,
  selectedActors: UIState["selectedActors"],
): EvaluatedSquare[] {
  if (!ruleId) return [];

  // Find actor with evaluation data for this rule
  // (tries selected actor first, then falls back to any actor)
  const evalActorId = findActorWithRuleData(ruleId, evaluatedRuleDetails, selectedActors);

  return evaluatedRuleDetails[evalActorId]?.[ruleId]?.squares ?? [];
}
```

## Key Files

| File | Purpose |
|------|---------|
| `types.ts` | Type definitions for EvaluatedCondition, EvaluatedSquare, EvaluatedRuleDetails |
| `world-operator.ts` | checkRuleScenario returns detailed results, tickRulesTree stores them |
| `inspector-context.tsx` | Provides evaluatedRuleDetailsForActor to inspector components |
| `content-rule.tsx` | Shows condition status in right sidebar |
| `content-flow-group-check.tsx` | Shows condition status for flow group checks |
| `panel-conditions.tsx` | Shows condition status in recording panel |
| `recording-square-status.tsx` | Renders square overlays on before stage |
| `stage/container.tsx` | Computes evaluatedSquares and passes to Stage |
| `stage.tsx` | Renders RecordingSquareStatus when evaluatedSquares provided |

## Edge Cases

### Multiple Actors of Same Character
When a rule has two actors of the same character (e.g., two zombies), conditions are used to disambiguate which stage actor maps to which rule actor. If conditions fail, the character-only fallback ensures the square still shows as "passed" while condition dots show the specific failure.

### Conditions Referencing Other Actors
Some conditions compare values between two different actors (e.g., `zombie1.health > zombie2.health`). The `stageActorsForReferencedActorId` function handles lookups for the RHS actor, using matched actors when available.

### Stale Data Prevention
The evaluation details are always updated on each tick, not just when a rule passes. This prevents stale "passing" indicators from persisting when a rule starts failing.
