import type { Timestamp } from 'firebase/firestore';

export interface Medication {
  id: string;
  name: string;
  dose: string;
  purpose: string;
  duration: 'ongoing' | 'temporary';
  startDate: string;
  dateApproximate: boolean;
  endDate: string;
  weightConcern: string;
  rlsConcern: string;
  notes: string;
  concernTags: string[];
  excludeProviders: string[];
  updatedAt?: Timestamp;
}

export interface Diagnosis {
  id: string;
  name: string;
  status: 'Diagnosed' | 'Suspected' | 'Resolved' | 'Monitoring';
  diagnosedDate: string;
  notes: string;
  concernTags: string[];
  updatedAt?: Timestamp;
}

export interface Provider {
  id: string;
  name: string;
  role: string;
  practice: string;
  address: string;
  phone: string;
  fax: string;
  executiveSummary: string;
  visitNotes: string;
  notes: string;
  concernTags: string[];
  defaultColumns: string[];
  defaultExplainers: string[];
  updatedAt?: Timestamp;
}

export interface Explainer {
  id: string;
  title: string;
  type: 'long' | 'short';
  content: string;
  concernTags: string[];
  updatedAt?: Timestamp;
}

export interface Note {
  id: string;
  providerId: string;
  providerNameOverride?: string;
  text: string;
  timestamp?: Timestamp | { seconds: number };
  updatedAt?: Timestamp | { seconds: number };
}

export interface TodoItem {
  id: string;
  title: string;
  recurrence: {
    type: 'yearly' | 'monthly' | 'once';
    month?: number;
    day?: number;
  } | null;
  completed: boolean;
  completedAt?: Timestamp | { seconds: number };
  createdAt?: Timestamp | { seconds: number };
}

export interface PatientInfo {
  fullName: string;
  dob: string;
  phone: string;
  email: string;
  address: string;
  emergencyContact: string;
  insurance: string;
  memberId: string;
  groupNumber: string;
  pharmacy: string;
}

export interface HealthData {
  medications: Medication[];
  diagnoses: Diagnosis[];
  providers: Provider[];
  explainers: Explainer[];
  notes: Note[];
  todos: TodoItem[];
}

export const CONCERN_TAGS = [
  'Weight', 'RLS', 'Insomnia', 'ADHD', 'Anxiety',
  'Hormonal', 'Iron', 'Post-surgical', 'Sensory/ND',
];

export const MED_COLUMNS = [
  { key: 'name', label: 'Medication', alwaysShow: true },
  { key: 'dose', label: 'Dose', alwaysShow: true },
  { key: 'purpose', label: 'Purpose', alwaysShow: true },
  { key: 'startDate', label: 'Started', alwaysShow: false },
  { key: 'weightConcern', label: 'Weight Concern', alwaysShow: false },
  { key: 'rlsConcern', label: 'RLS Concern', alwaysShow: false },
  { key: 'notes', label: 'Notes', alwaysShow: false },
] as const;
