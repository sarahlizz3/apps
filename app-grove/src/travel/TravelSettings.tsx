import { Link } from 'react-router-dom';
import { homeOptions } from './logic';
import { saveHome } from './services';
import type { useTravel } from './useTravel';

type Travel = ReturnType<typeof useTravel>;

export default function TravelSettings({ travel }: { travel: Travel }) {
  const { uid, places, home } = travel;

  return (
    <div className="max-w-2xl mx-auto px-4 pt-4 pb-8">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-bold font-display text-heading">Settings</h2>
        <Link to="/travel" className="min-h-11 px-4 rounded-lg border border-border bg-card text-body hover:bg-hover inline-flex items-center">
          Back to map
        </Link>
      </div>
      <label htmlFor="tm-home" className="block font-semibold mt-6 mb-1">Home country</label>
      {places ? (
        <select
          id="tm-home"
          className="w-full max-w-sm rounded-lg border border-border bg-card text-body px-3 py-2 text-base"
          value={home}
          onChange={(e) => saveHome(uid, e.target.value).catch((err) => console.error('Saving home failed', err))}
        >
          {homeOptions(places).map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
      ) : (
        <p className="text-muted">Loading…</p>
      )}
      <p className="text-secondary text-sm mt-2">Your home country isn't counted in the country total.</p>
    </div>
  );
}
