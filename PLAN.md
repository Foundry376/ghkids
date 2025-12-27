# Plan: Add "Published" State to Games

## Overview

Add a "published" boolean flag to games that controls visibility on the explore page. Only published games will appear to other users. Users can publish via a new menu option that prompts for a title and description.

---

## Implementation Steps

### 1. Database Schema Changes

**File:** `api/src/db/entity/world.ts`

Add two new columns to the World entity:
- `published: boolean` (default: `false`) - Controls explore page visibility
- `description: string | null` - User-provided description shown on explore page

```typescript
@Column({ type: "boolean", default: false })
published: boolean;

@Column({ type: "text", nullable: true })
description: string | null;
```

Update the `serialize()` method to include these new fields.

**Sync schema:** Run `yarn run typeorm schema:sync` in the api directory.

---

### 2. Backend API Changes

**File:** `api/src/routes/worlds.ts`

#### 2a. Update Explore Endpoint
Modify `GET /worlds/explore` to only return published worlds:

```typescript
router.get("/explore", async (req, res) => {
  const worlds = await World.find({
    where: { published: true },  // Only published worlds
    relations: ["user", "forkParent"],
    order: { playCount: "DESC" },
    take: 50,
  });
  res.json(worlds.map((c) => c.serialize()));
});
```

#### 2b. Update PUT Endpoint
Modify `PUT /worlds/:objectId` to accept `name`, `description`, and `published` fields:

```typescript
// In the PUT handler, add:
world.name = req.body.name ?? world.name;
world.description = req.body.description ?? world.description;
world.published = req.body.published ?? world.published;
```

---

### 3. Frontend Type Updates

**File:** `frontend/src/types.ts`

Add the new fields to the Game/World type interface (if it exists) or ensure they're handled in the data flow.

---

### 4. Create Publish Modal Component

**New File:** `frontend/src/editor/components/modal-publish/`

Create a modal for publishing that:
- Has a form with title (required) and description (optional) inputs
- Pre-populates title from current world name
- Has "Publish" and "Cancel" buttons
- On publish: calls the save action with published=true, name, and description

Structure:
```
modal-publish/
  container.tsx   - Modal component with form
  styles.scss     - Modal-specific styles (if needed)
```

#### Modal Content:
- Header: "Publish Your Game"
- Body:
  - Text input for "Title" (required, pre-filled with current world name)
  - Textarea for "Description" (optional, 200-300 char limit)
  - Explanation text: "Published games appear on the Explore page for everyone to play!"
- Footer:
  - "Cancel" button
  - "Publish" button (primary)

---

### 5. Register the Modal

**File:** `frontend/src/editor/constants/constants.ts`

Add new modal constant:
```typescript
export const MODALS = {
  STAGES: "stages",
  STAGE_SETTINGS: "stageSettings",
  EXPLORE_CHARACTERS: "exploreCharacters",
  VIDEOS: "videos",
  PUBLISH: "publish",  // New
};
```

**File:** `frontend/src/editor/components/container.tsx` (or wherever modals are rendered)

Add the PublishModal to the modal rendering logic.

---

### 6. Add Toolbar Menu Item

**File:** `frontend/src/editor/components/toolbar.jsx`

In the `_renderLeft()` dropdown menu, add a new menu item before "Save & Exit":

```jsx
<DropdownItem divider />
{metadata.published ? (
  <DropdownItem onClick={() => handleUnpublish()}>
    <i className="fa fa-eye-slash" /> Unpublish Game
  </DropdownItem>
) : (
  <DropdownItem onClick={() => dispatch(actions.showModal(MODALS.PUBLISH))}>
    <i className="fa fa-globe" /> Publish Game...
  </DropdownItem>
)}
<DropdownItem divider />
```

The menu shows:
- "Publish Game..." if not published (opens modal)
- "Unpublish Game" if already published (toggles flag directly)

---

### 7. Add Publish Action

**File:** `frontend/src/actions/main-actions.tsx` or create new actions

Create actions for:
- `publishWorld(name: string, description: string)` - Sets published=true with name/description
- `unpublishWorld()` - Sets published=false

These should call the PUT endpoint with the updated fields and trigger a save.

---

### 8. Connect Editor Page to Handle Publishing

**File:** `frontend/src/components/editor-page.tsx`

The editor page needs to:
- Pass the current world metadata (including `published` status) to the toolbar
- Provide a method to update the published state via the API
- Refresh the world metadata after publishing

---

### 9. Update World Metadata State

Ensure the world's `published`, `name`, and `description` are available in the editor state/context so the toolbar can show the correct publish/unpublish option.

---

## Visual Flow

```
User clicks menu → "Publish Game..." → Modal opens
                                        ↓
                                   Enter title
                                   Enter description (optional)
                                        ↓
                                   Click "Publish"
                                        ↓
                              API: PUT /worlds/:id
                              { name, description, published: true }
                                        ↓
                              World now appears on Explore page
```

---

## Edge Cases & Considerations

1. **Own unpublished games**: Users should still see their own unpublished games on their dashboard
2. **Profile page**: When viewing another user's profile, only show their published games
3. **Editing after publish**: Users can continue editing published games - changes save normally
4. **Republishing**: If a user changes the title/description, they can do so through the modal again
5. **Anonymous users**: Cannot publish (must be logged in) - hide the publish option for localStorage worlds
6. **Empty title validation**: Don't allow publishing with an empty title

---

## Files to Modify/Create

| File | Action |
|------|--------|
| `api/src/db/entity/world.ts` | Add `published` and `description` columns |
| `api/src/routes/worlds.ts` | Filter explore, update PUT endpoint |
| `frontend/src/editor/constants/constants.ts` | Add PUBLISH modal constant |
| `frontend/src/editor/components/toolbar.jsx` | Add publish menu item |
| `frontend/src/editor/components/modal-publish/container.tsx` | **Create** new modal |
| `frontend/src/editor/components/container.tsx` | Register new modal |
| `frontend/src/components/editor-page.tsx` | Handle publish actions |
| `frontend/src/actions/main-actions.tsx` | Add publish/unpublish actions |

---

## Testing Checklist

- [ ] New world defaults to unpublished
- [ ] Unpublished worlds don't appear on explore page
- [ ] Published worlds appear on explore page
- [ ] User can publish via modal with title and description
- [ ] User can unpublish a published world
- [ ] User can edit a published world (stays published)
- [ ] User sees their own unpublished worlds on dashboard
- [ ] Anonymous/localStorage worlds don't show publish option
- [ ] Title is required for publishing
- [ ] Description is optional
