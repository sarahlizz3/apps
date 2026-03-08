import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../shared/AuthContext';
import { loadAllData } from './services';
import type { HealthData } from './types';

const empty: HealthData = {
  medications: [],
  diagnoses: [],
  providers: [],
  explainers: [],
  notes: [],
  todos: [],
};

export function useHealthData() {
  const { user } = useAuth();
  const [data, setData] = useState<HealthData>(empty);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const result = await loadAllData(user.uid);
      setData(result);
    } catch (err) {
      console.error('Failed to load health data:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, setData, loading, reload };
}
