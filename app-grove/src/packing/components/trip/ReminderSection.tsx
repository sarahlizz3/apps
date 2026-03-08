import type { TripList } from '../../types';
import { useAuth } from '../../../shared/AuthContext';
import { addReminder, deleteReminder, toggleReminder } from '../../services/tripLists';
import InlineAdd from '../ui/InlineAdd';

interface Props {
  trip: TripList;
}

export default function ReminderSection({ trip }: Props) {
  const { user } = useAuth();

  if (trip.reminders.length === 0 && !user) return null;

  return (
    <div className="bg-reminder rounded-xl border border-reminder-border p-4">
      <h3 className="text-sm font-semibold text-reminder-text mb-3">Reminders</h3>
      {trip.reminders.map((r) => (
        <div key={r.id} className="flex items-center gap-3 py-1.5 group">
          <button
            onClick={() => user && toggleReminder(user.uid, trip.id, trip, r.id)}
            className={`shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
              r.checked ? 'bg-reminder-text border-reminder-text' : 'border-reminder-text hover:border-reminder-body'
            }`}
          >
            {r.checked && (
              <svg className="w-3 h-3 text-on-reminder" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            )}
          </button>
          <span className={`flex-1 text-sm ${r.checked ? 'line-through text-reminder-text' : 'text-reminder-body'}`}>
            {r.text}
          </span>
          <button
            onClick={() => user && deleteReminder(user.uid, trip.id, trip, r.id)}
            className="shrink-0 p-1 text-reminder-text hover:text-reminder-body opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
      <div className="mt-2">
        <InlineAdd
          placeholder="Add reminder..."
          onAdd={(text) => user && addReminder(user.uid, trip.id, trip, text)}
        />
      </div>
    </div>
  );
}
