# Plan: Granular Rule Evaluation Tracking

## Goal
Enhance the rule evaluation system to track **why** a rule didn't match, not just **whether** it matched. This enables the UI to display per-condition and per-square status indicators instead of just a single rule-level dot.

## Current State

### Data Structure
```typescript
// types.ts
export type EvaluatedRuleIds = {
  [actorId: string]: {
    [ruleTreeItemId: string]: boolean;  // Only tracks: matched or not
  };
};
```

### Matching Flow in `checkRuleScenario()` (world-operator.ts:212-346)
1. Iterate through each position `(x, y)` in `rule.extent`
2. Find stage actors at that position
3. Check if actor count matches rule expectations
4. Match stage actors to rule actors using `actorsMatch()`
5. Verify all required actors were found
6. Check action offsets are valid
7. Re-check all conditions (global-to-global, etc.)

The function returns `false` at multiple points without indicating **which** check failed.

---

## Proposed Design

### New Type Definitions

```typescript
// types.ts - Add these new types

/** Detailed evaluation result for a single condition */
export type EvaluatedCondition = {
  conditionKey: string;
  passed: boolean;
  leftValue?: string | null;   // Resolved value (for debugging/display)
  rightValue?: string | null;  // Resolved value (for debugging/display)
};

/** Detailed evaluation result for a single extent square */
export type EvaluatedSquare = {
  x: number;
  y: number;
  passed: boolean;
  reason?:
    | "offscreen"              // Position is offscreen on non-wrapping stage
    | "actor-count-mismatch"   // Different number of actors than expected
    | "actor-match-failed"     // Actor exists but doesn't match rule actor
    | "ok";                    // Square passed
  expectedActorCount?: number;
  actualActorCount?: number;
};

/** Detailed evaluation result for a rule */
export type EvaluatedRuleDetails = {
  passed: boolean;

  // Which stage of checking caused failure (for quick diagnosis)
  failedAt?:
    | "extent-square"          // A square in the extent didn't match
    | "missing-required-actor" // A required actor wasn't found
    | "action-offset-invalid"  // An action would go offscreen
    | "condition-failed";      // A condition check failed

  // Detailed breakdown
  conditions: EvaluatedCondition[];
  squares: EvaluatedSquare[];

  // Which actors were successfully matched (ruleActorId -> stageActorId)
  matchedActors?: { [ruleActorId: string]: string };
};

/** Enhanced EvaluatedRuleIds with optional granular data */
export type EvaluatedRuleIds = {
  [actorId: string]: {
    [ruleTreeItemId: string]: boolean;
  };
};

/** New: Granular evaluation data stored separately */
export type EvaluatedRuleDetails = {
  [actorId: string]: {
    [ruleId: string]: EvaluatedRuleDetails;
  };
};
```

### World State Changes

```typescript
// types.ts - Update WorldMinimal
export type WorldMinimal = {
  // ... existing fields ...
  evaluatedRuleIds: EvaluatedRuleIds;
  evaluatedRuleDetails?: EvaluatedRuleDetails;  // NEW: Optional granular data
};
```

---

## Implementation Steps

### Step 1: Define New Types (types.ts)
Add the new type definitions for granular tracking:
- `EvaluatedCondition`
- `EvaluatedSquare`
- `EvaluatedRuleDetails`
- Update `WorldMinimal` to include optional `evaluatedRuleDetails`

### Step 2: Refactor `checkRuleScenario()` (world-operator.ts)

**Current signature:**
```typescript
function checkRuleScenario(
  rule: Rule | NonNullable<RuleTreeFlowItem["check"]>,
): { [ruleActorId: string]: Actor } | false
```

**New signature:**
```typescript
type CheckRuleScenarioResult = {
  passed: boolean;
  stageActorForId: { [ruleActorId: string]: Actor } | null;
  details: EvaluatedRuleDetails;
};

function checkRuleScenario(
  rule: Rule | NonNullable<RuleTreeFlowItem["check"]>,
): CheckRuleScenarioResult
```

**Implementation changes:**
1. Initialize `details` object at start
2. Track each square evaluation in `details.squares`
3. Track each condition evaluation in `details.conditions`
4. Instead of `return false`, populate `details.failedAt` and return full result
5. At end, return `{ passed: true, stageActorForId, details }`

### Step 3: Refactor `actorsMatch()` (world-operator.ts)

**Current signature:**
```typescript
function actorsMatch(
  stageActor: Actor,
  ruleActor: Actor,
  conditions: RuleCondition[],
  stageActorsForId: ActorLookupFn | "avoiding-recursion",
): boolean
```

**Option A (simpler):** Keep returning boolean, let `checkRuleScenario` track which actor-pair failed.

**Option B (more granular):** Return detailed match info:
```typescript
type ActorMatchResult = {
  matched: boolean;
  failedConditions?: string[];  // condition keys that failed
};
```

**Recommendation:** Start with Option A for simplicity. We can enhance later if needed.

### Step 4: Update `tickRule()` and `tickRulesTree()`

Store the `EvaluatedRuleDetails` in a new module-level variable:
```typescript
let evaluatedRuleDetails: EvaluatedRuleDetails = {};
```

After `checkRuleScenario()` returns, store the details:
```typescript
const result = checkRuleScenario(rule);
evaluatedRuleDetails[me.id] = evaluatedRuleDetails[me.id] || {};
evaluatedRuleDetails[me.id][rule.id] = result.details;
```

### Step 5: Update `tick()` Return Value

Add `evaluatedRuleDetails` to the returned world state:
```typescript
return u({
  // ... existing fields ...
  evaluatedRuleIds: u.constant(evaluatedRuleIds),
  evaluatedRuleDetails: u.constant(evaluatedRuleDetails),  // NEW
}, previousWorld);
```

