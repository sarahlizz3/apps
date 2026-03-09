import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useRecipes } from '../hooks/useRecipes';
import type { DifficultyTier } from '../types';
import SearchBar from './SearchBar';
import CategoryFilter from './CategoryFilter';
import DifficultyFilter from './DifficultyFilter';
import RecipeCard from './RecipeCard';

export default function RecipeHome() {
  const { recipes, loading } = useRecipes();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyTier | 'All'>('All');

  const categories = useMemo(() => {
    const set = new Set<string>();
    recipes.forEach((r) => { if (r.category) set.add(r.category); });
    return Array.from(set).sort();
  }, [recipes]);

  const filtered = useMemo(() => {
    let list = recipes;

    if (selectedCategory !== 'All') {
      list = list.filter((r) => r.category === selectedCategory);
    }

    if (selectedDifficulty !== 'All') {
      list = list.filter((r) => r.difficulty === selectedDifficulty);
    }

    const term = search.trim().toLowerCase();
    if (term) {
      list = list.filter((r) => {
        const haystack = [
          r.title,
          r.category,
          r.notes ?? '',
          ...r.ingredients,
          ...r.directions,
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(term);
      });
    }

    return list;
  }, [recipes, search, selectedCategory, selectedDifficulty]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-lg mx-auto pb-24">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">My Recipes</h2>
        <Link
          to="/recipes/new"
          className="hidden sm:inline-flex bg-primary text-on-primary rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary-hover transition-colors"
        >
          + New Recipe
        </Link>
      </div>

      <div className="space-y-3 mb-4">
        <SearchBar value={search} onChange={setSearch} />
        {categories.length > 0 && (
          <CategoryFilter
            categories={categories}
            selected={selectedCategory}
            onSelect={setSelectedCategory}
          />
        )}
        <DifficultyFilter
          selected={selectedDifficulty}
          onSelect={setSelectedDifficulty}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-secondary text-center py-12">
          {recipes.length === 0
            ? 'No recipes yet. Add one to get started!'
            : 'No recipes match your search.'}
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}

      {/* Mobile floating add button */}
      <Link
        to="/recipes/new"
        className="sm:hidden fixed bottom-6 right-6 w-14 h-14 bg-primary text-on-primary rounded-full shadow-lg flex items-center justify-center text-2xl font-bold hover:bg-primary-hover transition-colors z-10"
        aria-label="Add Recipe"
      >
        +
      </Link>
    </div>
  );
}
