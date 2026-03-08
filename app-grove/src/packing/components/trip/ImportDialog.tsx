import { useEffect, useRef } from 'react';

interface ImportOption {
  id: string;
  label: string;
  detail?: string;
}

interface Props {
  open: boolean;
  title: string;
  options: ImportOption[];
  onSelect: (ids: string[]) => void;
  onCancel: () => void;
}

export default function ImportDialog({ open, title, options, onSelect, onCancel }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const selectedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) {
      selectedRef.current = new Set();
      el.showModal();
    }
    if (!open && el.open) el.close();
  }, [open]);

  function handleToggle(id: string) {
    const s = selectedRef.current;
    if (s.has(id)) s.delete(id); else s.add(id);
    const el = document.getElementById(`import-opt-${id}`) as HTMLInputElement;
    if (el) el.checked = s.has(id);
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onCancel}
      className="rounded-xl p-0 backdrop:bg-black/40 max-w-sm w-[calc(100%-2rem)]"
    >
      <div className="p-6 bg-card rounded-xl">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        {options.length === 0 ? (
          <p className="text-secondary text-sm">No templates available. Create some in the Templates tab first.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {options.map((opt) => (
              <label key={opt.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-hover cursor-pointer">
                <input
                  id={`import-opt-${opt.id}`}
                  type="checkbox"
                  onChange={() => handleToggle(opt.id)}
                  className="mt-0.5 w-4 h-4 rounded border-border text-primary focus:ring-focus"
                />
                <div>
                  <div className="text-sm font-medium">{opt.label}</div>
                  {opt.detail && <div className="text-xs text-secondary">{opt.detail}</div>}
                </div>
              </label>
            ))}
          </div>
        )}
        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-secondary hover:bg-hover rounded-lg transition-colors"
          >
            Cancel
          </button>
          {options.length > 0 && (
            <button
              onClick={() => onSelect(Array.from(selectedRef.current))}
              className="px-4 py-2 text-sm font-medium text-on-primary bg-primary hover:bg-primary-hover rounded-lg transition-colors"
            >
              Import
            </button>
          )}
        </div>
      </div>
    </dialog>
  );
}
