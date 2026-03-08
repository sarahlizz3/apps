import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../shared/firebase';
import { useAuth } from '../../shared/AuthContext';
import type { TemplateSection } from '../types';

export function useTemplateSections() {
  const { user } = useAuth();
  const [sections, setSections] = useState<TemplateSection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'users', user.uid, 'templateSections'),
      orderBy('createdAt', 'desc'),
    );
    return onSnapshot(q, (snap) => {
      setSections(snap.docs.map((d) => ({ id: d.id, ...d.data() } as TemplateSection)));
      setLoading(false);
    });
  }, [user]);

  return { sections, loading };
}
