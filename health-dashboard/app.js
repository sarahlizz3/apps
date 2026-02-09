/* ============================================
   HEALTH DASHBOARD — APPLICATION
   ============================================ */

// =============================================
// FIREBASE CONFIG
// Replace these with your Firebase project values
// =============================================
const firebaseConfig = {
  apiKey: "AIzaSyDA5-WmhJIN8-h2Rt-tyNtPBzzqZnmq9KY",
  authDomain: "health-apps-c1584.firebaseapp.com",
  projectId: "health-apps-c1584",
  storageBucket: "health-apps-c1584.firebasestorage.app",
  messagingSenderId: "563924917786",
  appId: "1:563924917786:web:561e7b3267d0210f913ba3"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// =============================================
// GLOBAL STATE
// =============================================
let currentUser = null;
let appData = {
  medications: [],
  diagnoses: [],
  providers: [],
  explainers: [],
  notes: []
};

const CONCERN_TAGS = [
  "Weight", "RLS", "Insomnia", "ADHD", "Anxiety",
  "Hormonal", "Iron", "Post-surgical", "Sensory/ND"
];

const MED_COLUMNS = [
  { key: "name", label: "Medication", alwaysShow: true },
  { key: "dose", label: "Dose", alwaysShow: true },
  { key: "purpose", label: "Purpose", alwaysShow: true },
  { key: "startDate", label: "Started", alwaysShow: false },
  { key: "weightConcern", label: "Weight Concern", alwaysShow: false },
  { key: "rlsConcern", label: "RLS Concern", alwaysShow: false },
  { key: "notes", label: "Notes", alwaysShow: false }
];

// =============================================
// AUTH
// =============================================
auth.onAuthStateChanged(user => {
  if (user) {
    currentUser = user;
    document.getElementById("auth-screen").classList.remove("active");
    document.getElementById("app-screen").classList.add("active");
    document.getElementById("user-email").textContent = user.email;
    loadAllData();
  } else {
    currentUser = null;
    document.getElementById("auth-screen").classList.add("active");
    document.getElementById("app-screen").classList.remove("active");
  }
});

document.getElementById("sign-in-btn").addEventListener("click", () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).catch(err => showToast("Sign in failed: " + err.message, true));
});

document.getElementById("sign-out-btn").addEventListener("click", () => {
  auth.signOut();
});

// =============================================
// FIRESTORE DATA LAYER
// =============================================
function userDoc() {
  return db.collection("users").doc(currentUser.uid);
}

function collection(name) {
  return userDoc().collection(name);
}

async function loadAllData() {
  try {
    const [meds, diags, provs, exps, notes] = await Promise.all([
      collection("medications").orderBy("name").get(),
      collection("diagnoses").orderBy("name").get(),
      collection("providers").orderBy("name").get(),
      collection("explainers").orderBy("title").get(),
      collection("notes").orderBy("timestamp", "desc").get()
    ]);
    appData.medications = meds.docs.map(d => ({ id: d.id, ...d.data() }));
    appData.diagnoses = diags.docs.map(d => ({ id: d.id, ...d.data() }));
    appData.providers = provs.docs.map(d => ({ id: d.id, ...d.data() }));
    appData.explainers = exps.docs.map(d => ({ id: d.id, ...d.data() }));
    appData.notes = notes.docs.map(d => ({ id: d.id, ...d.data() }));
    renderAll();
  } catch (err) {
    showToast("Error loading data: " + err.message, true);
  }
}

async function saveItem(collectionName, data, id = null) {
  try {
    if (id) {
      await collection(collectionName).doc(id).update(data);
    } else {
      const ref = await collection(collectionName).add(data);
      return ref.id;
    }
  } catch (err) {
    showToast("Error saving: " + err.message, true);
  }
}

async function deleteItem(collectionName, id) {
  try {
    await collection(collectionName).doc(id).delete();
  } catch (err) {
    showToast("Error deleting: " + err.message, true);
  }
}

// =============================================
// NAVIGATION
// =============================================
document.querySelectorAll(".nav-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
    document.getElementById("section-" + btn.dataset.section).classList.add("active");
    if (btn.dataset.section === "print") refreshPrintOptions();
    if (btn.dataset.section === "notes") refreshNotesProviderSelect();
  });
});

// =============================================
// TOAST NOTIFICATIONS
// =============================================
let toastContainer;
function showToast(msg, isError = false) {
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.className = "toast-container";
    document.body.appendChild(toastContainer);
  }
  const t = document.createElement("div");
  t.className = "toast" + (isError ? " error" : "");
  t.textContent = msg;
  toastContainer.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// =============================================
// RENDER ALL
// =============================================
function renderAll() {
  renderMedications();
  renderDiagnoses();
  renderProviders();
  renderExplainers();
  renderNotes();
  refreshPrintOptions();
}

// =============================================
// MEDICATIONS
// =============================================
function renderMedications(filter = "all") {
  const list = document.getElementById("medications-list");
  let meds = appData.medications;
  if (filter === "ongoing") meds = meds.filter(m => m.duration === "ongoing");
  if (filter === "temporary") meds = meds.filter(m => m.duration === "temporary");

  if (meds.length === 0) {
    list.innerHTML = '<div class="empty-state"><p>No medications added yet.</p></div>';
    return;
  }

  list.innerHTML = meds.map(m => `
    <div class="item-card" data-id="${m.id}">
      <div class="item-info">
        <div class="item-name">${esc(m.name)}</div>
        <div class="item-detail"><strong>Dose:</strong> ${esc(m.dose || "—")}</div>
        <div class="item-detail"><strong>For:</strong> ${esc(m.purpose || "—")}</div>
        <div class="item-detail"><strong>Started:</strong> ${m.dateApproximate ? "~" : ""}${esc(m.startDate || "—")}${m.endDate ? " → " + esc(m.endDate) : ""}</div>
        ${m.weightConcern ? `<div class="item-detail"><strong>Weight:</strong> ${esc(m.weightConcern)}</div>` : ""}
        ${m.rlsConcern ? `<div class="item-detail"><strong>RLS:</strong> ${esc(m.rlsConcern)}</div>` : ""}
        ${m.notes ? `<div class="item-detail"><strong>Notes:</strong> ${esc(m.notes)}</div>` : ""}
        <div class="item-tags">
          <span class="tag ${m.duration === 'ongoing' ? 'tag-ongoing' : 'tag-temporary'}">${m.duration}</span>
          ${(m.concernTags || []).map(t => `<span class="tag">${esc(t)}</span>`).join("")}
        </div>
      </div>
      <div class="item-actions">
        <button class="btn-icon" onclick="openModal('med','${m.id}')" title="Edit">✏️</button>
        <button class="btn-icon danger" onclick="confirmDelete('medications','${m.id}','${esc(m.name)}')" title="Delete">🗑️</button>
      </div>
    </div>
  `).join("");
}

