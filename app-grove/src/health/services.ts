import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  setDoc,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../shared/firebase';
import type { HealthData, PatientInfo } from './types';

function userCol(uid: string, name: string) {
  return collection(db, 'users', uid, name);
}

function userDocRef(uid: string) {
  return doc(db, 'users', uid);
}

export async function loadAllData(uid: string): Promise<HealthData> {
  const [meds, diags, provs, exps, notes, todos] = await Promise.all([
    getDocs(query(userCol(uid, 'medications'), orderBy('name'))),
    getDocs(query(userCol(uid, 'diagnoses'), orderBy('name'))),
    getDocs(query(userCol(uid, 'providers'), orderBy('name'))),
    getDocs(query(userCol(uid, 'explainers'), orderBy('title'))),
    getDocs(query(userCol(uid, 'notes'), orderBy('timestamp', 'desc'))),
    getDocs(query(userCol(uid, 'todos'), orderBy('createdAt', 'desc'))).catch(() => ({ docs: [] })),
  ]);

  return {
    medications: meds.docs.map(d => ({ id: d.id, ...d.data() } as HealthData['medications'][0])),
    diagnoses: diags.docs.map(d => ({ id: d.id, ...d.data() } as HealthData['diagnoses'][0])),
    providers: provs.docs.map(d => ({ id: d.id, ...d.data() } as HealthData['providers'][0])),
    explainers: exps.docs.map(d => ({ id: d.id, ...d.data() } as HealthData['explainers'][0])),
    notes: notes.docs.map(d => ({ id: d.id, ...d.data() } as HealthData['notes'][0])),
    todos: todos.docs.map(d => ({ id: d.id, ...d.data() } as HealthData['todos'][0])),
  };
}

export async function saveItem(
  uid: string,
  collectionName: string,
  data: Record<string, unknown>,
  id?: string,
): Promise<string | undefined> {
  if (id) {
    await updateDoc(doc(db, 'users', uid, collectionName, id), data);
    return id;
  } else {
    const ref = await addDoc(userCol(uid, collectionName), data);
    return ref.id;
  }
}

export async function deleteItem(uid: string, collectionName: string, id: string) {
  await deleteDoc(doc(db, 'users', uid, collectionName, id));
}

export async function loadPatientInfo(uid: string): Promise<PatientInfo> {
  const snap = await getDoc(userDocRef(uid));
  if (snap.exists()) {
    return (snap.data().patientInfo || {}) as PatientInfo;
  }
  return {} as PatientInfo;
}

export async function savePatientInfo(uid: string, data: PatientInfo) {
  await setDoc(userDocRef(uid), { patientInfo: data }, { merge: true });
}

export async function importItems(
  uid: string,
  collectionName: string,
  items: Record<string, unknown>[],
) {
  let count = 0;
  for (const item of items) {
    const cleanItem = { ...item };
    delete cleanItem.id;
    cleanItem.updatedAt = serverTimestamp();
    if (collectionName === 'notes' && cleanItem.timestamp) {
      cleanItem.timestamp = Timestamp.fromDate(new Date(cleanItem.timestamp as string));
    }
    await addDoc(userCol(uid, collectionName), cleanItem);
    count++;
  }
  return count;
}

export { serverTimestamp };
