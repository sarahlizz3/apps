# Feedback Bank — App Specification

## Overview

A single-page web app for organizing, filtering, and quickly copying reusable feedback comments for student assignments. Built as a static HTML/JS app hosted on GitHub Pages with Firebase Auth and Firestore backend.

**User:** Single authenticated user (the instructor). No student data stored.

---

## Tech Stack

- **Frontend:** Single HTML file with vanilla JS (no framework). Inline CSS or a single linked stylesheet.
- **Auth:** Firebase Authentication (email/password is fine; Google sign-in optional)
- **Database:** Cloud Firestore
- **Hosting:** GitHub Pages (static files only — no server)
- **Rich Text Editing:** A lightweight inline editor (contenteditable div or a minimal library like Trix) for bold, italic, paragraph breaks
- **Clipboard:** Clipboard API writing both `text/html` and `text/plain` for pasted formatting in Canvas LMS

---

## Design Guidelines

- **Dark mode** by default
- Almost-black background (e.g., `#1a1a2e` or `#121220` range), with muted/soft pastel accents that still pop — no neons, no harsh contrast
- High contrast for readability — text should be light but not pure white (e.g., `#e0e0e0` or `#d4d4dc`)
- Accent color suggestions: muted teal, soft lavender, dusty rose — pick a small cohesive palette
- **No full-color emojis.** Monotone icons/symbols only (SVG or Unicode) that match the design
- All interactive elements (buttons, pills, dropdowns) should be **comfortably large tap targets** — minimum 44x44px touch area, preferably larger for primary actions
- Cards should have generous padding and comfortable line-height for easy skimming
- Typography: clean sans-serif, ~16px body minimum, good hierarchy between section headings and card text
- **WCAG AA minimum**, aim for AAA on text contrast

---

## Data Model (Firestore)

All collections are scoped to the authenticated user's UID.

