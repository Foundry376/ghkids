# Option B: Flip the Coordinate Data

This document describes an alternative implementation of the "bottom-left =
(1, 1)" change. The currently merged approach ("Option A") flips at the UI
boundary only — internal storage stays Y-down with origin (0, 0). Option B
flips the **data itself** so that internal storage matches the kid's mental
model, and the only place the simulation sees Y-down is the renderer
(which already knows the stage height).

The two approaches are mutually exclusive. This document is intended for an
agent picking up Option B as a separate work stream so the two can be
compared side-by-side.

---

## 1. Why consider Option B

The Option A PR (`claude/lower-left-coordinates-d2Kf1`) demonstrated that
display-only flipping works, but it has one persistent inelegance: every
function that reads or writes the kid-facing `x`/`y` actor variables needs
access to `stage.height` to convert between frames. That forces a `stage`
parameter through `getVariableValue`, `resolveRuleValue`, every call site
in `world-operator.ts`, the inspector tree, and the disambiguation labels
in the rule editor — and we now have two interpretations of `actor.position`
in the recording UI (absolute vs. relative).

Under Option B the only place that still needs `stage.height` is the
renderer, which trivially has it. Everything else — simulation, rules,
variable read/write, persistence — uses the same Y-up convention the kid
uses. The price is a one-time data migration covering every field that
stores a Y value.

---

## 2. Convention to adopt

- **Internal coordinates: 0-indexed, Y-up.** Bottom-left tile is `(0, 0)`,
  top-left is `(0, height - 1)`. This matches the math convention.
- **Display coordinates: 1-indexed, Y-up.** Bottom-left is `(1, 1)`. The
  only conversion is `+1` for both axes.

Keeping internal 0-indexed simplifies modulo wrapping, array indexing, and
existing iteration loops. Only the kid's eyes see 1-indexed values.

> Why not 1-indexed internal? It's tempting for "what you see is what you
> store," but it complicates `((n % d) + d) % d` wrapping, breaks the
> common `for (i = 0; i < height; i++)` loop pattern, and makes "the
> origin is (0, 0)" no longer true for vector arithmetic. Keep internal
> 0-indexed.

---

## 3. The migration

### 3.1 Version gate

`EditorState` already has `version: 1` (`frontend/src/types.ts:403`). Bump
the literal to `1 | 2` and treat 2 as the new convention. A loaded world
without `version` (or with `version: 1`) is treated as legacy and migrated.

The migration must run **before** any rendering, simulation, or rule
evaluation. The two load entry points are:

1. **API-loaded worlds** — `frontend/src/components/editor-page.tsx`
   `editor.read()` / `editor.save()`. Migrate inside the read path right
   after `JSON.parse`.
2. **Anonymous localStorage worlds** — same file, the `localStorage` read
   branch. Migrate immediately on load.

After migration, set `version: 2` and persist on next save. Do **not**
migrate on save — only on load — so we never accidentally double-migrate
a world that was already saved as v2.

A small `migrateWorldV1ToV2(state: EditorStateV1): EditorStateV2` function
in `frontend/src/editor/utils/coordinate-migration.ts` is the cleanest
home for this. Export individual sub-functions for each shape so they can
be unit-tested.

### 3.2 Field-by-field migration rules

Internal Y-down (legacy): `internal_y_down ∈ [0, height - 1]`, top-left = 0.
Internal Y-up (target): `internal_y_up = (height - 1) - internal_y_down`.

For each migration target, the new value is computed as below.

#### `Stage.actors[*].position`

```
new.x = old.x
new.y = (stage.height - 1) - old.y
```

Run this for every actor on every stage in `state.world.stages`. Do **not**
flip width/height — those are extents, not coordinates.

#### `Rule.actors[*].position` — relative offsets from the main actor at (0, 0)

These are relative offsets (see comment at `types.ts:163-173`), not
absolute positions. The main actor stays at `(0, 0)`, but every other
actor's relative Y must flip direction:

```
new.x = old.x
new.y = -old.y
```

#### `Rule.extent` — relative bounds around the main actor

Extents have `xmin, xmax, ymin, ymax` and an `ignored` map keyed `"x,y"`.
The Y bounds must swap and negate:

```
new.xmin   = old.xmin
new.xmax   = old.xmax
new.ymin   = -old.ymax
new.ymax   = -old.ymin
new.ignored = Object.fromEntries(
  Object.entries(old.ignored).map(([key, v]) => {
    const [x, y] = key.split(",").map(Number);
    return [`${x},${-y}`, v];
  })
)
```

