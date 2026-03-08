import { useState, useRef, useEffect, useCallback } from 'react';
import type { HealthData, TodoItem } from '../types';
import { useAuth } from '../../shared/AuthContext';
import { saveItem, deleteItem, serverTimestamp } from '../services';
import { useToast } from './Toast';
import ConfirmDialog from './ConfirmDialog';

interface Props {
  data: HealthData;
  setData: React.Dispatch<React.SetStateAction<HealthData>>;
  onGoToNotes: () => void;
}

const SWIPE_THRESHOLD = 60;
const ACTION_WIDTH = 80;

function getTimestampSeconds(ts?: { seconds: number } | unknown): number {
  if (!ts || typeof ts !== 'object') return 0;
  if ('seconds' in (ts as object)) return (ts as { seconds: number }).seconds;
  return 0;
}

function isDue(todo: TodoItem): boolean {
  if (!todo.recurrence) return !todo.completed;
  if (!todo.completed) return true;

  const now = new Date();
  const completedSec = getTimestampSeconds(todo.completedAt);
  if (!completedSec) return true;

  const r = todo.recurrence;
  if (r.type === 'yearly' && r.month && r.day) {
    const dueDate = new Date(now.getFullYear(), r.month - 1, r.day);
    if (dueDate > now) dueDate.setFullYear(dueDate.getFullYear() - 1);
    return completedSec * 1000 < dueDate.getTime();
  }
  if (r.type === 'monthly' && r.day) {
    const dueDate = new Date(now.getFullYear(), now.getMonth(), r.day);
    if (dueDate > now) dueDate.setMonth(dueDate.getMonth() - 1);
    return completedSec * 1000 < dueDate.getTime();
  }
  return !todo.completed;
}

function formatRecurrence(r: TodoItem['recurrence']): string {
  if (!r) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  if (r.type === 'yearly' && r.month && r.day) return `Every ${months[r.month - 1]} ${r.day}`;
  if (r.type === 'monthly' && r.day) return `Monthly on the ${r.day}${r.day === 1 ? 'st' : r.day === 2 ? 'nd' : r.day === 3 ? 'rd' : 'th'}`;
  return '';
}