// Medication filter buttons
document.querySelectorAll("#section-medications .filter-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#section-medications .filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    renderMedications(btn.dataset.filter);
  });
});

// =============================================
// DIAGNOSES
// =============================================
function renderDiagnoses() {
  const list = document.getElementById("diagnoses-list");
  if (appData.diagnoses.length === 0) {
    list.innerHTML = '<div class="empty-state"><p>No diagnoses added yet.</p></div>';
    return;
  }
  list.innerHTML = appData.diagnoses.map(d => `
    <div class="item-card" data-id="${d.id}">
      <div class="item-info">
        <div class="item-name">${esc(d.name)}</div>
        <div class="item-detail"><strong>Status:</strong> ${esc(d.status || "—")}</div>
        <div class="item-detail"><strong>Diagnosed:</strong> ${esc(d.diagnosedDate || "—")}</div>
        ${d.notes ? `<div class="item-detail"><strong>Notes:</strong> ${esc(d.notes)}</div>` : ""}
        <div class="item-tags">
          ${(d.concernTags || []).map(t => `<span class="tag">${esc(t)}</span>`).join("")}
        </div>
      </div>
      <div class="item-actions">
        <button class="btn-icon" onclick="openModal('diagnosis','${d.id}')" title="Edit">✏️</button>
        <button class="btn-icon danger" onclick="confirmDelete('diagnoses','${d.id}','${esc(d.name)}')" title="Delete">🗑️</button>
      </div>
    </div>
  `).join("");
}

// =============================================
// PROVIDERS
// =============================================
function renderProviders() {
  const list = document.getElementById("providers-list");
  if (appData.providers.length === 0) {
    list.innerHTML = '<div class="empty-state"><p>No providers added yet.</p></div>';
    return;
  }
  list.innerHTML = appData.providers.map(p => `
    <div class="item-card" data-id="${p.id}">
      <div class="item-info">
        <div class="item-name">${esc(p.name)}</div>
        <div class="item-detail"><strong>Role:</strong> ${esc(p.role || "—")}</div>
        ${p.notes ? `<div class="item-detail"><strong>Notes:</strong> ${esc(p.notes)}</div>` : ""}
        <div class="item-tags">
          ${(p.concernTags || []).map(t => `<span class="tag">${esc(t)}</span>`).join("")}
        </div>
      </div>
      <div class="item-actions">
        <button class="btn-icon" onclick="openModal('provider','${p.id}')" title="Edit">✏️</button>
        <button class="btn-icon danger" onclick="confirmDelete('providers','${p.id}','${esc(p.name)}')" title="Delete">🗑️</button>
      </div>
    </div>
  `).join("");
}

// =============================================
// EXPLAINER BLOCKS
// =============================================
function renderExplainers(filter = "all") {
  const list = document.getElementById("explainers-list");
  let items = appData.explainers;
  if (filter === "long") items = items.filter(e => e.type === "long");
  if (filter === "short") items = items.filter(e => e.type === "short");

  if (items.length === 0) {
    list.innerHTML = '<div class="empty-state"><p>No explainer blocks added yet.</p></div>';
    return;
  }
  list.innerHTML = items.map(e => `
    <div class="item-card" data-id="${e.id}">
      <div class="item-info">
        <div class="item-name">${esc(e.title)}</div>
        <div class="item-detail">${esc(truncate(e.content, 150))}</div>
        <div class="item-tags">
          <span class="tag ${e.type === 'long' ? '' : 'tag-temporary'}">${e.type === 'long' ? 'Narrative' : 'Summary'}</span>
          ${(e.concernTags || []).map(t => `<span class="tag">${esc(t)}</span>`).join("")}
        </div>
      </div>
      <div class="item-actions">
        <button class="btn-icon" onclick="openModal('explainer','${e.id}')" title="Edit">✏️</button>
        <button class="btn-icon danger" onclick="confirmDelete('explainers','${e.id}','${esc(e.title)}')" title="Delete">🗑️</button>
      </div>
    </div>
  `).join("");
}

document.querySelectorAll("#section-explainers .filter-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#section-explainers .filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    renderExplainers(btn.dataset.filter);
  });
});

// =============================================
// APPOINTMENT NOTES
// =============================================
function renderNotes() {
  refreshNotesProviderSelect();
  filterAndRenderNotes();
}

function refreshNotesProviderSelect() {
  const selects = [
    document.getElementById("notes-provider-select"),
    document.getElementById("quick-note-provider")
  ];
  selects.forEach(sel => {
    if (!sel) return;
    const val = sel.value;
    sel.innerHTML = '<option value="all">All Providers</option>' +
      appData.providers.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join("");
    if (val) sel.value = val;
  });
}

