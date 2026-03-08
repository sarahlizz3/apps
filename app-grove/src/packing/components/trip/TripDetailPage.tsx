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
  reorderSections,
} from '../../services/tripLists';
import PackingSection from './PackingSection';
import ReminderSection from './ReminderSection';
import InlineAdd from '../ui/InlineAdd';
import ConfirmDialog from '../ui/ConfirmDialog';
import ImportDialog from './ImportDialog';

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
  const [sectionReorder, setSectionReorder] = useState(false);

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

  function moveSectionBy(fromIndex: number, direction: number) {
    if (!user || !trip) return;
    const toIndex = fromIndex + direction;
    if (toIndex < 0 || toIndex >= trip.sections.length) return;
    reorderSections(user.uid, trip.id, trip, fromIndex, toIndex);
  }

  function handlePrint() {
    if (!trip) return;
    const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    let html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>${trip.name}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;font-size:11pt;color:#1a1a1a;line-height:1.5;padding:0.4in;max-width:8.5in}
h1{font-size:16pt;margin-bottom:2pt}
.date{font-size:9pt;color:#888;margin-bottom:14pt}
h2{font-size:11pt;background:#f0f0f0;padding:4pt 8pt;margin:10pt 0 4pt 0;border-radius:3pt}
ul{list-style:none;padding:0;margin:0 0 6pt 0}
li{padding:3pt 0 3pt 24pt;position:relative;font-size:10pt;border-bottom:1px solid #eee}
li::before{content:'\\2610';position:absolute;left:4pt;font-size:13pt;line-height:1}
li.checked{color:#999;text-decoration:line-through}
li.checked::before{content:'\\2611'}
.reminders{background:#fff8e1;border:1px solid #ffe082;border-radius:4pt;padding:6pt 10pt;margin-bottom:10pt;font-size:10pt}
.reminders strong{color:#f57f17}
.stats{font-size:9pt;color:#666;margin-bottom:8pt}
@media print{body{padding:0}}
</style></head><body>
<h1>${trip.name}</h1>
<div class="date">${today}</div>
<div class="stats">${trip.totalItemCount} items total</div>`;

    if (trip.reminders.length > 0) {
      html += '<div class="reminders"><strong>Reminders:</strong><ul>';
      trip.reminders.forEach(r => {
        html += `<li${r.checked ? ' class="checked"' : ''}>${r.text}</li>`;
      });
      html += '</ul></div>';
    }

    trip.sections.forEach(s => {
      html += `<h2>${s.name} (${s.items.filter(i => !i.checked).length}/${s.items.length})</h2><ul>`;
      s.items.forEach(i => {
        html += `<li${i.checked ? ' class="checked"' : ''}>${i.name}</li>`;
      });
      html += '</ul>';
    });

    html += '</body></html>';
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const w = window.open(url);
    if (w) {
      w.onload = () => { w.print(); URL.revokeObjectURL(url); };
    }
  }

  const remaining = trip.totalItemCount - trip.checkedItemCount;
  // Use raw section order when in reorder mode, otherwise use insertion order (no sort)
  const displaySections = trip.sections;

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

      <div className="flex items-center gap-3 mb-4 text-sm text-secondary flex-wrap">
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
        <button
          onClick={handlePrint}
          className="text-secondary hover:text-primary"
        >
          Print
        </button>
        {trip.sections.length > 1 && (
          <button
            onClick={() => setSectionReorder(!sectionReorder)}
            className={sectionReorder ? 'text-primary font-medium' : 'text-secondary hover:text-primary'}
          >
            {sectionReorder ? 'Done' : 'Reorder'}
          </button>
        )}
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
        {displaySections.map((section, index) => (
          <PackingSection
            key={section.id}
            section={section}
            trip={trip}
            reorderMode={sectionReorder}
            isFirst={index === 0}
            isLast={index === displaySections.length - 1}
            onMoveUp={() => moveSectionBy(index, -1)}
            onMoveDown={() => moveSectionBy(index, 1)}
          />
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
