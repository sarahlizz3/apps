import type { DifficultyTier } from '../types';
import { DIFFICULTY_TIERS } from '../utils/constants';

interface Props {
  tier: DifficultyTier;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = { sm: 16, md: 20, lg: 24 };

function RamenIcon({ color, size }: { color: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 6c1.5 0 1.5 2 3 2s1.5-2 3-2 1.5 2 3 2 1.5-2 3-2 1.5 2 3 2" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M4 10c1.5 0 1.5 2 3 2s1.5-2 3-2 1.5 2 3 2 1.5-2 3-2 1.5 2 3 2" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M4 14c1.5 0 1.5 2 3 2s1.5-2 3-2 1.5 2 3 2 1.5-2 3-2 1.5 2 3 2" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M4 18c1.5 0 1.5 2 3 2s1.5-2 3-2 1.5 2 3 2 1.5-2 3-2 1.5 2 3 2" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function TacoIcon({ color, size }: { color: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 16c0-6 4-10 9-10s9 4 9 10" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M6 12c1-2 2-3 3-2s1 3 3 3 2-3 3-3 2 1 3 2" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M3 16c3 3 6 4 9 4s6-1 9-4" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function RiceBowlIcon({ color, size }: { color: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 11h18c0 5-4 9-9 9s-9-4-9-9z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M5 11c0-3 3-5 7-5s7 2 7 5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9 2l-1 9" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M15 2l1 9" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function SkilletIcon({ color, size }: { color: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="10" cy="14" rx="8" ry="5" stroke={color} strokeWidth="1.8" />
      <path d="M18 14h4" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M7 7c0-1.5 1-2 1-3" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
      <path d="M10 6c0-1.5 1-2 1-3" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
      <path d="M13 7c0-1.5 1-2 1-3" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

const iconComponents: Record<string, typeof RamenIcon> = {
  'instant-ramen': RamenIcon,
  tacos: TacoIcon,
  'rice-bowl': RiceBowlIcon,
  skillet: SkilletIcon,
};

export default function DifficultyIcon({ tier, size = 'md' }: Props) {
  if (!tier) return null;
  const info = DIFFICULTY_TIERS.find((t) => t.key === tier);
  if (!info) return null;
  const Icon = iconComponents[tier];
  if (!Icon) return null;
  return <Icon color={info.color} size={sizeMap[size]} />;
}