function filterAndRenderNotes() {
  const provId = document.getElementById("notes-provider-select")?.value || "all";
  const search = (document.getElementById("notes-search")?.value || "").toLowerCase();
  let notes = appData.notes;
  if (provId !== "all") notes = notes.filter(n => n.providerId === provId);
  if (search) notes = notes.filter(n => n.text.toLowerCase().includes(search));

  const list = document.getElementById("notes-list");
  if (notes.length === 0) {
    list.innerHTML = '<div class="empty-state"><p>No notes found.</p></div>';
    return;
  }
  list.innerHTML = notes.map(n => {
    const prov = appData.providers.find(p => p.id === n.providerId);
    const date = n.timestamp ? new Date(n.timestamp.seconds ? n.timestamp.seconds * 1000 : n.timestamp).toLocaleString() : "—";
    return `
      <div class="note-card" data-id="${n.id}">
        <div class="note-meta">
          <span class="note-date">${date}</span>
          <span class="note-provider-tag">${prov ? esc(prov.name) : "Unknown"}</span>
        </div>
        <div class="note-text">${esc(n.text)}</div>
        <div class="note-actions">
          <button class="btn-icon" onclick="editNote('${n.id}')" title="Edit">✏️</button>
          <button class="btn-icon danger" onclick="confirmDelete('notes','${n.id}','this note')" title="Delete">🗑️</button>
        </div>
      </div>
    `;
  }).join("");
}

document.getElementById("notes-provider-select")?.addEventListener("change", filterAndRenderNotes);
document.getElementById("notes-search")?.addEventListener("input", filterAndRenderNotes);

// =============================================
// QUICK NOTE
// =============================================
function openQuickNote() {
  document.getElementById("quick-note-overlay").classList.add("visible");
  document.getElementById("quick-note-text").value = "";
  const provSelect = document.getElementById("quick-note-provider");
  // Copy selected provider from notes sidebar
  const sidebarProv = document.getElementById("notes-provider-select").value;
  if (sidebarProv !== "all") provSelect.value = sidebarProv;
  document.getElementById("quick-note-text").focus();
}

function closeQuickNote() {
  document.getElementById("quick-note-overlay").classList.remove("visible");
}

function closeQuickNoteOnOverlay(e) {
  if (e.target === e.currentTarget) closeQuickNote();
}

async function saveQuickNote() {
  const provId = document.getElementById("quick-note-provider").value;
  const text = document.getElementById("quick-note-text").value.trim();
  if (!text) return showToast("Please enter a note.", true);
  if (provId === "all") return showToast("Please select a specific provider.", true);

  const data = {
    providerId: provId,
    text: text,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  };
  const newId = await saveItem("notes", data);
  if (newId) {
    data.id = newId;
    data.timestamp = new Date();
    appData.notes.unshift(data);
    renderNotes();
    closeQuickNote();
    showToast("Note saved!");
  }
}

async function editNote(noteId) {
  const note = appData.notes.find(n => n.id === noteId);
  if (!note) return;
  const newText = prompt("Edit note:", note.text);
  if (newText === null || newText.trim() === "") return;
  await saveItem("notes", { text: newText.trim() }, noteId);
  note.text = newText.trim();
  renderNotes();
  showToast("Note updated!");
}

// =============================================
// DELETE CONFIRMATION
// =============================================
let pendingDelete = null;

function confirmDelete(collectionName, id, label) {
  pendingDelete = { collectionName, id };
  document.getElementById("delete-message").textContent = `Are you sure you want to delete "${label}"? This cannot be undone.`;
  document.getElementById("delete-overlay").classList.add("visible");
  document.getElementById("delete-confirm-btn").onclick = async () => {
    await deleteItem(pendingDelete.collectionName, pendingDelete.id);
    // Remove from local data
    const key = pendingDelete.collectionName;
    appData[key] = appData[key].filter(item => item.id !== pendingDelete.id);
    renderAll();
    closeDeleteConfirm();
    showToast("Deleted successfully.");
  };
}

function closeDeleteConfirm() {
  document.getElementById("delete-overlay").classList.remove("visible");
  pendingDelete = null;
}

// =============================================
// MODAL SYSTEM
// =============================================
let currentModalType = null;
let currentEditId = null;

function openModal(type, editId = null) {
  currentModalType = type;
  currentEditId = editId;
  const overlay = document.getElementById("modal-overlay");
  const title = document.getElementById("modal-title");
  const body = document.getElementById("modal-body");

  let existing = null;
  if (editId) {
    const map = { med: "medications", diagnosis: "diagnoses", provider: "providers", explainer: "explainers" };
    existing = appData[map[type]]?.find(i => i.id === editId);
  }

  if (type === "med") {
    title.textContent = editId ? "Edit Medication" : "Add Medication";
    body.innerHTML = buildMedForm(existing);
  } else if (type === "diagnosis") {
    title.textContent = editId ? "Edit Diagnosis" : "Add Diagnosis";
    body.innerHTML = buildDiagnosisForm(existing);
  } else if (type === "provider") {
    title.textContent = editId ? "Edit Provider" : "Add Provider";
    body.innerHTML = buildProviderForm(existing);
  } else if (type === "explainer") {
    title.textContent = editId ? "Edit Explainer Block" : "Add Explainer Block";
    body.innerHTML = buildExplainerForm(existing);
  }

  overlay.classList.add("visible");
  initCheckboxChips();
}

function closeModal() {
  document.getElementById("modal-overlay").classList.remove("visible");
  currentModalType = null;
  currentEditId = null;
}

function closeModalOnOverlay(e) {
  if (e.target === e.currentTarget) closeModal();
}

// =============================================
// FORM BUILDERS
// =============================================
function buildConcernTagsHTML(selected = []) {
  return `
    <div class="checkbox-group" id="form-concern-tags">
      ${CONCERN_TAGS.map(tag => `
        <label class="checkbox-chip ${selected.includes(tag) ? 'selected' : ''}">
          <input type="checkbox" value="${tag}" ${selected.includes(tag) ? 'checked' : ''}>
          ${tag}
        </label>
      `).join("")}
    </div>
  `;
}

