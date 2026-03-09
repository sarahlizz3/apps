import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/AuthContext';
import { useRecipe } from '../hooks/useRecipe';
import { useRecipes } from '../hooks/useRecipes';
import { createRecipe, updateRecipe, deleteRecipe } from '../services';
import { DEFAULT_CATEGORY } from '../utils/constants';
import type { DifficultyTier } from '../types';
import DifficultySelector from './DifficultySelector';
import RecipeImport from './RecipeImport';
import ConfirmDialog from '../../packing/components/ui/ConfirmDialog';

export default function RecipeForm() {
  const { recipeId } = useParams<{ recipeId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { recipe, loading } = useRecipe(recipeId);
  const { recipes } = useRecipes();
  const isEdit = Boolean(recipeId);

  const [title, setTitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [category, setCategory] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [servings, setServings] = useState('');
  const [ingredientsText, setIngredientsText] = useState('');
  const [directionsText, setDirectionsText] = useState('');
  const [notes, setNotes] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [difficulty, setDifficulty] = useState<DifficultyTier>(null);
  const [saving, setSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [formReady, setFormReady] = useState(false);

  // Existing categories for autocomplete
  const existingCategories = useMemo(() => {
    const cats = new Set(recipes.map((r) => r.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [recipes]);

  // Populate form in edit mode
  useEffect(() => {
    if (isEdit && recipe) {
      setTitle(recipe.title);
      setImageUrl(recipe.imageUrl || '');
      setCategory(recipe.category || '');
      setPrepTime(recipe.prepTime || '');
      setCookTime(recipe.cookTime || '');
      setServings(recipe.servings || '');
      setIngredientsText(recipe.ingredients.join('\n'));
      setDirectionsText(recipe.directions.join('\n'));
      setNotes(recipe.notes || '');
      setSourceUrl(recipe.sourceUrl || '');
      setDifficulty(recipe.difficulty);
      setFormReady(true);
    }
  }, [isEdit, recipe]);

  // In create mode, show import first, then form
  function handleImport(data: {
    title: string;
    ingredients: string[];
    directions: string[];
    notes?: string;
    prepTime?: string;
    cookTime?: string;
    servings?: string;
    imageUrl?: string;
    sourceUrl?: string;
  }) {
    setTitle(data.title || '');
    setIngredientsText(data.ingredients.join('\n'));
    setDirectionsText(data.directions.join('\n'));
    setNotes(data.notes || '');
    setPrepTime(data.prepTime || '');
    setCookTime(data.cookTime || '');
    setServings(data.servings || '');
    setImageUrl(data.imageUrl || '');
    setSourceUrl(data.sourceUrl || '');
    setFormReady(true);
  }

  async function handleSave() {
    if (!user || !title.trim()) return;
    setSaving(true);

    const ingredients = ingredientsText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const directions = directionsText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const data: Record<string, unknown> = {
      title: title.trim(),
      ingredients,
      directions,
      category: category.trim() || DEFAULT_CATEGORY,
      difficulty,
    };
    if (prepTime.trim()) data.prepTime = prepTime.trim();
    if (cookTime.trim()) data.cookTime = cookTime.trim();
    if (servings.trim()) data.servings = servings.trim();
    if (imageUrl.trim()) data.imageUrl = imageUrl.trim();
    if (sourceUrl.trim()) data.sourceUrl = sourceUrl.trim();
    if (notes.trim()) data.notes = notes.trim();

    try {
      if (isEdit && recipeId) {
        await updateRecipe(user.uid, recipeId, data);
        navigate(`/recipes/${recipeId}`);
      } else {
        const newId = await createRecipe(user.uid, data);
        navigate(`/recipes/${newId}`);
      }
    } catch (err) {
      console.error('Failed to save recipe:', err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!user || !recipeId) return;
    try {
      await deleteRecipe(user.uid, recipeId);
      navigate('/recipes');
    } catch (err) {
      console.error('Failed to delete recipe:', err);
    }
  }

  if (isEdit && loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const showForm = isEdit || formReady;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <h2 className="text-xl font-semibold text-heading">
        {isEdit ? 'Edit Recipe' : 'New Recipe'}
      </h2>

      {/* Import section (create mode only, before form is ready) */}
      {!isEdit && !formReady && <RecipeImport onImport={handleImport} />}

      {showForm && (
        <div className="space-y-5">
          {/* Difficulty at the very top */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">
              Difficulty
            </label>
            <DifficultySelector value={difficulty} onChange={setDifficulty} />
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Recipe title"
              className="w-full bg-page border border-border rounded-lg px-3 py-2 text-sm text-body placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Image URL */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Image URL
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="w-full bg-page border border-border rounded-lg px-3 py-2 text-sm text-body placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {imageUrl && (
              <img
                src={imageUrl}
                alt="Preview"
                className="mt-2 h-20 w-20 object-cover rounded-lg border border-border"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Category
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder={DEFAULT_CATEGORY}
              list="recipe-categories"
              className="w-full bg-page border border-border rounded-lg px-3 py-2 text-sm text-body placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <datalist id="recipe-categories">
              {existingCategories.map((cat) => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
          </div>

          {/* Prep time, Cook time, Servings row */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                Prep Time
              </label>
              <input
                type="text"
                value={prepTime}
                onChange={(e) => setPrepTime(e.target.value)}
                placeholder="15 min"
                className="w-full bg-page border border-border rounded-lg px-3 py-2 text-sm text-body placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                Cook Time
              </label>
              <input
                type="text"
                value={cookTime}
                onChange={(e) => setCookTime(e.target.value)}
                placeholder="30 min"
                className="w-full bg-page border border-border rounded-lg px-3 py-2 text-sm text-body placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                Servings
              </label>
              <input
                type="text"
                value={servings}
                onChange={(e) => setServings(e.target.value)}
                placeholder="4"
                className="w-full bg-page border border-border rounded-lg px-3 py-2 text-sm text-body placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Ingredients */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Ingredients
            </label>
            <textarea
              value={ingredientsText}
              onChange={(e) => setIngredientsText(e.target.value)}
              placeholder="One ingredient per line, e.g.&#10;2 cups flour&#10;1 tsp salt&#10;3 eggs"
              rows={8}
              className="w-full bg-page border border-border rounded-lg px-3 py-2 text-sm text-body placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary resize-y"
            />
          </div>

          {/* Directions */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Directions
            </label>
            <textarea
              value={directionsText}
              onChange={(e) => setDirectionsText(e.target.value)}
              placeholder="One step per line, e.g.&#10;Preheat oven to 350F&#10;Mix dry ingredients&#10;Add wet ingredients and stir"
              rows={8}
              className="w-full bg-page border border-border rounded-lg px-3 py-2 text-sm text-body placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary resize-y"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Supports Markdown"
              rows={4}
              className="w-full bg-page border border-border rounded-lg px-3 py-2 text-sm text-body placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary resize-y"
            />
          </div>

          {/* Source URL */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Source URL
            </label>
            <input
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://example.com/original-recipe"
              className="w-full bg-page border border-border rounded-lg px-3 py-2 text-sm text-body placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={!title.trim() || saving}
              className="px-5 py-2.5 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-40 flex items-center gap-2"
            >
              {saving && (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
              )}
              {isEdit ? 'Save Changes' : 'Create Recipe'}
            </button>
            <button
              onClick={() =>
                navigate(isEdit && recipeId ? `/recipes/${recipeId}` : '/recipes')
              }
              className="px-5 py-2.5 text-sm font-medium text-secondary hover:bg-hover rounded-lg transition-colors"
            >
              Cancel
            </button>
            {isEdit && (
              <button
                onClick={() => setShowDeleteDialog(true)}
                className="ml-auto px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={showDeleteDialog}
        title="Delete Recipe"
        message={`Are you sure you want to delete "${title}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteDialog(false)}
      />
    </div>
  );
}
