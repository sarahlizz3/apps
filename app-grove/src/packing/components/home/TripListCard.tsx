import { Link } from 'react-router-dom';
import type { TripList } from '../../types';

interface Props {
  trip: TripList;
}

export default function TripListCard({ trip }: Props) {
  const remaining = trip.totalItemCount - trip.checkedItemCount;

  return (
    <Link
      to={`/packing/trip/${trip.id}`}
      className="block bg-card rounded-xl border border-border p-4 hover:border-section-border hover:bg-hover/40 transition-colors"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-body truncate">{trip.name}</h3>
        <span className="text-sm text-secondary shrink-0 ml-2">
          {remaining === 0 && trip.totalItemCount > 0
            ? 'All packed!'
            : `${remaining} remaining`}
        </span>
      </div>
      {trip.totalItemCount > 0 && (
        <div className="mt-2 h-2 bg-section-header rounded-full overflow-hidden">
          <div
            className="h-full bg-icon rounded-full transition-all"
            style={{ width: `${(trip.checkedItemCount / trip.totalItemCount) * 100}%` }}
          />
        </div>
      )}
    </Link>
  );
}