function buildMedForm(existing) {
  const e = existing || {};
  return `
    <label class="field-label">Medication Name *</label>
    <input type="text" id="form-med-name" class="input-field" value="${esc(e.name || "")}" placeholder="e.g., Vyvanse">

    <label class="field-label">Dose</label>
    <input type="text" id="form-med-dose" class="input-field" value="${esc(e.dose || "")}" placeholder="e.g., 40 mg daily">

    <label class="field-label">Purpose</label>
    <input type="text" id="form-med-purpose" class="input-field" value="${esc(e.purpose || "")}" placeholder="e.g., ADHD">

    <label class="field-label">Duration</label>
    <select id="form-med-duration" class="input-field">
      <option value="ongoing" ${e.duration === 'ongoing' || !e.duration ? 'selected' : ''}>Ongoing</option>
      <option value="temporary" ${e.duration === 'temporary' ? 'selected' : ''}>Temporary</option>
    </select>

    <label class="field-label">Start Date</label>
    <div style="display:flex;gap:0.5rem;align-items:center;">
      <input type="text" id="form-med-start" class="input-field" value="${esc(e.startDate || "")}" placeholder="e.g., Nov 2024" style="flex:1">
      <label style="font-size:0.85rem;white-space:nowrap;display:flex;align-items:center;gap:0.3rem;">
        <input type="checkbox" id="form-med-approx" ${e.dateApproximate ? 'checked' : ''}> Approximate
      </label>
    </div>

    <label class="field-label">End Date (temporary meds)</label>
    <input type="text" id="form-med-end" class="input-field" value="${esc(e.endDate || "")}" placeholder="Leave blank if ongoing">

    <label class="field-label">Weight Concern</label>
    <input type="text" id="form-med-weight" class="input-field" value="${esc(e.weightConcern || "")}" placeholder="e.g., Yes — gained 10-12 lbs">

    <label class="field-label">RLS Concern</label>
    <input type="text" id="form-med-rls" class="input-field" value="${esc(e.rlsConcern || "")}" placeholder="e.g., May worsen RLS symptoms">

    <label class="field-label">Notes</label>
    <textarea id="form-med-notes" class="input-field" rows="2" placeholder="Any additional notes...">${esc(e.notes || "")}</textarea>

    <label class="field-label">Concern Tags</label>
    ${buildConcernTagsHTML(e.concernTags)}

    <label class="field-label">Provider Override (optional)</label>
    <p style="font-size:0.82rem;color:var(--text-muted);margin-bottom:0.3rem;">All meds go to all providers by default. Check providers to <em>exclude</em> this med from their printout.</p>
    <div class="checkbox-group" id="form-med-exclude-providers">
      ${appData.providers.map(p => `
        <label class="checkbox-chip ${(e.excludeProviders || []).includes(p.id) ? 'selected' : ''}">
          <input type="checkbox" value="${p.id}" ${(e.excludeProviders || []).includes(p.id) ? 'checked' : ''}>
          ${esc(p.name)}
        </label>
      `).join("")}
    </div>

    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveMed()">Save</button>
    </div>
  `;
}