#### `RuleAction` — actions stored on rules

Walk `Character.rules` recursively (it's a `RuleTreeItem[]` containing
`group-event`, `group-flow`, and `Rule` nodes). For each `Rule`, migrate
its `actors`, `extent`, and `actions`. For each action:

| Action shape                                | Y handling                                |
| ------------------------------------------- | ----------------------------------------- |
| `move` with `delta`                         | `delta.y = -delta.y`                      |
| `move` with `offset` (rel. to main actor)   | `offset.y = -offset.y`                    |
| `create` with `offset`                      | `offset.y = -offset.y`                    |
| `appearance`, `delete`, `transform`, `global`, `variable` (non-x/y) | unchanged |
| `variable` with `variable: "x"`             | `value.constant` unchanged                |
| `variable` with `variable: "y"`             | If `value` is `{ constant }`: `constant = String(-Number(constant))`. Operations: see §3.3. |

#### `RuleCondition` constants referencing `x`/`y`

A condition like `actor.y > 3` — under the old convention "internal y > 3"
meant "lower than row 3 from the top." Under Option B's internal Y-up,
the same numeric meaning ("3 from the bottom") needs `actor.y > 3` to
have the **inverted** stored constant in v1 data.

For each condition, if either side is `{ actorId, variableId: "y" }` and
the other side is `{ constant }`, leave the constant alone — the
**comparator** must flip if Y semantics flip, but the constant is what
the kid typed, not a positional offset. **However** legacy v1 conditions
were written by the kid in Y-down terms, so the truthy region for that
condition will swap.

This is the trickiest migration. Recommended approach:

1. **Migrate the constant** using the source actor's stage height when
   knowable. If the condition references `actor.y` and we can identify
   the actor, compute `new = (stage.height - 1) - old`. This preserves
   meaning ("the actor is in row X from the top" → "X from the bottom"
   number).
2. **Flip the comparator** when the constant is migrated by stage-flip
   (so `>` becomes `<`, `>=` becomes `<=`; `=` and `!=` stay).
3. Apply the same logic when the condition is `actor.y CMP otherActor.y`
   — flip the comparator only (both sides flip the same way, the
   relation reverses).

This is messy because rules can apply on multiple stages with different
heights. For deltas like `actor.y > 3`, "row 3 from the top" doesn't have
a height-independent meaning, but kids wrote rules thinking about the
**stage they were on**. Pragmatic call: use the world's primary stage
height for the migration constant, and accept that rules that ran on
stages of unusual heights may need manual fixup. Add a console warning
during migration listing every condition that referenced `y` so the
maintainer can sanity-check.

#### `RuleValue.constant` referencing positions

`RuleValue` is `{ constant: string } | { actorId, variableId } | { globalId }`.
If a kid dragged a position chip into a value slot, the resulting action
landed `{ constant: "5" }` where 5 was the **internal** (Y-down) value.
Under Option B that 5 is now wrong. Apply the same stage-height-based
flip to any constant that lands as the right-hand side of a `variable: "y"`
action (or wherever the kid clearly intended a Y position). When in
doubt, leave alone and warn.

#### `Globals`

Walk `state.world.globals`. Custom globals can hold any string value;
without context we don't know whether a global stores a Y coord. Leave
unchanged. Add a console warning suggesting the maintainer inspect rules
that read globals into Y positions.

#### `Door` destination variables

Doors store destination as `actor.variableValues["door-dest-y"]` — a raw
internal Y. This needs migration:

```
const v = Number(actor.variableValues["door-dest-y"]);
if (Number.isFinite(v)) {
  // Use the destination stage's height, looked up via "door-dest-stage".
  actor.variableValues["door-dest-y"] = String((destStage.height - 1) - v);
}
```

If `door-dest-stage` is unset or invalid, fall back to the source stage's
height.

#### Recording state (`recording.beforeWorld`, `recording.afterWorld`, `recording.extent`, etc.)

These are transient — a recording in progress when the kid closes the
editor is lost. **Skip migrating recording state.** Treat any persisted
recording as stale and reset to `initialState.recording` during
migration.

#### `EditorState.version`

Set to `2` after migration. Persist in the next save.

### 3.3 Math operations on `actor.y` actions

Under Option A we relied on display-space arithmetic. Under Option B,
internal storage is already Y-up, so the engine just does:

- `set y = N` ⇒ `actor.position.y = N - 1` (display 1-indexed → internal 0-indexed)
- `add N to y` ⇒ `actor.position.y += N` (no sign flip; both internal and
  display agree on direction)
