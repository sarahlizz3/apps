import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../../shared/AuthContext';
import { useTemplateSection } from '../../hooks/useTemplateSection';
import { updateTemplateSection } from '../../services/templateSections';
import InlineAdd from '../ui/InlineAdd';
import TemplateItem from './TemplateItem';

export default function SectionTemplateEditor() {
  const { sectionId } = useParams<{ sectionId: string }>();
  const { user } = useAuth();
  const { section, loading } = useTemplateSection(sectionId);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!section) {
    return (
      <div className="p-4 text-center">
        <p className="text-muted mb-4">Section template not found.</p>
        <Link to="/packing/templates" className="text-primary hover:underline">Back to templates</Link>
      </div>
    );
  }

  function saveName() {
    if (!user || !section || !nameValue.trim()) return;
    updateTemplateSection(user.uid, section.id, { name: nameValue.trim() });
    setEditingName(false);
  }

  function addItem(name: string) {
    if (!user || !section) return;
    updateTemplateSection(user.uid, section.id, { items: [...section.items, name] });
  }

  function removeItem(index: number) {
    if (!user || !section) return;
    updateTemplateSection(user.uid, section.id, {
      items: section.items.filter((_, i) => i !== index),
    });
  }

  function renameItem(index: number, newName: string) {
    if (!user || !section) return;
    updateTemplateSection(user.uid, section.id, {
      items: section.items.map((item, i) => (i === index ? newName : item)),
    });
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <Link to="/packing/templates" className="shrink-0 text-muted hover:text-secondary -ml-1 p-1">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </Link>
        {editingName ? (
          <form onSubmit={(e) => { e.preventDefault(); saveName(); }} className="flex-1">
            <input
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              className="w-full text-xl font-bold rounded border border-section-border px-2 py-1 focus:outline-none focus:ring-2 focus:ring-focus"
              autoFocus
              onBlur={saveName}
            />
          </form>
        ) : (
          <h2
            onClick={() => { setEditingName(true); setNameValue(section.name); }}
            className="text-xl font-bold cursor-pointer text-heading hover:text-primary-hover"
          >
            {section.name}
          </h2>
        )}
        <select
          value={section.rank ?? ''}
          onChange={(e) => {
            if (!user) return;
            const val = e.target.value;
            updateTemplateSection(user.uid, section.id, { rank: val === '' ? null : Number(val) });
          }}
          className="shrink-0 w-14 text-[11px] text-muted rounded border border-section-border px-1 py-0.5 focus:outline-none focus:ring-2 focus:ring-focus"
          title="Section rank (priority)"
        >
          <option value="">None</option>
          {[1,2,3,4,5,6,7,8,9,10].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>

      <div className="bg-card rounded-xl border border-border p-4">
        {section.items.length === 0 && (
          <p className="text-secondary text-sm mb-3">No items yet. Add some below.</p>
        )}
        {section.items.map((item, index) => (
          <TemplateItem
            key={index}
            name={item}
            onDelete={() => removeItem(index)}
            onRename={(newName) => renameItem(index, newName)}
          />
        ))}
        <div className="mt-2">
          <InlineAdd placeholder="Add item..." onAdd={addItem} />
        </div>
      </div>
    </div>
  );
}
