import { useState, useEffect } from 'react';
import type { HealthData, PatientInfo } from '../types';
import { useToast } from './Toast';
import { useAuth } from '../../shared/AuthContext';
import { loadPatientInfo, savePatientInfo } from '../services';

interface Props {
  data: HealthData;
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const { showToast } = useToast();
  if (!value) return null;

  function copy() {
    navigator.clipboard.writeText(value).then(() => showToast('Copied!'));
  }

  return (
    <div onClick={copy} className="flex justify-between items-center px-3 py-2 border-b border-border cursor-pointer hover:bg-hover transition-colors">
      <span className="text-xs font-medium text-muted">{label}</span>
      <span className="text-sm text-body">{value}</span>
    </div>
  );
}

export default function FormInfoSection({ data }: Props) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [patientInfo, setPatientInfo] = useState<PatientInfo>({} as PatientInfo);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (user) loadPatientInfo(user.uid).then(setPatientInfo);
  }, [user]);

  async function handleSavePatientInfo(info: PatientInfo) {
    if (!user) return;
    try {
      await savePatientInfo(user.uid, info);
      setPatientInfo(info);
      setShowModal(false);
      showToast('Patient info saved!');
    } catch (err) {
      showToast('Error saving: ' + (err as Error).message, true);
    }
  }

  const ongoingMeds = data.medications.filter(m => m.duration === 'ongoing');
  const activeDiags = data.diagnoses.filter(d => d.status !== 'Resolved');
  const surgeryExplainer = data.explainers.find(e => e.title.toLowerCase().includes('surgical history'));
  const allergyExplainer = data.explainers.find(e => e.title.toLowerCase().includes('allergies'));

  return (
    <div className="space-y-6">
      {/* Patient Info */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-heading">Patient Info</h3>
          <button onClick={() => setShowModal(true)} className="text-xs text-primary hover:underline">Edit</button>
        </div>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <CopyRow label="Name" value={patientInfo.fullName} />
          <CopyRow label="DOB" value={patientInfo.dob} />
          <CopyRow label="Phone" value={patientInfo.phone} />
          <CopyRow label="Email" value={patientInfo.email} />
          <CopyRow label="Address" value={patientInfo.address} />
          <CopyRow label="Emergency" value={patientInfo.emergencyContact} />
          <CopyRow label="Insurance" value={patientInfo.insurance} />
          <CopyRow label="Member ID" value={patientInfo.memberId} />
          <CopyRow label="Group #" value={patientInfo.groupNumber} />
          <CopyRow label="Pharmacy" value={patientInfo.pharmacy} />
        </div>
      </div>

      {/* Ongoing Medications */}
      <div>
        <h3 className="text-sm font-semibold text-heading mb-2">Current Medications</h3>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {ongoingMeds.length === 0 ? (
            <p className="text-secondary text-xs p-3">No ongoing medications.</p>
          ) : ongoingMeds.map(m => (
            <CopyRow key={m.id} label={m.purpose || ''} value={`${m.name} ${m.dose || ''}`} />
          ))}
        </div>
      </div>

      {/* Surgeries */}
      <div>
        <h3 className="text-sm font-semibold text-heading mb-2">Surgical History</h3>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {surgeryExplainer ? (
            surgeryExplainer.content.split(',').map((s, i) => (
              <CopyRow key={i} label="" value={s.trim()} />
            ))
          ) : (
            <p className="text-secondary text-xs p-3">Add a "Surgical History" explainer block.</p>
          )}
        </div>
      </div>

      {/* Allergies */}
      <div>
        <h3 className="text-sm font-semibold text-heading mb-2">Allergies</h3>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {allergyExplainer ? (
            <CopyRow label="" value={allergyExplainer.content} />
          ) : (
            <p className="text-secondary text-xs p-3">Add an "Allergies" explainer block.</p>
          )}
        </div>
      </div>

      {/* Active Diagnoses */}
      <div>
        <h3 className="text-sm font-semibold text-heading mb-2">Active Diagnoses</h3>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {activeDiags.length === 0 ? (
            <p className="text-secondary text-xs p-3">No active diagnoses.</p>
          ) : activeDiags.map(d => (
            <CopyRow key={d.id} label={`${d.status || ''} ${d.diagnosedDate ? '\u2014 ' + d.diagnosedDate : ''}`} value={d.name} />
          ))}
        </div>
      </div>

      {/* Providers */}
      <div>
        <h3 className="text-sm font-semibold text-heading mb-2">Providers</h3>
        {data.providers.map(p => (
          <div key={p.id} className="bg-card border border-border rounded-xl overflow-hidden mb-2">
            <div className="px-3 py-2 bg-section-header border-b border-section-border font-semibold text-sm text-heading">{p.name}</div>
            <CopyRow label="Role" value={p.role} />
            <CopyRow label="Practice" value={p.practice} />
            <CopyRow label="Address" value={p.address} />
            <CopyRow label="Phone" value={p.phone} />
            <CopyRow label="Fax" value={p.fax} />
          </div>
        ))}
      </div>

      {showModal && (
        <PatientInfoModal info={patientInfo} onSave={handleSavePatientInfo} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}

function PatientInfoModal({ info, onSave, onClose }: {
  info: PatientInfo;
  onSave: (data: PatientInfo) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<PatientInfo>({ ...info });
  const set = (key: keyof PatientInfo) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  const inputCls = "w-full rounded-lg border border-border px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-focus";

  const fields: [keyof PatientInfo, string][] = [
    ['fullName', 'Full Name'], ['dob', 'Date of Birth'], ['phone', 'Phone'], ['email', 'Email'],
    ['address', 'Address'], ['emergencyContact', 'Emergency Contact'],
    ['insurance', 'Insurance'], ['memberId', 'Member ID'], ['groupNumber', 'Group Number'], ['pharmacy', 'Pharmacy'],
  ];

  return (
    <div className="fixed inset-0 bg-black/40 z-40 flex items-start justify-center pt-8 px-4 overflow-y-auto" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-card border border-border rounded-xl w-full max-w-lg p-5 mb-8">
        <h2 className="text-lg font-semibold text-heading mb-4">Edit Patient Info</h2>
        {fields.map(([key, label]) => (
          <div key={key}>
            <label className="block text-xs font-medium text-secondary mb-1">{label}</label>
            <input value={form[key] || ''} onChange={set(key)} className={inputCls} />
          </div>
        ))}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-secondary">Cancel</button>
          <button onClick={() => onSave(form)} className="px-4 py-2 text-sm bg-primary text-on-primary rounded-lg hover:bg-primary-hover transition-colors">Save</button>
        </div>
      </div>
    </div>
  );
}
