import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../shared/AuthContext';
import { useTripList } from '../../hooks/useTripList';
import { useTemplateSections } from '../../hooks/useTemplateSections';
import { useReminderTemplates } from '../../hooks/useReminderTemplates';
import {
  addSection,
  updateTripName,
  archiveTripList,
  deleteTripList,
  importSectionsIntoTrip,
  importRemindersIntoTrip,
} from '../../services/tripLists';
import PackingSection from './PackingSection';
import ReminderSection from './ReminderSection';
import InlineAdd from '../ui/InlineAdd';
import ConfirmDialog from '../ui/ConfirmDialog';
import ImportDialog from './ImportDialog';
import { sortSections } from '../../utils/sortSections';

export default function TripDetailPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const { user } = useAuth();
  const { trip, loading } = useTripList(tripId);
  const { sections: templateSections } = useTemplateSections();
  const { reminders: reminderTemplates } = useReminderTemplates();
  const navigate = useNavigate();

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [importSectionsOpen, setImportSectionsOpen] = useState(false);
  const [importRemindersOpen, setImportRemindersOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="p-4 text-center">
        <p className="text-secondary mb-4">Trip not found.</p>
        <Link to="/" className="text-primary hover:underline">Back to trips</Link>
      </div>
    );
  }

  function handleSaveName() {
    if (!user || !trip || !nameValue.trim()) return;
    updateTripName(user.uid, trip.id, nameValue.trim());
    setEditingName(false);
  }

  async function handleDelete() {
    if (!user || !trip) return;
    await deleteTripList(user.uid, trip.id);
    navigate('/');
  }

  function handleImportSections(ids: string[]) {
    if (!user || !trip || ids.length === 0) return;
    const selected = templateSections.filter((s) => ids.includes(s.id));
    importSectionsIntoTrip(
      user.uid,
      trip.id,
      trip,
      selected.map((s) => ({ name: s.name, items: s.items, ...(s.rank != null ? { rank: s.rank } : {}) })),
    );
    setImportSectionsOpen(false);
  }

  function handleImportReminders(ids: string[]) {
    if (!user || !trip || ids.length === 0) return;
    const selected = reminderTemplates.filter((r) => ids.includes(r.id));
    importRemindersIntoTrip(
      user.uid,
      trip.id,
      trip,
      selected.map((r) => r.text),
    );
    setImportRemindersOpen(false);
  }

  const remaining = trip.totalItemCount - trip.checkedItemCount;

  return (
    <div className="p-4 max-w-lg mx-auto pb-8">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <Link to="/" className="shrink-0 text-secondary hover:text-body -ml-1 p-1">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </Link>
        {editingName ? (
          <form onSubmit={(e) => { e.preventDefault(); handleSaveName(); }} className="flex-1 flex gap-2">
            <input
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              className="flex-1 text-xl font-bold rounded border border-border px-2 py-1 focus:outline-none focus:ring-2 focus:ring-focus"
              autoFocus
              onBlur={handleSaveName}
            />
          </form>
        ) : (
          <h2
            onClick={() => { setEditingName(true); setNameValue(trip.name); }}
            className="flex-1 text-xl font-bold cursor-pointer hover:text-primary"
          >
            {trip.name}
          </h2>
        )}
      </div>

      <div className="flex items-center gap-3 mb-4 text-sm text-secondary">
        <span>
          {trip.totalItemCount === 0
            ? 'No items yet'
            : remaining === 0
              ? 'All packed!'
              : `${remaining} of ${trip.totalItemCount} remaining`}
        </span>
        <span className="text-muted">|</span>
        <button
          onClick={() => user && archiveTripList(user.uid, trip.id, !trip.archived)}
          className="text-secondary hover:text-primary"
        >
          {trip.archived ? 'Unarchive' : 'Archive'}
        </button>
        <button
          onClick={() => setDeleteOpen(true)}
          className="text-secondary hover:text-rose-700"
        >
          Delete
        </button>
      </div>

      {/* Reminders */}
      <div className="mb-4">
        <ReminderSection trip={trip} />
        {reminderTemplates.length > 0 && (
          <button
            onClick={() => setImportRemindersOpen(true)}
            className="mt-2 text-xs text-reminder-text hover:text-reminder-body font-medium"
          >
            + Import reminder templates
          </button>
        )}
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {sortSections(trip.sections).map((section) => (
          <PackingSection key={section.id} section={section} trip={trip} />
        ))}
      </div>

      {/* Add section / Import */}
      <div className="mt-4 space-y-2">
        <InlineAdd
          placeholder="Add section..."
          onAdd={(name) => user && addSection(user.uid, trip.id, trip, name)}
        />
        {templateSections.length > 0 && (
          <button
            onClick={() => setImportSectionsOpen(true)}
            className="text-sm text-primary hover:text-primary-hover font-medium"
          >
            + Import section templates
          </button>
        )}
      </div>

      {/* Dialogs */}
      <ConfirmDialog
        open={deleteOpen}
        title="Delete Trip"
        message={`Delete "${trip.name}" and all its contents?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
      <ImportDialog
        open={importSectionsOpen}
        title="Import Section Templates"
        options={templateSections.map((s) => ({
          id: s.id,
          label: s.name,
          detail: `${s.items.length} items`,
        }))}
        onSelect={handleImportSections}
        onCancel={() => setImportSectionsOpen(false)}
      />
      <ImportDialog
        open={importRemindersOpen}
        title="Import Reminder Templates"
        options={reminderTemplates.map((r) => ({
          id: r.id,
          label: r.text,
        }))}
        onSelect={handleImportReminders}
        onCancel={() => setImportRemindersOpen(false)}
      />
    </div>
  );
}
