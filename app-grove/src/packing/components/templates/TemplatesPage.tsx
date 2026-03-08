import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../shared/AuthContext';
import { useTemplateSections } from '../../hooks/useTemplateSections';
import { useTemplatePackingLists } from '../../hooks/useTemplatePackingLists';
import { useReminderTemplates } from '../../hooks/useReminderTemplates';
import { createTemplateSection, deleteTemplateSection } from '../../services/templateSections';
import { createTemplatePackingList, deleteTemplatePackingList } from '../../services/templatePackingLists';
import { createReminderTemplate, deleteReminderTemplate } from '../../services/reminderTemplates';
import ConfirmDialog from '../ui/ConfirmDialog';
import { sortSections } from '../../utils/sortSections';

type Tab = 'sections' | 'packing-lists' | 'reminders';

export default function TemplatesPage() {
  const { user } = useAuth();
  const { sections, loading: sectionsLoading } = useTemplateSections();
  const { templates, loading: templatesLoading } = useTemplatePackingLists();
  const { reminders, loading: remindersLoading } = useReminderTemplates();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('sections');
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: string; name: string } | null>(null);

  const loading = sectionsLoading || templatesLoading || remindersLoading;

  async function handleDeleteConfirm() {
    if (!user || !deleteTarget) return;
    if (deleteTarget.type === 'section') await deleteTemplateSection(user.uid, deleteTarget.id);
    else if (deleteTarget.type === 'packing-list') await deleteTemplatePackingList(user.uid, deleteTarget.id);
    else if (deleteTarget.type === 'reminder') await deleteReminderTemplate(user.uid, deleteTarget.id);
    setDeleteTarget(null);
  }

  const tabClass = (t: Tab) =>
    `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
      tab === t ? 'bg-primary text-on-primary' : 'text-secondary hover:bg-hover'
    }`;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h2 className="text-xl font-bold mb-4">Templates</h2>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        <button className={tabClass('sections')} onClick={() => setTab('sections')}>Sections</button>
        <button className={tabClass('packing-lists')} onClick={() => setTab('packing-lists')}>Packing Lists</button>
        <button className={tabClass('reminders')} onClick={() => setTab('reminders')}>Reminders</button>
      </div>

      {/* Sections Tab */}
      {tab === 'sections' && (
        <div>
          <button
            onClick={async () => {
              if (!user) return;
              const name = prompt('Section name:');
              if (!name?.trim()) return;
              const id = await createTemplateSection(user.uid, name.trim());
              navigate(`/packing/templates/sections/${id}`);
            }}
            className="w-full bg-primary text-on-primary rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-primary-hover transition-colors mb-4"
          >
            + New Section Template
          </button>
          {sections.length === 0 && (
            <p className="text-secondary text-center py-8">No section templates yet.</p>
          )}
          <div className="space-y-2">
            {sortSections(sections).map((s) => (
              <div key={s.id} className="flex items-center bg-card rounded-xl border border-section-border overflow-hidden">
                <button
                  onClick={() => navigate(`/packing/templates/sections/${s.id}`)}
                  className="flex-1 text-left px-4 py-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-heading">{s.name}</span>
                    {s.rank != null && (
                      <span className="text-[11px] text-muted">#{s.rank}</span>
                    )}
                  </div>
                  <div className="text-xs text-muted">{s.items.length} items</div>
                </button>
                <button
                  onClick={() => setDeleteTarget({ type: 'section', id: s.id, name: s.name })}
                  className="shrink-0 px-3 py-3 text-secondary hover:text-rose-700"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Packing Lists Tab */}
      {tab === 'packing-lists' && (
        <div>
          <button
            onClick={async () => {
              if (!user) return;
              const name = prompt('Packing list name:');
              if (!name?.trim()) return;
              const id = await createTemplatePackingList(user.uid, name.trim());
              navigate(`/packing/templates/packing-lists/${id}`);
            }}
            className="w-full bg-primary text-on-primary rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-primary-hover transition-colors mb-4"
          >
            + New Packing List Template
          </button>
          {templates.length === 0 && (
            <p className="text-secondary text-center py-8">No packing list templates yet.</p>
          )}
          <div className="space-y-2">
            {templates.map((t) => (
              <div key={t.id} className="flex items-center bg-card rounded-xl border border-border overflow-hidden">
                <button
                  onClick={() => navigate(`/packing/templates/packing-lists/${t.id}`)}
                  className="flex-1 text-left px-4 py-3"
                >
                  <div className="text-sm font-medium">{t.name}</div>
                  <div className="text-xs text-secondary">
                    {t.sections.length} sections, {t.sections.reduce((n, s) => n + s.items.length, 0)} items
                  </div>
                </button>
                <button
                  onClick={() => setDeleteTarget({ type: 'packing-list', id: t.id, name: t.name })}
                  className="shrink-0 px-3 py-3 text-secondary hover:text-rose-700"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reminders Tab */}
      {tab === 'reminders' && (
        <div>
          <button
            onClick={async () => {
              if (!user) return;
              const text = prompt('Reminder text:');
              if (!text?.trim()) return;
              await createReminderTemplate(user.uid, text.trim());
            }}
            className="w-full bg-primary text-on-primary rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-primary-hover transition-colors mb-4"
          >
            + New Reminder Template
          </button>
          {reminders.length === 0 && (
            <p className="text-secondary text-center py-8">No reminder templates yet.</p>
          )}
          <div className="space-y-2">
            {reminders.map((r) => (
              <div key={r.id} className="flex items-center bg-card rounded-xl border border-border overflow-hidden">
                <div className="flex-1 px-4 py-3 text-sm">{r.text}</div>
                <button
                  onClick={() => setDeleteTarget({ type: 'reminder', id: r.id, name: r.text })}
                  className="shrink-0 px-3 py-3 text-secondary hover:text-rose-700"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete Template"
        message={`Delete "${deleteTarget?.name}"? This won't affect existing trips.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