- `subtract N from y` ⇒ `actor.position.y -= N`
- `set y = other.y` ⇒ both sides read display via `+1`, both write via `-1`,
  cancellation makes this a direct copy of internal y. Works.

This is the elegant case. No `stage.height` needed.

---

## 4. Engine changes (much smaller than Option A)

### 4.1 `getVariableValue` and `resolveRuleValue`
(`frontend/src/editor/utils/stage-helpers.ts`)

Remove the optional `stage` parameter. The conversions become purely
arithmetic:

```ts
if (id === "x") return String(actor.position.x + 1);
if (id === "y") return String(actor.position.y + 1);
```

All call sites in `world-operator.ts` simplify — no stage threading.

### 4.2 Variable action handler
(`frontend/src/editor/utils/world-operator.ts`, the `action.type === "variable"` branch)

```ts
if (action.variable === "x" || action.variable === "y") {
  const numValue = Number(next);
  if (!isNaN(numValue)) {
    const coord = action.variable as "x" | "y";
    // Display 1-indexed → internal 0-indexed.
    const wrappedPos = wrappedPosition({ ...stageActor.position, [coord]: numValue - 1 });
    if (wrappedPos) stageActor.position = wrappedPos;
  }
}
```

`wrappedPosition` itself is unchanged — internal Y-up uses the same modulo
arithmetic as Y-down.

### 4.3 No other simulation changes

- Iteration loops over extents stay as `for (let y = ymin; y <= ymax; y++)`
  — direction-agnostic.
- `pointByAdding`, `actorIntersectsExtent`, `pointIsInside`,
  `actorFillsPoint` — pure arithmetic, unchanged.
- Door teleport (`world-operator.ts:711-734`) — uses the destination
  variable values, which the migration has already converted. Unchanged.
- Wrapping — unchanged.

### 4.4 Default door destination
(`frontend/src/editor/utils/door-constants.ts`)

`computeDoorDefaultDestination` returns `{ x: position.x + 1, y: position.y }`.
The Y defaulting logic is fine; no change needed because Y is unchanged.

### 4.5 `applyAnchorAdjustment`, sprite transform formulas
(`frontend/src/editor/utils/stage-helpers.ts:108-136`)

These operate in **sprite-pixel space**, not world space. Sprite pixels
remain Y-down (top-left of the image is (0, 0), which is how PNG/canvas
data is laid out). The formulas for `flip-y`, `90`, `270` etc. stay
exactly as they are. The boundary between sprite-pixel-space and
world-space is in the renderer (§5).

---

## 5. Renderer changes (the only place height enters)

### 5.1 Canvas paint
(`frontend/src/editor/utils/stage-helpers.ts:557-577` `paintActorsOntoCanvas`)

Choose one of:

**(A) Flip the canvas axis once.** Apply `ctx.translate(0, stage.height * pxPerSquare); ctx.scale(1, -1)` at the start of painting, and remember
to flip text/sprite drawing back since we still want sprites drawn
right-side-up. This usually ends up requiring per-sprite re-flipping,
which is brittle.

**(B) Compute per-sprite world→screen Y.** Replace each
`actor.position.y * pxPerSquare` with `(stage.height - 1 - actor.position.y) * pxPerSquare`. Sprites are still drawn with their
own orientation; only the **placement** flips.

**Recommended: (B).** It's local and explicit. Define a tiny helper:

```ts
function worldYToCanvasY(internalY: number, stageHeight: number, pxPerSquare: number) {
  return (stageHeight - 1 - internalY) * pxPerSquare;
}
```

Use it everywhere the renderer maps `position.y` to a screen Y.

### 5.2 DOM positioning
(`frontend/src/editor/components/stage/stage.tsx:147-162` and similar)

Replace `top: relY * STAGE_CELL_SIZE * scale` with
`top: (containerHeight - 1 - relY) * STAGE_CELL_SIZE * scale`, where
`containerHeight` is the stage or rule extent height being rendered.

Anywhere a `position.y` is multiplied to compute a `top` CSS value, run
it through the same conversion.

### 5.3 Mouse → grid
(`frontend/src/editor/components/stage/stage.tsx:556-574` `getPositionForEvent`)

```ts
const internalY = (stage.height - 1) - Math.round((px.top - dragTop) / STAGE_CELL_SIZE / scale);
```

Drag/snap arithmetic that operates **after** this point is unchanged
because it works in internal coords.

