import { useState } from 'react';
import type { TripSection, TripList } from '../../types';
import { useAuth } from '../../../shared/AuthContext';
import { addItem, deleteItem, toggleItem, renameItem, deleteSection, renameSection, updateSectionRank, reorderItems } from '../../services/tripLists';
import PackingItem from './PackingItem';
import InlineAdd from '../ui/InlineAdd';
import ConfirmDialog from '../ui/ConfirmDialog';

interface Props {
  section: TripSection;
  trip: TripList;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  reorderMode?: boolean;
}

export default function PackingSection({ section, trip, onMoveUp, onMoveDown, isFirst, isLast, reorderMode }: Props) {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(section.name);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingRank, setEditingRank] = useState(false);
  const [itemReorder, setItemReorder] = useState(false);

  const checkedCount = section.items.filter((i) => i.checked).length;

  function handleRename() {
    if (!user || !editName.trim()) return;
    renameSection(user.uid, trip.id, trip, section.id, editName.trim());
    setEditing(false);
  }

  function moveItem(fromIndex: number, toIndex: number) {
    if (!user || toIndex < 0 || toIndex >= section.items.length) return;
    reorderItems(user.uid, trip.id, trip, section.id, fromIndex, toIndex);
  }

  return (
    <div className="bg-card rounded-xl border border-section-border overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-section-header border-b border-section-border">
        {reorderMode ? (
          <div className="flex flex-col gap-0.5 shrink-0">
            <button onClick={onMoveUp} disabled={isFirst} className="text-icon disabled:opacity-20 hover:text-primary p-0.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
              </svg>
            </button>
            <button onClick={onMoveDown} disabled={isLast} className="text-icon disabled:opacity-20 hover:text-primary p-0.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
          </div>
        ) : (
          <button onClick={() => setCollapsed(!collapsed)} className="shrink-0 text-icon">
            <svg
              className={`w-4 h-4 transition-transform ${collapsed ? '' : 'rotate-90'}`}
              fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        )}
        {editing ? (
          <form onSubmit={(e) => { e.preventDefault(); handleRename(); }} className="flex-1 flex gap-2">
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="flex-1 text-base font-bold rounded border border-section-border px-2 py-1 focus:outline-none focus:ring-2 focus:ring-focus"
              autoFocus
              onBlur={handleRename}
            />
          </form>
        ) : (
          <button
            onClick={() => { setEditing(true); setEditName(section.name); }}
            className="flex-1 text-left text-base font-bold text-heading"
          >
            {section.name}
          </button>
        )}
        {editingRank ? (
          <select
            value={section.rank ?? ''}
            onChange={(e) => {
              const val = e.target.value;
              if (user) updateSectionRank(user.uid, trip.id, trip, section.id, val === '' ? null : Number(val));
              setEditingRank(false);
            }}
            onBlur={() => setEditingRank(false)}
            autoFocus
            className="w-12 text-xs rounded border border-section-border px-1 py-0.5 focus:outline-none focus:ring-2 focus:ring-focus"
          >
            <option value="">—</option>
            {[1,2,3,4,5,6,7,8,9,10].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        ) : (
          <button
            onClick={() => setEditingRank(true)}
            className="shrink-0 text-[11px] text-muted hover:text-primary tabular-nums"
            title={section.rank != null ? `Rank ${section.rank}` : 'Set rank'}
          >
            {section.rank != null ? section.rank : '·'}
          </button>
        )}
        <span className="text-[11px] text-muted tabular-nums">
          {checkedCount}/{section.items.length}
        </span>
        {!reorderMode && section.items.length > 1 && (
          <button
            onClick={() => setItemReorder(!itemReorder)}
            className={`shrink-0 p-1 ${itemReorder ? 'text-primary' : 'text-muted hover:text-primary'}`}
            title="Reorder items"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
        )}
        <button
          onClick={() => setDeleteOpen(true)}
          className="shrink-0 text-muted hover:text-rose-400 p-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
          </svg>
        </button>
      </div>
      {!collapsed && (
        <div className="px-4 py-2">
          {section.items.map((item, index) => (
            <div key={item.id} className="flex items-center gap-1">
              {itemReorder && (
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button onClick={() => moveItem(index, index - 1)} disabled={index === 0} className="text-muted disabled:opacity-20 hover:text-primary p-0.5">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
                    </svg>
                  </button>
                  <button onClick={() => moveItem(index, index + 1)} disabled={index === section.items.length - 1} className="text-muted disabled:opacity-20 hover:text-primary p-0.5">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>
                </div>
              )}
              <div className="flex-1">
                <PackingItem
                  item={item}
                  onToggle={() => user && toggleItem(user.uid, trip.id, trip, section.id, item.id)}
                  onDelete={() => user && deleteItem(user.uid, trip.id, trip, section.id, item.id)}
                  onRename={(name) => user && renameItem(user.uid, trip.id, trip, section.id, item.id, name)}
                />
              </div>
            </div>
          ))}
          <div className="mt-2">
            <InlineAdd
              placeholder="Add item..."
              onAdd={(name) => user && addItem(user.uid, trip.id, trip, section.id, name)}
            />
          </div>
        </div>
      )}
      <ConfirmDialog
        open={deleteOpen}
        title="Delete Section"
        message={`Delete "${section.name}" and all its items?`}
        onConfirm={() => { user && deleteSection(user.uid, trip.id, trip, section.id); setDeleteOpen(false); }}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}
