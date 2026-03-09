import { DIFFICULTY_TIERS } from '../utils/constants';
import type { DifficultyTier } from '../types';
import DifficultyIcon from './DifficultyIcon';

interface Props {
  selected: DifficultyTier | 'All';
  onSelect: (value: DifficultyTier | 'All') => void;
}

export default function DifficultyFilter({ selected, onSelect }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      <button
        onClick={() => onSelect('All')}
        className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium transition-colors ${
          selected === 'All'
            ? 'bg-primary text-on-primary'
            : 'bg-hover text-secondary hover:text-body'
        }`}
      >
        All
      </button>
      {DIFFICULTY_TIERS.map((tier) => (
        <button
          key={tier.key}
          onClick={() => onSelect(tier.key)}
          className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium transition-colors flex items-center gap-1.5 ${
            selected === tier.key
              ? 'bg-primary text-on-primary'
              : 'bg-hover text-secondary hover:text-body'
          }`}
        >
          <DifficultyIcon tier={tier.key} size="sm" />
          {tier.label}
        </button>
      ))}
    </div>
  );
}
