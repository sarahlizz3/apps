import { useState } from 'react';
import type { Medication, HealthData } from '../types';
import ItemCard from './ItemCard';
import MedicationModal from './MedicationModal';
import ConfirmDialog from './ConfirmDialog';
import { useToast } from './Toast';
import { useAuth } from '../../shared/AuthContext';
import { saveItem, deleteItem, serverTimestamp } from '../services';

interface Props {
  data: HealthData;
  setData: React.Dispatch<React.SetStateAction<HealthData>>;
}

export default function MedicationsSection({ data, setData }: Props) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [filter, setFilter] = useState<'all' | 'ongoing' | 'temporary'>('all');
  const [editItem, setEditItem] = useState<Medication | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Medication | null>(null);

  const meds = filter === 'all'
    ? data.medications
    : data.medications.filter(m => m.duration === filter);

  async function handleSave(med: Omit<Medication, 'id' | 'updatedAt'>, id?: string) {
    if (!user) return;
    try {
      const payload = { ...med, updatedAt: serverTimestamp() };
      const newId = await saveItem(user.uid, 'medications', payload, id);
      if (id) {
        setData(prev => ({
          ...prev,
          medications: prev.medications.map(m => m.id === id ? { ...m, ...med } : m),
        }));
        showToast('Medication updated!');
      } else {
        setData(prev => ({
          ...prev,
          medications: [...prev.medications, { id: newId!, ...med } as Medication].sort((a, b) => a.name.localeCompare(b.name)),
        }));
        showToast('Medication added!');
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
      await deleteItem(user.uid, 'medications', deleteTarget.id);
      setData(prev => ({
        ...prev,
        medications: prev.medications.filter(m => m.id !== deleteTarget.id),
      }));
      showToast('Deleted successfully.');
    } catch (err) {
      showToast('Error deleting: ' + (err as Error).message, true);
    }
    setDeleteTarget(null);
  }

  const filters = ['all', 'ongoing', 'temporary'] as const;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {filters.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filter === f
                  ? 'bg-primary text-on-primary'
                  : 'bg-card text-secondary border border-border hover:bg-hover'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
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

      {meds.length === 0 ? (
        <p className="text-secondary text-sm text-center py-8">No medications added yet.</p>
      ) : (
        <div className="space-y-3">
          {meds.map(m => (
            <ItemCard
              key={m.id}
              onEdit={() => { setEditItem(m); setShowModal(true); }}
              onDelete={() => setDeleteTarget(m)}
            >
              <div className="font-semibold text-heading">{m.name}</div>
              <div className="text-sm text-secondary"><strong>Dose:</strong> {m.dose || '\u2014'}</div>
              <div className="text-sm text-secondary"><strong>For:</strong> {m.purpose || '\u2014'}</div>
              <div className="text-sm text-secondary">
                <strong>Started:</strong> {m.dateApproximate ? '~' : ''}{m.startDate || '\u2014'}
                {m.endDate ? ` \u2192 ${m.endDate}` : ''}
              </div>
              {m.weightConcern && <div className="text-sm text-secondary"><strong>Weight:</strong> {m.weightConcern}</div>}
              {m.rlsConcern && <div className="text-sm text-secondary"><strong>RLS:</strong> {m.rlsConcern}</div>}
              {m.notes && <div className="text-sm text-secondary"><strong>Notes:</strong> {m.notes}</div>}
              <div className="flex flex-wrap gap-1 mt-2">
                <span className={`px-2 py-0.5 rounded-full text-xs ${m.duration === 'ongoing' ? 'bg-primary/10 text-primary' : 'bg-reminder text-reminder-text'}`}>
                  {m.duration}
                </span>
                {(m.concernTags || []).map(t => (
                  <span key={t} className="px-2 py-0.5 rounded-full text-xs bg-hover text-secondary">{t}</span>
                ))}
              </div>
            </ItemCard>
          ))}
        </div>
      )}

      {showModal && (
        <MedicationModal
          existing={editItem}
          providers={data.providers}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditItem(null); }}
        />
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
