import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { geoNaturalEarth1, geoPath, type GeoPath, type GeoProjection } from 'd3-geo';
import { select, type Selection } from 'd3-selection';
import { zoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom';
import 'd3-transition';
import { computeCounts, isTappable, kindLabel } from './logic';
import PlacePanel from './PlacePanel';
import type { Place } from './types';
import type { useTravel } from './useTravel';

type Travel = ReturnType<typeof useTravel>;

interface MapState {
  svg: Selection<SVGSVGElement, unknown, null, undefined>;
  paths: Selection<SVGPathElement, Place, SVGGElement, unknown>;
  zoom: ZoomBehavior<SVGSVGElement, unknown>;
  path: GeoPath;
  proj: GeoProjection;
  W: number;
  H: number;
}

// Full 44px touch targets on phones; compact on laptop-width screens.
const toolBtn = 'min-h-11 px-3.5 sm:min-h-8 sm:px-2.5 sm:text-sm rounded-lg border border-border bg-card text-body hover:bg-hover transition-colors inline-flex items-center';

export default function MapView({ travel }: { travel: Travel }) {
  const { uid, places, byId, mapError, visits, visitById, home } = travel;
  const svgRef = useRef<SVGSVGElement>(null);
  const mapRef = useRef<MapState | null>(null);
  const [ready, setReady] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [params, setParams] = useSearchParams();
  const onTapRef = useRef<(id: string) => void>(() => {});
  onTapRef.current = (id: string) => {
    setSearching(false);
    setSelectedId(id);
  };

  // Build the map once the shapes have loaded.
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!places || !svgEl) return;
    const wrap = svgEl.parentElement as HTMLElement;
    const W = Math.max(300, wrap.clientWidth);
    const H = Math.max(300, wrap.clientHeight);
    const svg = select(svgEl).attr('viewBox', `0 0 ${W} ${H}`).attr('preserveAspectRatio', 'xMidYMid meet');
    const g = svg.select<SVGGElement>('g');
    g.selectAll('*').remove();

    const land = places.filter((p) => p.kind !== 'lake');
    const proj = geoNaturalEarth1().fitExtent(
      [[8, 8], [W - 8, H - 8]],
      { type: 'FeatureCollection', features: land.map((p) => ({ type: 'Feature', properties: {}, geometry: p.g })) },
    );
    const path = geoPath(proj);
    const paths = g
      .selectAll<SVGPathElement, Place>('path')
      .data(places)
      .join('path')
      .attr('d', (p) => path(p.g) ?? '');

    // A tap opens a place; a drag or pinch only moves the map. d3-zoom swallows the
    // click when the pointer moved more than 6px. Double-tap zoom is off so a quick
    // second tap can't zoom by accident — the +/− buttons do that.
    const z = zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 80])
      .translateExtent([[-W * 0.2, -H * 0.2], [W * 1.2, H * 1.2]])
      .clickDistance(6)
      .on('zoom', (e) => g.attr('transform', e.transform.toString()));
    svg.call(z).on('dblclick.zoom', null);
    g.on('click', (e: MouseEvent) => {
      const d = select(e.target as SVGPathElement).datum() as Place | undefined;
      if (d && isTappable(d)) onTapRef.current(d.id);
    });

    // On a tall phone screen the world is a thin strip, so open zoomed until the map
    // fills the height, centred on North America. Pan for the rest.
    const [[, y0], [, y1]] = path.bounds({ type: 'Sphere' });
    const k0 = Math.min(3, Math.max(1, (H * 0.9) / (y1 - y0)));
    if (k0 > 1.05) {
      const [cx, cy] = proj([-72, 35]) ?? [W / 2, H / 2];
      svg.call(z.transform, zoomIdentity.translate(W / 2, H / 2).scale(k0).translate(-cx, -cy));
    }

    mapRef.current = { svg, paths, zoom: z, path, proj, W, H };
    setReady(true);
    return () => {
      svg.on('.zoom', null);
      g.on('click', null);
      mapRef.current = null;
    };
  }, [places]);

  // Colour every shape from the current visits / home / selection.
  useEffect(() => {
    const m = mapRef.current;
    if (!ready || !m) return;
    m.paths.attr('class', (p) => {
      if (p.kind === 'lake') return 'lake';
      if (p.kind === 'other') return 'x';
      let c = `p c${p.c ?? 0}`;
      if (visitById.has(p.id)) c += ' v';
      else if (p.kind === 'country' && p.id === home) c += ' h';
      if (p.id === selectedId) c += ' sel';
      return c;
    });
    if (selectedId) {
      m.paths.filter((p) => p.id === selectedId).raise();
      m.paths.filter((p) => p.kind === 'lake').raise();
    }
  }, [ready, visitById, home, selectedId]);

  function zoomTo(id: string) {
    const m = mapRef.current;
    const p = byId.get(id);
    if (!m || !p) return;
    const [[x0, y0], [x1, y1]] = m.path.bounds(p.g);
    const k = Math.min(80, 0.6 / Math.max((x1 - x0) / m.W, (y1 - y0) / m.H));
    m.svg
      .transition()
      .duration(600)
      .call(m.zoom.transform, zoomIdentity.translate(m.W / 2, m.H / 2).scale(k).translate(-(x0 + x1) / 2, -(y0 + y1) / 2));
  }

  function zoomBy(f: number) {
    const m = mapRef.current;
    if (m) m.svg.transition().duration(250).call(m.zoom.scaleBy, f);
  }

  // Arriving from the Visited list (?place=ID): zoom there and open its panel.
  const placeParam = params.get('place');
  useEffect(() => {
    if (!ready || !placeParam) return;
    zoomTo(placeParam);
    setSelectedId(placeParam);
    setParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, placeParam]);

  const counts = places ? computeCounts(visits, places, byId, home) : null;
  const selected = selectedId ? byId.get(selectedId) : undefined;
  const homeShown = home !== 'USA' && home !== 'CAN';

  const q = query.trim().toLowerCase();
  const hits: Place[] = q && places
    ? places
        .filter((p) => isTappable(p) && p.name.toLowerCase().includes(q))
        .sort(
          (a, b) =>
            Number(!a.name.toLowerCase().startsWith(q)) - Number(!b.name.toLowerCase().startsWith(q)) ||
            a.name.localeCompare(b.name),
        )
        .slice(0, 8)
    : [];

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2.5 sm:py-2 shrink-0 flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex flex-wrap gap-2">
          <Link to="visited" className={toolBtn}>Visited</Link>
          <button type="button" className={toolBtn} onClick={() => { setSelectedId(null); setQuery(''); setSearching(true); }}>
            Search
          </button>
          <Link to="settings" className={toolBtn}>Settings</Link>
        </div>
        {counts && (
          <div className="flex flex-wrap gap-x-5 gap-y-1" aria-live="polite">
            <Stat n={counts.countries} label={`of ${counts.countriesTotal} countries`} />
            <Stat n={counts.states} label="of 50 US states" />
            <Stat n={counts.provinces} label="of 13 Canadian provinces and territories" />
            <Stat n={counts.territories} label={`of ${counts.territoriesTotal} territories`} />
          </div>
        )}
      </div>

      <div className="relative flex-1 min-h-0 travel-map">
        <svg ref={svgRef} className="absolute inset-0 w-full h-full block" role="img" aria-label="World map. Tap a place to see its name.">
          <g />
        </svg>
        {!places && (
          <div className="absolute inset-0 grid place-items-center text-muted px-6 text-center">
            {mapError ? "The map didn't load. Reload the page to try again." : 'Loading map…'}
          </div>
        )}
        <div className="absolute left-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] flex gap-3 text-xs rounded-lg px-2.5 py-1.5 bg-page/85 text-body" aria-hidden="true">
          <span><i className="tm-swatch" style={{ background: 'linear-gradient(135deg,var(--tm-v0) 50%,var(--tm-v1) 50%)' }} />Visited</span>
          {homeShown && <span><i className="tm-swatch" style={{ background: 'var(--tm-home)' }} />Home</span>}
        </div>
        <div className="absolute right-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] flex flex-col gap-1.5">
          <button type="button" className={`${toolBtn} w-11 sm:w-9 sm:min-h-9 justify-center text-xl sm:text-lg px-0`} aria-label="Zoom in" onClick={() => zoomBy(1.8)}>+</button>
          <button type="button" className={`${toolBtn} w-11 sm:w-9 sm:min-h-9 justify-center text-xl sm:text-lg px-0`} aria-label="Zoom out" onClick={() => zoomBy(1 / 1.8)}>&minus;</button>
        </div>
      </div>

      {(selected || searching) && (
        <section
          className="fixed z-30 inset-x-0 bottom-0 max-h-[78%] overflow-y-auto bg-card text-body border-t border-border rounded-t-2xl shadow-[0_-8px_30px_rgba(0,0,0,0.18)] px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:inset-x-auto sm:left-4 sm:bottom-4 sm:w-[400px] sm:rounded-2xl sm:border"
          aria-live="polite"
        >
          {selected ? (
            <PlacePanel
              key={selected.id}
              uid={uid}
              place={selected}
              visit={visitById.get(selected.id)}
              isHome={selected.id === home}
              onClose={() => setSelectedId(null)}
            />
          ) : (
            <>
              <h2 className="text-xl font-bold font-display text-heading">Search</h2>
              <label htmlFor="tm-q" className="block font-semibold text-sm mt-2 mb-1">Country, state, province or territory</label>
              <input
                id="tm-q"
                autoFocus
                autoComplete="off"
                className="w-full rounded-lg border border-border bg-card text-body px-3 py-2 text-base"
                placeholder="Type a name"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <ul className="mt-2">
                {q && hits.length === 0 && <li className="text-muted py-2">No matches.</li>}
                {hits.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="w-full min-h-11 text-left flex justify-between gap-3 rounded-lg px-2 py-2 hover:bg-hover"
                      onClick={() => {
                        setSearching(false);
                        zoomTo(p.id);
                        setSelectedId(p.id);
                      }}
                    >
                      <span>{p.name}</span>
                      <span className="text-muted text-sm shrink-0">
                        {kindLabel(p)}
                        {visitById.has(p.id) ? ', visited' : ''}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-3">
                <button type="button" className={toolBtn} onClick={() => setSearching(false)}>Close</button>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="flex items-baseline gap-1.5 whitespace-nowrap">
      <b className="text-xl sm:text-base text-heading tabular-nums">{n}</b>
      <span className="text-sm sm:text-xs text-secondary">{label}</span>
    </div>
  );
}

