# Lessons

Learn Codako is a set of short lessons, listed at `/learn`. Each one opens its
own small prebuilt world and runs a walkthrough over the editor. They replace
the single long tutorial that ran through one large "Cave Adventure" world.

| Piece                           | Where                                      |
| ------------------------------- | ------------------------------------------ |
| Title, caption, card art, world | `lessons.ts` (+ `worlds/`, `screenshots/`) |
| Walkthrough steps               | `../editor/constants/lessons/<slug>.ts`    |
| Launcher                        | `start-lesson.ts`                          |

They're keyed by slug. `/learn` calls `startLesson()`, which writes the lesson's
world to the kid's account (or localStorage when signed out) and opens
`/editor/<id>?lesson=<slug>`; the tutorial container picks the slug up from
there and runs the matching steps. It draws the lesson's title card before step
0 and a "you finished this" card after the last one, so lesson content is only
the steps in between.

The worlds in `worlds/` are generated from ASCII maps by
`scripts/build-lesson-worlds.ts` - don't hand-edit them:

```
cd scripts && yarn install && yarn build-lesson-worlds
```

**Adding or changing a lesson: read `.claude/skills/authoring-lessons/SKILL.md`.**
It covers designing a world around the shared characters' rules, what makes a
step advance, keeping the recorded audio, and how to test that a lesson plays
through.
