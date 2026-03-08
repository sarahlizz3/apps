import { useState } from 'react';
import type { Diagnosis, HealthData } from '../types';
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

const STATUSES = ['Diagnosed', 'Suspected', 'Resolved', 'Monitoring'] as const;

export default function DiagnosesSection({ data, setData }: Props) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [editItem, setEditItem] = useState<Diagnosis | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Diagnosis | null>(null);

  async function handleSave(diag: Omit<Diagnosis, 'id' | 'updatedAt'>, id?: string) {
    if (!user) return;
    try {
      const payload = { ...diag, updatedAt: serverTimestamp() };
      const newId = await saveItem(user.uid, 'diagnoses', payload, id);
      if (id) {
        setData(prev => ({
          ...prev,
          diagnoses: prev.diagnoses.map(d => d.id === id ? { ...d, ...diag } : d),
        }));
        showToast('Diagnosis updated!');
      } else {
        setData(prev => ({
          ...prev,
          diagnoses: [...prev.diagnoses, { id: newId!, ...diag } as Diagnosis].sort((a, b) => a.name.localeCompare(b.name)),
        }));
        showToast('Diagnosis added!');
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
      await deleteItem(user.uid, 'diagnoses', deleteTarget.id);
      setData(prev => ({ ...prev, diagnoses: prev.diagnoses.filter(d => d.id !== deleteTarget.id) }));
      showToast('Deleted successfully.');
    } catch (err) {
      showToast('Error deleting: ' + (err as Error).message, true);
    }
    setDeleteTarget(null);
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => { setEditItem(null); setShowModal(true); }}
          className="bg-primary text-on-primary px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-primary-hover transition-colors"
        >
          + Add
        </button>
      </div>

      {data.diagnoses.length === 0 ? (
        <p className="text-secondary text-sm text-center py-8">No diagnoses added yet.</p>
      ) : (
        <div className="space-y-3">
          {data.diagnoses.map(d => (
            <ItemCard key={d.id} onEdit={() => { setEditItem(d); setShowModal(true); }} onDelete={() => setDeleteTarget(d)}>
              <div className="font-semibold text-heading">{d.name}</div>
              <div className="text-sm text-secondary"><strong>Status:</strong> {d.status || '\u2014'}</div>
              <div className="text-sm text-secondary"><strong>Diagnosed:</strong> {d.diagnosedDate || '\u2014'}</div>
              {d.notes && <div className="text-sm text-secondary"><strong>Notes:</strong> {d.notes}</div>}
              <div className="flex flex-wrap gap-1 mt-2">
                {(d.concernTags || []).map(t => (
                  <span key={t} className="px-2 py-0.5 rounded-full text-xs bg-hover text-secondary">{t}</span>
                ))}
              </div>
            </ItemCard>
          ))}
        </div>
      )}

      {showModal && (
        <DiagnosisModal existing={editItem} onSave={handleSave} onClose={() => { setShowModal(false); setEditItem(null); }} />
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function DiagnosisModal({ existing, onSave, onClose }: {
  existing: Diagnosis | null;
  onSave: (data: Omit<Diagnosis, 'id' | 'updatedAt'>, id?: string) => void;
  onClose: () => void;
}) {
  const e = existing;
  const [name, setName] = useState(e?.name || '');
  const [status, setStatus] = useState<Diagnosis['status']>(e?.status || 'Diagnosed');
  const [diagnosedDate, setDiagnosedDate] = useState(e?.diagnosedDate || '');
  const [notes, setNotes] = useState(e?.notes || '');
  const [concernTags, setConcernTags] = useState<string[]>(e?.concernTags || []);

  function handleSubmit() {
    if (!name.trim()) return;
    onSave({ name: name.trim(), status, diagnosedDate, notes, concernTags }, existing?.id);
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-40 flex items-start justify-center pt-8 px-4 overflow-y-auto" onClick={ev => { if (ev.target === ev.currentTarget) onClose(); }}>
      <div className="bg-card border border-border rounded-xl w-full max-w-lg p-5 mb-8">
        <h2 className="text-lg font-semibold text-heading mb-4">{existing ? 'Edit Diagnosis' : 'Add Diagnosis'}</h2>

        <label className="block text-xs font-medium text-secondary mb-1">Diagnosis Name *</label>
        <input value={name} onChange={ev => setName(ev.target.value)} className="w-full rounded-lg border border-border px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-focus" />

        <label className="block text-xs font-medium text-secondary mb-1">Status</label>
        <select value={status} onChange={ev => setStatus(ev.target.value as Diagnosis['status'])} className="w-full rounded-lg border border-border px-3 py-2 text-sm mb-3">
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <label className="block text-xs font-medium text-secondary mb-1">Diagnosed Date</label>
        <input value={diagnosedDate} onChange={ev => setDiagnosedDate(ev.target.value)} className="w-full rounded-lg border border-border px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-focus" placeholder="e.g., 2020" />

        <label className="block text-xs font-medium text-secondary mb-1">Notes</label>
        <textarea value={notes} onChange={ev => setNotes(ev.target.value)} rows={3} className="w-full rounded-lg border border-border px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-focus" />

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
