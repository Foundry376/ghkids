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

## [2024-12-31]

### Changed

- Refactored buildNamingPayload to top-level function with helpers
- Added typed useAppSelector and useEditorSelector hooks

### Fixed

- Hide condition status circles when rule has not been evaluated
- Fixed build issues
- Made backend tests log less and error correctly

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
