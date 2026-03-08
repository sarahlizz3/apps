import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../shared/AuthContext';
import { useTripLists } from '../../hooks/useTripLists';
import { useTemplatePackingLists } from '../../hooks/useTemplatePackingLists';
import { createTripList, createTripFromTemplate, deleteTripList, archiveTripList } from '../../services/tripLists';
import TripListCard from './TripListCard';
import ConfirmDialog from '../ui/ConfirmDialog';

export default function HomePage() {
  const { user } = useAuth();
  const { trips, loading } = useTripLists();
  const { templates } = useTemplatePackingLists();
  const navigate = useNavigate();
  const [showArchived, setShowArchived] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showCreateMenu, setShowCreateMenu] = useState(false);

  const activeTrips = trips.filter((t) => !t.archived);
  const archivedTrips = trips.filter((t) => t.archived);

  async function handleCreateBlank() {
    if (!user) return;
    const name = prompt('Trip name:');
    if (!name?.trim()) return;
    const id = await createTripList(user.uid, name.trim());
    navigate(`/packing/trip/${id}`);
  }

  async function handleCreateFromTemplate(templateId: string) {
    if (!user) return;
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;
    const name = prompt('Trip name:', template.name);
    if (!name?.trim()) return;
    const id = await createTripFromTemplate(
      user.uid,
      name.trim(),
      template.sections.map((s) => ({ name: s.name, items: s.items, ...(s.rank != null ? { rank: s.rank } : {}) })),
    );
    setShowCreateMenu(false);
    navigate(`/packing/trip/${id}`);
  }

  async function handleDelete() {
    if (!user || !deleteTarget) return;
    await deleteTripList(user.uid, deleteTarget);
    setDeleteTarget(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">My Trips</h2>
        <div className="relative">
          <button
            onClick={() => templates.length > 0 ? setShowCreateMenu(!showCreateMenu) : handleCreateBlank()}
            className="bg-primary text-on-primary rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary-hover transition-colors"
          >
            + New Trip
          </button>
          {showCreateMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowCreateMenu(false)} />
              <div className="absolute right-0 top-full mt-1 bg-card rounded-xl border border-border shadow-lg z-20 w-56">
                <button
                  onClick={() => { setShowCreateMenu(false); handleCreateBlank(); }}
                  className="w-full text-left px-4 py-3 text-sm hover:bg-hover rounded-t-xl"
                >
                  Blank trip
                </button>
                <div className="border-t border-border">
                  <p className="px-4 pt-2 pb-1 text-xs font-medium text-secondary uppercase">From template</p>
                  {templates.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleCreateFromTemplate(t.id)}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-hover last:rounded-b-xl"
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {activeTrips.length === 0 && (
        <p className="text-secondary text-center py-12">No active trips. Create one to get started!</p>
      )}

      <div className="space-y-3">
        {activeTrips.map((trip) => (
          <div key={trip.id} className="relative group">
            <TripListCard trip={trip} />
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
              <button
                onClick={(e) => { e.preventDefault(); user && archiveTripList(user.uid, trip.id, true); }}
                className="bg-card/90 border border-border rounded-lg p-1.5 text-secondary hover:text-body text-xs"
                title="Archive"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                </svg>
              </button>
              <button
                onClick={(e) => { e.preventDefault(); setDeleteTarget(trip.id); }}
                className="bg-card/90 border border-border rounded-lg p-1.5 text-secondary hover:text-rose-700 text-xs"
                title="Delete"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {archivedTrips.length > 0 && (
        <div className="mt-8">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="flex items-center gap-2 text-sm font-medium text-secondary hover:text-body mb-3"
          >
            <svg
              className={`w-4 h-4 transition-transform ${showArchived ? 'rotate-90' : ''}`}
              fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
            Archived ({archivedTrips.length})
          </button>
          {showArchived && (
            <div className="space-y-3">
              {archivedTrips.map((trip) => (
                <div key={trip.id} className="relative group opacity-60">
                  <TripListCard trip={trip} />
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                    <button
                      onClick={(e) => { e.preventDefault(); user && archiveTripList(user.uid, trip.id, false); }}
                      className="bg-card/90 border border-border rounded-lg p-1.5 text-secondary hover:text-body text-xs"
                      title="Unarchive"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 0 0-2.25 2.25v9a2.25 2.25 0 0 0 2.25 2.25h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25H15m0-3-3-3m0 0-3 3m3-3V15" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => { e.preventDefault(); setDeleteTarget(trip.id); }}
                      className="bg-card/90 border border-border rounded-lg p-1.5 text-secondary hover:text-rose-700 text-xs"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete Trip"
        message="Are you sure you want to delete this trip? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
