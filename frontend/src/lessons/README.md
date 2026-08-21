# Lessons

Learn Codako is a set of short lessons, listed at `/learn`. Each one opens its
own small prebuilt world and runs a walkthrough over the editor. They replace
the single long tutorial that ran through one large "Cave Adventure" world.

Three pieces make up a lesson:

| Piece                           | Where                                      |
| ------------------------------- | ------------------------------------------ |
| Title, caption, card art, world | `lessons.ts` (+ `worlds/`, `screenshots/`) |
| Walkthrough steps               | `../editor/constants/lessons/<slug>.ts`    |
| Launcher                        | `start-lesson.ts`                          |

They're keyed by slug. `/learn` calls `startLesson()`, which writes the lesson's
world to the kid's account (or localStorage when signed out) and opens
`/editor/<id>?lesson=<slug>`; the tutorial container picks the slug up from
there and runs the matching steps.

The container renders the lesson's title card before step 0 and a "you finished
this" card after the last step, so lesson content is only the steps in between -
no start or wrap-up step needed.

## Changing a lesson's world

The worlds in `worlds/` are generated - don't hand-edit them:

```
cd scripts && yarn install && yarn build-lesson-worlds
```

`scripts/build-lesson-worlds.ts` holds an ASCII map per world and shares one
character library (`scripts/lesson-worlds/characters.json`), lifted from the
original tutorial world. Lesson content refers to those characters by id, so
keep the ids stable.

`src/editor/utils/lesson-worlds.test.ts` asserts what each world does when it's
played - the hero can't cross the lava, the boulder falls into his path - since
a lesson that no longer reaches its next step just quietly stalls.

## Changing what Ravi says

Step text lives in `../editor/constants/lessons/<slug>.ts`. Audio filenames are
a hash of the text, so new or edited lines need new audio:

```
cd scripts && ELEVENLABS_API_KEY=... yarn generate-tutorial-audio
```

A step with no audio file still shows its text, but it will only advance when
whatever it's waiting for happens - if it waits on nothing, it sits there until
the kid presses the skip button.

## Card art

The screenshots are the editor's own stage thumbnails at 800px. To refresh one,
open the lesson and run in the console:

```js
const h = await import("/src/editor/utils/stage-helpers.ts");
const stage = Object.values(window.editorStore.getState().world.stages)[0];
h.getStageScreenshot(stage, { size: 800 }); // returns a data URL
```
