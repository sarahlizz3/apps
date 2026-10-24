import type { Timestamp } from 'firebase/firestore';

export type DifficultyTier =
  | 'instant-ramen'
  | 'tacos'
  | 'rice-bowl'
  | 'instant-pot'
  | 'skillet'
  | 'special-occasion'
  | null;

export interface Recipe {
  id: string;
  title: string;
  /** Short line or two under the title, e.g. "Grandma's dolmathes, unrolled." */
  description?: string;
  ingredients: string[];
  directions: string[];
  prepTime?: string;
  cookTime?: string;
  servings?: string;
  imageUrl?: string;
  sourceUrl?: string;
  /** Recipes saved before tags existed have a single category instead. Read through recipeTags(). */
  category?: string;
  tags?: string[];
  difficulty: DifficultyTier;
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
