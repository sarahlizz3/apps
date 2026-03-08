import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../shared/firebase';
import { useAuth } from '../../shared/AuthContext';
import type { Recipe } from '../types';

export function useRecipe(recipeId: string | undefined) {
  const { user } = useAuth();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !recipeId) return;
    return onSnapshot(doc(db, 'users', user.uid, 'recipes', recipeId), (snap) => {
      if (snap.exists()) {
        setRecipe({ id: snap.id, ...snap.data() } as Recipe);
      } else {
        setRecipe(null);
      }
      setLoading(false);
    });
  }, [user, recipeId]);

  return { recipe, loading };
}
