interface Props {
  categories: string[];
  selected: string;
  onSelect: (category: string) => void;
}

export default function CategoryFilter({ categories, selected, onSelect }: Props) {
  const all = ['All', ...categories];

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {all.map((cat) => {
        const isSelected = cat === selected;
        return (
          <button
            key={cat}
            onClick={() => onSelect(cat)}
            className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium transition-colors ${
              isSelected
                ? 'bg-primary text-on-primary'
                : 'bg-hover text-secondary hover:text-body'
            }`}
          >
            {cat}
          </button>
        );
      })}
    </div>
  );
}
