# AppGrove Maintenance Guide

## Tech Stack

- **React 19** + **TypeScript 5.9** — UI framework
- **Vite 7** — Build tool and dev server
- **Tailwind CSS 4** — Styling (via `@tailwindcss/vite` plugin)
- **Firebase 12** — Authentication (Google) and Firestore database
- **React Router 7** — Client-side routing
- **vite-plugin-pwa** — Progressive Web App support with auto-update

## Project Structure

```
app-grove/
├── src/
│   ├── shared/          # Shared Firebase config, auth, theme
│   ├── launcher/        # App launcher page
│   ├── packing/         # Packing list app
│   └── health/          # Health dashboard app
├── .env                 # Firebase credentials (not committed)
├── firestore.rules      # Firestore security rules
├── firebase.json        # Firebase CLI config (rules deploy only)
└── vite.config.ts       # Vite config with base path /app-grove/
```

## Regular Maintenance Tasks

### 1. Update Dependencies (Monthly)

```bash
cd app-grove
npm outdated           # Check for updates
npm update             # Update within semver ranges
npm run build          # Verify build still works
```

For major version bumps (e.g., Vite 7 → 8, React 19 → 20):
- Read the migration guide for the package
- Update one major package at a time
- Run `npm run build` and test after each

### 2. Deploy Firestore Rules

When `firestore.rules` changes:

```bash
firebase deploy --only firestore:rules
```

### 3. Build and Deploy to GitHub Pages

The built output goes to `dist/` which GitHub Pages serves from the `app-grove/` directory:

```bash
npm run build
# Then commit the dist/ directory or use a CI action
```

### 4. Adding a New Mini App

1. Create a new directory under `src/` (e.g., `src/my-new-app/`)
2. Add the app's route to `src/App.tsx`
3. Add an entry to the launcher in `src/launcher/LauncherPage.tsx`
4. If the app needs Firestore collections, add them under `users/{uid}/` — no rule changes needed since the wildcard rule covers all sub-collections
5. Import shared modules from `../shared/` for Firebase, auth, and theme

### 5. Key Configuration

- **Base path**: Set in `vite.config.ts` as `base: '/app-grove/'` — all assets and routes are relative to this
- **Firebase project**: `app-grove` — credentials in `.env`
- **Auth**: Google-only, locked to a single UID in both Firestore rules and app code
- **PWA**: Configured in `vite.config.ts` with Workbox for offline caching

## Troubleshooting

- **Blank page after deploy**: Check that `base` in `vite.config.ts` matches the actual URL path
- **Auth errors**: Verify the domain is authorized in Firebase Console → Authentication → Settings → Authorized domains
- **Firestore permission denied**: Check that the UID in `firestore.rules` matches your actual Google account UID
