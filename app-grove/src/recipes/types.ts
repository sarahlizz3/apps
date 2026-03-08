import type { Timestamp } from 'firebase/firestore';

export type DifficultyTier = 'instant-ramen' | 'tacos' | 'rice-bowl' | 'skillet' | null;

export interface Recipe {
  id: string;
  title: string;
  ingredients: string[];
  directions: string[];
  prepTime?: string;
  cookTime?: string;
  servings?: string;
  imageUrl?: string;
  sourceUrl?: string;
  category: string;
  difficulty: DifficultyTier;
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
