import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../shared/firebase';
import type { Recipe } from './types';

function recipesCol(userId: string) {
  return collection(db, 'users', userId, 'recipes');
}

function recipeDoc(userId: string, recipeId: string) {
  return doc(db, 'users', userId, 'recipes', recipeId);
}

export async function createRecipe(
  userId: string,
  data: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>,
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
  data: Partial<Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>>,
) {
  await updateDoc(recipeDoc(userId, recipeId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteRecipe(userId: string, recipeId: string) {
  await deleteDoc(recipeDoc(userId, recipeId));
}