### Step 6: Update History Tracking

Add `evaluatedRuleDetails` to `HistoryItem` type and store/restore it in `tick()`/`untick()`.

### Step 7: Update Context Provider (inspector/container.tsx)

Pass granular data through context:
```typescript
<InspectorContext.Provider
  value={{
    evaluatedRuleIdsForActor: focusedActor
      ? focusedWorld.evaluatedRuleIds[focusedActor.id]
      : {},
    evaluatedRuleDetailsForActor: focusedActor  // NEW
      ? focusedWorld.evaluatedRuleDetails?.[focusedActor.id]
      : {},
  }}
>
```

### Step 8: Create New UI Components

**ConditionStateCircle** (new file):
```tsx
export const ConditionStateCircle = ({ ruleId, conditionKey }: Props) => {
  const { evaluatedRuleDetailsForActor } = useContext(InspectorContext);
  const details = evaluatedRuleDetailsForActor?.[ruleId];
  const condition = details?.conditions.find(c => c.conditionKey === conditionKey);
  const passed = condition?.passed;
  return <div className={`circle ${passed}`} />;
};
```

**SquareStateIndicator** (new file):
```tsx
// For displaying in rule mini-preview, etc.
export const SquareStateIndicator = ({ ruleId, x, y }: Props) => {
  const { evaluatedRuleDetailsForActor } = useContext(InspectorContext);
  const details = evaluatedRuleDetailsForActor?.[ruleId];
  const square = details?.squares.find(s => s.x === x && s.y === y);
  // Return visual indicator with color based on square.passed and square.reason
};
```

### Step 9: Integrate into Existing UI

Update `ContentRule`, `ContentConditions`, and rule preview components to show:
- Per-condition status dots next to each condition row
- Visual overlay on rule "before" picture showing which squares matched/failed

---

## File Changes Summary

| File | Changes |
|------|---------|
| `frontend/src/types.ts` | Add new types, update WorldMinimal, HistoryItem |
| `frontend/src/editor/utils/world-operator.ts` | Refactor `checkRuleScenario()`, add details tracking |
| `frontend/src/editor/components/inspector/inspector-context.tsx` | Add `evaluatedRuleDetailsForActor` to context |
| `frontend/src/editor/components/inspector/container.tsx` | Pass details through context |
| `frontend/src/editor/components/inspector/condition-state-circle.tsx` | New component |
| `frontend/src/editor/components/inspector/square-state-indicator.tsx` | New component |
| `frontend/src/editor/components/inspector/content-rule.tsx` | Use new indicators |

---

## Performance Considerations

1. **Memory**: Storing detailed evaluation data increases memory usage. Consider:
   - Only track details in "debug mode" or when inspector is open
   - Limit history depth for detailed data
   - Use more compact representations

2. **Computation**: Tracking details adds overhead. The current implementation already does all these checks - we're just recording results instead of discarding them.

3. **Optional Tracking**: Add a flag to enable/disable granular tracking:
   ```typescript
   function tick(options?: { trackDetails?: boolean })
   ```

---

## Testing Strategy

1. Unit tests for `checkRuleScenario()` verifying correct detail population
2. Test each failure mode returns appropriate `failedAt` and details
3. Integration tests verifying UI displays correct status
4. Performance benchmarks comparing with/without detail tracking

---

## Open Questions

1. **Should we track actor-level match details?** Currently proposed to track at square level. Could go deeper to track which specific property (appearance, variable, etc.) caused actor mismatch.

2. **Should details persist in saved worlds?** Probably not - they're runtime evaluation state only.

3. **How to visualize square failures in UI?** Options:
   - Color overlay on rule preview tiles
   - Tooltip on hover
   - Separate debug panel

4. **Should flow containers (group-event, group-flow) also have detailed tracking?** Currently proposed for rules only. Could extend to show which child rules were attempted.

---

## Architectural Insights (from world-operator skill)

### Pattern to Follow: FrameAccumulator

The existing `FrameAccumulator` class tracks animation frames during rule execution. We can follow a similar pattern for tracking evaluation details:

```typescript
// Similar to how FrameAccumulator works
class EvaluationAccumulator {
  private details: { [actorId: string]: { [ruleId: string]: EvaluatedRuleDetails } } = {};

  push(actorId: string, ruleId: string, result: EvaluatedRuleDetails) {
    this.details[actorId] ||= {};
    this.details[actorId][ruleId] = result;
  }

  getDetails() { return this.details; }
}
```

### Key Code Points (from architecture reference)

1. **checkRuleScenario failure points** (world-operator.ts:212-346):
   - Line 269: `wrappedStagePos === null` → offscreen
   - Line 282: actor count mismatch
   - Line 296: no matching rule actor found
   - Line 305: required actor not found
   - Line 316: action offset invalid
   - Line 341: condition check failed

2. **actorsMatch failure points** (world-operator.ts:66-118):
   - Line 73: character mismatch
   - Line 114: condition comparison failed

3. **UI integration point** (inspector/rule-state-circle.tsx):
   - Uses `InspectorContext` to get `evaluatedRuleIdsForActor`
   - Simple lookup: `evaluatedRuleIdsForActor?.[rule.id]`
   - We add `evaluatedRuleDetailsForActor` following the same pattern

### Immutable Update Pattern

Follow existing updeep pattern:
```typescript
return u({
  // ... existing fields ...
  evaluatedRuleIds: u.constant(evaluatedRuleIds),
  evaluatedRuleDetails: u.constant(evaluatedRuleDetails),  // NEW
}, previousWorld);
```
