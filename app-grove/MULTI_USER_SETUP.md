# Adding Users to AppGrove

## How it works

AppGrove uses an allowlist of Google account UIDs. Only users whose UID is in the list can access the app.

## Step 1: Get their UID (already set up)

1. Have the person open the app and sign in with Google
2. They'll see a "You don't have access yet" message with their UID code
3. They tap the code to copy it, then text/send it to you

## Step 2: Add their UID to the environment variable

Open `app-grove/.env` and change `VITE_AUTHORIZED_UID` to `VITE_AUTHORIZED_UIDS` (plural), with comma-separated UIDs:

```
VITE_AUTHORIZED_UIDS=NwKIDbdAHRNXxZ926uhC47ofP4t1,theirUidHere,anotherUidHere
```

## Step 3: Update the frontend auth check

In `src/shared/firebase.ts`, change:
```ts
export const AUTHORIZED_UID = import.meta.env.VITE_AUTHORIZED_UID;
```
to:
```ts
export const AUTHORIZED_UIDS = (import.meta.env.VITE_AUTHORIZED_UIDS ?? '').split(',');
```

In `src/shared/AuthContext.tsx`, change:
```ts
import { auth, AUTHORIZED_UID } from './firebase';
// ...
const authorized = user != null && user.uid === AUTHORIZED_UID;
```
to:
```ts
import { auth, AUTHORIZED_UIDS } from './firebase';
// ...
const authorized = user != null && AUTHORIZED_UIDS.includes(user.uid);
```

## Step 4: Update Firestore security rules

In `firestore.rules`, change the hardcoded UID to a list:

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null
                         && request.auth.uid == userId
                         && request.auth.uid in ['NwKIDbdAHRNXxZ926uhC47ofP4t1', 'theirUidHere', 'anotherUidHere'];
    }
  }
}
```

Then deploy the rules:
```bash
cd app-grove
firebase deploy --only firestore:rules
```

## Step 5: Rebuild and deploy the app

```bash
cd app-grove
rm -rf dist assets
npm run build
cp -r dist/assets ./assets/
cp dist/registerSW.js dist/sw.js dist/workbox-*.js dist/manifest.webmanifest .
git add -A && git commit -m "Add users to allowlist" && git push
```

## Notes

- Each user gets their own isolated data (recipes, packing lists, health info, settings)
- Adding a new user later means repeating steps 2-5 with their UID added to both places
- The Firestore rules and the `.env` list must stay in sync
