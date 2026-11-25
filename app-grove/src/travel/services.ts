import { collection, deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../shared/firebase';

// Firestore layout:
//   users/{uid}/travelVisits/{placeId}  { year, note, updatedAt }
//   users/{uid}/settings/travel         { home }
// Covered by the existing users/{uid}/** rule — no rules change needed.

export function visitsCol(uid: string) {
  return collection(db, 'users', uid, 'travelVisits');
}

export function travelSettingsDoc(uid: string) {
  return doc(db, 'users', uid, 'settings', 'travel');
}

// Writes are not awaited by the screens: with the offline cache, the local
// snapshot updates at once, but the promise only settles when the server answers.
export function saveVisit(uid: string, placeId: string, year: string, note: string) {
  return setDoc(doc(visitsCol(uid), placeId), { year, note, updatedAt: serverTimestamp() });
}

export function removeVisit(uid: string, placeId: string) {
  return deleteDoc(doc(visitsCol(uid), placeId));
}

export function saveHome(uid: string, home: string) {
  return setDoc(travelSettingsDoc(uid), { home }, { merge: true });
}
