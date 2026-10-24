export const AUTO_PREPENDED_STEPS = [
  'Find and pull out all ingredients',
  'Find and pull out any bakeware or pans needed',
];

/* Colors run green, teal, blue, purple, pink, coral from easiest to hardest.
   Each one is at least 3:1 against both the light and dark card colors, so the
   icon stays visible when it appears alone (on recipe cards). */
export const DIFFICULTY_TIERS = [
  { key: 'instant-ramen' as const, label: 'Instant Ramen', color: '#16a34a' },
  { key: 'tacos' as const, label: 'Tacos', color: '#0d9488' },
  { key: 'rice-bowl' as const, label: 'Rice Bowl', color: '#3b82f6' },
  // About as much work as Skillet, but you can walk away from it.
  { key: 'instant-pot' as const, label: 'Instant Pot', color: '#a855f7' },
  { key: 'skillet' as const, label: 'Skillet', color: '#d944b8' },
  { key: 'special-occasion' as const, label: 'Special Occasion', color: '#e65f50' },
];

export const DEFAULT_CATEGORY = 'Uncategorized';