function TodoItemRow({ todo, onCheck, onDelete }: {
  todo: TodoItem;
  onCheck: () => void;
  onDelete: () => void;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [offsetX, setOffsetX] = useState(0);
  const [swiped, setSwiped] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isHorizontal = useRef<boolean | null>(null);
  const due = isDue(todo);

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
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) isHorizontal.current = Math.abs(dx) > Math.abs(dy);
      return;
    }
    if (!isHorizontal.current) return;
    if (swiped) {
      setOffsetX(Math.max(-ACTION_WIDTH, Math.min(0, -ACTION_WIDTH + dx)));
    } else {
      setOffsetX(Math.min(0, dx));
    }
  }
  function handleTouchEnd() {
    if (isHorizontal.current === false) return;
    if (swiped) {
      if (offsetX > -SWIPE_THRESHOLD) { setOffsetX(0); setSwiped(false); } else setOffsetX(-ACTION_WIDTH);
    } else {
      if (offsetX < -SWIPE_THRESHOLD) { setOffsetX(-ACTION_WIDTH); setSwiped(true); } else setOffsetX(0);
    }
  }
  function closeSwipe() { setOffsetX(0); setSwiped(false); }

  return (
    <div className="relative overflow-hidden rounded-lg">
      {(offsetX !== 0 || swiped) && (
        <div className="absolute right-0 top-0 bottom-0 flex items-stretch" style={{ width: ACTION_WIDTH }}>
          <button
            onClick={() => { closeSwipe(); setDeleteOpen(true); }}
            className="flex-1 flex items-center justify-center bg-rose-800 text-white text-xs font-medium"
          >
            Delete
          </button>
        </div>
      )}
      <div
        className="relative bg-card flex items-center gap-3 px-3 py-2.5 transition-transform duration-150 ease-out"
        style={{ transform: `translateX(${offsetX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => { if (swiped) closeSwipe(); }}
        onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY }); }}
      >
        <button
          onClick={(e) => { if (swiped) { e.stopPropagation(); return; } onCheck(); }}
          className={`shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
            !due ? 'bg-primary border-primary' : 'border-secondary hover:border-primary'
          }`}
        >
          {!due && (
            <svg className="w-3.5 h-3.5 text-on-primary" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          )}
        </button>
        <div className="flex-1 min-w-0">
          <span className={`text-sm ${!due ? 'line-through text-muted' : 'text-body'}`}>{todo.title}</span>
          {todo.recurrence && (
            <span className="ml-2 text-[10px] text-muted bg-hover px-1.5 py-0.5 rounded-full">
              {formatRecurrence(todo.recurrence)}
            </span>
          )}
        </div>
      </div>

      {contextMenu && (
        <div className="fixed z-50 bg-card rounded-lg shadow-lg border border-border py-1 min-w-[140px]" style={{ top: contextMenu.y, left: contextMenu.x }}>
          <button onClick={() => { closeContextMenu(); setDeleteOpen(true); }} className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-hover flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
            Delete
          </button>
        </div>
      )}

      <ConfirmDialog
        open={deleteOpen}
        title="Delete To-Do"
        message={`Delete "${todo.title}"?${todo.recurrence ? ' This will also remove the recurring schedule.' : ''}`}
        onConfirm={() => { onDelete(); setDeleteOpen(false); }}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}

export default function HomeSection({ data, setData, onGoToNotes }: Props) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [recType, setRecType] = useState<'once' | 'yearly' | 'monthly'>('once');
  const [recMonth, setRecMonth] = useState(1);
  const [recDay, setRecDay] = useState(1);
  const [showArchived, setShowArchived] = useState(false);

  const dueTodos = data.todos.filter(t => isDue(t));
  const archivedTodos = data.todos.filter(t => !isDue(t));

  async function handleAdd() {
    if (!user || !newTitle.trim()) return;
    const recurrence = recType === 'once' ? null : {
      type: recType,
      ...(recType === 'yearly' ? { month: recMonth, day: recDay } : { day: recDay }),
    };
    const payload = { title: newTitle.trim(), recurrence, completed: false, createdAt: serverTimestamp() };
    try {
      const id = await saveItem(user.uid, 'todos', payload);
      const newTodo = { id: id!, title: newTitle.trim(), recurrence, completed: false, createdAt: { seconds: Date.now() / 1000 } };
      setData(prev => ({ ...prev, todos: [newTodo, ...prev.todos] }));
      setNewTitle('');
      setShowAdd(false);
      setRecType('once');
      showToast('To-do added!');
    } catch (err) {
      showToast('Error: ' + (err as Error).message, true);
    }
  }

  async function handleCheck(todo: TodoItem) {
    if (!user) return;
    const nowCompleted = isDue(todo);
    const updates = nowCompleted
      ? { completed: true, completedAt: serverTimestamp() }
      : { completed: false, completedAt: null };
    try {
      await saveItem(user.uid, 'todos', updates, todo.id);
      setData(prev => ({
        ...prev,
        todos: prev.todos.map(t =>
          t.id === todo.id
            ? { ...t, completed: nowCompleted, completedAt: nowCompleted ? { seconds: Date.now() / 1000 } : undefined }
            : t
        ),
      }));
    } catch (err) {
      showToast('Error: ' + (err as Error).message, true);
    }
  }

  async function handleDelete(id: string) {
    if (!user) return;
    try {
      await deleteItem(user.uid, 'todos', id);
      setData(prev => ({ ...prev, todos: prev.todos.filter(t => t.id !== id) }));
      showToast('Deleted.');
    } catch (err) {
      showToast('Error: ' + (err as Error).message, true);
    }
  }

  async function handleRestore(todo: TodoItem) {
    if (!user) return;
    try {
      await saveItem(user.uid, 'todos', { completed: false, completedAt: null }, todo.id);
      setData(prev => ({
        ...prev,
        todos: prev.todos.map(t => t.id === todo.id ? { ...t, completed: false, completedAt: undefined } : t),
      }));
      showToast('Restored!');
    } catch (err) {
      showToast('Error: ' + (err as Error).message, true);
    }
  }

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div className="space-y-4">
      {/* Quick actions */}
      <div className="flex gap-2">
        <button
          onClick={onGoToNotes}
          className="flex-1 bg-card border border-border rounded-xl px-4 py-3 text-sm font-medium text-secondary hover:bg-hover transition-colors flex items-center gap-2 justify-center"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
          Add Note
        </button>
        <button
          onClick={() => setShowAdd(true)}
          className="flex-1 bg-primary text-on-primary rounded-xl px-4 py-3 text-sm font-medium hover:bg-primary-hover transition-colors flex items-center gap-2 justify-center"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add To-Do
        </button>
      </div>

      {/* Add todo form */}
      {showAdd && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <input
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="What needs to be done?"
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-focus"
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
          />
          <div className="flex items-center gap-2">
            <label className="text-xs text-secondary">Repeat:</label>
            <select value={recType} onChange={e => setRecType(e.target.value as 'once' | 'yearly' | 'monthly')} className="rounded-lg border border-border px-2 py-1 text-xs">
              <option value="once">One-time</option>
              <option value="yearly">Yearly</option>
              <option value="monthly">Monthly</option>
            </select>
            {recType === 'yearly' && (
              <>
                <select value={recMonth} onChange={e => setRecMonth(+e.target.value)} className="rounded-lg border border-border px-2 py-1 text-xs">
                  {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
                <input type="number" min={1} max={31} value={recDay} onChange={e => setRecDay(+e.target.value)} className="w-14 rounded-lg border border-border px-2 py-1 text-xs" />
              </>
            )}
            {recType === 'monthly' && (
              <input type="number" min={1} max={31} value={recDay} onChange={e => setRecDay(+e.target.value)} className="w-14 rounded-lg border border-border px-2 py-1 text-xs" placeholder="Day" />
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => { setShowAdd(false); setNewTitle(''); setRecType('once'); }} className="px-3 py-1.5 text-xs text-secondary">Cancel</button>
            <button onClick={handleAdd} className="px-3 py-1.5 text-xs bg-primary text-on-primary rounded-lg hover:bg-primary-hover transition-colors">Add</button>
          </div>
        </div>
      )}

      {/* Active todos */}
      <div>
        <h3 className="text-xs font-semibold text-heading uppercase tracking-wider mb-2">To-Do</h3>
        {dueTodos.length === 0 ? (
          <p className="text-secondary text-sm text-center py-4">All caught up!</p>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
            {dueTodos.map(t => (
              <TodoItemRow key={t.id} todo={t} onCheck={() => handleCheck(t)} onDelete={() => handleDelete(t.id)} />
            ))}
          </div>
        )}
      </div>

      {/* Archived/completed */}
      {archivedTodos.length > 0 && (
        <div>
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="flex items-center gap-1 text-xs font-semibold text-muted uppercase tracking-wider mb-2"
          >
            <svg className={`w-3 h-3 transition-transform ${showArchived ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
            Completed ({archivedTodos.length})
          </button>
          {showArchived && (
            <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
              {archivedTodos.map(t => (
                <div key={t.id} className="flex items-center gap-3 px-3 py-2.5 bg-card">
                  <span className="flex-1 text-sm line-through text-muted">{t.title}</span>
                  <button
                    onClick={() => handleRestore(t)}
                    className="text-xs text-primary hover:text-primary-hover transition-colors"
                  >
                    Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
