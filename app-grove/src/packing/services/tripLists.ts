import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../shared/firebase';
import type { TripSection, TripItem, TripReminder, TripList } from '../types';

function tripListsCol(userId: string) {
  return collection(db, 'users', userId, 'tripLists');
}

function tripListDoc(userId: string, tripId: string) {
  return doc(db, 'users', userId, 'tripLists', tripId);
}

export async function createTripList(userId: string, name: string) {
  const ref = doc(tripListsCol(userId));
  await setDoc(ref, {
    name,
    archived: false,
    reminders: [],
    sections: [],
    totalItemCount: 0,
    checkedItemCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function createTripFromTemplate(
  userId: string,
  name: string,
  templateSections: { name: string; items: string[]; rank?: number }[],
) {
  const sections: TripSection[] = templateSections.map((s) => ({
    id: crypto.randomUUID(),
    name: s.name,
    items: s.items.map((item) => ({
      id: crypto.randomUUID(),
      name: item,
      checked: false,
    })),
    ...(s.rank != null ? { rank: s.rank } : {}),
  }));
  const totalItemCount = sections.reduce((sum, s) => sum + s.items.length, 0);

  const ref = doc(tripListsCol(userId));
  await setDoc(ref, {
    name,
    archived: false,
    reminders: [],
    sections,
    totalItemCount,
    checkedItemCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function deleteTripList(userId: string, tripId: string) {
  await deleteDoc(tripListDoc(userId, tripId));
}

export async function updateTripName(userId: string, tripId: string, name: string) {
  await updateDoc(tripListDoc(userId, tripId), { name, updatedAt: serverTimestamp() });
}

export async function archiveTripList(userId: string, tripId: string, archived: boolean) {
  await updateDoc(tripListDoc(userId, tripId), { archived, updatedAt: serverTimestamp() });
}

// --- Sections ---

export async function addSection(userId: string, tripId: string, trip: TripList, sectionName: string) {
  const newSection: TripSection = {
    id: crypto.randomUUID(),
    name: sectionName,
    items: [],
  };
  await updateDoc(tripListDoc(userId, tripId), {
    sections: [...trip.sections, newSection],
    updatedAt: serverTimestamp(),
  });
}

export async function deleteSection(userId: string, tripId: string, trip: TripList, sectionId: string) {
  const section = trip.sections.find((s) => s.id === sectionId);
  if (!section) return;
  const removedTotal = section.items.length;
  const removedChecked = section.items.filter((i) => i.checked).length;
  await updateDoc(tripListDoc(userId, tripId), {
    sections: trip.sections.filter((s) => s.id !== sectionId),
    totalItemCount: trip.totalItemCount - removedTotal,
    checkedItemCount: trip.checkedItemCount - removedChecked,
    updatedAt: serverTimestamp(),
  });
}

export async function renameSection(userId: string, tripId: string, trip: TripList, sectionId: string, name: string) {
  await updateDoc(tripListDoc(userId, tripId), {
    sections: trip.sections.map((s) => (s.id === sectionId ? { ...s, name } : s)),
    updatedAt: serverTimestamp(),
  });
}

export async function updateSectionRank(userId: string, tripId: string, trip: TripList, sectionId: string, rank: number | null) {
  await updateDoc(tripListDoc(userId, tripId), {
    sections: trip.sections.map((s) =>
      s.id === sectionId
        ? rank != null ? { ...s, rank } : (() => { const { rank: _, ...rest } = s; return rest; })()
        : s,
    ),
    updatedAt: serverTimestamp(),
  });
}

// --- Items ---

export async function addItem(userId: string, tripId: string, trip: TripList, sectionId: string, itemName: string) {
  const newItem: TripItem = { id: crypto.randomUUID(), name: itemName, checked: false };
  await updateDoc(tripListDoc(userId, tripId), {
    sections: trip.sections.map((s) =>
      s.id === sectionId ? { ...s, items: [...s.items, newItem] } : s,
    ),
    totalItemCount: trip.totalItemCount + 1,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteItem(userId: string, tripId: string, trip: TripList, sectionId: string, itemId: string) {
  const section = trip.sections.find((s) => s.id === sectionId);
  const item = section?.items.find((i) => i.id === itemId);
  if (!item) return;
  await updateDoc(tripListDoc(userId, tripId), {
    sections: trip.sections.map((s) =>
      s.id === sectionId ? { ...s, items: s.items.filter((i) => i.id !== itemId) } : s,
    ),
    totalItemCount: trip.totalItemCount - 1,
    checkedItemCount: item.checked ? trip.checkedItemCount - 1 : trip.checkedItemCount,
    updatedAt: serverTimestamp(),
  });
}

export async function renameItem(userId: string, tripId: string, trip: TripList, sectionId: string, itemId: string, name: string) {
  await updateDoc(tripListDoc(userId, tripId), {
    sections: trip.sections.map((s) =>
      s.id === sectionId
        ? { ...s, items: s.items.map((i) => (i.id === itemId ? { ...i, name } : i)) }
        : s,
    ),
    updatedAt: serverTimestamp(),
  });
}

export async function toggleItem(userId: string, tripId: string, trip: TripList, sectionId: string, itemId: string) {
  const section = trip.sections.find((s) => s.id === sectionId);
  const item = section?.items.find((i) => i.id === itemId);
  if (!item) return;
  const nowChecked = !item.checked;
  await updateDoc(tripListDoc(userId, tripId), {
    sections: trip.sections.map((s) =>
      s.id === sectionId
        ? {
            ...s,
            items: s.items.map((i) => (i.id === itemId ? { ...i, checked: nowChecked } : i)),
          }
        : s,
    ),
    checkedItemCount: nowChecked ? trip.checkedItemCount + 1 : trip.checkedItemCount - 1,
    updatedAt: serverTimestamp(),
  });
}

// --- Reorder ---

export async function reorderSections(userId: string, tripId: string, trip: TripList, fromIndex: number, toIndex: number) {
  const sections = [...trip.sections];
  const [moved] = sections.splice(fromIndex, 1);
  sections.splice(toIndex, 0, moved);
  await updateDoc(tripListDoc(userId, tripId), { sections, updatedAt: serverTimestamp() });
}

export async function reorderItems(userId: string, tripId: string, trip: TripList, sectionId: string, fromIndex: number, toIndex: number) {
  await updateDoc(tripListDoc(userId, tripId), {
    sections: trip.sections.map((s) => {
      if (s.id !== sectionId) return s;
      const items = [...s.items];
      const [moved] = items.splice(fromIndex, 1);
      items.splice(toIndex, 0, moved);
      return { ...s, items };
    }),
    updatedAt: serverTimestamp(),
  });
}

// --- Reminders ---

export async function addReminder(userId: string, tripId: string, trip: TripList, text: string) {
  const newReminder: TripReminder = { id: crypto.randomUUID(), text, checked: false };
  await updateDoc(tripListDoc(userId, tripId), {
    reminders: [...trip.reminders, newReminder],
    updatedAt: serverTimestamp(),
  });
}

export async function deleteReminder(userId: string, tripId: string, trip: TripList, reminderId: string) {
  await updateDoc(tripListDoc(userId, tripId), {
    reminders: trip.reminders.filter((r) => r.id !== reminderId),
    updatedAt: serverTimestamp(),
  });
}

export async function toggleReminder(userId: string, tripId: string, trip: TripList, reminderId: string) {
  await updateDoc(tripListDoc(userId, tripId), {
    reminders: trip.reminders.map((r) =>
      r.id === reminderId ? { ...r, checked: !r.checked } : r,
    ),
    updatedAt: serverTimestamp(),
  });
}

// --- Import sections into trip ---

export async function importSectionsIntoTrip(
  userId: string,
  tripId: string,
  trip: TripList,
  templateSections: { name: string; items: string[]; rank?: number }[],
) {
  const newSections: TripSection[] = templateSections.map((s) => ({
    id: crypto.randomUUID(),
    name: s.name,
    items: s.items.map((item) => ({
      id: crypto.randomUUID(),
      name: item,
      checked: false,
    })),
    ...(s.rank != null ? { rank: s.rank } : {}),
  }));
  const addedCount = newSections.reduce((sum, s) => sum + s.items.length, 0);
  await updateDoc(tripListDoc(userId, tripId), {
    sections: [...trip.sections, ...newSections],
    totalItemCount: trip.totalItemCount + addedCount,
    updatedAt: serverTimestamp(),
  });
}

export async function importRemindersIntoTrip(
  userId: string,
  tripId: string,
  trip: TripList,
  reminderTexts: string[],
) {
  const newReminders: TripReminder[] = reminderTexts.map((text) => ({
    id: crypto.randomUUID(),
    text,
    checked: false,
  }));
  await updateDoc(tripListDoc(userId, tripId), {
    reminders: [...trip.reminders, ...newReminders],
    updatedAt: serverTimestamp(),
  });
}
