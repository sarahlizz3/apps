import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../../shared/AuthContext';
import { useTemplatePackingList } from '../../hooks/useTemplatePackingList';
import { useTemplateSections } from '../../hooks/useTemplateSections';
import { updateTemplatePackingList } from '../../services/templatePackingLists';
import type { TemplatePLSection } from '../../types';
import InlineAdd from '../ui/InlineAdd';
import TemplateItem from './TemplateItem';
import ImportDialog from '../trip/ImportDialog';
import { sortSections } from '../../utils/sortSections';

export default function PackingListTemplateEditor() {
  const { templateId } = useParams<{ templateId: string }>();
  const { user } = useAuth();
  const { template, loading } = useTemplatePackingList(templateId);
  const { sections: templateSections } = useTemplateSections();
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [importOpen, setImportOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="p-4 text-center">
        <p className="text-muted mb-4">Template not found.</p>
        <Link to="/packing/templates" className="text-primary hover:underline">Back to templates</Link>
      </div>
    );
  }

  function saveName() {
    if (!user || !template || !nameValue.trim()) return;
    updateTemplatePackingList(user.uid, template.id, { name: nameValue.trim() });
    setEditingName(false);
  }

  function updateSections(newSections: TemplatePLSection[]) {
    if (!user || !template) return;
    updateTemplatePackingList(user.uid, template.id, { sections: newSections });
  }

  function addSection(name: string) {
    updateSections([
      ...template!.sections,
      { id: crypto.randomUUID(), name, items: [] },
    ]);
  }

  function deleteSection(sectionId: string) {
    updateSections(template!.sections.filter((s) => s.id !== sectionId));
  }

  function addItemToSection(sectionId: string, itemName: string) {
    updateSections(
      template!.sections.map((s) =>
        s.id === sectionId ? { ...s, items: [...s.items, itemName] } : s,
      ),
    );
  }

  function removeItemFromSection(sectionId: string, itemIndex: number) {
    updateSections(
      template!.sections.map((s) =>
        s.id === sectionId
          ? { ...s, items: s.items.filter((_, i) => i !== itemIndex) }
          : s,
      ),
    );
  }

  function renameItemInSection(sectionId: string, itemIndex: number, newName: string) {
    updateSections(
      template!.sections.map((s) =>
        s.id === sectionId
          ? { ...s, items: s.items.map((item, i) => (i === itemIndex ? newName : item)) }
          : s,
      ),
    );
  }

  function handleImportSections(ids: string[]) {
    if (ids.length === 0) return;
    const selected = templateSections.filter((s) => ids.includes(s.id));
    const newSections: TemplatePLSection[] = selected.map((s) => ({
      id: crypto.randomUUID(),
      name: s.name,
      items: [...s.items],
      ...(s.rank != null ? { rank: s.rank } : {}),
    }));
    updateSections([...template!.sections, ...newSections]);
    setImportOpen(false);
  }

  return (
    <div className="p-4 max-w-lg mx-auto pb-8">
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
              className="w-full text-xl font-bold rounded border border-border px-2 py-1 focus:outline-none focus:ring-2 focus:ring-focus"
              autoFocus
              onBlur={saveName}
            />
          </form>
        ) : (
          <h2
            onClick={() => { setEditingName(true); setNameValue(template.name); }}
            className="text-xl font-bold cursor-pointer hover:text-primary"
          >
            {template.name}
          </h2>
        )}
      </div>

      <div className="space-y-4">
        {sortSections(template.sections).map((section) => (
          <div key={section.id} className="bg-card rounded-xl border border-section-border overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-section-header border-b border-section-border">
              <span className="flex-1 text-base font-bold text-heading">{section.name}</span>
              <select
                value={section.rank ?? ''}
                onChange={(e) => {
                  const val = e.target.value;
                  const newRank = val === '' ? undefined : Number(val);
                  updateSections(
                    template!.sections.map((s) =>
                      s.id === section.id
                        ? newRank != null ? { ...s, rank: newRank } : (() => { const { rank: _, ...rest } = s; return rest; })()
                        : s,
                    ),
                  );
                }}
                className="shrink-0 w-12 text-[11px] text-muted rounded border border-section-border px-0.5 py-0.5 focus:outline-none focus:ring-2 focus:ring-focus"
                title="Section rank"
              >
                <option value="">—</option>
                {[1,2,3,4,5,6,7,8,9,10].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <span className="text-[11px] text-muted">{section.items.length} items</span>
              <button
                onClick={() => deleteSection(section.id)}
                className="text-muted hover:text-rose-400 p-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
              </button>
            </div>
            <div className="px-4 py-2">
              {section.items.map((item, index) => (
                <TemplateItem
                  key={index}
                  name={item}
                  onDelete={() => removeItemFromSection(section.id, index)}
                  onRename={(newName) => renameItemInSection(section.id, index, newName)}
                />
              ))}
              <div className="mt-2">
                <InlineAdd
                  placeholder="Add item..."
                  onAdd={(name) => addItemToSection(section.id, name)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        <InlineAdd placeholder="Add section..." onAdd={addSection} />
        {templateSections.length > 0 && (
          <button
            onClick={() => setImportOpen(true)}
            className="text-sm text-primary hover:text-primary-hover font-medium"
          >
            + Import section templates
          </button>
        )}
      </div>

      <ImportDialog
        open={importOpen}
        title="Import Section Templates"
        options={templateSections.map((s) => ({
          id: s.id,
          label: s.name,
          detail: `${s.items.length} items`,
        }))}
        onSelect={handleImportSections}
        onCancel={() => setImportOpen(false)}
      />
    </div>
  );
}
