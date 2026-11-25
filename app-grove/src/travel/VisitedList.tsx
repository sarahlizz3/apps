import { Link, useNavigate } from 'react-router-dom';
import { TOTAL_CA, TOTAL_STATES, computeCounts } from './logic';
import type { Place, Visit } from './types';
import type { useTravel } from './useTravel';

type Travel = ReturnType<typeof useTravel>;

interface Row {
  id: string;
  name: string;
  visit: Visit | null; // null = a country counted through its states/provinces
}

export default function VisitedList({ travel }: { travel: Travel }) {
  const { places, byId, visits, home, visitsLoaded } = travel;
  const navigate = useNavigate();

  if (!places || !visitsLoaded) {
    return <p className="p-6 text-muted">Loading…</p>;
  }

  const counts = computeCounts(visits, places, byId, home);
  const rows = (kind: Place['kind']): Row[] =>
    visits
      .filter((v) => byId.get(v.id)?.kind === kind)
      .map((v) => ({ id: v.id, name: byId.get(v.id)!.name, visit: v }))
      .sort((a, b) => a.name.localeCompare(b.name));

  // The US and Canada count as countries through their states and provinces, so they
  // appear in the country list the same way they appear in the counter.
  const derived: Row[] = (
    [
      ['USA', 'United States', 'us'],
      ['CAN', 'Canada', 'ca'],
    ] as const
  )
    .filter(([id, , kind]) => id !== home && visits.some((v) => byId.get(v.id)?.kind === kind))
    .map(([id, name]) => ({ id, name, visit: null }));
  const countries = [...rows('country').filter((r) => r.id !== home), ...derived].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const states = rows('us');
  const provinces = rows('ca');
  const territories = rows('terr');
  // Visits whose place code isn't on the current map (only possible after a map update
  // where a country split or merged). Kept and listed rather than dropped.
  const orphans = visits.filter((v) => !byId.has(v.id));

  const open = (id: string) => navigate(`/travel?place=${encodeURIComponent(id)}`);

  return (
    <div className="max-w-2xl mx-auto px-4 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-bold font-display text-heading">Visited</h2>
        <Link to="/travel" className="min-h-11 px-4 rounded-lg border border-border bg-card text-body hover:bg-hover inline-flex items-center">
          Back to map
        </Link>
      </div>

      <Section title="Countries" countText={`${counts.countries} of ${counts.countriesTotal}`} rows={countries} empty="No countries logged yet." onOpen={open} />
      <Section
        title="US states"
        countText={`${counts.states} of ${TOTAL_STATES}${counts.dc ? ', plus D.C.' : ''}`}
        rows={states}
        empty="No states logged yet."
        onOpen={open}
      />
      <Section title="Canadian provinces and territories" countText={`${counts.provinces} of ${TOTAL_CA}`} rows={provinces} empty="No provinces or territories logged yet." onOpen={open} />
      <Section title="Territories" countText={`${counts.territories} of ${counts.territoriesTotal}`} rows={territories} empty="No territories logged yet." onOpen={open} />

      {orphans.length > 0 && (
        <section className="mt-6">
          <h3 className="text-lg font-semibold text-heading">Not on the current map</h3>
          <p className="text-secondary text-sm mt-1">
            These visits are saved under place codes the current map doesn't have. Their year and notes are kept.
          </p>
          <ul className="mt-2">
            {orphans.map((v) => (
              <li key={v.id} className="py-2 border-t border-border first:border-t-0">
                <span className="font-mono text-sm">{v.id}</span>
                {v.year && <span className="text-muted ml-3">{v.year}</span>}
                {v.note && <p className="text-muted text-sm truncate">{v.note}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Section({
  title,
  countText,
  rows,
  empty,
  onOpen,
}: {
  title: string;
  countText: string;
  rows: Row[];
  empty: string;
  onOpen: (id: string) => void;
}) {
  return (
    <section className="mt-6">
      <h3 className="flex flex-wrap items-baseline gap-x-2 text-lg font-semibold text-heading">
        {title} <span className="text-sm font-normal text-muted whitespace-nowrap">{countText}</span>
      </h3>
      {rows.length === 0 ? (
        <p className="text-muted mt-1">{empty}</p>
      ) : (
        <ul className="mt-1">
          {rows.map((r) => {
            const inner = (
              <>
                <span className="min-w-0">{r.name}</span>
                <span className="text-muted tabular-nums whitespace-nowrap">{r.visit?.year ?? ''}</span>
                {r.visit === null ? (
                  <span className="col-span-2 text-muted text-sm">Counted from your visits there</span>
                ) : (
                  r.visit.note && <span className="col-span-2 text-muted text-sm truncate">{r.visit.note}</span>
                )}
              </>
            );
            const cls = 'w-full min-h-12 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 text-left rounded-lg px-2 py-2.5';
            return (
              <li key={r.id} className="border-t border-hover first:border-t-0">
                {r.visit === null ? (
                  <div className={cls}>{inner}</div>
                ) : (
                  <button type="button" className={`${cls} hover:bg-hover`} onClick={() => onOpen(r.id)}>
                    {inner}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
