import { CONCERN_TAGS } from '../types';

interface Props {
  selected: string[];
  onChange: (tags: string[]) => void;
  tags?: string[];
}

export default function ConcernTagChips({ selected, onChange, tags = CONCERN_TAGS }: Props) {
  function toggle(tag: string) {
    if (selected.includes(tag)) {
      onChange(selected.filter(t => t !== tag));
    } else {
      onChange([...selected, tag]);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map(tag => (
        <button
          key={tag}
          type="button"
          onClick={() => toggle(tag)}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
            selected.includes(tag)
              ? 'bg-primary text-on-primary border-primary'
              : 'bg-card text-secondary border-border hover:bg-hover'
          }`}
        >
          {tag}
        </button>
      ))}
    </div>
  );
}
