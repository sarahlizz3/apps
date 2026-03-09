import type { DifficultyTier } from '../types';
import { DIFFICULTY_TIERS } from '../utils/constants';
import ramenUrl from '../assets/ramen.svg';
import tacoUrl from '../assets/taco.svg';
import ricebowlUrl from '../assets/ricebowl.svg';
import skilletUrl from '../assets/skillet.svg';

interface Props {
  tier: DifficultyTier;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = { sm: 16, md: 20, lg: 24 };

const iconUrls: Record<string, string> = {
  'instant-ramen': ramenUrl,
  tacos: tacoUrl,
  'rice-bowl': ricebowlUrl,
  skillet: skilletUrl,
};

export default function DifficultyIcon({ tier, size = 'md' }: Props) {
  if (!tier) return null;
  const info = DIFFICULTY_TIERS.find((t) => t.key === tier);
  if (!info) return null;
  const px = sizeMap[size];
  const url = iconUrls[tier];
  if (!url) return null;

  return (
    <span
      className="inline-block"
      style={{
        width: px,
        height: px,
        backgroundColor: info.color,
        WebkitMaskImage: `url(${url})`,
        WebkitMaskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskImage: `url(${url})`,
        maskSize: 'contain',
        maskRepeat: 'no-repeat',
        maskPosition: 'center',
      }}
    />
  );
}
