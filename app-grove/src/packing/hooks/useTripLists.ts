import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../shared/firebase';
import { useAuth } from '../../shared/AuthContext';
import type { TripList } from '../types';

export function useTripLists() {
  const { user } = useAuth();
  const [trips, setTrips] = useState<TripList[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'users', user.uid, 'tripLists'),
      orderBy('createdAt', 'desc'),
    );
    return onSnapshot(q, (snap) => {
      setTrips(snap.docs.map((d) => ({ id: d.id, ...d.data() } as TripList)));
      setLoading(false);
    });
  }, [user]);

  return { trips, loading };
}
