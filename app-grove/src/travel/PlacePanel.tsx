import { useState } from 'react';
import { kindLabel } from './logic';
import { removeVisit, saveVisit } from './services';
import type { Place, Visit } from './types';

const btn = 'min-h-11 px-4 rounded-lg border border-border bg-card text-body hover:bg-hover transition-colors';
const btnPrimary = 'min-h-11 px-4 rounded-lg bg-primary text-on-primary font-semibold hover:bg-primary-hover transition-colors';
const btnDanger = 'min-h-11 px-4 rounded-lg border border-reminder-border text-reminder-text hover:bg-reminder transition-colors';
const field = 'w-full rounded-lg border border-border bg-card text-body px-3 py-2 text-base';

interface Props {
  uid: string;
  place: Place;
  visit: Visit | undefined;
  isHome: boolean;
  onClose: () => void;
}

/** Bottom panel for one tapped place. Nothing is saved until Log visit / Save is pressed. */
export default function PlacePanel({ uid, place, visit, isHome, onClose }: Props) {
  const [mode, setMode] = useState<'view' | 'edit' | 'confirm'>(visit ? 'view' : 'edit');
  const [year, setYear] = useState(visit?.year ?? '');
  const [note, setNote] = useState(visit?.note ?? '');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const y = year.replace(/\D/g, '').slice(0, 4);
    saveVisit(uid, place.id, y, note.trim()).catch((err) => console.error('Saving visit failed', err));
    setYear(y);
    setMode('view');
  }

  function remove() {
    removeVisit(uid, place.id).catch((err) => console.error('Removing visit failed', err));
    setYear('');
    setNote('');
    setMode('edit');
  }

  let body: React.ReactNode;
  if (place.kind === 'country' && isHome) {
    body = (
      <>
        <p>This is your home country, so it isn't counted.</p>
        <div className="flex flex-wrap gap-2 mt-4">
          <button type="button" className={btn} onClick={onClose}>Close</button>
        </div>
      </>
    );
  } else if (visit && mode !== 'edit') {
    body = (
      <>
        <span className="inline-block rounded-md px-2.5 py-1 font-semibold text-heading"
          style={{ background: 'color-mix(in srgb, var(--tm-v0) 24%, transparent)' }}>
          Visited{visit.year ? ` in ${visit.year}` : ''}
        </span>
        {visit.note && <p className="mt-3 whitespace-pre-wrap break-words">{visit.note}</p>}
        <div className="flex flex-wrap gap-2 mt-4">
          <button type="button" className={btn} onClick={() => setMode('edit')}>Edit</button>
          <button type="button" className={btnDanger} onClick={() => setMode('confirm')}>Remove visit</button>
          <button type="button" className={btn} onClick={onClose}>Close</button>
        </div>
        {mode === 'confirm' && (
          <div className="mt-4 rounded-lg bg-hover p-3">
            <p>Remove {place.name} from your visits? Its year and notes will be deleted too.</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <button type="button" className={btnDanger} onClick={remove}>Remove</button>
              <button type="button" className={btn} onClick={() => setMode('view')}>Keep it</button>
            </div>
          </div>
        )}
      </>
    );
  } else {
    body = (
      <form onSubmit={submit}>
        <label htmlFor="tm-year" className="block font-semibold text-sm mt-1 mb-1">
          Year <span className="font-normal text-muted">(optional)</span>
        </label>
        <input
          id="tm-year"
          className={`${field} max-w-[9em]`}
          inputMode="numeric"
          maxLength={4}
          autoComplete="off"
          value={year}
          onChange={(e) => setYear(e.target.value)}
        />
        <label htmlFor="tm-note" className="block font-semibold text-sm mt-3 mb-1">
          Notes <span className="font-normal text-muted">(optional)</span>
        </label>
        <textarea id="tm-note" className={`${field} min-h-20`} value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="flex flex-wrap gap-2 mt-4">
          <button type="submit" className={btnPrimary}>{visit ? 'Save' : 'Log visit'}</button>
          <button
            type="button"
            className={btn}
            onClick={() => {
              if (visit) {
                setYear(visit.year ?? '');
                setNote(visit.note ?? '');
                setMode('view');
              } else onClose();
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <>
      <h2 className="text-xl font-bold font-display text-heading leading-tight">{place.name}</h2>
      <p className="text-muted text-sm mb-3">{kindLabel(place)}</p>
      {body}
    </>
  );
}
