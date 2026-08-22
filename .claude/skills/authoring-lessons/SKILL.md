---
name: authoring-lessons
description:
  How Learn Codako lessons are built - the prebuilt world each one starts from, the walkthrough
  steps, the card art, and how to test that a lesson actually plays through. Use when adding a
  lesson, changing an existing one, or debugging a walkthrough that stops advancing.
---

# Authoring Learn Codako lessons

A lesson is a short walkthrough over the editor that starts from its own small prebuilt world.
They're listed at `/learn`; picking one writes its world into the kid's account (localStorage when
signed out) and opens `/editor/<id>?lesson=<slug>`, where the tutorial container reads the slug and
runs the matching steps.

This replaced a single tutorial that ran ~60 steps through one large world, so most of the step text
in `constants/lessons/` is that tutorial's, cut at the "Start Lesson:" boundaries it already had.

## The four pieces

| Piece        | Where                                             | Notes                                        |
| ------------ | ------------------------------------------------- | -------------------------------------------- |
| Registration | `frontend/src/lessons/lessons.ts`                 | slug, title, caption, card art, world loader |
| World        | `frontend/src/lessons/worlds/<slug>.json`         | generated, don't hand-edit                   |
| Steps        | `frontend/src/editor/constants/lessons/<slug>.ts` | keyed by slug in that folder's `index.ts`    |
| Card art     | `frontend/src/lessons/screenshots/<slug>.jpg`     | the editor's own stage thumbnail             |

`frontend/src/lessons/` deliberately imports no editor code - the lesson index page loads it, and
the editor bundle shouldn't come with it.

The container (`editor/components/tutorial/container.tsx`) renders a **title card** before step 0
and a **finish card** after the last step. So lesson content is only the steps in between: don't
write an intro step or a wrap-up step. The title card's button is also what gives the browser the
click it wants before audio will play.

## Designing the world

Worlds come from ASCII maps in `scripts/build-lesson-worlds.ts`. Add a map, add an entry to
`LESSON_WORLDS`, and run:

```bash
cd scripts && yarn install && yarn build-lesson-worlds
```

```ts
const boulderMap = [
  "..............",
  "..............",
  "..............",
  "..............",
  ".H.......O..F.",
  "==============",
  "##############",
  "##############",
];
```

Rows are written top to bottom, but actors are placed in v2 coordinates: **1-indexed, y counting up
from the bottom**. The last row is y=1; the first character of a row is x=1. Row length sets the
stage width, row count the height.

| Tile        | Sprite                                                            |
| ----------- | ----------------------------------------------------------------- |
| `H` `O` `F` | hero, boulder, flag (get the actor ids `hero`, `boulder`, `flag`) |
| `=` `#`     | grass-topped dirt, plain dirt                                     |
| `~` `-` `_` | lava surface (two wave frames), deep lava                         |

Every lesson shares one character library, `scripts/lesson-worlds/characters.json`, lifted from the
original tutorial world. **Keep the character ids stable** - steps and tests refer to characters by
id (`aamlcui8uxr` hero, `oou4u6jemi` boulder, `jizye5ng66r` flag, `1483692598319` lava,
`1483692683990` dirt; the names are in `constants/lessons/characters.ts`).

### What the shared characters already do

Design around these - they're why a world behaves the way it does:

- **Hero, arrow keys**: walks one square left/right, but only into an _empty_ square. Anything in
  the way (a boulder, a wall) stops him. Walking also sets which way he faces.
- **Hero, idle**: falls one square whenever the square below is empty. Note the key rules are
  checked first, so a held arrow key beats gravity - he can walk across a gap if you hold it.
- **Lava**: a hero in the square directly above lava sinks into it and flips upside down (dead).
- **Hero, dead**: moves up-left (-1, +2) _if there's lava beside him and dirt above that lava_, then
  flips upright. That's the respawn, and it's geometry-specific: put the lava's edge directly under
  the last square of ground, or a hero who falls in stays in.
- **Flag**: switches to its success appearance when the hero stands in the square to its left.

### Sizing

14 x 8 is a good default (the original tutorial world was 22 x 13, which is a lot of empty sky).
Keep the whole lesson inside the frame: the hero's route, the thing he interacts with, and the exit.
Stages render at 40px per square.

### Prebuilt rules

A lesson that picks up where another left off ships with that rule already recorded - lesson 4
starts with the climbing rule from lesson 3. Put it where the recorder would have: **unshifted into
the character's `idle` event container** (see `characters-reducer.ts`, `FINISH_RECORDING`), named
`"Untitled Rule"`. `climbRule` in the generator is the worked example:

```ts
actors: { hero at (0,0), boulder at (1,0) },
extent: { xmin: 0, xmax: 1, ymin: 0, ymax: 1, ignored: {} },
actions: [{ type: "move", delta: { x: 1, y: 1 }, actorId: "hero" }],
```