async function saveMed() {
  const name = document.getElementById("form-med-name").value.trim();
  if (!name) return showToast("Medication name is required.", true);

  const data = {
    name,
    dose: document.getElementById("form-med-dose").value.trim(),
    purpose: document.getElementById("form-med-purpose").value.trim(),
    duration: document.getElementById("form-med-duration").value,
    startDate: document.getElementById("form-med-start").value.trim(),
    dateApproximate: document.getElementById("form-med-approx").checked,
    endDate: document.getElementById("form-med-end").value.trim(),
    weightConcern: document.getElementById("form-med-weight").value.trim(),
    rlsConcern: document.getElementById("form-med-rls").value.trim(),
    notes: document.getElementById("form-med-notes").value.trim(),
    concernTags: getSelectedCheckboxes("form-concern-tags"),
    excludeProviders: getSelectedCheckboxes("form-med-exclude-providers"),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  if (!data.startDate && !currentEditId) {
    data.startDate = new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" });
    data.dateApproximate = true;
  }

  if (currentEditId) {
    await saveItem("medications", data, currentEditId);
    const idx = appData.medications.findIndex(m => m.id === currentEditId);
    if (idx >= 0) appData.medications[idx] = { id: currentEditId, ...data };
    showToast("Medication updated!");
  } else {
    const newId = await saveItem("medications", data);
    appData.medications.push({ id: newId, ...data });
    showToast("Medication added!");
  }
  renderMedications();
  closeModal();
}

function buildDiagnosisForm(existing) {
  const e = existing || {};
  return `
    <label class="field-label">Diagnosis Name *</label>
    <input type="text" id="form-diag-name" class="input-field" value="${esc(e.name || "")}" placeholder="e.g., ADHD-Combined Type">

    <label class="field-label">Status</label>
    <select id="form-diag-status" class="input-field">
      <option value="Diagnosed" ${e.status === 'Diagnosed' || !e.status ? 'selected' : ''}>Diagnosed</option>
      <option value="Suspected" ${e.status === 'Suspected' ? 'selected' : ''}>Suspected / Clinically Agreed</option>
      <option value="Resolved" ${e.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
      <option value="Monitoring" ${e.status === 'Monitoring' ? 'selected' : ''}>Monitoring</option>
    </select>

    <label class="field-label">Diagnosed Date</label>
    <input type="text" id="form-diag-date" class="input-field" value="${esc(e.diagnosedDate || "")}" placeholder="e.g., 2020, or Since childhood">

    <label class="field-label">Notes</label>
    <textarea id="form-diag-notes" class="input-field" rows="3" placeholder="Additional context...">${esc(e.notes || "")}</textarea>

    <label class="field-label">Concern Tags</label>
    ${buildConcernTagsHTML(e.concernTags)}

    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveDiagnosis()">Save</button>
    </div>
  `;
}

async function saveDiagnosis() {
  const name = document.getElementById("form-diag-name").value.trim();
  if (!name) return showToast("Diagnosis name is required.", true);

  const data = {
    name,
    status: document.getElementById("form-diag-status").value,
    diagnosedDate: document.getElementById("form-diag-date").value.trim(),
    notes: document.getElementById("form-diag-notes").value.trim(),
    concernTags: getSelectedCheckboxes("form-concern-tags"),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  if (currentEditId) {
    await saveItem("diagnoses", data, currentEditId);
    const idx = appData.diagnoses.findIndex(d => d.id === currentEditId);
    if (idx >= 0) appData.diagnoses[idx] = { id: currentEditId, ...data };
    showToast("Diagnosis updated!");
  } else {
    const newId = await saveItem("diagnoses", data);
    appData.diagnoses.push({ id: newId, ...data });
    showToast("Diagnosis added!");
  }
  renderDiagnoses();
  closeModal();
}

function buildProviderForm(existing) {
  const e = existing || {};
  const defaultExplainers = e.defaultExplainers || [];
  const defaultColumns = e.defaultColumns || MED_COLUMNS.filter(c => !c.alwaysShow).map(c => c.key); // all optional columns on by default for new providers

  return `
    <label class="field-label">Provider Name *</label>
    <input type="text" id="form-prov-name" class="input-field" value="${esc(e.name || "")}" placeholder="e.g., Dr. Smith or PCP / PA">

    <label class="field-label">Role / Specialty</label>
    <input type="text" id="form-prov-role" class="input-field" value="${esc(e.role || "")}" placeholder="e.g., Psychiatrist, Bariatric Surgeon">

    <label class="field-label">Executive Summary (for printouts)</label>
    <textarea id="form-prov-summary" class="input-field textarea-large" rows="5" placeholder="Paste a per-provider executive summary here...">${esc(e.executiveSummary || "")}</textarea>

    <label class="field-label">Visit Notes (for next visit)</label>
    <textarea id="form-prov-visitnotes" class="input-field" rows="3" placeholder="Things to bring up at next appointment...">${esc(e.visitNotes || "")}</textarea>

    <label class="field-label">Notes</label>
    <textarea id="form-prov-notes" class="input-field" rows="2" placeholder="General notes about this provider...">${esc(e.notes || "")}</textarea>

    <label class="field-label">Concern Tags (auto-maps which items this provider sees)</label>
    ${buildConcernTagsHTML(e.concernTags)}

    <label class="field-label">Default Medication Columns for Printout</label>
    <p style="font-size:0.82rem;color:var(--text-muted);margin-bottom:0.3rem;">Medication name, dose, and purpose always show. Select which additional columns to include by default.</p>
    <div class="checkbox-group" id="form-prov-default-columns">
      ${MED_COLUMNS.filter(c => !c.alwaysShow).map(c => `
        <label class="checkbox-chip ${defaultColumns.includes(c.key) ? 'selected' : ''}">
          <input type="checkbox" value="${c.key}" ${defaultColumns.includes(c.key) ? 'checked' : ''}>
          ${c.label}
        </label>
      `).join("")}
    </div>

    <label class="field-label">Default Explainer Blocks for Printout</label>
    <p style="font-size:0.82rem;color:var(--text-muted);margin-bottom:0.3rem;">Select which explainer blocks should be included by default when printing for this provider. You can still toggle these before each printout.</p>
    <div class="checkbox-group" id="form-prov-default-explainers">
      ${appData.explainers.map(exp => `
        <label class="checkbox-chip ${defaultExplainers.includes(exp.id) ? 'selected' : ''}">
          <input type="checkbox" value="${exp.id}" ${defaultExplainers.includes(exp.id) ? 'checked' : ''}>
          ${esc(exp.title)}
        </label>
      `).join("")}
    </div>

    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveProvider()">Save</button>
    </div>
  `;
}

async function saveProvider() {
  const name = document.getElementById("form-prov-name").value.trim();
  if (!name) return showToast("Provider name is required.", true);

  const data = {
    name,
    role: document.getElementById("form-prov-role").value.trim(),
    executiveSummary: document.getElementById("form-prov-summary").value.trim(),
    visitNotes: document.getElementById("form-prov-visitnotes").value.trim(),
    notes: document.getElementById("form-prov-notes").value.trim(),
    concernTags: getSelectedCheckboxes("form-concern-tags"),
    defaultColumns: getSelectedCheckboxes("form-prov-default-columns"),
    defaultExplainers: getSelectedCheckboxes("form-prov-default-explainers"),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  if (currentEditId) {
    await saveItem("providers", data, currentEditId);
    const idx = appData.providers.findIndex(p => p.id === currentEditId);
    if (idx >= 0) appData.providers[idx] = { id: currentEditId, ...data };
    showToast("Provider updated!");
  } else {
    const newId = await saveItem("providers", data);
    appData.providers.push({ id: newId, ...data });
    showToast("Provider added!");
  }
  renderProviders();
  closeModal();
}

function buildExplainerForm(existing) {
  const e = existing || {};
  return `
    <label class="field-label">Title *</label>
    <input type="text" id="form-exp-title" class="input-field" value="${esc(e.title || "")}" placeholder="e.g., Autonomic Anxiety — Not Cognitive">

    <label class="field-label">Type</label>
    <select id="form-exp-type" class="input-field">
      <option value="long" ${e.type === 'long' || !e.type ? 'selected' : ''}>Long / Narrative</option>
      <option value="short" ${e.type === 'short' ? 'selected' : ''}>Short / Summary</option>
    </select>

    <label class="field-label">Content *</label>
    <textarea id="form-exp-content" class="input-field textarea-large" rows="8" placeholder="The explanation text...">${esc(e.content || "")}</textarea>

    <label class="field-label">Concern Tags</label>
    ${buildConcernTagsHTML(e.concernTags)}

    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveExplainer()">Save</button>
    </div>
  `;
}

async function saveExplainer() {
  const title = document.getElementById("form-exp-title").value.trim();
  const content = document.getElementById("form-exp-content").value.trim();
  if (!title || !content) return showToast("Title and content are required.", true);

  const data = {
    title,
    type: document.getElementById("form-exp-type").value,
    content,
    concernTags: getSelectedCheckboxes("form-concern-tags"),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  if (currentEditId) {
    await saveItem("explainers", data, currentEditId);
    const idx = appData.explainers.findIndex(e => e.id === currentEditId);
    if (idx >= 0) appData.explainers[idx] = { id: currentEditId, ...data };
    showToast("Explainer updated!");
  } else {
    const newId = await saveItem("explainers", data);
    appData.explainers.push({ id: newId, ...data });
    showToast("Explainer added!");
  }
  renderExplainers();
  closeModal();
}

// =============================================
// CHECKBOX CHIP TOGGLE
// =============================================
function initCheckboxChips() {
  document.querySelectorAll(".checkbox-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      const cb = chip.querySelector("input[type='checkbox']");
      cb.checked = !cb.checked;
      chip.classList.toggle("selected", cb.checked);
    });
  });
}

function getSelectedCheckboxes(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return [];
  return Array.from(container.querySelectorAll("input[type='checkbox']:checked")).map(cb => cb.value);
}

// =============================================
// PRINT OPTIONS REFRESH
// =============================================
function refreshPrintOptions() {
  // Provider select
  const sel = document.getElementById("print-provider-select");
  if (sel) {
    const currentVal = sel.value;
    sel.innerHTML = appData.providers.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join("");
    if (currentVal && appData.providers.some(p => p.id === currentVal)) {
      sel.value = currentVal;
    }
    // Remove old listener to avoid duplicates, then add new one
    sel.removeEventListener("change", onPrintProviderChange);
    sel.addEventListener("change", onPrintProviderChange);
  }

  // Load defaults for currently selected provider
  loadPrintDefaults();
}

function onPrintProviderChange() {
  loadPrintDefaults();
}

function loadPrintDefaults() {
  const sel = document.getElementById("print-provider-select");
  if (!sel) return;
  const provider = appData.providers.find(p => p.id === sel.value);
  if (!provider) return;

  const defaultColumns = provider.defaultColumns || MED_COLUMNS.filter(c => !c.alwaysShow).map(c => c.key);
  const defaultExplainers = provider.defaultExplainers || [];

  // Column toggles
  const colToggle = document.getElementById("print-columns-toggle");
  if (colToggle) {
    colToggle.innerHTML = MED_COLUMNS.filter(c => !c.alwaysShow).map(c => {
      const isOn = defaultColumns.includes(c.key);
      return `
        <label class="toggle-chip ${isOn ? 'active' : ''}">
          <input type="checkbox" value="${c.key}" ${isOn ? 'checked' : ''}> ${c.label}
        </label>
      `;
    }).join("");
    colToggle.querySelectorAll(".toggle-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        const cb = chip.querySelector("input");
        cb.checked = !cb.checked;
        chip.classList.toggle("active", cb.checked);
      });
    });
  }

  // Explainer toggles
  const expToggle = document.getElementById("print-explainers-toggle");
  if (expToggle) {
    expToggle.innerHTML = appData.explainers.map(e => {
      const isOn = defaultExplainers.includes(e.id);
      return `
        <label class="toggle-chip ${isOn ? 'active' : ''}">
          <input type="checkbox" value="${e.id}" ${isOn ? 'checked' : ''}> ${esc(e.title)}
        </label>
      `;
    }).join("");
    expToggle.querySelectorAll(".toggle-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        const cb = chip.querySelector("input");
        cb.checked = !cb.checked;
        chip.classList.toggle("active", cb.checked);
      });
    });
  }
}

