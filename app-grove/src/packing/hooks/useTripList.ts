import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../shared/firebase';
import { useAuth } from '../../shared/AuthContext';
import type { TripList } from '../types';

export function useTripList(tripId: string | undefined) {
  const { user } = useAuth();
  const [trip, setTrip] = useState<TripList | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !tripId) return;
    return onSnapshot(doc(db, 'users', user.uid, 'tripLists', tripId), (snap) => {
      if (snap.exists()) {
        setTrip({ id: snap.id, ...snap.data() } as TripList);
      } else {
        setTrip(null);
      }
      setLoading(false);
    });
  }, [user, tripId]);

  return { trip, loading };
}