Rule matching is exact: **every square in the extent must hold exactly the actors the rule lists**,
unless the square is marked `ignored`. A rule the kid records therefore includes the scenery that
happened to be inside the box, which matters when you model that rule in a test.

The generator emits a whole editor state (`ui`, `recording`, `undoStack`, `redoStack`), because the
editor loads a world's `data` as its entire redux store. It also writes the current stage shape
(dimensions in `stage.variableValues`) and modern key names (`code: "ArrowRight"`, not `39`), so the
files don't lean on `data-migrations.ts`.

## Writing the steps

One file per lesson, exporting `TutorialStepContent[]`:

```ts
{
  pose: ["standing-pointing", "standing-talking"],   // poses in constants/tutorial-content.ts
  text: `Click the 'Play' button to start my game.`,
  annotation: { selectors: ["[data-tutorial-id=play]"], style: "outline" },
  onEnter: (dispatch) => dispatch(changeActors(heroPath, { position: HERO_START })),
  waitsFor: { stateMatching: (state) => state.ui.playback.running === true },
}
```

### How a step advances

| `waitsFor`        | Advances when                                                                       |
| ----------------- | ----------------------------------------------------------------------------------- |
| `stateMatching`   | the predicate passes (checked on every store change), after `delay` (default 750ms) |
| `elementMatching` | the selector matches (polled every 500ms), after `delay` (default 250ms)            |
| `button`          | the kid clicks the button with that label                                           |
| nothing           | the step's audio finishes                                                           |

**A step with no `waitsFor` and no audio file never advances on its own** - the kid has to press the
skip arrow. If you write new text, either give the step something to wait for or accept that it
sits until audio is generated.

Put every coordinate in a named constant at the top of the lesson file and derive predicates from
it. Never copy a position out of another lesson: the worlds are different sizes.

```ts
const BOULDER_COLUMN = 10;
waitsFor: {
  stateMatching: (_s, stage) => heroIn(stage)!.position.x > BOULDER_COLUMN;
}
```

`characters.ts` in that folder has `heroIn`, `boulderIn`, `heroPath`, `boulderPath` - use them
rather than re-deriving actor lookups.

### Annotations

`selectors` are plain CSS selectors run against the live editor, so they only match when the UI is
in the right state (an inspector selector needs the inspector open). The editor tags its landmarks
with `data-tutorial-id`: `controls`, `play`, `characters`, `characters-add-button`, `paint-tools`,
`paint-save-and-close`, `toolbar-tool-record`, `toolbar-tool-trash`, `record-next-step`,
`inspector-add-rule`, `inspector-add-rule-key`, `keypicker-done`, `undo-button`, `main-menu`. Grep
for `data-tutorial-id` before inventing a new one; add one to the component if the thing you need to
point at has no stable class.

`style: "arrow"` draws from the first selector to the second, `"outline"` circles them.

To highlight a region of the stage rather than an element, outline the stage background and offset
into it. Squares are 40px, and offsets count from the _top_ of the stage:

```ts
options: {
  width: 40 * BRIDGE_LENGTH,
  height: 34,
  offsetTop: 40 * (STAGE_HEIGHT - ROW) + 6,
  offsetLeft: 40 * (FIRST_COLUMN - 1),
}
```

A selector that matches nothing doesn't fail - the annotation just goes invisible. In dev the
annotation logs `Walkthrough annotation matched nothing: …` after 2s, so keep the console open while
testing.

### Audio

Audio filenames are a hash of the step text (`utils/text-hash.ts` → `audio_<hash>.mp3` in
`frontend/src/editor/sounds/tutorial/`). **Reusing text from the old tutorial verbatim keeps its
recording**; changing so much as the punctuation orphans it. New or edited lines need:

```bash
cd scripts && ELEVENLABS_API_KEY=... yarn generate-tutorial-audio      # --dry-run to list first
```

The dry run lists every line with no file, which is the quickest way to see what your edit cost.
Set `skipAudio: true` on a step that deliberately has none (e.g. a duplicate line used as a wait
step).

## Registering it

