import { useState } from 'react';
import type { Provider, HealthData } from '../types';
import { MED_COLUMNS } from '../types';
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

export default function ProvidersSection({ data, setData }: Props) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [editItem, setEditItem] = useState<Provider | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Provider | null>(null);

  async function handleSave(prov: Omit<Provider, 'id' | 'updatedAt'>, id?: string) {
    if (!user) return;
    try {
      const payload = { ...prov, updatedAt: serverTimestamp() };
      const newId = await saveItem(user.uid, 'providers', payload, id);
      if (id) {
        setData(prev => ({ ...prev, providers: prev.providers.map(p => p.id === id ? { ...p, ...prov } : p) }));
        showToast('Provider updated!');
      } else {
        setData(prev => ({
          ...prev,
          providers: [...prev.providers, { id: newId!, ...prov } as Provider].sort((a, b) => a.name.localeCompare(b.name)),
        }));
        showToast('Provider added!');
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
      await deleteItem(user.uid, 'providers', deleteTarget.id);
      setData(prev => ({ ...prev, providers: prev.providers.filter(p => p.id !== deleteTarget.id) }));
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

      {data.providers.length === 0 ? (
        <p className="text-secondary text-sm text-center py-8">No providers added yet.</p>
      ) : (
        <div className="space-y-3">
          {data.providers.map(p => (
            <ItemCard key={p.id} onEdit={() => { setEditItem(p); setShowModal(true); }} onDelete={() => setDeleteTarget(p)}>
              <div className="font-semibold text-heading">{p.name}</div>
              <div className="text-sm text-secondary"><strong>Role:</strong> {p.role || '\u2014'}</div>
              {p.practice && <div className="text-sm text-secondary"><strong>Practice:</strong> {p.practice}</div>}
              {p.phone && <div className="text-sm text-secondary"><strong>Phone:</strong> {p.phone}</div>}
              {p.notes && <div className="text-sm text-secondary"><strong>Notes:</strong> {p.notes}</div>}
              <div className="flex flex-wrap gap-1 mt-2">
                {(p.concernTags || []).map(t => (
                  <span key={t} className="px-2 py-0.5 rounded-full text-xs bg-hover text-secondary">{t}</span>
                ))}
              </div>
            </ItemCard>
          ))}
        </div>
      )}

      {showModal && (
        <ProviderModal existing={editItem} explainers={data.explainers} onSave={handleSave} onClose={() => { setShowModal(false); setEditItem(null); }} />
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

function ProviderModal({ existing, explainers, onSave, onClose }: {
  existing: Provider | null;
  explainers: HealthData['explainers'];
  onSave: (data: Omit<Provider, 'id' | 'updatedAt'>, id?: string) => void;
  onClose: () => void;
}) {
  const optionalCols = MED_COLUMNS.filter(c => !c.alwaysShow);
  const e = existing;
  const [name, setName] = useState(e?.name || '');
  const [role, setRole] = useState(e?.role || '');
  const [practice, setPractice] = useState(e?.practice || '');
  const [address, setAddress] = useState(e?.address || '');
  const [phone, setPhone] = useState(e?.phone || '');
  const [fax, setFax] = useState(e?.fax || '');
  const [executiveSummary, setExecutiveSummary] = useState(e?.executiveSummary || '');
  const [visitNotes, setVisitNotes] = useState(e?.visitNotes || '');
  const [notes, setNotes] = useState(e?.notes || '');
  const [concernTags, setConcernTags] = useState<string[]>(e?.concernTags || []);
  const [defaultColumns, setDefaultColumns] = useState<string[]>(
    e?.defaultColumns || optionalCols.map(c => c.key)
  );
  const [defaultExplainers, setDefaultExplainers] = useState<string[]>(e?.defaultExplainers || []);

  function handleSubmit() {
    if (!name.trim()) return;
    onSave({
      name: name.trim(), role, practice, address, phone, fax,
      executiveSummary, visitNotes, notes, concernTags,
      defaultColumns, defaultExplainers,
    }, existing?.id);
  }

  const inputCls = "w-full rounded-lg border border-border px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-focus";

  return (
    <div className="fixed inset-0 bg-black/40 z-40 flex items-start justify-center pt-8 px-4 overflow-y-auto" onClick={ev => { if (ev.target === ev.currentTarget) onClose(); }}>
      <div className="bg-card border border-border rounded-xl w-full max-w-lg p-5 mb-8">
        <h2 className="text-lg font-semibold text-heading mb-4">{existing ? 'Edit Provider' : 'Add Provider'}</h2>

        <label className="block text-xs font-medium text-secondary mb-1">Provider Name *</label>
        <input value={name} onChange={ev => setName(ev.target.value)} className={inputCls} />

        <label className="block text-xs font-medium text-secondary mb-1">Role / Specialty</label>
        <input value={role} onChange={ev => setRole(ev.target.value)} className={inputCls} />

        <label className="block text-xs font-medium text-secondary mb-1">Practice Name</label>
        <input value={practice} onChange={ev => setPractice(ev.target.value)} className={inputCls} />

        <label className="block text-xs font-medium text-secondary mb-1">Address</label>
        <input value={address} onChange={ev => setAddress(ev.target.value)} className={inputCls} />

        <label className="block text-xs font-medium text-secondary mb-1">Phone</label>
        <input value={phone} onChange={ev => setPhone(ev.target.value)} className={inputCls} />

        <label className="block text-xs font-medium text-secondary mb-1">Fax</label>
        <input value={fax} onChange={ev => setFax(ev.target.value)} className={inputCls} />

        <label className="block text-xs font-medium text-secondary mb-1">Executive Summary</label>
        <textarea value={executiveSummary} onChange={ev => setExecutiveSummary(ev.target.value)} rows={4} className={inputCls} />

        <label className="block text-xs font-medium text-secondary mb-1">Visit Notes</label>
        <textarea value={visitNotes} onChange={ev => setVisitNotes(ev.target.value)} rows={3} className={inputCls} />

        <label className="block text-xs font-medium text-secondary mb-1">Notes</label>
        <textarea value={notes} onChange={ev => setNotes(ev.target.value)} rows={2} className={inputCls} />

        <label className="block text-xs font-medium text-secondary mb-1">Concern Tags</label>
        <div className="mb-3"><ConcernTagChips selected={concernTags} onChange={setConcernTags} /></div>

        <label className="block text-xs font-medium text-secondary mb-1">Default Medication Columns</label>
        <p className="text-xs text-muted mb-1">Name, dose, purpose always show. Select additional columns.</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {optionalCols.map(c => (
            <button
              key={c.key}
              type="button"
              onClick={() => setDefaultColumns(prev => prev.includes(c.key) ? prev.filter(k => k !== c.key) : [...prev, c.key])}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                defaultColumns.includes(c.key) ? 'bg-primary text-on-primary border-primary' : 'bg-card text-secondary border-border hover:bg-hover'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <label className="block text-xs font-medium text-secondary mb-1">Default Explainer Blocks</label>
        <div className="flex flex-wrap gap-2 mb-4">
          {explainers.map(exp => (
            <button
              key={exp.id}
              type="button"
              onClick={() => setDefaultExplainers(prev => prev.includes(exp.id) ? prev.filter(id => id !== exp.id) : [...prev, exp.id])}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                defaultExplainers.includes(exp.id) ? 'bg-primary text-on-primary border-primary' : 'bg-card text-secondary border-border hover:bg-hover'
              }`}
            >
              {exp.title}
            </button>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-secondary hover:text-body transition-colors">Cancel</button>
          <button onClick={handleSubmit} className="px-4 py-2 text-sm bg-primary text-on-primary rounded-lg hover:bg-primary-hover transition-colors">Save</button>
        </div>
      </div>
    </div>
  );
}
