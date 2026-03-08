import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../shared/firebase';


function recipesCol(userId: string) {
  return collection(db, 'users', userId, 'recipes');
}

function recipeDoc(userId: string, recipeId: string) {
  return doc(db, 'users', userId, 'recipes', recipeId);
}

export async function createRecipe(
  userId: string,
  data: Record<string, unknown>,
) {
  const ref = doc(recipesCol(userId));
  await setDoc(ref, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateRecipe(
  userId: string,
  recipeId: string,
  data: Record<string, unknown>,
) {
  await updateDoc(recipeDoc(userId, recipeId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteRecipe(userId: string, recipeId: string) {
  await deleteDoc(recipeDoc(userId, recipeId));
}
