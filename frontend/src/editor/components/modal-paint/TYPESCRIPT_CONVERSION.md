# TypeScript Conversion Process

This document describes the process used to convert the appearance editor (modal-paint) from JavaScript to TypeScript, including the use of AI subagents for code review.

## Overview

Converted 9 JavaScript files to TypeScript while modernizing from class components with `connect()` to functional components with hooks (`useSelector`, `useDispatch`, `useReducer`).

## Process

### Phase 1: Planning

1. **Explore the codebase** to understand existing patterns
   - Identified reference component (`ContainerPaneRules`) using modern hooks pattern
   - Listed all files needing conversion
   - Noted existing TypeScript files to preserve

2. **Create a conversion plan** before making changes
   - Document file dependencies (convert utilities before components)
   - Identify shared types needed

### Phase 2: Implementation

**Conversion order** (dependencies first):
1. `helpers.js` → `helpers.ts` (utilities with no dependencies)
2. `create-pixel-image-data.js` → `create-pixel-image-data.ts`
3. `create-pixel-context.js` → `create-pixel-context.ts`
4. `tools.js` → `tools.ts`
5. `types.ts` (new file for shared interfaces)
6. `pixel-color-picker.jsx` → `pixel-color-picker.tsx`
7. `sprite-variables-panel.jsx` → `sprite-variables-panel.tsx`
8. `variable-overlay.jsx` → `variable-overlay.tsx`
9. `pixel-canvas.jsx` → `pixel-canvas.tsx`
10. `container.jsx` → `container.tsx` (main component, last)

**Key patterns applied:**
- Replace `PropTypes` with TypeScript interfaces
- Replace `connect(mapStateToProps)` with `useSelector`
- Replace `mapDispatchToProps` with `useDispatch` + action creators
- Replace class components with functional components
- Replace `this.state`/`this.setState` with `useState` or `useReducer`

### Phase 3: Code Review via Subagent

Used a subagent to review for React/TypeScript best practices:

```
Task tool with prompt:
"Review the TypeScript conversion for React and TypeScript best practices.
Look for: type safety issues, React hooks violations, stale closures,
missing dependencies, etc."
```

**Issues identified:**
- Critical: `as any` type assertions (unsafe)
- Critical: Stale closures in callbacks
- Critical: Empty useEffect dependency arrays
- Critical: Event handlers depending on entire state object
- Critical: Stale state in setTimeout callbacks
- Moderate: Complex state better suited for useReducer

### Phase 4: Fix Critical Issues

**Patterns used to fix issues:**

1. **Stale closures** → Use refs for stable callbacks:
   ```typescript
   const stateRef = useRef(state);
   useEffect(() => { stateRef.current = state; }, [state]);

   const handler = useCallback(() => {
     const currentState = stateRef.current; // Always fresh
   }, []); // Empty deps = stable reference
   ```

2. **Complex state** → useReducer pattern:
   ```typescript
   type Action =
     | { type: "SET_STATE"; payload: Partial<State> }
     | { type: "UNDO" }
     | { type: "REDO" };

   function reducer(state: State, action: Action): State {
     switch (action.type) { ... }
   }
   ```

3. **Type assertions** → Helper functions:
   ```typescript
   // Instead of: tool.mousedown(pixel, state as any)
   // Create typed helper:
   function getToolState(state: PaintState): PixelToolState { ... }
   tool.mousedown(pixel, getToolState(state))
   ```

4. **Empty dependency arrays** → Proper dependencies or split effects:
   ```typescript
   // Before: useEffect(() => { init(); render(); }, []);
   // After: Single effect with proper deps
   useEffect(() => {
     if (!contextRef.current || contextRef.current.getSize() !== size) {
       initContext();
     }
     render();
   }, [size, render]);
   ```

### Phase 5: Behavior Change Review via Subagent

Used a subagent to compare branch to main for unintended changes:

```
Task tool with prompt:
"Compare branch to main and analyze all changes for unintended
functionality or behavior changes. Use git diff main...HEAD.
Look for: logic changes, state management changes, event handler
changes, effect timing changes, default values, removed code."
```

**Findings:**
- 2 intentional behavior changes (documented)
- 4 bug fixes (improvements)
- All other files: faithful conversion

## Subagent Usage Summary

| Purpose | Subagent Type | When to Use |
|---------|---------------|-------------|
| Code review | `general-purpose` | After initial conversion, before fixing issues |
| Behavior comparison | `general-purpose` | After all changes, before finalizing |
| Codebase exploration | `Explore` | When understanding existing patterns |

## Checklist for Future Conversions

- [ ] Identify reference components using target patterns
- [ ] List files and determine conversion order (deps first)
- [ ] Create shared types file early
- [ ] Convert one file at a time, verify builds
- [ ] Run subagent review for best practices
- [ ] Fix critical issues using patterns above
- [ ] Run subagent comparison to main for behavior changes
- [ ] Document any intentional behavior changes
- [ ] Commit with clear messages describing changes