Add the entry to `LESSONS` in `frontend/src/lessons/lessons.ts` (order in that array is the order on
the page, and drives the finish card's "next lesson") and to `lessonContent` in
`editor/constants/lessons/index.ts`.

Card art is the editor's own stage thumbnail. Open the lesson and run in the console:

```js
const h = await import("/src/editor/utils/stage-helpers.ts");
const stage = Object.values(window.editorStore.getState().world.stages)[0];
h.getStageScreenshot(stage, { size: 800 }); // data: URL - decode it into screenshots/<slug>.jpg
```

## Testing a lesson

Two layers, and both are worth doing: a lesson that breaks doesn't throw, it just stops advancing.

### 1. Simulate the world

`frontend/src/editor/utils/lesson-worlds.test.ts` loads each world JSON and plays it with scripted
input, asserting the premise the steps wait on: the hero can't cross the lava without a bridge and
can with one, the boulder blocks him until the climbing rule exists, the falling boulder lands in
his path. Add a case per new lesson.

```ts
const { world, characters } = load(myLessonWorld);
const after = runSimulation(
  world,
  characters,
  12,
  Array(12).fill(holdingRight),
);
expect(actorOf(after, HERO).position.x).to.be.at.least(10);
```

For a lesson whose point is a rule the kid records, build that rule in the test the way the recorder
would (including the scenery inside the extent) and assert the outcome. That's what catches a world
whose geometry can't actually produce the moment the lesson promises.

```bash
cd frontend && yarn test          # 397 tests, ~1s
```

### 2. Walk it in a browser

The simulation says nothing about whether the steps advance or the annotations point at anything.
The dev server on :5173 talks to the production API, so run the lesson **signed out** and it goes
through localStorage instead of creating worlds in a real account:

```bash
# start signed out - a stale session cookie sends startLesson down the signed-in path and 401s
agent-browser --cdp "$CDP_PORT" eval 'document.cookie = "session=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/"'
agent-browser --cdp "$CDP_PORT" open "http://localhost:5173/learn"
agent-browser --cdp "$CDP_PORT" snapshot -i          # find the lesson's card
agent-browser --cdp "$CDP_PORT" click @e2
agent-browser --cdp "$CDP_PORT" find text "Start Lesson" click
```

Then step through, reading the step text and the world state between actions:

```bash
agent-browser --cdp "$CDP_PORT" get text ".tutorial-container"
agent-browser --cdp "$CDP_PORT" click "[data-tutorial-id=play]"
agent-browser --cdp "$CDP_PORT" press ArrowRight
agent-browser --cdp "$CDP_PORT" eval '(() => { const s = window.editorStore.getState();
  const h = Object.values(s.world.stages.root.actors).find(a => a.characterId === "aamlcui8uxr");
  return JSON.stringify({ pos: h.position, step: s.ui.tutorial, tool: s.ui.selectedToolId }); })()'
agent-browser --cdp "$CDP_PORT" errors        # and `console` for the annotation warning
```

What to confirm, step by step:

1. The text changed after you did what the step asked - that's the `waitsFor` firing. If it didn't,
   the predicate is wrong (usually a coordinate copied from another world).
2. No `Walkthrough annotation matched nothing` in the console.
3. `onEnter` put the actors where the step's language assumes ("click the hero" only works if he's
   beside the boulder).
4. The finish card appears after the last step. To check it without playing the whole lesson:
   `window.editorStore.dispatch({type:"UPDATE_TUTORIAL_STATE", values:{stepIndex: 99}})`.

Interactions the CLI can't do well (dragging rule handles, drag-and-drop into a rule container) are
worth doing by hand at least once per lesson that needs them.

### 3. The usual checks

```bash
cd frontend && npx tsc -b && yarn test && npx eslint src
```

Two eslint warnings are pre-existing; there should be zero errors.

## Gotchas worth knowing

- **Signed-in creation is two calls**: `POST /worlds`, then `PUT /worlds/:id?action=save`. Without
  `action=save` the API files the world as an unsaved _draft_, and the editor opens asking the kid
  whether to restore it.
- **Key rules use key names now** (`"ArrowRight"`), but worlds saved before that change store
  numeric keyCodes. Held keys are recorded under both spellings (`editor/utils/keys.ts`) so old
  worlds still respond; author new rules with names.
- **The world JSON is the whole editor state.** A world missing `undoStack` crashes the editor on
  load. Let the generator build it.
- A transform action with no `value` is skipped by the engine with `A rule value is missing?` in the
  console - give every action an explicit value.
- Twelve steps in the repo point at audio files that were never generated (six in the fork
  walkthrough). They show their text and advance on their `waitsFor`; they're not your regression.

## Adding a lesson: checklist

1. Map + `LESSON_WORLDS` entry in `scripts/build-lesson-worlds.ts`, `yarn build-lesson-worlds`.
2. Steps in `frontend/src/editor/constants/lessons/<slug>.ts`, registered in that folder's
   `index.ts`.
3. Entry in `frontend/src/lessons/lessons.ts`, in curriculum order.
4. Card art into `frontend/src/lessons/screenshots/<slug>.jpg`.
5. Simulation case in `lesson-worlds.test.ts`.
6. Walk it in a browser, console open.
7. `yarn generate-tutorial-audio --dry-run` to see which lines you owe audio for.
