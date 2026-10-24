import { useState } from 'react';
import { exactTag, similarTag } from '../utils/tags';

interface Props {
  id: string;
  value: string[];
  onChange: (tags: string[]) => void;
  /** Every tag used on any recipe, offered as suggestions. */
  existing: string[];
}

/**
 * Type a tag and press Enter to add it. Tags already used elsewhere show
 * underneath as one-tap suggestions, and typing narrows them. If what's typed
 * is close to an existing tag ("soups" vs "Soup"), the first Enter only
 * highlights the existing one; a second Enter adds what was typed.
 */
export default function TagInput({ id, value, onChange, existing }: Props) {
  const [text, setText] = useState('');
  const [nudge, setNudge] = useState(false);

  const query = text.trim().toLowerCase();
  const near = similarTag(text, existing);
  const suggestions = existing.filter(
    (t) =>
      !value.some((v) => v.toLowerCase() === t.toLowerCase()) &&
      (!query || t.toLowerCase().includes(query) || t === near),
  );

  function add(tag: string) {
    const name = exactTag(tag, existing) ?? tag.trim();
    if (name && !value.some((v) => v.toLowerCase() === name.toLowerCase())) {
      onChange([...value, name]);
    }
    setText('');
    setNudge(false);
  }

  function remove(tag: string) {
    onChange(value.filter((v) => v !== tag));
  }

  return (
    <div>
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5 mb-2" aria-label="Tags on this recipe">
          {value.map((tag) => (
            <li
              key={tag}
              className="inline-flex items-center gap-0.5 rounded-full bg-primary text-on-primary text-sm pl-3 pr-1 py-0.5"
            >
              {tag}
              <button
                type="button"
                onClick={() => remove(tag)}
                aria-label={`Remove ${tag}`}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-black/15"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <input
        id={id}
        type="text"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setNudge(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (!text.trim()) return;
            if (near && !nudge) {
              setNudge(true);
              return;
            }
            add(text);
          } else if (e.key === 'Backspace' && !text && value.length > 0) {
            remove(value[value.length - 1]);
          }
        }}
        placeholder="Type a tag and press Enter"
        autoComplete="off"
        className="w-full bg-page border border-border rounded-lg px-3 py-2 text-sm text-body placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary"
      />

      {near && (
        <div
          className={`mt-2 rounded-lg bg-hover px-3 py-2 text-sm text-body flex flex-wrap items-center gap-2 ${
            nudge ? 'ring-2 ring-primary' : ''
          }`}
          role="status"
        >
          <span>
            You already have <strong>{near}</strong>.
          </span>
          <button
            type="button"
            onClick={() => add(near)}
            className="rounded-md bg-primary text-on-primary px-2.5 py-1 text-sm font-medium"
          >
            Add {near}
          </button>
        </div>
      )}

      {suggestions.length > 0 && (
        <>
          <p className="mt-2 text-xs text-muted">Already used</p>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {suggestions.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => add(tag)}
                className="rounded-full border border-border bg-hover text-secondary hover:text-body hover:border-primary px-3 py-1 text-sm min-h-8"
              >
                + {tag}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
