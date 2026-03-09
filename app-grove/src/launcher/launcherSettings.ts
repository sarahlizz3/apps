import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../shared/firebase';

export interface ExternalApp {
  id: string;
  name: string;
  url: string;
  description: string;
}

export interface LauncherSettings {
  appOrder: string[];
  externalApps: ExternalApp[];
}

const DEFAULT_ORDER = ['packing', 'health', 'recipes'];
const DEFAULTS: LauncherSettings = { appOrder: DEFAULT_ORDER, externalApps: [] };

function settingsDoc(uid: string) {
  return doc(db, 'users', uid, 'settings', 'launcher');
}

export async function getLauncherSettings(uid: string): Promise<LauncherSettings> {
  try {
    const snap = await getDoc(settingsDoc(uid));
    if (!snap.exists()) return DEFAULTS;
    const data = snap.data();
    return {
      appOrder: data.appOrder ?? DEFAULT_ORDER,
      externalApps: data.externalApps ?? [],
    };
  } catch (e) {
    console.error('Failed to load launcher settings', e);
    return DEFAULTS;
  }
}

export async function saveLauncherSettings(uid: string, settings: LauncherSettings): Promise<void> {
  await setDoc(settingsDoc(uid), settings);
}
