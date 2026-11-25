import { useEffect, useMemo, useState } from 'react';
import { onSnapshot } from 'firebase/firestore';
import { useAuth } from '../shared/AuthContext';
import { loadPlaces } from './logic';
import { travelSettingsDoc, visitsCol } from './services';
import type { Place, Visit } from './types';

const DEFAULT_HOME = 'USA';

export function useTravel() {
  const { user } = useAuth();
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [visitsLoaded, setVisitsLoaded] = useState(false);
  const [home, setHome] = useState(DEFAULT_HOME);

  useEffect(() => {
    let alive = true;
    loadPlaces()
      .then((p) => alive && setPlaces(p))
      .catch((e: Error) => alive && setMapError(e.message));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    const offVisits = onSnapshot(visitsCol(user.uid), (snap) => {
      setVisits(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Visit, 'id'>) })));
      setVisitsLoaded(true);
    });
    const offSettings = onSnapshot(travelSettingsDoc(user.uid), (snap) => {
      setHome((snap.data()?.home as string | undefined) ?? DEFAULT_HOME);
    });
    return () => {
      offVisits();
      offSettings();
    };
  }, [user]);

  const byId = useMemo(() => new Map((places ?? []).map((p) => [p.id, p])), [places]);
  const visitById = useMemo(() => new Map(visits.map((v) => [v.id, v])), [visits]);

  return { uid: user?.uid ?? '', places, byId, mapError, visits, visitById, visitsLoaded, home };
}
