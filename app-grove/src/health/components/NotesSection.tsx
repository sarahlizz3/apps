import { useState } from 'react';
import type { Note, HealthData } from '../types';
import ConfirmDialog from './ConfirmDialog';
import { useToast } from './Toast';
import { useAuth } from '../../shared/AuthContext';
import { saveItem, deleteItem, serverTimestamp } from '../services';

interface Props {
  data: HealthData;
  setData: React.Dispatch<React.SetStateAction<HealthData>>;
}

export default function NotesSection({ data, setData }: Props) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [providerFilter, setProviderFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showQuickNote, setShowQuickNote] = useState(false);
  const [quickNoteText, setQuickNoteText] = useState('');
  const [quickNoteProvider, setQuickNoteProvider] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState<Note | null>(null);

  let notes = data.notes;
  if (providerFilter !== 'all') notes = notes.filter(n => n.providerId === providerFilter);
  if (search) notes = notes.filter(n => n.text.toLowerCase().includes(search.toLowerCase()));

  function formatDate(n: Note) {
    if (!n.timestamp) return '\u2014';
    const ts = 'seconds' in n.timestamp ? n.timestamp.seconds * 1000 : 0;
    return ts ? new Date(ts).toLocaleString() : '\u2014';
  }

  async function handleQuickNoteSave() {
    if (!user || !quickNoteText.trim() || quickNoteProvider === 'all') {
      showToast(quickNoteProvider === 'all' ? 'Please select a provider.' : 'Please enter a note.', true);
      return;
    }
    try {
      const payload = { providerId: quickNoteProvider, text: quickNoteText.trim(), timestamp: serverTimestamp() };
      const newId = await saveItem(user.uid, 'notes', payload);
      const newNote: Note = { id: newId!, providerId: quickNoteProvider, text: quickNoteText.trim(), timestamp: { seconds: Date.now() / 1000 } };
      setData(prev => ({ ...prev, notes: [newNote, ...prev.notes] }));
      setShowQuickNote(false);
      setQuickNoteText('');
      showToast('Note saved!');
    } catch (err) {
      showToast('Error saving: ' + (err as Error).message, true);
    }
  }

  async function handleEditNote(note: Note) {
    const newText = prompt('Edit note:', note.text);
    if (newText === null || newText.trim() === '') return;
    if (!user) return;
    try {
      await saveItem(user.uid, 'notes', { text: newText.trim() }, note.id);
      setData(prev => ({
        ...prev,
        notes: prev.notes.map(n => n.id === note.id ? { ...n, text: newText.trim() } : n),
      }));
      showToast('Note updated!');
    } catch (err) {
      showToast('Error updating: ' + (err as Error).message, true);
    }
  }

  async function handleDelete() {
    if (!user || !deleteTarget) return;
    try {
      await deleteItem(user.uid, 'notes', deleteTarget.id);
      setData(prev => ({ ...prev, notes: prev.notes.filter(n => n.id !== deleteTarget.id) }));
      showToast('Deleted successfully.');
    } catch (err) {
      showToast('Error deleting: ' + (err as Error).message, true);
    }
    setDeleteTarget(null);
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <select
          value={providerFilter}
          onChange={e => setProviderFilter(e.target.value)}
          className="rounded-lg border border-border px-3 py-2 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-focus"
        >
          <option value="all">All Providers</option>
          {data.providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search notes..."
          className="rounded-lg border border-border px-3 py-2 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-focus"
        />
        <button
          onClick={() => setShowQuickNote(true)}
          className="bg-primary text-on-primary px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-primary-hover transition-colors shrink-0"
        >
          + Quick Note
        </button>
      </div>

      {notes.length === 0 ? (
        <p className="text-secondary text-sm text-center py-8">No notes found.</p>
      ) : (
        <div className="space-y-3">
          {notes.map(n => {
            const prov = data.providers.find(p => p.id === n.providerId);
            return (
              <div key={n.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-xs text-muted">{formatDate(n)}</span>
                    <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-hover text-secondary">
                      {prov?.name || 'Unknown'}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleEditNote(n)} className="text-muted hover:text-body" title="Edit">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                      </svg>
                    </button>
                    <button onClick={() => setDeleteTarget(n)} className="text-reminder-text hover:opacity-80" title="Delete">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>
                <p className="text-sm text-body">{n.text}</p>
              </div>
            );
          })}
        </div>
      )}

      {showQuickNote && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-start justify-center pt-8 px-4" onClick={e => { if (e.target === e.currentTarget) setShowQuickNote(false); }}>
          <div className="bg-card border border-border rounded-xl w-full max-w-lg p-5">
            <h2 className="text-lg font-semibold text-heading mb-4">Quick Note</h2>
            <select
              value={quickNoteProvider}
              onChange={e => setQuickNoteProvider(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm mb-3"
            >
              <option value="all">Select Provider</option>
              {data.providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <textarea
              value={quickNoteText}
              onChange={e => setQuickNoteText(e.target.value)}
              rows={4}
              placeholder="Enter your note..."
              className="w-full rounded-lg border border-border px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-focus"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowQuickNote(false)} className="px-4 py-2 text-sm text-secondary">Cancel</button>
              <button onClick={handleQuickNoteSave} className="px-4 py-2 text-sm bg-primary text-on-primary rounded-lg hover:bg-primary-hover transition-colors">Save</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        message="Are you sure you want to delete this note? This cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
