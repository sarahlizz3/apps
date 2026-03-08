import type { DifficultyTier } from '../types';
import { DIFFICULTY_TIERS } from '../utils/constants';
import DifficultyIcon from './DifficultyIcon';

interface Props {
  value: DifficultyTier;
  onChange: (tier: DifficultyTier) => void;
}

export default function DifficultySelector({ value, onChange }: Props) {
  return (
    <div className="flex gap-2">
      {DIFFICULTY_TIERS.map((tier) => {
        const selected = value === tier.key;
        return (
          <button
            key={tier.key}
            type="button"
            onClick={() => onChange(selected ? null : tier.key)}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg border transition-colors ${
              selected
                ? 'border-2 bg-hover/60'
                : 'border border-border opacity-60 hover:opacity-100'
            }`}
            style={selected ? { borderColor: tier.color, backgroundColor: `${tier.color}15` } : undefined}
          >
            <DifficultyIcon tier={tier.key} size="md" />
            <span className="text-xs font-medium">{tier.label}</span>
          </button>
        );
      })}
    </div>
  );
}
