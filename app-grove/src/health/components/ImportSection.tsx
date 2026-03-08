import { useState, useRef } from 'react';
import { useToast } from './Toast';
import { useAuth } from '../../shared/AuthContext';
import { importItems } from '../services';

interface Props {
  onImported: () => void;
}

const VALID_COLLECTIONS = ['medications', 'diagnoses', 'providers', 'explainers', 'notes'];

export default function ImportSection({ onImported }: Props) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [jsonText, setJsonText] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleImport() {
    if (!user) return;

    let text = jsonText;
    if (fileRef.current?.files?.length) {
      text = await fileRef.current.files[0].text();
    }
    if (!text.trim()) {
      return showToast('Please upload a JSON file or paste JSON data.', true);
    }

    let data: Record<string, unknown[]>;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return showToast('Invalid JSON: ' + (e as Error).message, true);
    }

    const found = VALID_COLLECTIONS.filter(c => Array.isArray(data[c]) && data[c].length > 0);
    if (found.length === 0) {
      return showToast('No valid data found.', true);
    }

    const counts = found.map(c => `${data[c].length} ${c}`).join(', ');
    if (!confirm(`This will ADD: ${counts}\n\nContinue?`)) return;

    let total = 0;
    try {
      for (const collName of found) {
        const count = await importItems(user.uid, collName, data[collName] as Record<string, unknown>[]);
        total += count;
      }
      showToast(`Import complete! Added ${total} items.`);
      setJsonText('');
      if (fileRef.current) fileRef.current.value = '';
      onImported();
    } catch (err) {
      showToast(`Import error after ${total} items: ${(err as Error).message}`, true);
    }
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-heading mb-3">Import JSON</h3>
      <input
        ref={fileRef}
        type="file"
        accept=".json"
        className="block w-full text-sm text-secondary mb-3 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border file:border-border file:text-sm file:bg-card file:text-secondary hover:file:bg-hover"
      />
      <textarea
        value={jsonText}
        onChange={e => setJsonText(e.target.value)}
        rows={4}
        placeholder="Or paste JSON data here..."
        className="w-full rounded-lg border border-border px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-focus"
      />
      <button
        onClick={handleImport}
        className="w-full bg-card border border-border text-secondary py-2 rounded-lg text-sm font-medium hover:bg-hover transition-colors"
      >
        Import
      </button>
    </div>
  );
}
