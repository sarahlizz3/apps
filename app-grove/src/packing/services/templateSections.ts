import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../shared/firebase';

function col(userId: string) {
  return collection(db, 'users', userId, 'templateSections');
}

export async function createTemplateSection(userId: string, name: string, items: string[] = []) {
  const ref = doc(col(userId));
  await setDoc(ref, {
    name,
    items,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateTemplateSection(
  userId: string,
  sectionId: string,
  data: { name?: string; items?: string[]; rank?: number | null },
) {
  await updateDoc(doc(col(userId), sectionId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTemplateSection(userId: string, sectionId: string) {
  await deleteDoc(doc(col(userId), sectionId));
}
