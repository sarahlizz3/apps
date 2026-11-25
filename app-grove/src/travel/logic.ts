import placesUrl from './places.json?url';
import type { Place, Visit } from './types';

export const TOTAL_COUNTRIES = 195;
export const TOTAL_STATES = 50; // D.C. can be logged but isn't counted as a state
export const TOTAL_CA = 13;
const CA_TERRITORIES = new Set(['CA-YT', 'CA-NT', 'CA-NU']);

// The map file is ~2 MB, so it is fetched once and shared by every screen.
let placesPromise: Promise<Place[]> | null = null;
export function loadPlaces(): Promise<Place[]> {
  if (!placesPromise) {
    placesPromise = fetch(placesUrl)
      .then((r) => {
        if (!r.ok) throw new Error(`Map file failed to load (${r.status})`);
        return r.json() as Promise<Place[]>;
      })
      .then((all) => all.filter((p) => p.g && p.name !== 'Antarctica'));
    placesPromise.catch(() => {
      placesPromise = null; // let a later visit retry
    });
  }
  return placesPromise;
}

export function isTappable(p: Place): boolean {
  return p.kind !== 'other' && p.kind !== 'lake';
}

export function kindLabel(p: Place): string {
  switch (p.kind) {
    case 'us':
      return p.id === 'US-DC' ? 'U.S. federal district' : 'U.S. state';
    case 'ca':
      return CA_TERRITORIES.has(p.id) ? 'Canadian territory' : 'Canadian province';
    case 'terr':
      return 'Territory';
    default:
      return 'Country';
  }
}

/** Countries for the home-country setting. The US and Canada are drawn as states and
 *  provinces, so they're added by hand. */
export function homeOptions(places: Place[]): { id: string; name: string }[] {
  return [
    ...places.filter((p) => p.kind === 'country').map((p) => ({ id: p.id, name: p.name })),
    { id: 'USA', name: 'United States' },
    { id: 'CAN', name: 'Canada' },
  ].sort((a, b) => a.name.localeCompare(b.name));
}

/** Visited countries, as counted: direct visits, plus the US/Canada through any of
 *  their states/provinces. Never the home country. Territories never count. */
export function countedCountries(visits: Visit[], byId: Map<string, Place>, home: string): Set<string> {
  const set = new Set<string>();
  for (const v of visits) {
    const p = byId.get(v.id);
    if (!p) continue;
    if (p.kind === 'country') set.add(p.id);
    else if (p.kind === 'us') set.add('USA');
    else if (p.kind === 'ca') set.add('CAN');
  }
  set.delete(home);
  return set;
}

export interface Counts {
  countries: number;
  countriesTotal: number;
  states: number;
  dc: boolean;
  provinces: number;
  territories: number;
  territoriesTotal: number;
}

export function computeCounts(visits: Visit[], places: Place[], byId: Map<string, Place>, home: string): Counts {
  const ids = new Set(visits.map((v) => v.id).filter((id) => byId.has(id)));
  const has = (pred: (id: string) => boolean) => [...ids].filter(pred).length;
  return {
    countries: countedCountries(visits, byId, home).size,
    countriesTotal: TOTAL_COUNTRIES - 1, // minus home
    states: has((id) => id.startsWith('US-') && id !== 'US-DC'),
    dc: ids.has('US-DC'),
    provinces: has((id) => id.startsWith('CA-')),
    territories: has((id) => id.startsWith('T-')),
    territoriesTotal: places.filter((p) => p.kind === 'terr').length,
  };
}
