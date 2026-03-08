import { Timestamp } from 'firebase/firestore';

export interface TemplateSection {
  id: string;
  name: string;
  items: string[];
  rank?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface TemplatePLSection {
  id: string;
  name: string;
  items: string[];
  rank?: number;
}

export interface TemplatePackingList {
  id: string;
  name: string;
  sections: TemplatePLSection[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ReminderTemplate {
  id: string;
  text: string;
  createdAt: Timestamp;
}

export interface TripReminder {
  id: string;
  text: string;
  checked: boolean;
}

export interface TripItem {
  id: string;
  name: string;
  checked: boolean;
}

export interface TripSection {
  id: string;
  name: string;
  items: TripItem[];
  rank?: number;
}

export interface TripList {
  id: string;
  name: string;
  archived: boolean;
  reminders: TripReminder[];
  sections: TripSection[];
  totalItemCount: number;
  checkedItemCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
