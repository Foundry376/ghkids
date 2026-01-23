# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Codako is a programming-by-demonstration tool that allows users to create simulations ("worlds") with 2D grid-based stages. Users draw characters, demonstrate rules they should follow, and create interactive games. Live at https://www.codako.org/

## Build & Development Commands

### Frontend (Vite + React)
```bash
cd frontend
yarn install
yarn dev      # Start dev server
yarn build    # Production build (outputs to api/frontend/)
yarn lint     # ESLint
```

### API (Express + TypeORM)
```bash
cd api
yarn install
yarn dev      # Start dev server with hot reload (port 8080)
yarn build    # Compile TypeScript
yarn lint     # Prettier + ESLint
yarn run typeorm schema:sync  # Sync database schema
```

### Headless
```bash
cd headless
yarn start    # Copies frontend utils and runs simulation headlessly
```

## Architecture

### Monorepo Structure
- `api/` - Express backend with TypeORM (PostgreSQL), serves frontend build
- `frontend/` - React 16 + Redux + Vite, compiles into `api/frontend/`
- `headless/` - Standalone runner for simulating worlds without UI (useful for ML/automation)

### Core Domain Model (defined in `frontend/src/types.ts`)
- **Character**: A class/template with sprites, rules, and variables
- **Actor**: An instance of a character at a specific position with state
- **Stage**: A 2D grid containing actors, with optional wrapping
- **World**: The complete game state with stages, globals, and history
- **Rule**: Conditions (before state) and actions (transformations) attached to characters

### Simulation Engine
The `WorldOperator` (`frontend/src/editor/utils/world-operator.ts`) is the core simulation engine:
- `tick()`: Advances world state by evaluating all actor rules
- `untick()`: Reverts to previous state using history
- `resetForRule()`: Sets up world state for rule editing/preview

Rules are evaluated per-actor with flow control containers:
- `group-event`: Triggered by key press, click, or idle
- `group-flow`: Control flow with behaviors: `first`, `all`, `random`, `loop`

### State Management
- Redux store with `updeep` for immutable updates
- Main state shape: `{ me, editor: EditorState }`
- EditorState contains: `characters`, `world`, `ui`, `recording`, undo/redo stacks

### Recording Flow (Programming by Demonstration)
The recording system (`frontend/src/editor/actions/recording-actions.ts`) captures rule creation:
1. User sets up "before" state with actors
2. User demonstrates "after" state (moves, appearance changes, etc.)
3. System extracts conditions and actions to create a Rule

### Key Frontend Paths
- `frontend/src/editor/` - Core editor components and logic
- `frontend/src/editor/components/stage/` - Stage rendering and interaction
- `frontend/src/editor/components/inspector/` - Rule and character inspection
- `frontend/src/editor/utils/` - Helpers including world-operator, stage-helpers

### API Routes
- `GET/PUT /worlds/:id` - World CRUD
- `GET /worlds/explore` - Public worlds list
- `POST /worlds?from=id&fork=true` - Clone/fork world
