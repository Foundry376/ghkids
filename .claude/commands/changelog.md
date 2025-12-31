# Update Changelog

Generate a changelog entry for all commits since the last documented change.

## Instructions

1. **Read the CHANGELOG.md file** from the repository root. If it doesn't exist, create it with the template below.

2. **Find the last documented commit** by looking for the hidden marker comment:
   ```
   <!-- LAST_COMMIT: <commit-hash> -->
   ```
   This marker appears at the very top of the file, before any visible content.

3. **Get all commits since that commit** using:
   ```bash
   git log <last-commit>..HEAD --oneline
   ```
   If no marker exists or CHANGELOG.md is new, analyze the last 10 commits:
   ```bash
   git log -10 --oneline
   ```

4. **For each commit, analyze the changes**:
   - Read the commit message/title
   - Use `git show --stat <commit-hash>` to see which files changed
   - For significant changes, use `git show <commit-hash>` to understand the actual code changes
   - Group related commits together (e.g., multiple TypeScript conversions)

5. **Generate a changelog entry** with today's date in this format:
   ```markdown
   ## [YYYY-MM-DD]

   ### Added
   - New features added

   ### Changed
   - Changes to existing functionality

   ### Fixed
   - Bug fixes

   ### Removed
   - Removed features (if any)
   ```

   Only include sections that have entries. Write clear, user-facing descriptions (not just commit messages).

6. **Update CHANGELOG.md**:
   - Update the hidden marker at the top to the latest commit hash (use `git rev-parse HEAD`)
   - Add the new entry below the marker and title, above any existing entries
   - Preserve all existing changelog entries

## CHANGELOG.md Template

If creating a new CHANGELOG.md, use this template:

```markdown
<!-- LAST_COMMIT: <current-HEAD-hash> -->

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [YYYY-MM-DD]

### Added
- Initial changelog entry

```

## Example Output

```markdown
<!-- LAST_COMMIT: 06cf5d7abc123 -->

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [2024-01-15]

### Added
- Actor selection dropdown for overlapping actors on the stage
- World-operator integration tests for game simulation

### Changed
- Converted appearance editor to TypeScript
- Refactored toolbar and control components to TypeScript

### Fixed
- Pixel alignment bugs in the appearance editor canvas
- Crash when evaluated rule details are missing
```

## Important Notes

- Be concise but informative in descriptions
- Group related changes (e.g., "Converted multiple components to TypeScript" instead of listing each one)
- Focus on user-visible changes when possible
- Include PR numbers if present in commit messages: `(#123)`
- If there are no new commits since the last marker, inform the user that the changelog is up to date
