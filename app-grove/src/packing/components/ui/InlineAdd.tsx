import { useState } from 'react';

interface Props {
  placeholder: string;
  onAdd: (value: string) => void;
}

export default function InlineAdd({ placeholder, onAdd }: Props) {
  const [value, setValue] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setValue('');
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="flex-1 min-w-0 rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-focus"
      />
      <button
        type="submit"
        className="shrink-0 bg-primary text-on-primary rounded-lg px-3 py-2 text-sm font-medium hover:bg-primary-hover transition-colors"
      >
        Add
      </button>
    </form>
  );
}
