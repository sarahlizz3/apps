import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../shared/firebase';

function col(userId: string) {
  return collection(db, 'users', userId, 'reminderTemplates');
}

export async function createReminderTemplate(userId: string, text: string) {
  const ref = doc(col(userId));
  await setDoc(ref, {
    text,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function deleteReminderTemplate(userId: string, templateId: string) {
  await deleteDoc(doc(col(userId), templateId));
}
