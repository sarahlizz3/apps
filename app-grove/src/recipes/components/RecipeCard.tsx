import { Link } from 'react-router-dom';
import type { Recipe } from '../types';
import DifficultyIcon from './DifficultyIcon';

interface Props {
  recipe: Recipe;
}

export default function RecipeCard({ recipe }: Props) {
  const totalTime = [recipe.prepTime, recipe.cookTime].filter(Boolean).join(' + ');

  return (
    <Link
      to={`/recipes/${recipe.id}`}
      className="block bg-card rounded-xl border border-border p-4 hover:border-section-border hover:bg-hover/40 transition-colors"
    >
      <div className="flex items-center gap-3">
        {recipe.imageUrl ? (
          <img
            src={recipe.imageUrl}
            alt={recipe.title}
            className="w-12 h-12 rounded-lg object-cover shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-hover flex items-center justify-center shrink-0 text-secondary text-lg">
            🍽
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-body truncate">{recipe.title}</h3>
          <div className="flex items-center gap-2 mt-1">
            {recipe.category && (
              <span className="text-xs bg-hover text-secondary rounded-full px-2 py-0.5">
                {recipe.category}
              </span>
            )}
            <DifficultyIcon tier={recipe.difficulty} size="sm" />
            {totalTime && (
              <span className="text-xs text-secondary">{totalTime}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
