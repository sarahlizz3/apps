import { useState, useEffect } from 'react';
import type { HealthData, Note } from '../types';
import { MED_COLUMNS } from '../types';
import { useToast } from './Toast';

interface Props {
  data: HealthData;
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

function getNoteTimestamp(n: Note): number {
  const ts = n.updatedAt || n.timestamp;
  if (!ts || typeof ts !== 'object' || !('seconds' in ts)) return 0;
  return ts.seconds * 1000;
}

export default function PrintSection({ data }: Props) {
  const { showToast } = useToast();
  const [provId, setProvId] = useState(data.providers[0]?.id || '');
  const [subtitle, setSubtitle] = useState('');
  const [includeSummary, setIncludeSummary] = useState(true);
  const [includeNotes, setIncludeNotes] = useState(true);
  const [selectedCols, setSelectedCols] = useState<string[]>([]);
  const [selectedExplainers, setSelectedExplainers] = useState<string[]>([]);
  const [noteExportStart, setNoteExportStart] = useState('');
  const [noteExportEnd, setNoteExportEnd] = useState('');
  const [singleNoteId, setSingleNoteId] = useState('');

  const optionalCols = MED_COLUMNS.filter(c => !c.alwaysShow);
  const provider = data.providers.find(p => p.id === provId);

  useEffect(() => {
    if (!provider) return;
    setSelectedCols(provider.defaultColumns || optionalCols.map(c => c.key));
    setSelectedExplainers(provider.defaultExplainers || []);
  }, [provId]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleCol(key: string) {
    setSelectedCols(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  }

  function toggleExp(id: string) {
    setSelectedExplainers(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }

  function generatePrintout() {
    if (!provider) return showToast('Please select a provider.', true);

    const allCols = [...MED_COLUMNS.filter(c => c.alwaysShow).map(c => c.key), ...selectedCols];
    const meds = data.medications.filter(m => !(m.excludeProviders || []).includes(provId));
    const provTags = provider.concernTags || [];
    const diagnoses = data.diagnoses.filter(d =>
      (d.concernTags || []).some(t => provTags.includes(t)) || provTags.length === 0
    );
    const explainers = data.explainers.filter(e => selectedExplainers.includes(e.id));
    const longExplainers = explainers.filter(e => e.type === 'long');
    const shortExplainers = explainers.filter(e => e.type === 'short');
    const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    const colMap: Record<string, string> = {
      name: 'Medication', dose: 'Dose', purpose: 'For', startDate: 'Started',
      weightConcern: 'Weight Concern', rlsConcern: 'RLS Concern', notes: 'Notes',
    };

    let html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<title>${provider.name} \u2014 ${today}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;font-size:11pt;color:#1a1a1a;line-height:1.45;padding:0.5in;max-width:8.5in}
h1{font-size:16pt;margin-bottom:2pt}.subtitle{font-size:11pt;color:#555;margin-bottom:4pt}.date{font-size:9pt;color:#888;margin-bottom:14pt}
h2{font-size:12pt;color:#1B3A5C;border-bottom:1.5px solid #1B3A5C;padding-bottom:3pt;margin:14pt 0 8pt 0}
table{width:100%;border-collapse:collapse;margin-bottom:10pt;font-size:10pt}th{background:#1B3A5C;color:white;text-align:left;padding:5pt 6pt;font-weight:600}
td{padding:4pt 6pt;border-bottom:1px solid #ddd;vertical-align:top}tr:nth-child(even) td{background:#f5f8fc}
.key-box{background:#FFF8E7;border-left:4px solid #B8860B;padding:8pt 12pt;margin:8pt 0;font-size:10pt}.key-label{font-weight:700;color:#B8860B}
.explainer{margin:6pt 0;font-size:10pt}.explainer-title{font-weight:600}
.short-fact{background:#f0f4f8;padding:4pt 8pt;margin:3pt 0;border-radius:3pt;font-size:9.5pt}.short-fact strong{color:#1B3A5C}
ul{margin:4pt 0 8pt 18pt;font-size:10pt}li{margin-bottom:3pt}
.visit-notes{background:#fffde7;border:1px solid #e6c94a;padding:8pt 12pt;margin:8pt 0;border-radius:4pt}.visit-notes-label{font-weight:700;color:#8a6a10;font-size:10pt}
.footer{margin-top:16pt;padding-top:8pt;border-top:1px solid #ccc;font-size:8pt;color:#999;text-align:center}
@media print{body{padding:0}}
</style></head><body>
<h1>Patient Health Overview \u2014 ${provider.name}</h1>
${subtitle ? `<div class="subtitle">${subtitle}</div>` : ''}
<div class="date">Updated: ${today}</div>`;

    if (includeSummary && provider.executiveSummary) {
      html += `<h2>Summary</h2><div class="key-box"><span class="key-label">KEY: </span>${provider.executiveSummary}</div>`;
    }

    html += `<h2>Current Medications</h2><table><thead><tr>${allCols.map(k => `<th>${colMap[k] || k}</th>`).join('')}</tr></thead><tbody>`;
    meds.forEach(m => {
      html += '<tr>';
      allCols.forEach(key => {
        let val = (m as unknown as Record<string, unknown>)[key] as string || '\u2014';
        if (key === 'startDate' && m.dateApproximate) val = '~' + val;
        html += `<td>${val}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody></table>';

    if (diagnoses.length > 0) {
      html += '<h2>Relevant Diagnoses</h2><ul>';
      diagnoses.forEach(d => {
        html += `<li><strong>${d.name}</strong>`;
        if (d.status) html += ` (${d.status})`;
        if (d.diagnosedDate) html += ` \u2014 ${d.diagnosedDate}`;
        if (d.notes) html += `<br><em>${d.notes}</em>`;
        html += '</li>';
      });
      html += '</ul>';
    }

    if (longExplainers.length > 0) {
      html += '<h2>Clinical Context</h2>';
      longExplainers.forEach(e => {
        html += `<div class="explainer"><div class="explainer-title">${e.title}</div><p>${e.content}</p></div>`;
      });
    }

    if (shortExplainers.length > 0) {
      html += '<h2>Key Facts</h2><div class="short-facts">';
      shortExplainers.forEach(e => {
        html += `<div class="short-fact"><strong>${e.title}:</strong> ${e.content}</div>`;
      });
      html += '</div>';
    }

    if (includeNotes && provider.visitNotes) {
      html += `<div class="visit-notes"><div class="visit-notes-label">For This Visit:</div><p>${provider.visitNotes}</p></div>`;
    }

    html += `<div class="footer">Patient Health Overview \u2014 Generated ${today} \u2014 Confidential</div></body></html>`;

    const filename = `${provider.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.html`;
    downloadFile(html, filename, 'text/html');
    showToast('Printout generated!');
  }

  function generateClaudeExport() {
    const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    let md = `# Health Data Export for Claude Review\n\n**Export Date:** ${today}\n\n---\n\n`;
    md += `## Instructions for Claude\n\nReview this patient health data export and provide feedback on:\n\n`;
    md += `1. **Medication interactions**\n2. **Missing concern tags**\n3. **Timeline patterns**\n4. **Temporary medication follow-up**\n5. **Provider coordination gaps**\n6. **General observations**\n\n---\n\n`;
    md += `## Ongoing Medications\n\n| Medication | Dose | Purpose | Started | Weight | RLS | Tags | Notes |\n|---|---|---|---|---|---|---|---|\n`;
    data.medications.filter(m => m.duration === 'ongoing').forEach(m => {
      md += `| ${m.name || '\u2014'} | ${m.dose || '\u2014'} | ${m.purpose || '\u2014'} | ${m.dateApproximate ? '~' : ''}${m.startDate || '\u2014'} | ${m.weightConcern || '\u2014'} | ${m.rlsConcern || '\u2014'} | ${(m.concernTags || []).join(', ') || '\u2014'} | ${m.notes || '\u2014'} |\n`;
    });
    md += `\n## Temporary Medications\n\n| Medication | Dose | Purpose | Started | End | Weight | RLS | Tags | Notes |\n|---|---|---|---|---|---|---|---|---|\n`;
    data.medications.filter(m => m.duration === 'temporary').forEach(m => {
      md += `| ${m.name || '\u2014'} | ${m.dose || '\u2014'} | ${m.purpose || '\u2014'} | ${m.dateApproximate ? '~' : ''}${m.startDate || '\u2014'} | ${m.endDate || 'ongoing?'} | ${m.weightConcern || '\u2014'} | ${m.rlsConcern || '\u2014'} | ${(m.concernTags || []).join(', ') || '\u2014'} | ${m.notes || '\u2014'} |\n`;
    });
    md += `\n## Diagnoses\n\n| Diagnosis | Status | Date | Tags | Notes |\n|---|---|---|---|---|\n`;
    data.diagnoses.forEach(d => {
      md += `| ${d.name || '\u2014'} | ${d.status || '\u2014'} | ${d.diagnosedDate || '\u2014'} | ${(d.concernTags || []).join(', ') || '\u2014'} | ${d.notes || '\u2014'} |\n`;
    });
    md += `\n## Providers\n\n| Provider | Role | Tags |\n|---|---|---|\n`;
    data.providers.forEach(p => { md += `| ${p.name} | ${p.role || '\u2014'} | ${(p.concernTags || []).join(', ') || '\u2014'} |\n`; });
    md += `\n## Explainer Blocks\n\n`;
    data.explainers.forEach(e => { md += `### ${e.title} (${e.type})\n\n${e.content}\n\n`; });
    md += `---\n\n*End of export*\n`;

    downloadFile(md, `health_export_${new Date().toISOString().slice(0, 10)}.md`, 'text/markdown');
    showToast('Export generated!');
  }

  function exportJSON() {
    function clean(items: Record<string, unknown>[]) {
      return items.map(item => {
        const copy = { ...item };
        delete copy.id;
        if (copy.updatedAt && typeof copy.updatedAt === 'object' && 'seconds' in (copy.updatedAt as object)) {
          copy.updatedAt = new Date(((copy.updatedAt as { seconds: number }).seconds) * 1000).toISOString();
        }
        if (copy.timestamp && typeof copy.timestamp === 'object' && 'seconds' in (copy.timestamp as object)) {
          copy.timestamp = new Date(((copy.timestamp as { seconds: number }).seconds) * 1000).toISOString();
        }
        return copy;
      });
    }

    const exportData = {
      exportDate: new Date().toISOString(),
      appVersion: '2.0',
      medications: clean(data.medications as unknown as Record<string, unknown>[]),
      diagnoses: clean(data.diagnoses as unknown as Record<string, unknown>[]),
      providers: clean(data.providers as unknown as Record<string, unknown>[]),
      explainers: clean(data.explainers as unknown as Record<string, unknown>[]),
      notes: clean(data.notes as unknown as Record<string, unknown>[]),
    };

    downloadFile(JSON.stringify(exportData, null, 2), `health_backup_${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
    showToast('JSON backup downloaded!');
  }

  function formatNoteForExport(n: Note): string {
    const provName = n.providerId === '__other'
      ? (n.providerNameOverride || 'Other')
      : (data.providers.find(p => p.id === n.providerId)?.name || 'Unknown');
    const date = getNoteTimestamp(n) ? new Date(getNoteTimestamp(n)).toLocaleString() : 'No date';
    return `## ${provName} — ${date}\n\n${n.text}\n\n---\n\n`;
  }

  function exportAllDoctorInfo() {
    let md = `# All Provider Information\n\n**Exported:** ${new Date().toLocaleDateString()}\n\n---\n\n`;
    data.providers.forEach(p => {
      md += `## ${p.name}\n\n`;
      if (p.role) md += `**Role:** ${p.role}\n\n`;
      if (p.practice) md += `**Practice:** ${p.practice}\n\n`;
      if (p.address) md += `**Address:** ${p.address}\n\n`;
      if (p.phone) md += `**Phone:** ${p.phone}\n\n`;
      if (p.fax) md += `**Fax:** ${p.fax}\n\n`;
      if (p.executiveSummary) md += `**Summary:** ${p.executiveSummary}\n\n`;
      if (p.notes) md += `**Notes:** ${p.notes}\n\n`;
      if ((p.concernTags || []).length) md += `**Tags:** ${p.concernTags.join(', ')}\n\n`;
      md += `---\n\n`;
    });
    downloadFile(md, `providers_${new Date().toISOString().slice(0, 10)}.md`, 'text/markdown');
    showToast('Provider info exported!');
  }

  function exportAllNotes() {
    let md = `# All Notes\n\n**Exported:** ${new Date().toLocaleDateString()}\n\n---\n\n`;
    data.notes.forEach(n => { md += formatNoteForExport(n); });
    downloadFile(md, `all_notes_${new Date().toISOString().slice(0, 10)}.md`, 'text/markdown');
    showToast('All notes exported!');
  }

  function exportNotesByDate() {
    if (!noteExportStart || !noteExportEnd) {
      showToast('Please select start and end dates.', true);
      return;
    }
    const startMs = new Date(noteExportStart).getTime();
    const endMs = new Date(noteExportEnd + 'T23:59:59').getTime();
    const filtered = data.notes.filter(n => {
      const ts = getNoteTimestamp(n);
      return ts >= startMs && ts <= endMs;
    });
    if (filtered.length === 0) {
      showToast('No notes found in that date range.', true);
      return;
    }
    let md = `# Notes: ${noteExportStart} to ${noteExportEnd}\n\n---\n\n`;
    filtered.forEach(n => { md += formatNoteForExport(n); });
    downloadFile(md, `notes_${noteExportStart}_to_${noteExportEnd}.md`, 'text/markdown');
    showToast(`Exported ${filtered.length} note(s)!`);
  }

  function exportSingleNote() {
    const note = data.notes.find(n => n.id === singleNoteId);
    if (!note) {
      showToast('Please select a note.', true);
      return;
    }
    const md = formatNoteForExport(note);
    const date = getNoteTimestamp(note) ? new Date(getNoteTimestamp(note)).toISOString().slice(0, 10) : 'undated';
    downloadFile(md, `note_${date}.md`, 'text/markdown');
    showToast('Note exported!');
  }

  const chipCls = (active: boolean) =>
    `px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
      active ? 'bg-primary text-on-primary border-primary' : 'bg-card text-secondary border-border hover:bg-hover'
    }`;

  return (
    <div className="space-y-6">
      {/* Provider Printout */}
      <div>
        <h3 className="text-sm font-semibold text-heading mb-3">Provider Printout</h3>
        <label className="block text-xs font-medium text-secondary mb-1">Provider</label>
        <select value={provId} onChange={e => setProvId(e.target.value)} className="w-full rounded-lg border border-border px-3 py-2 text-sm mb-3">
          {data.providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        <label className="block text-xs font-medium text-secondary mb-1">Subtitle (optional)</label>
        <input value={subtitle} onChange={e => setSubtitle(e.target.value)} className="w-full rounded-lg border border-border px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-focus" />

        <div className="flex gap-4 mb-3">
          <label className="flex items-center gap-2 text-sm text-secondary">
            <input type="checkbox" checked={includeSummary} onChange={e => setIncludeSummary(e.target.checked)} /> Include Summary
          </label>
          <label className="flex items-center gap-2 text-sm text-secondary">
            <input type="checkbox" checked={includeNotes} onChange={e => setIncludeNotes(e.target.checked)} /> Include Visit Notes
          </label>
        </div>

        <label className="block text-xs font-medium text-secondary mb-1">Medication Columns</label>
        <div className="flex flex-wrap gap-2 mb-3">
          {optionalCols.map(c => (
            <button key={c.key} type="button" onClick={() => toggleCol(c.key)} className={chipCls(selectedCols.includes(c.key))}>{c.label}</button>
          ))}
        </div>

        <label className="block text-xs font-medium text-secondary mb-1">Explainer Blocks</label>
        <div className="flex flex-wrap gap-2 mb-4">
          {data.explainers.map(e => (
            <button key={e.id} type="button" onClick={() => toggleExp(e.id)} className={chipCls(selectedExplainers.includes(e.id))}>{e.title}</button>
          ))}
        </div>

        <button onClick={generatePrintout} className="w-full bg-primary text-on-primary py-2 rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors">
          Generate Printout
        </button>
      </div>

      {/* Export Buttons */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-heading mb-3">Data Export</h3>
        <button onClick={exportAllDoctorInfo} className="w-full bg-card border border-border text-secondary py-2 rounded-lg text-sm font-medium hover:bg-hover transition-colors">
          Export All Doctor Info
        </button>
        <button onClick={exportAllNotes} className="w-full bg-card border border-border text-secondary py-2 rounded-lg text-sm font-medium hover:bg-hover transition-colors">
          Export All Notes
        </button>
        <button onClick={generateClaudeExport} className="w-full bg-card border border-border text-secondary py-2 rounded-lg text-sm font-medium hover:bg-hover transition-colors">
          Claude Export (Markdown)
        </button>
        <button onClick={exportJSON} className="w-full bg-card border border-border text-secondary py-2 rounded-lg text-sm font-medium hover:bg-hover transition-colors">
          JSON Backup
        </button>
      </div>

      {/* Notes Export by Date */}
      <div>
        <h3 className="text-sm font-semibold text-heading mb-3">Export Notes by Date Range</h3>
        <div className="flex gap-2 mb-3">
          <div className="flex-1">
            <label className="block text-xs text-secondary mb-1">From</label>
            <input type="date" value={noteExportStart} onChange={e => setNoteExportStart(e.target.value)} className="w-full rounded-lg border border-border px-3 py-2 text-sm" />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-secondary mb-1">To</label>
            <input type="date" value={noteExportEnd} onChange={e => setNoteExportEnd(e.target.value)} className="w-full rounded-lg border border-border px-3 py-2 text-sm" />
          </div>
        </div>
        <button onClick={exportNotesByDate} className="w-full bg-card border border-border text-secondary py-2 rounded-lg text-sm font-medium hover:bg-hover transition-colors">
          Export Notes in Range
        </button>
      </div>

      {/* Export Single Note */}
      <div>
        <h3 className="text-sm font-semibold text-heading mb-3">Export Individual Note</h3>
        <select value={singleNoteId} onChange={e => setSingleNoteId(e.target.value)} className="w-full rounded-lg border border-border px-3 py-2 text-sm mb-3">
          <option value="">Select a note...</option>
          {data.notes.map(n => {
            const provName = n.providerId === '__other'
              ? (n.providerNameOverride || 'Other')
              : (data.providers.find(p => p.id === n.providerId)?.name || 'Unknown');
            const date = getNoteTimestamp(n) ? new Date(getNoteTimestamp(n)).toLocaleDateString() : 'No date';
            const preview = n.text.slice(0, 40) + (n.text.length > 40 ? '...' : '');
            return <option key={n.id} value={n.id}>{date} — {provName}: {preview}</option>;
          })}
        </select>
        <button onClick={exportSingleNote} className="w-full bg-card border border-border text-secondary py-2 rounded-lg text-sm font-medium hover:bg-hover transition-colors">
          Export Selected Note
        </button>
      </div>
    </div>
  );
}
