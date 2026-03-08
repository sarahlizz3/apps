import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../shared/firebase';
import { useAuth } from '../../shared/AuthContext';
import type { TemplateSection } from '../types';

export function useTemplateSection(sectionId: string | undefined) {
  const { user } = useAuth();
  const [section, setSection] = useState<TemplateSection | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !sectionId) return;
    return onSnapshot(doc(db, 'users', user.uid, 'templateSections', sectionId), (snap) => {
      if (snap.exists()) {
        setSection({ id: snap.id, ...snap.data() } as TemplateSection);
      } else {
        setSection(null);
      }
      setLoading(false);
    });
  }, [user, sectionId]);

  return { section, loading };
}
