import { useRef, useEffect } from 'react';

interface Props {
  open: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ open, message, onConfirm, onCancel }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (open) ref.current?.showModal();
    else ref.current?.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onCancel}
      className="rounded-xl border border-border p-6 max-w-sm w-full backdrop:bg-black/40"
    >
      <p className="text-body text-sm mb-4">{message}</p>
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm text-secondary hover:text-body transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 text-sm bg-reminder-text text-white rounded-lg hover:opacity-90 transition-opacity"
        >
          Delete
        </button>
      </div>
    </dialog>
  );
}
