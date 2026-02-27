# Feedback Bank

A single-page web app for organizing, filtering, and quickly copying reusable feedback comments for student assignments. Uses Firebase Auth + Firestore, hosted on GitHub Pages.

## Setup

### 1. Firebase Console

- Register a new web app in the existing `personal-apps-f875f` Firebase project
- Replace `YOUR_APP_ID_HERE` in `firebase-config.js` with the actual `appId`
- Ensure Email/Password auth is enabled
- Verify Firestore security rules support `users/{userId}/{document=**}` — merge with existing Flow rules if needed:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### 2. Local Development

```bash
cd comment-bank
python3 -m http.server
```

Open `http://localhost:8000` in a browser.

## File Structure

| File | Description |
|------|-------------|
| `index.html` | Single-page app shell |
| `style.css` | All styles (dark theme, custom properties, responsive) |
| `firebase-config.js` | Firebase init (reuses project config from Flow) |
| `app.js` | All application logic (9 modules) |

## Features

- **Filter pills** — Class and assignment filters with horizontal scrolling
- **Search** — Debounced client-side search against plain text
- **Category grouping** — Comments grouped as General, Positive, Constructive, Critical with colored borders
- **Rich text copy** — Copies HTML + plain text to clipboard (preserves formatting in Canvas LMS)
- **Slide-out editor** — Contenteditable rich text with Bold/Italic, class multi-select, assignment dropdown, category pills
- **Global comments** — Comments marked "All Classes" appear in a separate bottom section when filtering by class
- **Settings** — Class/assignment CRUD, bulk archive operations
- **Dark theme** — Muted teal/lavender/rose accents on dark backgrounds

## JS Architecture

| Module | Responsibility |
|--------|---------------|
| `State` | Central data store + filter state |
| `Auth` | Login/logout, auth state observer |
| `Store` | All Firestore CRUD, `loadAll()` |
| `UI` | Toast notifications, confirm dialog |
| `Filters` | Pill rendering, search, `applyFilters()` |
| `Comments` | Card rendering, category grouping, copy |
| `Editor` | Slide-out panel, rich text editor, save/archive |
| `Settings` | Class/assignment management, bulk actions |
| `App` | Init orchestration, reset on sign-out |
