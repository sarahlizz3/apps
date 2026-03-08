import { useState } from 'react';
import type { Medication, Provider } from '../types';
import ConcernTagChips from './ConcernTagChips';

interface Props {
  existing: Medication | null;
  providers: Provider[];
  onSave: (data: Omit<Medication, 'id' | 'updatedAt'>, id?: string) => void;
  onClose: () => void;
}

export default function MedicationModal({ existing, providers, onSave, onClose }: Props) {
  const e = existing;
  const [name, setName] = useState(e?.name || '');
  const [dose, setDose] = useState(e?.dose || '');
  const [purpose, setPurpose] = useState(e?.purpose || '');
  const [duration, setDuration] = useState<'ongoing' | 'temporary'>(e?.duration || 'ongoing');
  const [startDate, setStartDate] = useState(e?.startDate || '');
  const [dateApproximate, setDateApproximate] = useState(e?.dateApproximate || false);
  const [endDate, setEndDate] = useState(e?.endDate || '');
  const [weightConcern, setWeightConcern] = useState(e?.weightConcern || '');
  const [rlsConcern, setRlsConcern] = useState(e?.rlsConcern || '');
  const [notes, setNotes] = useState(e?.notes || '');
  const [concernTags, setConcernTags] = useState<string[]>(e?.concernTags || []);
  const [excludeProviders, setExcludeProviders] = useState<string[]>(e?.excludeProviders || []);

  function handleSubmit() {
    if (!name.trim()) return;
    let sd = startDate;
    let da = dateApproximate;
    if (!sd && !existing) {
      sd = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      da = true;
    }
    onSave({
      name: name.trim(), dose, purpose, duration,
      startDate: sd, dateApproximate: da, endDate,
      weightConcern, rlsConcern, notes,
      concernTags, excludeProviders,
    }, existing?.id);
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-40 flex items-start justify-center pt-8 px-4 overflow-y-auto" onClick={e2 => { if (e2.target === e2.currentTarget) onClose(); }}>
      <div className="bg-card border border-border rounded-xl w-full max-w-lg p-5 mb-8">
        <h2 className="text-lg font-semibold text-heading mb-4">{existing ? 'Edit Medication' : 'Add Medication'}</h2>

        <label className="block text-xs font-medium text-secondary mb-1">Medication Name *</label>
        <input value={name} onChange={e2 => setName(e2.target.value)} className="w-full rounded-lg border border-border px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-focus" placeholder="e.g., Vyvanse" />

        <label className="block text-xs font-medium text-secondary mb-1">Dose</label>
        <input value={dose} onChange={e2 => setDose(e2.target.value)} className="w-full rounded-lg border border-border px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-focus" placeholder="e.g., 40 mg daily" />

        <label className="block text-xs font-medium text-secondary mb-1">Purpose</label>
        <input value={purpose} onChange={e2 => setPurpose(e2.target.value)} className="w-full rounded-lg border border-border px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-focus" placeholder="e.g., ADHD" />

        <label className="block text-xs font-medium text-secondary mb-1">Duration</label>
        <select value={duration} onChange={e2 => setDuration(e2.target.value as 'ongoing' | 'temporary')} className="w-full rounded-lg border border-border px-3 py-2 text-sm mb-3">
          <option value="ongoing">Ongoing</option>
          <option value="temporary">Temporary</option>
        </select>

        <label className="block text-xs font-medium text-secondary mb-1">Start Date</label>
        <div className="flex gap-2 items-center mb-3">
          <input value={startDate} onChange={e2 => setStartDate(e2.target.value)} className="flex-1 rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-focus" placeholder="e.g., Nov 2024" />
          <label className="text-xs flex items-center gap-1 whitespace-nowrap">
            <input type="checkbox" checked={dateApproximate} onChange={e2 => setDateApproximate(e2.target.checked)} /> Approx
          </label>
        </div>

        <label className="block text-xs font-medium text-secondary mb-1">End Date</label>
        <input value={endDate} onChange={e2 => setEndDate(e2.target.value)} className="w-full rounded-lg border border-border px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-focus" placeholder="Leave blank if ongoing" />

        <label className="block text-xs font-medium text-secondary mb-1">Weight Concern</label>
        <input value={weightConcern} onChange={e2 => setWeightConcern(e2.target.value)} className="w-full rounded-lg border border-border px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-focus" />

        <label className="block text-xs font-medium text-secondary mb-1">RLS Concern</label>
        <input value={rlsConcern} onChange={e2 => setRlsConcern(e2.target.value)} className="w-full rounded-lg border border-border px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-focus" />

        <label className="block text-xs font-medium text-secondary mb-1">Notes</label>
        <textarea value={notes} onChange={e2 => setNotes(e2.target.value)} rows={2} className="w-full rounded-lg border border-border px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-focus" />

        <label className="block text-xs font-medium text-secondary mb-1">Concern Tags</label>
        <div className="mb-3">
          <ConcernTagChips selected={concernTags} onChange={setConcernTags} />
        </div>

        <label className="block text-xs font-medium text-secondary mb-1">Exclude from Providers</label>
        <p className="text-xs text-muted mb-1">Check providers to exclude this med from their printout.</p>
        <div className="mb-4">
          <ConcernTagChips selected={excludeProviders} onChange={setExcludeProviders} tags={providers.map(p => p.id)} />
          {/* Show provider names instead */}
          <div className="flex flex-wrap gap-2 mt-1">
            {providers.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setExcludeProviders(prev =>
                    prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id]
                  );
                }}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  excludeProviders.includes(p.id)
                    ? 'bg-primary text-on-primary border-primary'
                    : 'bg-card text-secondary border-border hover:bg-hover'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-secondary hover:text-body transition-colors">Cancel</button>
          <button onClick={handleSubmit} className="px-4 py-2 text-sm bg-primary text-on-primary rounded-lg hover:bg-primary-hover transition-colors">Save</button>
        </div>
      </div>
    </div>
  );
}
