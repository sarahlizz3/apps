import { useState, useRef, useEffect, useCallback } from 'react';
import { marked } from 'marked';
import type { Note, Provider } from '../types';
import { useAuth } from '../../shared/AuthContext';
import { saveItem, serverTimestamp } from '../services';
import { useToast } from './Toast';

interface Props {
  note: Note | null;
  providers: Provider[];
  onSaved: (note: Note) => void;
  onClose: () => void;
}

export default function NoteEditor({ note, providers, onSaved, onClose }: Props) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [text, setText] = useState(note?.text || '');
  const [providerId, setProviderId] = useState(note?.providerId || '');
  const [providerNameOverride, setProviderNameOverride] = useState(note?.providerNameOverride || '');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const doSave = useCallback(async (currentText: string) => {
    if (!user || (!providerId && providerId !== '__other')) return;
    setSaveStatus('saving');
    try {
      const payload: Record<string, unknown> = {
        text: currentText,
        providerId: providerId === '__other' ? '__other' : providerId,
        updatedAt: serverTimestamp(),
      };
      if (providerId === '__other') payload.providerNameOverride = providerNameOverride;
      if (!note) payload.timestamp = serverTimestamp();

      const id = await saveItem(user.uid, 'notes', payload, note?.id);
      setSaveStatus('saved');
      return id;
    } catch (err) {
      showToast('Save error: ' + (err as Error).message, true);
      setSaveStatus('idle');
      return undefined;
    }
  }, [user, providerId, providerNameOverride, note, showToast]);

  // Autosave on text change (debounced)
  useEffect(() => {
    if (!text || text === note?.text) return;
    setSaveStatus('idle');
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { doSave(text); }, 1500);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [text, note?.text, doSave]);

  async function handleSaveAndClose() {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!providerId || (providerId === '__other' && !providerNameOverride.trim())) {
      showToast('Please select a provider.', true);
      return;
    }
    if (!text.trim()) {
      showToast('Please enter a note.', true);
      return;
    }
    const id = await doSave(text);
    if (id !== undefined) {
      const saved: Note = {
        id: id || note?.id || '',
        providerId: providerId === '__other' ? '__other' : providerId,
        providerNameOverride: providerId === '__other' ? providerNameOverride : undefined,
        text,
        timestamp: note?.timestamp || { seconds: Date.now() / 1000 },
        updatedAt: { seconds: Date.now() / 1000 },
      };
      onSaved(saved);
    }
  }

  function getProviderName() {
    if (providerId === '__other') return providerNameOverride || 'Other';
    return providers.find(p => p.id === providerId)?.name || '';
  }

  const containerClass = isFullscreen
    ? 'fixed inset-0 z-50 bg-page flex flex-col'
    : 'bg-card border border-border rounded-xl flex flex-col max-h-[80vh]';

  return (
    <div className={containerClass}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <select
            value={providerId}
            onChange={e => setProviderId(e.target.value)}
            className="rounded-lg border border-border px-2 py-1 text-xs max-w-[200px]"
          >
            <option value="">Select Provider</option>
            {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            <option value="__other">Other...</option>
          </select>
          {providerId === '__other' && (
            <input
              value={providerNameOverride}
              onChange={e => setProviderNameOverride(e.target.value)}
              placeholder="Provider name"
              className="rounded-lg border border-border px-2 py-1 text-xs w-32"
            />
          )}
          {providerId && <span className="text-[10px] text-muted truncate">{getProviderName()}</span>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-muted">
            {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : ''}
          </span>
          <button onClick={() => setShowPreview(!showPreview)} className="text-muted hover:text-body p-1" title={showPreview ? 'Edit' : 'Preview'}>
            {showPreview ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
            )}
          </button>
          <button onClick={() => setIsFullscreen(!isFullscreen)} className="text-muted hover:text-body p-1" title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
            {isFullscreen ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5 5.25 5.25" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Editor / Preview */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {showPreview ? (
          <div
            className="prose prose-sm max-w-none p-4 text-body [&_h1]:text-heading [&_h2]:text-heading [&_h3]:text-heading [&_strong]:text-heading [&_a]:text-primary [&_code]:bg-hover [&_code]:px-1 [&_code]:rounded [&_pre]:bg-hover [&_pre]:p-3 [&_pre]:rounded-lg [&_blockquote]:border-l-primary [&_blockquote]:text-secondary [&_li]:text-body"
            dangerouslySetInnerHTML={{ __html: marked(text) as string }}
          />
        ) : (
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Write your note... (supports Markdown)"
            className="w-full h-full min-h-[300px] p-4 text-sm text-body bg-transparent resize-none focus:outline-none"
            autoFocus
          />
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center px-4 py-2 border-t border-border shrink-0">
        <span className="text-[10px] text-muted">Markdown supported</span>
        <div className="flex gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-xs text-secondary">Cancel</button>
          <button onClick={handleSaveAndClose} className="px-3 py-1.5 text-xs bg-primary text-on-primary rounded-lg hover:bg-primary-hover transition-colors">
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
}
