import { useState } from 'react';
import type { Explainer, HealthData } from '../types';
import ItemCard from './ItemCard';
import ConfirmDialog from './ConfirmDialog';
import ConcernTagChips from './ConcernTagChips';
import { useToast } from './Toast';
import { useAuth } from '../../shared/AuthContext';
import { saveItem, deleteItem, serverTimestamp } from '../services';

interface Props {
  data: HealthData;
  setData: React.Dispatch<React.SetStateAction<HealthData>>;
}

export default function ExplainersSection({ data, setData }: Props) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [filter, setFilter] = useState<'all' | 'long' | 'short'>('all');
  const [editItem, setEditItem] = useState<Explainer | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Explainer | null>(null);

  const items = filter === 'all'
    ? data.explainers
    : data.explainers.filter(e => e.type === filter);

  async function handleSave(exp: Omit<Explainer, 'id' | 'updatedAt'>, id?: string) {
    if (!user) return;
    try {
      const payload = { ...exp, updatedAt: serverTimestamp() };
      const newId = await saveItem(user.uid, 'explainers', payload, id);
      if (id) {
        setData(prev => ({ ...prev, explainers: prev.explainers.map(e => e.id === id ? { ...e, ...exp } : e) }));
        showToast('Explainer updated!');
      } else {
        setData(prev => ({
          ...prev,
          explainers: [...prev.explainers, { id: newId!, ...exp } as Explainer].sort((a, b) => a.title.localeCompare(b.title)),
        }));
        showToast('Explainer added!');
      }
      setShowModal(false);
      setEditItem(null);
    } catch (err) {
      showToast('Error saving: ' + (err as Error).message, true);
    }
  }

  async function handleDelete() {
    if (!user || !deleteTarget) return;
    try {
      await deleteItem(user.uid, 'explainers', deleteTarget.id);
      setData(prev => ({ ...prev, explainers: prev.explainers.filter(e => e.id !== deleteTarget.id) }));
      showToast('Deleted successfully.');
    } catch (err) {
      showToast('Error deleting: ' + (err as Error).message, true);
    }
    setDeleteTarget(null);
  }

  const filters = ['all', 'long', 'short'] as const;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {filters.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filter === f ? 'bg-primary text-on-primary' : 'bg-card text-secondary border border-border hover:bg-hover'
              }`}
            >
              {f === 'all' ? 'All' : f === 'long' ? 'Narrative' : 'Summary'}
            </button>
          ))}
        </div>
        <button
          onClick={() => { setEditItem(null); setShowModal(true); }}
          className="bg-primary text-on-primary px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-primary-hover transition-colors"
        >
          + Add
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-secondary text-sm text-center py-8">No explainer blocks added yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map(e => (
            <ItemCard key={e.id} onEdit={() => { setEditItem(e); setShowModal(true); }} onDelete={() => setDeleteTarget(e)}>
              <div className="font-semibold text-heading">{e.title}</div>
              <div className="text-sm text-secondary line-clamp-3">{e.content}</div>
              <div className="flex flex-wrap gap-1 mt-2">
                <span className={`px-2 py-0.5 rounded-full text-xs ${e.type === 'long' ? 'bg-primary/10 text-primary' : 'bg-reminder text-reminder-text'}`}>
                  {e.type === 'long' ? 'Narrative' : 'Summary'}
                </span>
                {(e.concernTags || []).map(t => (
                  <span key={t} className="px-2 py-0.5 rounded-full text-xs bg-hover text-secondary">{t}</span>
                ))}
              </div>
            </ItemCard>
          ))}
        </div>
      )}

      {showModal && (
        <ExplainerModal existing={editItem} onSave={handleSave} onClose={() => { setShowModal(false); setEditItem(null); }} />
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function ExplainerModal({ existing, onSave, onClose }: {
  existing: Explainer | null;
  onSave: (data: Omit<Explainer, 'id' | 'updatedAt'>, id?: string) => void;
  onClose: () => void;
}) {
  const e = existing;
  const [title, setTitle] = useState(e?.title || '');
  const [type, setType] = useState<'long' | 'short'>(e?.type || 'long');
  const [content, setContent] = useState(e?.content || '');
  const [concernTags, setConcernTags] = useState<string[]>(e?.concernTags || []);

  function handleSubmit() {
    if (!title.trim() || !content.trim()) return;
    onSave({ title: title.trim(), type, content: content.trim(), concernTags }, existing?.id);
  }

  const inputCls = "w-full rounded-lg border border-border px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-focus";

  return (
    <div className="fixed inset-0 bg-black/40 z-40 flex items-start justify-center pt-8 px-4 overflow-y-auto" onClick={ev => { if (ev.target === ev.currentTarget) onClose(); }}>
      <div className="bg-card border border-border rounded-xl w-full max-w-lg p-5 mb-8">
        <h2 className="text-lg font-semibold text-heading mb-4">{existing ? 'Edit Explainer' : 'Add Explainer'}</h2>

        <label className="block text-xs font-medium text-secondary mb-1">Title *</label>
        <input value={title} onChange={ev => setTitle(ev.target.value)} className={inputCls} />

        <label className="block text-xs font-medium text-secondary mb-1">Type</label>
        <select value={type} onChange={ev => setType(ev.target.value as 'long' | 'short')} className={inputCls}>
          <option value="long">Long / Narrative</option>
          <option value="short">Short / Summary</option>
        </select>

        <label className="block text-xs font-medium text-secondary mb-1">Content *</label>
        <textarea value={content} onChange={ev => setContent(ev.target.value)} rows={8} className={inputCls} />

        <label className="block text-xs font-medium text-secondary mb-1">Concern Tags</label>
        <div className="mb-4"><ConcernTagChips selected={concernTags} onChange={setConcernTags} /></div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-secondary hover:text-body transition-colors">Cancel</button>
          <button onClick={handleSubmit} className="px-4 py-2 text-sm bg-primary text-on-primary rounded-lg hover:bg-primary-hover transition-colors">Save</button>
        </div>
      </div>
    </div>
  );
}
