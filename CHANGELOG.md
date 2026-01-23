<!-- LAST_COMMIT: 9568abd -->

## [2025-01-01]

We added email notifications! Now when someone remixes your game, you'll get an email letting you know. You can also opt in to weekly summaries showing how many people played your games. We also made it so game creators can choose when to share their games on the Explore page, and added a "camera follow" feature that keeps your character in view when moving around large stages.

### Added

- Email notification system with AWS SES and Handlebars templates
- Fork notifications: game owners receive an email when someone remixes their game
- Weekly play summary emails showing engagement metrics
- Periodic task scheduler for scheduled email delivery
- User notification settings (stored as JSONB) to control email preferences
- Published flag for games: only published games appear on Explore page
- Camera follow feature: stages can track and center on a specific actor during playback
- Actor X/Y position exposed as magic variables for use in rule conditions and actions
- CAPTCHA verification on user registration
- Tutorial audio updated with child-friendly voice (ElevenLabs)

### Changed

- Replaced SendGrid with AWS SES for email delivery
- Improved cold start reliability by awaiting TypeORM initialization (#46)

### Fixed

- Staging environment API calls incorrectly routing to production backend

## [2025-12-30]

We converted lots of code to TypeScript to make it easier to catch bugs, and fixed some visual glitches in the appearance editor. You'll also notice the rule inspector now shows you exactly which conditions are passing or failing when you test your rules.

### Added

- Changelog page that renders this file directly from GitHub (#43)
- Changelog generator command for keeping this file up to date (#44)

### Changed

- Converted appearance editor, toolbar, and many page components to TypeScript (#29, #30, #31, #32, #33)
- Refactored buildNamingPayload to top-level function with helpers (#37)
- Added typed useAppSelector and useEditorSelector hooks (#36)

### Fixed

- Hide condition status circles when rule has not been evaluated (#35)
- Appearance editor canvas pixel alignment bugs (#34)
- Build and backend test issues

## [2025-12-26]

We added a testing framework so we can catch bugs before you see them! We also fixed a bunch of small issues - like the color palette being hard to click, and rotated characters looking weird when you drag them.

### Added

- Mocha unit test framework and initial test suite (#11)
- Backend test infrastructure with mocha, chai, and supertest (#24)
- Tests for users and characters API routes (#25)
- World-operator integration tests for game simulation (#26)
- World-operator and world-lifecycle Claude Code skills (#19, #21)
- CLAUDE.md for Claude Code guidance (#10)

### Changed

- Support non-square canvas sizes for AI sprite generation (#14)
- Upgraded TypeORM to 0.3.28 (#23)

### Fixed

- Color palette always clickable now (#13)
- Garbled drag image for rotated/flipped actors (#16)
- Rule and appearance tools reset properly on background click (#17)
- Delete tool now respects multi-selection (#12)
- Various edge cases and potential bugs (#15)

## [2025-12-12]

You can now control how animations play - choose between smooth movement, step-by-step, or instant!

### Added

- Animation control for actions: linear, single step, or skip modes

## [2025-11-25]

We improved how characters turn and face different directions. You can also now see and control individual animation frames for your characters.

### Added

- Visualize and disable individual animation frames
- Less than (<) and greater than (>) comparators for number conditions

### Changed

- Direction is now a "turn" action that's easier to understand and use

## [2025-10-04]

We made playback mode smarter - it now pauses when you switch tools and prevents accidental changes to your game while it's running.

### Changed

- Playback pauses automatically when switching out of pointer mode
- Stage prevents dragging actors during playback
- Clicking a character in recording mode now selects its variables automatically
- Multiple edits to the same variable create a single rule action

### Fixed

- Zoomed out stages now handle drag boxes, outlines, and cursors correctly
- Appearance comparisons work correctly with string comparators

## [2025-09-25]

Big update! You can now select multiple actors at once by drawing a box around them, and drag them all together. We also added AI-powered automatic naming for your rules, so you don't have to think of names yourself.

### Added

- Multi-actor selection with drag box on stage
- Multi-actor drag, move, and delete support
- AI auto-naming for rules (#9)
- Custom mouse cursors that center properly on click points
- New "direction" system with all transform options

### Changed

- Rule icons updated from camera to before/after style

### Fixed

- Deleting a character that is referenced in rules
- Half-pixel positioning in pixel canvas
- Various Sentry-reported errors

## [2025-09-07]

Bug fix week! We squashed several issues with rule conditions and character appearances.

### Fixed

- Rule conditions expecting the wrong actor
- Editing the second appearance of a character
- Various Sentry-reported issues

## [2025-08-22]

You can now see your character's variables right on the sprite while you play! We also added a staging environment so we can test big changes before releasing them to everyone.

### Added

- Sprite variable overlay - see variable values on actors during play (#8)
- Read and write appearance names within the appearance editor
- Staging environment for testing larger changes
- Arbitrary conditions on rule containers using globals for key presses and clicks

### Changed

- IDs now include data type prefixes for easier debugging
- Character and appearance both get named in the paint modal

## [2025-07-18]

Small fixes this week for the "ignore square" tool and some behind-the-scenes error tracking.

### Fixed

- "Ignore square" tool clears properly when canceling recording mode
- Ignored squares render correctly in production

## [2025-07-08]

Lots of new tools this week! You can now use a stamp tool to quickly copy characters and rules, and a trash tool to delete conditions and actions. We also made labels easier to edit with a single click.

### Added

- Stamp tool for copying characters, appearances, and rules
- Option-drag to duplicate rules within a character
- Trash tool for deleting actions and conditions from rules
- Default appearance condition added to new rules automatically
- Sentry error tracking for catching bugs
- GitHub Action for automatic deployment to Fly.io

### Changed

- Labels now edit with single-click instead of double-click
- Muted background option and sprite renaming (#7)

### Fixed

- Cut/copy/paste now works in text fields
- Moving actors created within a rule
- Stamp tool cancels properly on first click
- Empty labels maintain their height
- History navigation ("back" button) skips frames with no changes
- Various crashes and Sentry-reported errors

## [2025-06-20]

Variables got a big upgrade! You can now use text (not just numbers) for variable values, and compare them in more ways. We also added background removal for sprites so you can paste images from anywhere.

### Added

- String variable values - variables can now hold text, not just numbers
- Expanded comparators for variable conditions
- Background removal for sprites (#6)
- Scaled rendering for larger stages

### Changed

- Left and right sides of rule actions are now identical and replaceable
- Removed instructional screen when starting a recording (faster workflow)
- Data migrations for backwards compatibility with old saves

### Fixed

- Old saves not loading due to `flip-xy` transform issue
- Graceful handling when rule scenarios match but no empty squares available

## [2025-05-18]

You can now create bigger characters that take up more than one square! We also made it easier to select actors with a single click, and the drawing canvas now trims empty space automatically.

### Added

- Support for larger sprites that span multiple tiles (#5)
- Single click to select actors on stage
- Large sprite support in stage screenshots

### Changed

- Canvas automatically trims empty rows/columns when saving
- Expanded color picker with "clear" color option and pen sizes

### Fixed

- Scroll bar now allows full canvas scrolling when zoomed
- Stamping no longer creates overlapping actors for multi-tile sprites
- Drag and drop sprite orientation

## [2025-04-06]

Animations are smoother now! When your game runs, you'll see characters move from square to square instead of just jumping.

### Added

- Animated tick frames - characters smoothly move between positions

## [2025-03-08]

We made Codako work better on iPads, and improved the stamp tool so you can see which character you're about to place.

### Added

- iPad support with mobile-specific styling and viewport settings
- Stamp tool cursor shows the character you picked up

### Changed

- Direct editing of rule actions (removed "prefs" menu)
- Converted recording components to TypeScript

### Fixed

- Relative position issues in rules
- Stamp and trash tools now return to pointer mode after use

## [2024-12-01]

### Added

- Initial public release of Codako
- Programming by demonstration interface for creating games
- 2D grid-based stage system
- Character and actor system with sprites
- Rule-based simulation engine
- Explore page for discovering public games
- User profiles and authentication
- Fork/remix functionality for games
