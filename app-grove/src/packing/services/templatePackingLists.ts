import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../shared/firebase';
import type { TemplatePLSection } from '../types';

function col(userId: string) {
  return collection(db, 'users', userId, 'templatePackingLists');
}

export async function createTemplatePackingList(userId: string, name: string) {
  const ref = doc(col(userId));
  await setDoc(ref, {
    name,
    sections: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateTemplatePackingList(
  userId: string,
  templateId: string,
  data: { name?: string; sections?: TemplatePLSection[] },
) {
  await updateDoc(doc(col(userId), templateId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTemplatePackingList(userId: string, templateId: string) {
  await deleteDoc(doc(col(userId), templateId));
}
