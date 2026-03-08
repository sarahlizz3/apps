import { useState, useRef, useEffect, useCallback } from 'react';
import ConfirmDialog from '../ui/ConfirmDialog';

interface Props {
  name: string;
  onDelete: () => void;
  onRename: (name: string) => void;
}

const SWIPE_THRESHOLD = 60;
const ACTION_WIDTH = 120;

export default function TemplateItem({ name, onDelete, onRename }: Props) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(name);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [offsetX, setOffsetX] = useState(0);
  const [swiped, setSwiped] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isHorizontal = useRef<boolean | null>(null);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  useEffect(() => {
    if (!contextMenu) return;
    const handle = () => closeContextMenu();
    document.addEventListener('click', handle);
    document.addEventListener('scroll', handle, true);
    return () => {
      document.removeEventListener('click', handle);
      document.removeEventListener('scroll', handle, true);
    };
  }, [contextMenu, closeContextMenu]);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isHorizontal.current = null;
  }

  function handleTouchMove(e: React.TouchEvent) {
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;

    if (isHorizontal.current === null) {
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        isHorizontal.current = Math.abs(dx) > Math.abs(dy);
      }
      return;
    }

    if (!isHorizontal.current) return;

    if (swiped) {
      const clamped = Math.min(0, -ACTION_WIDTH + dx);
      setOffsetX(Math.max(-ACTION_WIDTH, Math.min(0, clamped)));
    } else {
      setOffsetX(Math.min(0, dx));
    }
  }

  function handleTouchEnd() {
    if (isHorizontal.current === false) return;

    if (swiped) {
      if (offsetX > -SWIPE_THRESHOLD) {
        setOffsetX(0);
        setSwiped(false);
      } else {
        setOffsetX(-ACTION_WIDTH);
      }
    } else {
      if (offsetX < -SWIPE_THRESHOLD) {
        setOffsetX(-ACTION_WIDTH);
        setSwiped(true);
      } else {
        setOffsetX(0);
      }
    }
  }

  function closeSwipe() {
    setOffsetX(0);
    setSwiped(false);
  }

  function saveEdit() {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== name) {
      onRename(trimmed);
    }
    setEditing(false);
  }

  return (
    <div className="relative overflow-hidden">
      {/* Action buttons behind — only rendered during swipe to avoid subpixel bleed-through */}
      {(offsetX !== 0 || swiped) && (
        <div className="absolute right-0 top-0 bottom-0 flex items-stretch" style={{ width: ACTION_WIDTH }}>
          <button
            onClick={() => { closeSwipe(); setEditing(true); setEditValue(name); }}
            className="flex-1 flex items-center justify-center bg-primary text-on-primary text-xs font-medium"
          >
            Edit
          </button>
          <button
            onClick={() => { closeSwipe(); setDeleteOpen(true); }}
            className="flex-1 flex items-center justify-center bg-rose-800 text-white text-xs font-medium"
          >
            Delete
          </button>
        </div>
      )}

      {/* Swipeable foreground */}
      <div
        className="relative bg-card flex items-center gap-3 py-2 transition-transform duration-150 ease-out"
        style={{ transform: `translateX(${offsetX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => { if (swiped) closeSwipe(); }}
        onContextMenu={(e) => {
          e.preventDefault();
          setContextMenu({ x: e.clientX, y: e.clientY });
        }}
      >
        {editing ? (
          <form onSubmit={(e) => { e.preventDefault(); saveEdit(); }} className="flex-1">
            <input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full text-sm rounded border border-border px-2 py-1 focus:outline-none focus:ring-2 focus:ring-focus"
              autoFocus
              onBlur={saveEdit}
            />
          </form>
        ) : (
          <span className="flex-1 text-sm text-body select-none">
            {name}
          </span>
        )}
      </div>

      {/* Right-click context menu (desktop) */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-card rounded-lg shadow-lg border border-border py-1 min-w-[140px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            onClick={() => { closeContextMenu(); setEditing(true); setEditValue(name); }}
            className="w-full text-left px-4 py-2 text-sm text-secondary hover:bg-hover flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Z" />
            </svg>
            Edit
          </button>
          <button
            onClick={() => { closeContextMenu(); setDeleteOpen(true); }}
            className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
            Delete
          </button>
        </div>
      )}

      <ConfirmDialog
        open={deleteOpen}
        title="Delete Item"
        message={`Delete "${name}"?`}
        onConfirm={() => { onDelete(); setDeleteOpen(false); }}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}
