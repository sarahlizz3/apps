import { useEffect, useRef } from 'react';

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', onConfirm, onCancel }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onCancel}
      className="rounded-xl p-0 backdrop:bg-black/40 max-w-sm w-[calc(100%-2rem)]"
    >
      <div className="p-6 bg-card rounded-xl">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-secondary text-sm">{message}</p>
        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-secondary hover:bg-hover rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-red-800 hover:bg-red-900 rounded-lg transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