### 5.4 Recording extent overlay
(`frontend/src/editor/components/stage/stage.tsx:373-392`,
`recording-square-status.tsx`, `actor-offset-canvas.tsx`,
`scenario-stage.tsx`)

The extent overlay computes `xCenter`, `yCenter` from extent bounds and
positions an overlay div via CSS `top`/`left`. Same flip rule applies:
when computing `top` from a Y value, use `(height - 1 - y) * cellSize`.

The trickier piece is the **rule extent box** drawn around the main
actor. With Y-up internal, `extent.ymin` is now the bottom-most relative
row and `extent.ymax` is the top-most. Iteration loops still work; the
visual rendering needs the same renderer flip.

### 5.5 Sprite anchor
(`frontend/src/editor/components/sprites/actor-sprite.tsx:96-97, 190-191`)

`actor.position` is the world position. The sprite is placed so its
anchor lands at that world position. With the world Y-up, "below the
anchor" in the sprite (positive `dy`) should now extend toward **lower**
internal Y, i.e. toward the bottom of the screen. The simplest way to
keep the existing top-left anchor convention working is to keep the
sprite's pixel-space coords as-is and flip only at the world→screen
boundary in §5.1.

Sanity-check pass: paint an actor at internal (0, 0), confirm it shows up
at the bottom-left of the rendered stage; paint at (0, height - 1),
confirm it shows up at the top-left. If anchors look off, the issue is
almost certainly that anchor offsets are baked into the wrong frame.

### 5.6 Drag previews and ghost actors

Whenever code computes a CSS position from a grid cell, the same flip
applies. Search for `position.y * STAGE_CELL_SIZE` and `position.y *
pxPerSquare` and convert each. Also check `Math.round(... / STAGE_CELL_SIZE)`
patterns — these are likely inverse mappings that need the corresponding
flip.

---

## 6. Inspector simplification (the elegance win)

In `frontend/src/editor/components/inspector/container-pane-variables.tsx`:

```ts
displayValue={getCommonValue(actors, (a) => a.position.x + 1)}
onChange={(displayX) => {
  dispatch(changeActors(selectedActors!, {
    position: { ...actor.position, x: displayX - 1 },
  }));
}}
```

Same for Y — no `stage.height` needed. The `stage` prop on
`ContainerPaneVariables` and the `stage` prop on `PositionGridItem` can
be removed entirely. The header `formatPosition(position, stage)` becomes
`formatPosition(position)` and just prints `(x+1, y+1)`.

