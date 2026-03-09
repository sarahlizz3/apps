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

const SETTINGS_DOC = doc(db, 'settings', 'launcher');

const DEFAULT_ORDER = ['packing', 'health', 'recipes'];

export async function getLauncherSettings(): Promise<LauncherSettings> {
  const snap = await getDoc(SETTINGS_DOC);
  if (!snap.exists()) {
    return { appOrder: DEFAULT_ORDER, externalApps: [] };
  }
  const data = snap.data();
  return {
    appOrder: data.appOrder ?? DEFAULT_ORDER,
    externalApps: data.externalApps ?? [],
  };
}

export async function saveLauncherSettings(settings: LauncherSettings): Promise<void> {
  await setDoc(SETTINGS_DOC, settings);
}