### `users/{uid}/classes/{classId}`
```
{
  name: string,            // e.g., "ENGL 1170 - Fall 2025"
  archived: boolean,       // default false
  sortOrder: number,       // for display ordering
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### `users/{uid}/classes/{classId}/assignments/{assignmentId}`
```
{
  name: string,            // e.g., "Essay 1: Literacy Narrative"
  archived: boolean,       // default false
  sortOrder: number,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### `users/{uid}/comments/{commentId}`
```
{
  textHtml: string,        // rich text content stored as HTML
  textPlain: string,       // plain text version (stripped) for search and preview
  classIds: string[],      // array of classId references, OR empty array for "all classes"
  isGlobal: boolean,       // true = applies to all classes (shows in every view)
  assignmentId: string | null,  // null = general comment for that class
  category: string,        // "general" | "positive" | "constructive" | "critical"
  archived: boolean,       // default false
  sortOrder: number,       // for future drag-to-reorder
  createdAt: timestamp,
  updatedAt: timestamp
}
```

**Key design decisions:**
- Comments with `isGlobal: true` always appear at the bottom of the page regardless of class filter.
- Comments with a specific `classId` but no `assignmentId` are general comments for that class.
- Comments with both `classId` and `assignmentId` are assignment-specific.
- `textPlain` is auto-generated from `textHtml` on save for search indexing.

---

## UI Layout

### Top Bar / Filter Area

```
[App Title / Logo]                              [Settings ⚙] [Sign Out]

Class:  (All)  (ENGL 1170)  (ENGL 1181)  (ENGL 1190)  ...    ← pill selectors
Assignment:  (All)  (Essay 1)  (Essay 2)  ...                  ← pill selectors, only visible when a specific class is selected

[🔍 Search comments...]                         [+ Add Comment]
```

- **Class pills:** Horizontal scrollable row. "(All)" is the default. Selecting a class filters to that class's comments + global comments.
- **Assignment pills:** Only appear when a specific class is selected. "(All)" means show all comments for that class (not filtered to any assignment). Selecting an assignment further filters.
- **Search bar:** Filters comments by text content (client-side search against `textPlain` is fine for the expected data volume).
- **Add Comment button:** Opens the slide-out panel. Should be prominent and easy to hit.

### Main Content Area

Comments are grouped by category, each in its own section. The sections appear in this order:

1. **General** — procedural/policy comments
2. **Positive** — what's working well
3. **Constructive** — areas for growth
4. **Critical** — major issues needing immediate attention

Each section:
```
── General ──────────────────────────────────────────────────
┌─────────────────────────────────────────────────────┬──────┐
│ Full comment text displayed here, preserving         │ Copy │
│ paragraph breaks and formatting. No truncation.      │      │
│                                                      │ Edit │
│ This is the second paragraph of the comment.         │      │
└─────────────────────────────────────────────────────┴──────┘
┌─────────────────────────────────────────────────────┬──────┐
│ Another comment in the same category...              │ Copy │
│                                                      │ Edit │
└─────────────────────────────────────────────────────┴──────┘

── Positive ─────────────────────────────────────────────────
  (cards here)

── Constructive ─────────────────────────────────────────────
  (cards here)

── Critical ─────────────────────────────────────────────────
  (cards here)
```

**When a class is selected,** class-specific comments appear in their category sections as described above, and then **global comments** appear in a clearly separated area at the bottom of the page, also grouped by category. Label this section something like "Comments for All Classes" with a visual separator.

**When "(All)" classes is selected,** show all non-archived comments across all classes grouped by category. Global comments can appear in their normal category sections here (no need for a separate bottom section in this view).

### Comment Cards

- Full comment text always visible (no truncation, no expand/collapse)
- Comfortable padding (at least 16px, preferably 20-24px)
- Line-height ~1.6 for readability
- **Copy button** on the right side of each card — clearly visible, easy to click
- **Edit button** below Copy (or as a secondary action — less prominent than Copy)
- Subtle metadata below the comment: which class(es) it's assigned to, which assignment (if any)
- Cards should have a subtle border or background differentiation from the page background
- Category sections could use a subtle left-border color accent to visually distinguish them

### Slide-Out Panel (Add / Edit Comment)

Slides in from the right side of the screen. Should overlay the main content with a slight backdrop dim.

Contents:
- **Rich text editor** — supports bold, italic, paragraph breaks. A simple toolbar with B, I buttons is sufficient. Stored as HTML.
- **Class selector** — multi-select with checkboxes for each active class, plus a toggle/checkbox for "All Classes" (sets `isGlobal: true`). When "All Classes" is checked, individual class checkboxes are disabled/grayed.
- **Assignment dropdown** — only appears if exactly one class is selected. Shows that class's active assignments. Optional (can be left blank for general class comments).
- **Category selector** — four pill buttons: General, Positive, Constructive, Critical. Single-select, required.
- **Save / Cancel buttons** at the bottom
- If editing, also show an **Archive** button (with confirmation)

---

## Settings Screen

Accessible via the ⚙ gear icon. Can be a full-page view or a large modal.

### Manage Classes
- List of all classes (active first, then archived)
- Add new class (text input + save)
- Edit class name
- Archive / Unarchive class
- **Archive All Comments** button per class — archives all comments associated with that class (with confirmation dialog)

### Manage Assignments
- Select a class first, then see its assignments
- Add new assignment (text input + save)
- Edit assignment name
- Archive / Unarchive assignment

### Bulk Actions
- "Archive all comments for [class]" — for semester resets
- "Archive all comments for [class] + [assignment]" — for assignment-level cleanup

---

## Copy Functionality

When the user clicks **Copy** on a comment card:

```javascript
// Write both HTML and plain text to clipboard
const blob = new Blob([comment.textHtml], { type: 'text/html' });
const blobPlain = new Blob([comment.textPlain], { type: 'text/plain' });
const item = new ClipboardItem({
  'text/html': blob,
  'text/plain': blobPlain
});
navigator.clipboard.write([item]);
```

- Show brief visual feedback on the button (e.g., button text changes to "Copied ✓" for 1.5 seconds, or a subtle color flash)
- This preserves bold/italic/paragraph formatting when pasting into Canvas's Rich Content Editor

---

## Search

- Client-side filtering against `textPlain` field
- Case-insensitive substring match
- Filters across all visible comments (respects current class/assignment filter)
- Results still displayed in category-grouped sections
- Search input should have a clear/X button to reset

---

## Auth Flow

- On load: check Firebase auth state
- If not signed in: show a simple centered login form (email + password)
- If signed in: load the main app
- Sign-out button in top bar
- No registration flow needed in the UI if you set up the account manually in Firebase Console (or add a simple registration option — your call)

---

## State Management

Since this is vanilla JS, keep it simple:

- Load all active (non-archived) comments, classes, and assignments on auth into memory
- Filter/group client-side
- Write to Firestore on create/update/archive, then update local state
- For the expected data volume (hundreds of comments, not thousands), this approach is performant and avoids complex real-time listener management
- Use Firestore snapshots/listeners if you want real-time sync across devices, but for a single-user app, simple read-on-load + write-on-change is sufficient

---

## File Structure (for GitHub Pages)

```
/index.html          — main app (single page)
/style.css           — stylesheet
/app.js              — main application logic
/firebase-config.js  — Firebase initialization (or inline in app.js)
/README.md
```

Keep it minimal. Single HTML page is ideal for GitHub Pages hosting.

---

## Future Considerations (Do Not Build Yet)

These are noted for architectural awareness — don't implement in v1:

- Drag-to-reorder comments within categories (sortOrder field is already in the data model)
- Export/import comments (JSON backup)
- Comment templates (pre-filled comment structures with blanks to fill in)
- Dark/light mode toggle (dark only for v1)
- Tagging beyond the four categories
- Comment usage tracking (how often each comment is copied)

---

## Summary of Key UX Priorities

1. **Skimmability** — full comment text always visible, generous spacing, clear category groupings
2. **One-click copy** — large, obvious Copy button on every card, copies rich text
3. **Fast filtering** — pills for class and assignment, client-side search
4. **Easy management** — slide-out panel for add/edit, settings screen for classes and assignments
5. **Semester transitions** — archive functionality at comment, class, and bulk levels
6. **Global comments** — always visible at page bottom regardless of class filter