The disambiguation labels in `ActorBlock`/`ActorVariableBlock`/
`ConnectedActorBlock` similarly stop needing a `stage` prop. Both
absolute and relative interpretations collapse to "show `(x+1, y+1)`"
for absolute world positions, or "show `(x, y)`" for rule-relative
offsets (no shift since offsets aren't 1-indexed).

This eliminates the hardest-to-explain part of Option A: the dual
"absolute vs. relative" interpretation in the recording UI.

---

## 7. Sprite transforms — confirming nothing breaks

The transforms `flip-y`, `90`, `180`, `270`, `flip-x`, `d1`, `d2` are
defined in **sprite-pixel space** (`stage-helpers.ts:108-136`,
`pointApplyingTransform`). Sprite-pixel space remains Y-down because
that's how image data is stored. None of these formulas change.

Confirm by writing a unit test: take a sprite with an obvious
asymmetric mark, apply each transform, render at internal `(0, 0)` and
again at internal `(0, height - 1)`, compare against fixture images.
The transform output must be identical regardless of where in the world
the sprite is placed; only the **position** of the rendered sprite
should change between the two cases.

---

## 8. Persistence

- **DB schema**: no change. Worlds are stored as JSON blobs.
- **`api/` backend**: no change. The migration runs in the frontend on
  load. (If the backend ever does its own world processing — e.g.,
  thumbnail generation — it would need the same migration. Search
  `api/src/**/*.ts` for `position` references; current state appears
  clean.)
- **Public worlds (forks, explore)**: when fetched, run through the
  same load-time migration. The forked copy gets saved as v2 the first
  time the new owner saves.
- **Headless runner** (`headless/`): uses the simulation engine with no
  rendering. As long as it loads worlds via the same migration entry
  point, it's automatic. Verify this by running the headless smoke test
  on a v1-saved world.
- **Tutorials** (`frontend/src/editor/constants/tutorial-content.ts`):
  these are **authored constants**, not loaded data. The migration
  doesn't touch them. Tutorial coords like `{ x: 9, y: 9 }` and
  predicates like `after.position.y === before.position.y - 1` (line
  318) must be hand-edited to the new convention. See §9.3.

---

## 9. Test strategy

### 9.1 Update existing fixtures

Every test that asserts a specific Y value needs review. The pattern is:

- A test that places an actor at `{ x: 2, y: 3 }` on a height-10 stage
  and expects movement → make sure the expected Y is in Y-up frame.
- A "move up" rule using `delta: { x: 0, y: -1 }` becomes
  `delta: { x: 0, y: 1 }` because internal Y-up means `+1` goes up.

Run `grep -n "y:" frontend/src/editor/utils/__tests__/scenarios/*.ts`
and audit each.

### 9.2 Migration unit tests

Add `frontend/src/editor/utils/coordinate-migration.test.ts` covering:

- Actor positions on a multi-actor stage.
- Rule actors (relative offsets).
- Rule extents, including the `ignored` re-keying.
- Rule actions: `move` (delta and offset), `create`, `variable: "y"`
  with constant value.
- Door destination variables on cross-stage doors.
- Recording state reset.
- Idempotency: migrating a v2 world is a no-op.

Snapshot one realistic v1 world JSON and one expected v2 JSON; assert
the migration produces the expected output exactly.

### 9.3 Tutorials

Walk `tutorial-content.ts` and update every hardcoded Y or Y-direction
delta. Verify each step still triggers the matcher. The tutorials use
internal coords throughout — there's no display layer for them — so
the conversion is a direct edit.

### 9.4 Integration smoke test

A single test that:
1. Loads a v1 world (fixture JSON).
2. Migrates.
3. Runs `tick()` for 10 frames.
4. Asserts the final actor positions match an expected v2 fixture.

This catches subtle bugs where a field was missed in the migration.

### 9.5 Bottom-left invariant test

```ts
// Document the convention in a test that will fail loudly if anyone
// ever flips it back.
it("internal (0, 0) is the bottom-left tile", () => {
  // Render a 1x1 sprite at (0, 0) on a height-8 stage and assert its
  // CSS top is `(8 - 1 - 0) * cellSize = 7 * cellSize`.
});
```

---

## 10. Files inventory

**New files**

- `frontend/src/editor/utils/coordinate-migration.ts`
- `frontend/src/editor/utils/coordinate-migration.test.ts`

**Modified — engine and helpers**

- `frontend/src/types.ts` — bump `version` to `1 | 2`.
- `frontend/src/editor/utils/stage-helpers.ts` — simplify
  `getVariableValue`/`resolveRuleValue` (drop the optional `stage` param
  added in Option A; simple `+1` arithmetic).
- `frontend/src/editor/utils/world-operator.ts` — simplify variable
  action handler (drop stage threading, use `numValue - 1`).
- `frontend/src/editor/utils/coordinate-display.ts` — simplify or
  delete; `formatPosition` becomes `(x+1, y+1)` with no stage arg.

**Modified — load entry points (migration call site)**

- `frontend/src/components/editor-page.tsx` — invoke migration after
  parsing JSON in both API and localStorage paths.

**Modified — renderer**

- `frontend/src/editor/components/stage/stage.tsx` — DOM `top` flip,
  mouse → grid flip, recording overlay flip, drag previews.
- `frontend/src/editor/utils/stage-helpers.ts` (`paintActorsOntoCanvas`)
  — canvas Y flip per §5.1.
- `frontend/src/editor/components/sprites/actor-sprite.tsx` — sprite
  placement Y flip.
- `frontend/src/editor/components/stage/recording/squares-canvas.tsx`,
  `actor-offset-canvas.tsx`, `actor-delta-canvas.tsx`,
  `scenario-stage.tsx` — any Y-to-pixel conversion flip.

**Modified — UI text**

- `frontend/src/editor/components/inspector/container-pane-variables.tsx`
  — drop `stage` prop, simplify position fields and header.
- `frontend/src/editor/components/inspector/container.tsx` — stop
  passing `stage`.
- `frontend/src/editor/components/stage/recording/blocks.tsx` — drop
  `stage` prop on `ActorBlock`, `ActorVariableBlock`,
  `ConnectedActorBlock`. Always show `(x+1, y+1)` for absolute coords;
  show `(x, y)` unchanged for relative offsets in `rule.actors`.
- `frontend/src/editor/components/stage/recording/condition-rows.tsx`,
  `panel-actions.tsx`, `panel-conditions.tsx` — remove `stage` prop
  threading.

**Modified — tutorials**

- `frontend/src/editor/constants/tutorial-content.ts` — hand-edit every
  hardcoded coord and every Y-direction delta. Verify each tutorial
  step's matcher with the new values.

**Modified — tests**

- `frontend/src/editor/utils/__tests__/scenarios/*.ts` — flip Y values
  and Y-direction deltas in fixtures.
- `frontend/src/editor/utils/__tests__/test-fixtures.ts` — same.
- `frontend/src/editor/utils/world-operator.test.ts` — delete or update
  the Option A "display-coordinate" describe block, since semantics
  collapse.
- `frontend/src/editor/utils/coordinate-display.test.ts` — significantly
  simplify (most of its content was justifying the Option A design).

**Possibly affected — verify clean**

- `headless/` — confirm load path goes through migration.
- `api/src/**` — currently no Y arithmetic; spot-check thumbnail
  generation if any.

---

## 11. Validation checklist

Before merging, confirm by hand:

1. Open an existing v1 world (saved by current production). Actors are
   in the right place. Press play. Rules behave the same as before.
2. Open the same world in a freshly-saved v2 form (round-trip through
   the migration → save → reload → migration is a no-op).
3. Drag an actor with the mouse. It snaps to the grid cell directly
   under the cursor.
4. Inspector shows `(1, 1)` for the bottom-left tile.
5. Type `(3, 5)` in the inspector. The actor moves to display row 5
   from the bottom, column 3 from the left.
6. Record a rule "move up": demonstrate by dragging the actor to a
   higher row. Replay the rule. The actor moves up.
7. Record a condition `actor.y == 1`. Trigger the rule. It fires only
   when the actor is on the bottom row.
8. Door teleport across stages of different heights still lands at the
   destination chosen at authoring time.
9. Tutorials all complete (run each end-to-end).
10. Fork a public world via the explore page. The forked copy renders
    identically to the original.

---

## 12. Risks and rollback

**Highest risk: condition migration ambiguity (§3.2 conditions).** Kid-
authored conditions like `actor.y > 3` whose constants reference Y need
height-aware migration. We pick "use the world's primary stage height"
as a heuristic, but a rule that ran on a non-primary stage of different
height could be subtly wrong post-migration. Mitigation: migration
emits a console warning per `y`-referencing condition, listing rule
name, condition, and the heuristic used. The maintainer reviews
flagged conditions in production worlds.

**Rollback path.** If a v2 release ships and a critical bug is found:
1. Worlds saved as v2 cannot be downgraded by simply rolling back the
   frontend; they'd render upside-down on a v1 codebase.
2. Provide a reverse migration `migrateWorldV2ToV1` from day one,
   gated behind a debug toggle, so a faulty production migration can
   be undone per-world.
3. Keep the v1→v2 migration deterministic and well-tested so any
   re-run is safe.

**Migration on save?** Resist the temptation to re-migrate on save.
If the load path is the only place migration runs, a save→load→save
cycle never re-applies the conversion. Re-applying is silently
catastrophic.

---

## 13. Estimated scope

This is **substantially more work than Option A**:

- ~300 lines of migration code + tests.
- Renderer changes are mechanical but need careful testing in DOM,
  canvas, and recording overlay.
- Tutorial-content hand-edit is tedious (~30 hardcoded values).
- Test fixture updates ripple through several scenario files.

Realistic estimate: 2–3 days for a careful agent, including a thorough
manual validation pass on saved production worlds. Compare to Option A
at ~half a day.

The payoff is permanent — internal storage matches kid mental model
forever, the inspector code is one-third the size, and there are no
"absolute vs. relative" footguns.

---

## 14. Suggested workstream order

1. Land migration code + unit tests **on a draft PR** before touching
   anything else. The migration is the pivot point and must be solid.
2. Add the bottom-left invariant test (failing initially).
3. Flip the renderer (DOM, canvas, mouse). The bottom-left test should
   pass; everything else may be broken.
4. Simplify engine helpers (`getVariableValue`, variable action). Run
   the integration tests; fix scenario fixtures as failures appear.
5. Simplify inspector and recording UI. Drop the `stage` props.
6. Update tutorials.
7. Manual validation against §11.
8. Wire migration into both load entry points (API and localStorage).
9. Final pass: search for `position.y` and audit each remaining usage.

Doing the migration first lets you iterate on the rest with v2 data;
doing the renderer second gives a fast visual sanity check. The
inspector/UI cleanup is mostly mechanical once the engine is sound.
