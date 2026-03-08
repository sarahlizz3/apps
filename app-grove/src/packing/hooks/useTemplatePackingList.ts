import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../shared/firebase';
import { useAuth } from '../../shared/AuthContext';
import type { TemplatePackingList } from '../types';

export function useTemplatePackingList(templateId: string | undefined) {
  const { user } = useAuth();
  const [template, setTemplate] = useState<TemplatePackingList | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !templateId) return;
    return onSnapshot(doc(db, 'users', user.uid, 'templatePackingLists', templateId), (snap) => {
      if (snap.exists()) {
        setTemplate({ id: snap.id, ...snap.data() } as TemplatePackingList);
      } else {
        setTemplate(null);
      }
      setLoading(false);
    });
  }, [user, templateId]);

  return { template, loading };
}
