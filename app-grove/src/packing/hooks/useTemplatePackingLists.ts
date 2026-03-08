import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../shared/firebase';
import { useAuth } from '../../shared/AuthContext';
import type { TemplatePackingList } from '../types';

export function useTemplatePackingLists() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<TemplatePackingList[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'users', user.uid, 'templatePackingLists'),
      orderBy('createdAt', 'desc'),
    );
    return onSnapshot(q, (snap) => {
      setTemplates(snap.docs.map((d) => ({ id: d.id, ...d.data() } as TemplatePackingList)));
      setLoading(false);
    });
  }, [user]);

  return { templates, loading };
}
