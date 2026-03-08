import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../shared/firebase';
import { useAuth } from '../../shared/AuthContext';
import type { ReminderTemplate } from '../types';

export function useReminderTemplates() {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<ReminderTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'users', user.uid, 'reminderTemplates'),
      orderBy('createdAt', 'desc'),
    );
    return onSnapshot(q, (snap) => {
      setReminders(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ReminderTemplate)));
      setLoading(false);
    });
  }, [user]);

  return { reminders, loading };
}
