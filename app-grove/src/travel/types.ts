import type { Geometry } from 'geojson';

/**
 * One shape on the map, from places.json (built by scripts/build-travel-map.py).
 *  country — one of the 195 sovereign countries, id is ISO 3166 alpha-3 ("FRA")
 *  us / ca — a US state (+ D.C.) or Canadian province/territory ("US-MI", "CA-ON")
 *  terr    — an island territory logged on its own ("T-MQ")
 *  other   — drawn but not tappable (Greenland, Hong Kong, …)
 *  lake    — drawn over the land in the sea colour
 */
export type PlaceKind = 'country' | 'us' | 'ca' | 'terr' | 'other' | 'lake';

export interface Place {
  id: string;
  name: string;
  kind: PlaceKind;
  /** Colour slot 0–5; neighbouring places always differ. */
  c?: number;
  g: Geometry;
}

export interface Visit {
  /** Place id — also the Firestore doc id. */
  id: string;
  year?: string;
  note?: string;
}

export interface TravelSettings {
  /** Country id (ISO alpha-3) that is never counted. */
  home: string;
}
