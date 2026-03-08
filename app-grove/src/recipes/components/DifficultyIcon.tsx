import type { ReactNode } from 'react';
import type { DifficultyTier } from '../types';
import { DIFFICULTY_TIERS } from '../utils/constants';

interface Props {
  tier: DifficultyTier;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-6 h-6' };

export default function DifficultyIcon({ tier, size = 'md' }: Props) {
  if (!tier) return null;

  const info = DIFFICULTY_TIERS.find((t) => t.key === tier);
  if (!info) return null;

  const cls = sizeMap[size];

  const icons: Record<string, ReactNode> = {
    'instant-ramen': (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
        <path d="M4 8 q4 -3 8 0 t8 0" />
        <path d="M4 12 q4 -3 8 0 t8 0" />
        <path d="M4 16 q4 -3 8 0 t8 0" />
      </svg>
    ),
    tacos: (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 18 Q4 6 12 6 Q20 6 20 18 Z" />
        <circle cx="10" cy="13" r="1" />
        <circle cx="14" cy="13" r="1" />
        <circle cx="12" cy="10" r="1" />
      </svg>
    ),
    'rice-bowl': (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12 h16" />
        <path d="M4 12 Q4 20 12 20 Q20 20 20 12" />
        <path d="M6 12 Q8 6 12 8 Q16 6 18 12" />
      </svg>
    ),
    skillet: (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="13" r="7" />
        <line x1="18" y1="13" x2="23" y2="13" />
      </svg>
    ),
  };

  return (
    <span style={{ color: info.color }} className="inline-flex">
      {icons[tier]}
    </span>
  );
}
