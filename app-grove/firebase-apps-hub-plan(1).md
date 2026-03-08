# AppGrove — Firebase Consolidation Plan

## Goal

Consolidate my small personal utility apps into a single Firebase project called **AppGrove** (hosted at `appgrove.skarlis.org`) instead of maintaining separate Firebase projects for each one. This reduces setup overhead and makes it easy to add new mini apps in the future — especially when building with Claude Code.

## What Goes In

- **Health app** — tracking doctors notes and related health info
- **Packing list app** — packing list management

These are both single-user apps (just me). Future small personal utility apps will also be added to AppGrove.

## What Stays Separate

- Work/classroom tools (QuickPoll, etc.) — these stay in their own Firebase projects
- Flow (notes/to-do app) — staying independent since it has a more complex roadmap
- Any future app that needs multi-user access would get its own project, separate from AppGrove

## Architecture

- **One Firebase project (`appgrove`)** backing all the apps
- **Each app gets its own Firestore namespace** (top-level collection or set of collections) so they don't interfere with each other
- **Frontend hosting stays on GitHub Pages** at `appgrove.skarlis.org` — Firebase Hosting is likely not needed
- **Security rules** lock everything to my single UID at the top level, with per-app namespaces as needed
- **Shared Firebase config** across all apps so new ones don't require new API keys or project setup

## Tasks for Claude Code

### 1. Audit Existing Projects

Look at the current Firebase setup for both the health app and packing list app:

- Map out the existing Firestore collection/document structure for each
- Check whether either app uses Firebase Storage (file uploads, etc.)
- Check what auth method each app uses (Google sign-in, email, etc.)
- Check for any custom Firestore indexes (`firestore.indexes.json`)
- Check whether either project uses Firebase Hosting, Cloud Functions, or callable endpoints

### 2. Recommend Repo Structure

Propose a directory structure for the AppGrove repo that:

- Keeps the shared Firebase config in one place (DRY, not duplicated per app)
- Makes it easy to scaffold a new app directory in the future
- Works well with GitHub Pages hosting

### 3. Data Migration Plan

- Script the export from each existing Firebase project
- Script the import into AppGrove under app-specific namespaces
- Include any Firebase Storage migration if applicable
- Preserve existing data structure as much as possible

### 4. Security Rules

- Write a `firestore.rules` file that locks the entire AppGrove project to my UID
- Add per-app namespace rules for each migrated app
- Structure the rules so adding a new app namespace is straightforward

### 5. Deployment Workflow

- Confirm whether Firebase Hosting is needed at all (probably not since frontend is on GitHub Pages)
- Set up `firebase.json` for rules and index deployment
- Make sure `firebase deploy --only firestore:rules` works from the AppGrove repo so future rule changes can be pushed by CC without console access

### 6. Auth Setup

- Confirm auth method consistency across both apps
- Flag anything I need to enable manually in the Firebase console for AppGrove

## One-Time Manual Setup (Me)

These are things I'll need to do in the Firebase console before CC can take over:

- Create the AppGrove Firebase project
- Enable the auth provider(s)
- Run `firebase login` locally
- Run `firebase init` in the AppGrove repo

After that, CC should be able to handle all future additions and deployments.
