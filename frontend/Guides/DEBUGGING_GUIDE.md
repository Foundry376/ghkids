# Debugging Guide for Codako Frontend

This guide provides context and patterns for investigating common issues in the Codako frontend codebase.

## Architecture Overview

### Core Concepts

- **Characters**: Templates that define rules, variables, and appearances
- **Actors**: Instances of characters placed on stages with specific positions and variable values
- **Rules**: Logic that controls actor behavior, evaluated per-actor
- **Stages**: Game levels containing actors
- **World**: The game state including all stages and global variables

### Key Relationships

```
Character (1) -----> (N) Actor
  |                    |
  |                    +-> position, variableValues
  |                    +-> characterId (links back)
  +-> rules, variables, appearances
```

## Common Issue Patterns

### 1. Rule Editor / Inspector Issues

**Problem**: Features only work when specific selection state is met
**Common Cause**: Context providers only passing data for selected actor vs. selected character

**Key Files**:

- `/src/editor/components/inspector/container.tsx` - Main context provider
- `/src/editor/components/inspector/inspector-context.tsx` - Context definition
- `/src/editor/components/inspector/rule-state-circle.tsx` - Traffic light indicators

**Debugging Pattern**:

1. Check what data is being passed to `InspectorContext.Provider`
2. Verify if data should be actor-specific or character-specific
3. Look at `mapStateToProps` function to see data selection logic

**Example Fix**: Traffic lights (COD-1) - Changed from actor-specific to character-specific rule evaluation data

### 2. Character-Actor Relationship Issues

**Finding Actors by Character**:

```typescript
// Find all actors of a specific character
const actorsOfCharacter = Object.values(stage.actors).filter(
  (actor) => actor.characterId === characterId,
);

// Find first actor of character at position
const actor = Object.values(stage.actors).find(
  (a) => actorFillsPoint(a, characters, position) && a.characterId === characterId,
);
```

**Key Properties**:

- `actor.characterId` - Links actor to its character template
- `actor.variableValues` - Instance-specific variable values
- `character.rules` - Template rules applied to all actors of this character

### 3. Mouse/Touch Input Issues

**Problem**: Cursor positioning or click targeting incorrect
**Common Cause**: Coordinate transformation between screen space and game space

**Key Files**:

- `/src/editor/components/modal-paint/pixel-canvas.jsx` - Appearance editor
- `/src/editor/components/stage/stage.tsx` - Main game stage

**Debugging Pattern**:

1. Check `_pixelForEvent` or similar coordinate transformation functions
2. Look for `Math.floor()` vs `Math.round()` issues
3. Verify cursor hotspot alignment with actual click targets

**Example Fix**: Cursor hotspot (COD-5) - Added half-pixel offset to center cursor targeting

### 4. State Management Issues

**Redux Structure**:

```
EditorState {
  world: WorldMinimal           // Current game state
  ui: UIState                   // Selection state, active tools
  characters: Characters        // Character templates
  recording: RecordingState     // Rule recording state
}
```

**Common Patterns**:

- `ui.selectedActors` - Currently selected actor
- `ui.selectedCharacterId` - Currently selected character template
- `world.evaluatedRuleIds` - Rule execution results per actor

## Investigation Checklist

### For Selection-Related Issues:

- [ ] Does the feature work when the right thing is selected?
- [ ] What selection state does the feature depend on?
- [ ] Should it work for selected actor or selected character?
- [ ] Is the context provider passing the right data?

### For Visual/UI Issues:

- [ ] Check CSS classes and styling
- [ ] Verify coordinate transformations
- [ ] Look for rendering conditions (if statements)
- [ ] Check for timing/state update issues

### For Rule/Logic Issues:

- [ ] Verify rule evaluation data structure
- [ ] Check actor-character relationship
- [ ] Look for data aggregation logic
- [ ] Verify context provider data flow

## Common Debugging Commands

```bash
# Find components by pattern
rg "class.*Component" --type ts --type tsx

# Find context usage
rg "useContext|InspectorContext" --type ts --type tsx

# Find specific hooks or methods
rg "_pixelForEvent|mapStateToProps" --type ts --type tsx

# Find type definitions
rg "export type.*Character|interface.*Props" --type ts
```

## File Structure Guide

### Inspector System

- `container.tsx` - Main inspector container with Redux connection
- `inspector-context.tsx` - Context definition for inspector components
- `container-pane-rules.tsx` - Rules tab content
- `rule-state-circle.tsx` - Traffic light indicators
- `content-rule.tsx` - Individual rule display

### Stage System

- `stage.tsx` - Main game stage component
- `stage-recording-controls.jsx` - Recording interface controls

### Paint System

- `modal-paint/container.jsx` - Appearance editor modal
- `modal-paint/pixel-canvas.jsx` - Drawing canvas with mouse handling
- `modal-paint/tools.js` - Drawing tools (pen, eraser, etc.)

### Types

- `types.ts` - Core type definitions for the entire application

## Recent Fixes Reference

### COD-1: Traffic Light Icons

**Issue**: Red/green rule indicators only worked when character was selected
**Solution**: Aggregated rule evaluation data from all actors of selected character
**Files**: `inspector/container.tsx:122-135`

### COD-5: Cursor Hotspot Offset

**Issue**: Pixel targeting was off by upper-left offset
**Solution**: Added half-pixel offset to center cursor targeting
**Files**: `modal-paint/pixel-canvas.jsx:84-85`