// =============================================
// GENERATE PRINTOUT
// =============================================
function generatePrintout() {
  const provId = document.getElementById("print-provider-select").value;
  const provider = appData.providers.find(p => p.id === provId);
  if (!provider) return showToast("Please select a provider.", true);

  const subtitle = document.getElementById("print-subtitle").value.trim();
  const includeSummary = document.getElementById("print-include-summary").checked;
  const includeNotes = document.getElementById("print-include-notes").checked;

  // Get selected columns
  const selectedCols = MED_COLUMNS.filter(c => c.alwaysShow).map(c => c.key);
  document.querySelectorAll("#print-columns-toggle input:checked").forEach(cb => selectedCols.push(cb.value));

  // Get selected explainers
  const selectedExplainerIds = [];
  document.querySelectorAll("#print-explainers-toggle input:checked").forEach(cb => selectedExplainerIds.push(cb.value));

  // Filter medications: all meds go to all providers unless explicitly excluded
  const meds = appData.medications.filter(m => !(m.excludeProviders || []).includes(provId));

  // Filter diagnoses by provider's concern tags
  const provTags = provider.concernTags || [];
  const diagnoses = appData.diagnoses.filter(d =>
    (d.concernTags || []).some(t => provTags.includes(t)) || provTags.length === 0
  );

  // Selected explainers
  const explainers = appData.explainers.filter(e => selectedExplainerIds.includes(e.id));
  const longExplainers = explainers.filter(e => e.type === "long");
  const shortExplainers = explainers.filter(e => e.type === "short");

  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  // Build HTML
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${esc(provider.name)} — ${today}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #1a1a1a; line-height: 1.45; padding: 0.5in; max-width: 8.5in; }
  h1 { font-size: 16pt; margin-bottom: 2pt; }
  .subtitle { font-size: 11pt; color: #555; margin-bottom: 4pt; }
  .date { font-size: 9pt; color: #888; margin-bottom: 14pt; }
  h2 { font-size: 12pt; color: #1B3A5C; border-bottom: 1.5px solid #1B3A5C; padding-bottom: 3pt; margin: 14pt 0 8pt 0; }
  h3 { font-size: 10.5pt; color: #2E6B9E; margin: 10pt 0 4pt 0; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 10pt; font-size: 10pt; }
  th { background: #1B3A5C; color: white; text-align: left; padding: 5pt 6pt; font-weight: 600; }
  td { padding: 4pt 6pt; border-bottom: 1px solid #ddd; vertical-align: top; }
  tr:nth-child(even) td { background: #f5f8fc; }
  .key-box { background: #FFF8E7; border-left: 4px solid #B8860B; padding: 8pt 12pt; margin: 8pt 0; font-size: 10pt; }
  .key-label { font-weight: 700; color: #B8860B; }
  .summary-box { background: #f0f4f8; padding: 8pt 12pt; margin: 6pt 0; border-radius: 4pt; font-size: 10pt; }
  .explainer { margin: 6pt 0; font-size: 10pt; }
  .explainer-title { font-weight: 600; }
  .short-facts { margin: 6pt 0; }
  .short-fact { background: #f0f4f8; padding: 4pt 8pt; margin: 3pt 0; border-radius: 3pt; font-size: 9.5pt; }
  .short-fact strong { color: #1B3A5C; }
  ul { margin: 4pt 0 8pt 18pt; font-size: 10pt; }
  li { margin-bottom: 3pt; }
  .visit-notes { background: #fffde7; border: 1px solid #e6c94a; padding: 8pt 12pt; margin: 8pt 0; border-radius: 4pt; }
  .visit-notes-label { font-weight: 700; color: #8a6a10; font-size: 10pt; }
  .footer { margin-top: 16pt; padding-top: 8pt; border-top: 1px solid #ccc; font-size: 8pt; color: #999; text-align: center; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
<h1>Patient Health Overview — ${esc(provider.name)}</h1>
${subtitle ? `<div class="subtitle">${esc(subtitle)}</div>` : ""}
<div class="date">Updated: ${today}</div>
`;

  // Executive Summary
  if (includeSummary && provider.executiveSummary) {
    html += `<h2>Summary</h2>
<div class="key-box"><span class="key-label">KEY: </span>${esc(provider.executiveSummary)}</div>`;
  }

  // Medications
  html += `<h2>Current Medications</h2>
<table><thead><tr>`;
  const colMap = {
    name: "Medication", dose: "Dose", purpose: "For", startDate: "Started",
    weightConcern: "Weight Concern", rlsConcern: "RLS Concern", notes: "Notes"
  };
  selectedCols.forEach(key => { html += `<th>${colMap[key]}</th>`; });
  html += `</tr></thead><tbody>`;
  meds.forEach(m => {
    html += "<tr>";
    selectedCols.forEach(key => {
      let val = m[key] || "—";
      if (key === "startDate" && m.dateApproximate) val = "~" + val;
      html += `<td>${esc(val)}</td>`;
    });
    html += "</tr>";
  });
  html += `</tbody></table>`;

  // Diagnoses
  if (diagnoses.length > 0) {
    html += `<h2>Relevant Diagnoses</h2><ul>`;
    diagnoses.forEach(d => {
      html += `<li><strong>${esc(d.name)}</strong>`;
      if (d.status) html += ` (${esc(d.status)})`;
      if (d.diagnosedDate) html += ` — ${esc(d.diagnosedDate)}`;
      if (d.notes) html += `<br><em>${esc(d.notes)}</em>`;
      html += `</li>`;
    });
    html += `</ul>`;
  }

  // Long explainers
  if (longExplainers.length > 0) {
    html += `<h2>Clinical Context</h2>`;
    longExplainers.forEach(e => {
      html += `<div class="explainer"><div class="explainer-title">${esc(e.title)}</div><p>${esc(e.content)}</p></div>`;
    });
  }

  // Short explainers
  if (shortExplainers.length > 0) {
    html += `<h2>Key Facts</h2><div class="short-facts">`;
    shortExplainers.forEach(e => {
      html += `<div class="short-fact"><strong>${esc(e.title)}:</strong> ${esc(e.content)}</div>`;
    });
    html += `</div>`;
  }

  // Visit notes
  if (includeNotes && provider.visitNotes) {
    html += `<div class="visit-notes"><div class="visit-notes-label">For This Visit:</div><p>${esc(provider.visitNotes)}</p></div>`;
  }

  html += `<div class="footer">Patient Health Overview — Generated ${today} — Confidential</div>`;
  html += `</body></html>`;

  // Download
  const filename = `${provider.name.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().slice(0, 10)}.html`;
  downloadFile(filename, html, "text/html");
  showToast("Printout generated!");
}

// =============================================
// CLAUDE EXPORT
// =============================================
function generateClaudeExport() {
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  let md = `# Health Data Export for Claude Review

**Export Date:** ${today}

---

## Instructions for Claude

Review this patient health data export and provide feedback on the following:

1. **Medication interactions:** Flag any medications that may have untagged interactions or side effects, especially regarding weight gain, RLS worsening, or interactions with other listed medications.
2. **Missing concern tags:** Identify any items that appear to be missing concern tags (e.g., a medication known for weight gain that isn't tagged with "Weight").
3. **Timeline patterns:** Look across the medication and diagnosis timeline for patterns the patient should discuss with a provider.
4. **Temporary medication follow-up:** Flag any temporary medications that may need follow-up or have been "temporary" for an unusually long time.
5. **Provider coordination gaps:** Based on the provider concern-tag mappings, identify any areas where no provider appears to be covering an important intersection of concerns.
6. **General observations:** Note anything else that stands out as potentially important for the patient's care coordination.

Please organize your findings by urgency: (1) Address soon, (2) Bring up at next relevant appointment, (3) Worth monitoring.

---

## Ongoing Medications

| Medication | Dose | Purpose | Started | Weight Concern | RLS Concern | Tags | Notes |
|---|---|---|---|---|---|---|---|
`;

  appData.medications.filter(m => m.duration === "ongoing").forEach(m => {
    md += `| ${m.name || "—"} | ${m.dose || "—"} | ${m.purpose || "—"} | ${m.dateApproximate ? "~" : ""}${m.startDate || "—"} | ${m.weightConcern || "—"} | ${m.rlsConcern || "—"} | ${(m.concernTags || []).join(", ") || "—"} | ${m.notes || "—"} |\n`;
  });

  md += `\n## Temporary Medications\n\n| Medication | Dose | Purpose | Started | End Date | Weight Concern | RLS Concern | Tags | Notes |\n|---|---|---|---|---|---|---|---|---|\n`;
  appData.medications.filter(m => m.duration === "temporary").forEach(m => {
    md += `| ${m.name || "—"} | ${m.dose || "—"} | ${m.purpose || "—"} | ${m.dateApproximate ? "~" : ""}${m.startDate || "—"} | ${m.endDate || "ongoing?"} | ${m.weightConcern || "—"} | ${m.rlsConcern || "—"} | ${(m.concernTags || []).join(", ") || "—"} | ${m.notes || "—"} |\n`;
  });

  md += `\n## Diagnoses\n\n| Diagnosis | Status | Date | Tags | Notes |\n|---|---|---|---|---|\n`;
  appData.diagnoses.forEach(d => {
    md += `| ${d.name || "—"} | ${d.status || "—"} | ${d.diagnosedDate || "—"} | ${(d.concernTags || []).join(", ") || "—"} | ${d.notes || "—"} |\n`;
  });

  md += `\n## Providers & Concern Mappings\n\n| Provider | Role | Concern Tags |\n|---|---|---|\n`;
  appData.providers.forEach(p => {
    md += `| ${p.name || "—"} | ${p.role || "—"} | ${(p.concernTags || []).join(", ") || "—"} |\n`;
  });

  md += `\n## Explainer Blocks\n\n`;
  appData.explainers.forEach(e => {
    md += `### ${e.title} (${e.type})\n\n${e.content}\n\n`;
  });

  md += `---\n\n*End of export*\n`;

  const filename = `health_export_${new Date().toISOString().slice(0, 10)}.md`;
  downloadFile(filename, md, "text/markdown");
  showToast("Export generated!");
}

// =============================================
// UTILITIES
// =============================================
function esc(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function truncate(str, len) {
  if (!str) return "";
  return str.length > len ? str.slice(0, len) + "…" : str;
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// =============================================
// JSON EXPORT (BACKUP)
// =============================================
function exportJSON() {
  // Strip Firestore-specific fields for clean export
  function clean(items) {
    return items.map(item => {
      const copy = { ...item };
      delete copy.id; // Firestore doc ID — will be regenerated on import
      // Convert Firestore timestamps to ISO strings
      if (copy.updatedAt && copy.updatedAt.seconds) {
        copy.updatedAt = new Date(copy.updatedAt.seconds * 1000).toISOString();
      }
      if (copy.timestamp && copy.timestamp.seconds) {
        copy.timestamp = new Date(copy.timestamp.seconds * 1000).toISOString();
      }
      return copy;
    });
  }

  const exportData = {
    exportDate: new Date().toISOString(),
    appVersion: "1.0",
    medications: clean(appData.medications),
    diagnoses: clean(appData.diagnoses),
    providers: clean(appData.providers),
    explainers: clean(appData.explainers),
    notes: clean(appData.notes)
  };

  const filename = `health_backup_${new Date().toISOString().slice(0, 10)}.json`;
  downloadFile(filename, JSON.stringify(exportData, null, 2), "application/json");
  showToast("JSON backup downloaded!");
}

// =============================================
// JSON IMPORT
// =============================================
async function importJSON() {
  let jsonText = "";

  // Check for file upload first
  const fileInput = document.getElementById("import-file");
  const textInput = document.getElementById("import-json-text");

  if (fileInput.files.length > 0) {
    jsonText = await fileInput.files[0].text();
  } else if (textInput.value.trim()) {
    jsonText = textInput.value.trim();
  } else {
    return showToast("Please upload a JSON file or paste JSON data.", true);
  }

  let data;
  try {
    data = JSON.parse(jsonText);
  } catch (e) {
    return showToast("Invalid JSON: " + e.message, true);
  }

  // Validate structure
  const validCollections = ["medications", "diagnoses", "providers", "explainers", "notes"];
  const collectionsFound = validCollections.filter(c => Array.isArray(data[c]) && data[c].length > 0);

  if (collectionsFound.length === 0) {
    return showToast("No valid data found in JSON. Expected: medications, diagnoses, providers, explainers, or notes arrays.", true);
  }

  // Confirm before importing
  const counts = collectionsFound.map(c => `${data[c].length} ${c}`).join(", ");
  if (!confirm(`This will ADD the following to your existing data:\n\n${counts}\n\nThis does not overwrite existing items. Continue?`)) {
    return;
  }

  let totalAdded = 0;

  try {
    for (const collName of collectionsFound) {
      for (const item of data[collName]) {
        // Remove any id field from imported data
        const cleanItem = { ...item };
        delete cleanItem.id;

        // Convert date strings back to Firestore timestamps where needed
        cleanItem.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        if (collName === "notes" && cleanItem.timestamp) {
          // Keep timestamp as a date for notes
          cleanItem.timestamp = firebase.firestore.Timestamp.fromDate(new Date(cleanItem.timestamp));
        }

        await collection(collName).add(cleanItem);
        totalAdded++;
      }
    }

    showToast(`Import complete! Added ${totalAdded} items. Reloading...`);

    // Clear inputs
    fileInput.value = "";
    textInput.value = "";

    // Reload data
    await loadAllData();

  } catch (err) {
    showToast(`Import error after ${totalAdded} items: ${err.message}`, true);
  }
}
