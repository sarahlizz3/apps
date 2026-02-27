/* ========================================
   State — Central data store + filter state
   ======================================== */
const State = {
  classes: [],       // { id, name, archived, sortOrder, createdAt, updatedAt }
  assignments: {},   // { classId: [{ id, name, archived, sortOrder, ... }] }
  comments: [],      // { id, textHtml, textPlain, classIds, isGlobal, assignmentId, category, archived, sortOrder, ... }

  // Filter state
  selectedClassId: null,   // null = "All"
  selectedAssignmentId: null, // null = "All" for that class
  searchQuery: '',

  activeClasses() {
    return this.classes.filter(c => !c.archived).sort((a, b) => a.sortOrder - b.sortOrder);
  },

  allClasses() {
    const active = this.classes.filter(c => !c.archived).sort((a, b) => a.sortOrder - b.sortOrder);
    const archived = this.classes.filter(c => c.archived).sort((a, b) => a.sortOrder - b.sortOrder);
    return [...active, ...archived];
  },

  assignmentsForClass(classId) {
    return (this.assignments[classId] || []).filter(a => !a.archived).sort((a, b) => a.sortOrder - b.sortOrder);
  },

  allAssignmentsForClass(classId) {
    const list = this.assignments[classId] || [];
    const active = list.filter(a => !a.archived).sort((a, b) => a.sortOrder - b.sortOrder);
    const archived = list.filter(a => a.archived).sort((a, b) => a.sortOrder - b.sortOrder);
    return [...active, ...archived];
  },

  activeComments() {
    return this.comments.filter(c => !c.archived);
  },

  getClass(id) {
    return this.classes.find(c => c.id === id);
  },

  getAssignment(classId, assignmentId) {
    return (this.assignments[classId] || []).find(a => a.id === assignmentId);
  },

  reset() {
    this.classes = [];
    this.assignments = {};
    this.comments = [];
    this.selectedClassId = null;
    this.selectedAssignmentId = null;
    this.searchQuery = '';
  }
};

/* ========================================
   Auth — Login/logout, auth state observer
   ======================================== */
const Auth = {
  currentUser: null,

  init() {
    auth.onAuthStateChanged((user) => {
      this.currentUser = user;
      document.getElementById('loading-spinner').classList.add('hidden');

      if (user) {
        document.getElementById('login-container').classList.add('hidden');
        document.getElementById('app-container').classList.remove('hidden');
        App.onSignIn(user);
      } else {
        document.getElementById('login-container').classList.remove('hidden');
        document.getElementById('app-container').classList.add('hidden');
        document.getElementById('login-password').value = '';
        setTimeout(() => document.getElementById('login-email').focus(), 100);
        App.onSignOut();
      }
    });

    this.setupLoginForm();
    document.getElementById('btn-signout').addEventListener('click', () => this.signOut());
  },

  setupLoginForm() {
    const form = document.getElementById('login-form');
    const errorEl = document.getElementById('login-error');
    const submitBtn = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      errorEl.textContent = '';
      errorEl.classList.add('hidden');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Signing in...';

      try {
        await auth.signInWithEmailAndPassword(email, password);
      } catch (error) {
        let message = 'Unable to sign in. Please try again.';
        switch (error.code) {
          case 'auth/invalid-email': message = 'Invalid email address.'; break;
          case 'auth/user-disabled': message = 'This account has been disabled.'; break;
          case 'auth/user-not-found': message = 'No account found with this email.'; break;
          case 'auth/wrong-password': message = 'Incorrect password.'; break;
          case 'auth/invalid-credential': message = 'Invalid email or password.'; break;
          case 'auth/too-many-requests': message = 'Too many attempts. Please try again later.'; break;
          case 'auth/network-request-failed': message = 'Network error. Check your connection.'; break;
        }
        errorEl.textContent = message;
        errorEl.classList.remove('hidden');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In';
      }
    });
  },

  async signOut() {
    try {
      await auth.signOut();
    } catch (error) {
      UI.showToast('Sign out failed', true);
    }
  },

  uid() {
    return this.currentUser?.uid || null;
  }
};

/* ========================================
   Store — All Firestore CRUD
   ======================================== */
const Store = {
  userRef() {
    return db.collection('users').doc(Auth.uid());
  },

  classesRef() {
    return this.userRef().collection('classes');
  },

  assignmentsRef(classId) {
    return this.classesRef().doc(classId).collection('assignments');
  },

  commentsRef() {
    return this.userRef().collection('comments');
  },

  generateId() {
    return db.collection('_').doc().id;
  },

  async loadAll() {
    try {
      // Load classes
      const classSnap = await this.classesRef().get();
      State.classes = classSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Load assignments for all active classes in parallel
      const activeClasses = State.classes.filter(c => !c.archived);
      const assignmentPromises = activeClasses.map(async (cls) => {
        const snap = await this.assignmentsRef(cls.id).get();
        return { classId: cls.id, assignments: snap.docs.map(d => ({ id: d.id, ...d.data() })) };
      });
      const results = await Promise.all(assignmentPromises);
      State.assignments = {};
      results.forEach(r => { State.assignments[r.classId] = r.assignments; });

      // Load comments
      const commentSnap = await this.commentsRef().get();
      State.comments = commentSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (error) {
      console.error('Error loading data:', error);
      UI.showToast('Failed to load data', true);
    }
  },

  // Classes
  async saveClass(data) {
    const id = data.id || this.generateId();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    const doc = {
      name: data.name,
      archived: data.archived || false,
      sortOrder: data.sortOrder ?? State.classes.length,
      updatedAt: now
    };
    if (!data.id) doc.createdAt = now;
    await this.classesRef().doc(id).set(doc, { merge: true });
    return id;
  },

  // Assignments
  async saveAssignment(classId, data) {
    const id = data.id || this.generateId();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    const doc = {
      name: data.name,
      archived: data.archived || false,
      sortOrder: data.sortOrder ?? (State.assignments[classId] || []).length,
      updatedAt: now
    };
    if (!data.id) doc.createdAt = now;
    await this.assignmentsRef(classId).doc(id).set(doc, { merge: true });
    return id;
  },

  // Comments
  async saveComment(data) {
    const id = data.id || this.generateId();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    // Auto-generate textPlain from textHtml
    const tmp = document.createElement('div');
    tmp.innerHTML = data.textHtml || '';
    const textPlain = tmp.textContent || tmp.innerText || '';
    const doc = {
      textHtml: data.textHtml,
      textPlain: textPlain,
      classIds: data.classIds || [],
      isGlobal: data.isGlobal || false,
      assignmentId: data.assignmentId || null,
      category: data.category || 'general',
      archived: data.archived || false,
      sortOrder: data.sortOrder ?? State.comments.length,
      updatedAt: now
    };
    if (!data.id) doc.createdAt = now;
    await this.commentsRef().doc(id).set(doc, { merge: true });
    return { id, ...doc, textPlain };
  },

  async archiveComment(id) {
    await this.commentsRef().doc(id).update({
      archived: true,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  },

  async bulkArchiveComments(commentIds) {
    const batch = db.batch();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    commentIds.forEach(id => {
      batch.update(this.commentsRef().doc(id), { archived: true, updatedAt: now });
    });
    await batch.commit();
  }
};

/* ========================================
   UI — Toast + Confirm dialog
   ======================================== */
const UI = {
  showToast(message, isError = false) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast' + (isError ? ' error' : '');
    toast.textContent = message;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  },

  confirm(message) {
    return new Promise((resolve) => {
      const backdrop = document.getElementById('confirm-backdrop');
      const msgEl = document.getElementById('confirm-message');
      const okBtn = document.getElementById('confirm-ok');
      const cancelBtn = document.getElementById('confirm-cancel');
      msgEl.textContent = message;
      backdrop.classList.add('open');

      const cleanup = () => {
        backdrop.classList.remove('open');
        okBtn.removeEventListener('click', onOk);
        cancelBtn.removeEventListener('click', onCancel);
        document.removeEventListener('keydown', onKey);
      };
      const onOk = () => { cleanup(); resolve(true); };
      const onCancel = () => { cleanup(); resolve(false); };
      const onKey = (e) => {
        if (e.key === 'Escape') onCancel();
      };

      okBtn.addEventListener('click', onOk);
      cancelBtn.addEventListener('click', onCancel);
      document.addEventListener('keydown', onKey);
      okBtn.focus();
    });
  }
};

/* ========================================
   Filters — Pill rendering, search, applyFilters
   ======================================== */
const Filters = {
  _debounceTimer: null,

  init() {
    // Search
    const searchInput = document.getElementById('search-input');
    const searchClear = document.getElementById('search-clear');

    searchInput.addEventListener('input', () => {
      const val = searchInput.value;
      searchClear.classList.toggle('hidden', !val);
      clearTimeout(this._debounceTimer);
      this._debounceTimer = setTimeout(() => {
        State.searchQuery = val.trim().toLowerCase();
        this.applyFilters();
      }, 200);
    });

    searchClear.addEventListener('click', () => {
      searchInput.value = '';
      searchClear.classList.add('hidden');
      State.searchQuery = '';
      this.applyFilters();
    });
  },

  renderClassPills() {
    const container = document.getElementById('class-pills');
    const classes = State.activeClasses();
    let html = '<button class="pill' + (State.selectedClassId === null ? ' active' : '') + '" data-class-id="">All</button>';
    classes.forEach(c => {
      html += '<button class="pill' + (State.selectedClassId === c.id ? ' active' : '') + '" data-class-id="' + c.id + '">' + this._esc(c.name) + '</button>';
    });
    container.innerHTML = html;

    container.querySelectorAll('.pill').forEach(btn => {
      btn.addEventListener('click', () => {
        State.selectedClassId = btn.dataset.classId || null;
        State.selectedAssignmentId = null;
        this.renderClassPills();
        this.renderAssignmentPills();
        this.applyFilters();
      });
    });

    this.renderAssignmentPills();
  },

  renderAssignmentPills() {
    const container = document.getElementById('assignment-pills');
    if (!State.selectedClassId) {
      container.classList.add('hidden');
      return;
    }
    container.classList.remove('hidden');
    const assignments = State.assignmentsForClass(State.selectedClassId);
    let html = '<button class="pill' + (State.selectedAssignmentId === null ? ' active' : '') + '" data-assignment-id="">All</button>';
    assignments.forEach(a => {
      html += '<button class="pill' + (State.selectedAssignmentId === a.id ? ' active' : '') + '" data-assignment-id="' + a.id + '">' + this._esc(a.name) + '</button>';
    });
    container.innerHTML = html;

    container.querySelectorAll('.pill').forEach(btn => {
      btn.addEventListener('click', () => {
        State.selectedAssignmentId = btn.dataset.assignmentId || null;
        this.renderAssignmentPills();
        this.applyFilters();
      });
    });
  },

  applyFilters() {
    const active = State.activeComments();
    let classSpecific = [];
    let globalComments = [];

    if (State.selectedClassId) {
      // Class is selected — split into class-specific and global
      classSpecific = active.filter(c => {
        if (c.isGlobal) return false;
        if (!c.classIds.includes(State.selectedClassId)) return false;
        if (State.selectedAssignmentId && c.assignmentId !== State.selectedAssignmentId) return false;
        return true;
      });
      globalComments = active.filter(c => c.isGlobal);

      // Also filter assignment for global if desired — spec says global always shows
      // If assignment filter is on, still show global (per spec: "always visible at page bottom regardless")
    } else {
      // "All" selected — show everything together
      classSpecific = active;
      globalComments = [];
    }

    // Apply search
    if (State.searchQuery) {
      const q = State.searchQuery;
      classSpecific = classSpecific.filter(c => (c.textPlain || '').toLowerCase().includes(q));
      globalComments = globalComments.filter(c => (c.textPlain || '').toLowerCase().includes(q));
    }

    Comments.render(classSpecific, globalComments);
  },

  _esc(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }
};

/* ========================================
   Comments — Card rendering, copy, edit delegation
   ======================================== */
const Comments = {
  CATEGORIES: ['general', 'positive', 'constructive', 'critical'],
  CATEGORY_LABELS: { general: 'General', positive: 'Positive', constructive: 'Constructive', critical: 'Critical' },
  CATEGORY_COLORS: { general: 'var(--cat-general)', positive: 'var(--cat-positive)', constructive: 'var(--cat-constructive)', critical: 'var(--cat-critical)' },

  render(classSpecific, globalComments) {
    const container = document.getElementById('main-content');

    if (classSpecific.length === 0 && globalComments.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">&mdash;</div><div class="empty-state-text">No comments found</div><div class="empty-state-sub">Add a comment to get started, or adjust your filters.</div></div>';
      return;
    }

    let html = '';

    // Class-specific (or all) grouped by category
    html += this._renderGrouped(classSpecific);

    // Global section (only when a class is selected)
    if (globalComments.length > 0) {
      html += '<div class="global-section-divider"><span>Comments for All Classes</span></div>';
      html += this._renderGrouped(globalComments);
    }

    container.innerHTML = html;
    this._bindActions(container);
  },

  _renderGrouped(comments) {
    let html = '';
    this.CATEGORIES.forEach(cat => {
      const catComments = comments.filter(c => c.category === cat);
      if (catComments.length === 0) return;

      html += '<div class="category-section">';
      html += '<div class="category-header"><div class="category-dot" style="background:' + this.CATEGORY_COLORS[cat] + '"></div>';
      html += '<h2>' + this.CATEGORY_LABELS[cat] + ' <span class="category-count">(' + catComments.length + ')</span></h2></div>';

      catComments.forEach(c => {
        html += this._renderCard(c);
      });
      html += '</div>';
    });
    return html;
  },

  _renderCard(comment) {
    const meta = this._buildMeta(comment);
    return '<div class="comment-card" data-category="' + comment.category + '" data-id="' + comment.id + '">' +
      '<div class="card-body">' +
        '<div class="card-text">' + comment.textHtml + '</div>' +
        (meta ? '<div class="card-meta">' + meta + '</div>' : '') +
      '</div>' +
      '<div class="card-actions">' +
        '<button class="btn-copy" data-id="' + comment.id + '">Copy</button>' +
        '<button class="btn-edit" data-id="' + comment.id + '">Edit</button>' +
      '</div>' +
    '</div>';
  },

  _buildMeta(comment) {
    const parts = [];
    if (comment.isGlobal) {
      parts.push('All classes');
    } else if (comment.classIds && comment.classIds.length > 0) {
      const names = comment.classIds.map(id => {
        const cls = State.getClass(id);
        return cls ? cls.name : 'Unknown';
      });
      parts.push(names.join(', '));
    }
    if (comment.assignmentId) {
      // Find assignment across all classes
      for (const classId of (comment.classIds || [])) {
        const a = State.getAssignment(classId, comment.assignmentId);
        if (a) { parts.push(a.name); break; }
      }
    }
    return parts.map(p => '<span>' + Filters._esc(p) + '</span>').join('');
  },

  _bindActions(container) {
    container.querySelectorAll('.btn-copy').forEach(btn => {
      btn.addEventListener('click', () => this.onCopy(btn));
    });
    container.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const comment = State.comments.find(c => c.id === btn.dataset.id);
        if (comment) Editor.open(comment);
      });
    });
  },

  async onCopy(btn) {
    const comment = State.comments.find(c => c.id === btn.dataset.id);
    if (!comment) return;

    try {
      const item = new ClipboardItem({
        'text/html': new Blob([comment.textHtml], { type: 'text/html' }),
        'text/plain': new Blob([comment.textPlain], { type: 'text/plain' })
      });
      await navigator.clipboard.write([item]);

      btn.textContent = 'Copied';
      btn.classList.add('copied');
      UI.showToast('Copied to clipboard');
      setTimeout(() => {
        btn.textContent = 'Copy';
        btn.classList.remove('copied');
      }, 1500);
    } catch (error) {
      // Fallback for browsers that don't support ClipboardItem
      try {
        await navigator.clipboard.writeText(comment.textPlain);
        btn.textContent = 'Copied';
        btn.classList.add('copied');
        UI.showToast('Copied as plain text');
        setTimeout(() => {
          btn.textContent = 'Copy';
          btn.classList.remove('copied');
        }, 1500);
      } catch (err) {
        UI.showToast('Copy failed', true);
      }
    }
  }
};

/* ========================================
   Editor — Slide-out panel, contenteditable, save/archive
   ======================================== */
const Editor = {
  editingComment: null, // null = new comment

  init() {
    // Toolbar buttons
    document.querySelectorAll('.toolbar-btn').forEach(btn => {
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault(); // Prevent losing focus from editor
        document.execCommand(btn.dataset.cmd, false, null);
      });
    });

    // Category pills
    document.getElementById('editor-category').addEventListener('click', (e) => {
      const pill = e.target.closest('.cat-pill');
      if (!pill) return;
      document.querySelectorAll('#editor-category .cat-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
    });

    // Panel buttons
    document.getElementById('panel-close').addEventListener('click', () => this.close());
    document.getElementById('panel-backdrop').addEventListener('click', () => this.close());
    document.getElementById('btn-panel-cancel').addEventListener('click', () => this.close());
    document.getElementById('btn-panel-save').addEventListener('click', () => this.save());
    document.getElementById('btn-panel-archive').addEventListener('click', () => this.archive());

    // Add comment button
    document.getElementById('btn-add-comment').addEventListener('click', () => this.open(null));

    // Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (document.getElementById('confirm-backdrop').classList.contains('open')) return;
        if (document.getElementById('settings-overlay').classList.contains('open')) {
          Settings.close();
          return;
        }
        if (document.getElementById('slide-panel').classList.contains('open')) {
          this.close();
        }
      }
    });
  },

  open(comment) {
    this.editingComment = comment;
    const panel = document.getElementById('slide-panel');
    const backdrop = document.getElementById('panel-backdrop');
    const title = document.getElementById('panel-title');
    const archiveBtn = document.getElementById('btn-panel-archive');
    const editor = document.getElementById('editor-area');

    title.textContent = comment ? 'Edit Comment' : 'Add Comment';
    archiveBtn.classList.toggle('hidden', !comment);

    // Reset editor
    editor.innerHTML = comment ? comment.textHtml : '';

    // Reset category
    document.querySelectorAll('#editor-category .cat-pill').forEach(p => p.classList.remove('active'));
    if (comment) {
      const catPill = document.querySelector('#editor-category .cat-pill[data-cat="' + comment.category + '"]');
      if (catPill) catPill.classList.add('active');
    }

    // Render class checkboxes
    this._renderClassCheckboxes(comment);

    // Render assignment dropdown
    this._updateAssignmentDropdown(comment);

    panel.classList.add('open');
    backdrop.classList.add('open');
    setTimeout(() => editor.focus(), 300);
  },

  close() {
    document.getElementById('slide-panel').classList.remove('open');
    document.getElementById('panel-backdrop').classList.remove('open');
    this.editingComment = null;
  },

  _renderClassCheckboxes(comment) {
    const container = document.getElementById('editor-classes');
    const classes = State.activeClasses();
    const isGlobal = comment ? comment.isGlobal : false;
    const selectedIds = comment ? (comment.classIds || []) : [];

    let html = '<label class="checkbox-item"><input type="checkbox" id="cb-global"' + (isGlobal ? ' checked' : '') + '><span>All Classes</span></label>';
    classes.forEach(c => {
      const checked = selectedIds.includes(c.id) ? ' checked' : '';
      const disabled = isGlobal ? ' disabled' : '';
      const dimClass = isGlobal ? ' disabled' : '';
      html += '<label class="checkbox-item' + dimClass + '"><input type="checkbox" data-class-id="' + c.id + '"' + checked + disabled + '><span>' + Filters._esc(c.name) + '</span></label>';
    });
    container.innerHTML = html;

    // Toggle global
    document.getElementById('cb-global').addEventListener('change', (e) => {
      const isG = e.target.checked;
      container.querySelectorAll('input[data-class-id]').forEach(cb => {
        cb.disabled = isG;
        cb.checked = false;
        cb.closest('.checkbox-item').classList.toggle('disabled', isG);
      });
      this._updateAssignmentDropdown(null);
    });

    // Track class changes for assignment dropdown
    container.querySelectorAll('input[data-class-id]').forEach(cb => {
      cb.addEventListener('change', () => this._updateAssignmentDropdown(null));
    });
  },

  _updateAssignmentDropdown(comment) {
    const section = document.getElementById('editor-assignment-section');
    const select = document.getElementById('editor-assignment');
    const isGlobal = document.getElementById('cb-global').checked;
    const checkedClasses = [...document.querySelectorAll('#editor-classes input[data-class-id]:checked')].map(cb => cb.dataset.classId);

    // Only show when exactly one class selected and not global
    if (isGlobal || checkedClasses.length !== 1) {
      section.classList.add('hidden');
      select.innerHTML = '<option value="">None</option>';
      return;
    }

    section.classList.remove('hidden');
    const classId = checkedClasses[0];
    const assignments = State.assignmentsForClass(classId);
    let html = '<option value="">None</option>';
    assignments.forEach(a => {
      const selected = comment && comment.assignmentId === a.id ? ' selected' : '';
      html += '<option value="' + a.id + '"' + selected + '>' + Filters._esc(a.name) + '</option>';
    });
    select.innerHTML = html;
  },

  async save() {
    const editor = document.getElementById('editor-area');
    const textHtml = editor.innerHTML.trim();

    if (!textHtml || textHtml === '<br>') {
      UI.showToast('Please enter comment text', true);
      return;
    }

    // Get category
    const activeCat = document.querySelector('#editor-category .cat-pill.active');
    if (!activeCat) {
      UI.showToast('Please select a category', true);
      return;
    }
    const category = activeCat.dataset.cat;

    // Get class selection
    const isGlobal = document.getElementById('cb-global').checked;
    const classIds = isGlobal ? [] : [...document.querySelectorAll('#editor-classes input[data-class-id]:checked')].map(cb => cb.dataset.classId);

    if (!isGlobal && classIds.length === 0) {
      UI.showToast('Please select at least one class or "All Classes"', true);
      return;
    }

    // Get assignment
    const assignmentId = document.getElementById('editor-assignment').value || null;

    const saveBtn = document.getElementById('btn-panel-save');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
      const data = {
        id: this.editingComment?.id || null,
        textHtml,
        classIds,
        isGlobal,
        assignmentId,
        category,
        archived: false,
        sortOrder: this.editingComment?.sortOrder ?? State.comments.length
      };

      const result = await Store.saveComment(data);

      // Update local state
      if (this.editingComment) {
        const idx = State.comments.findIndex(c => c.id === this.editingComment.id);
        if (idx >= 0) {
          State.comments[idx] = { ...State.comments[idx], ...data, id: this.editingComment.id, textPlain: result.textPlain };
        }
      } else {
        State.comments.push({ ...data, id: result.id, textPlain: result.textPlain });
      }

      this.close();
      Filters.applyFilters();
      UI.showToast(this.editingComment ? 'Comment updated' : 'Comment added');
    } catch (error) {
      console.error('Save error:', error);
      UI.showToast('Failed to save comment', true);
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save';
    }
  },

  async archive() {
    if (!this.editingComment) return;
    const confirmed = await UI.confirm('Archive this comment? It will be hidden from view.');
    if (!confirmed) return;

    try {
      await Store.archiveComment(this.editingComment.id);
      const idx = State.comments.findIndex(c => c.id === this.editingComment.id);
      if (idx >= 0) State.comments[idx].archived = true;
      this.close();
      Filters.applyFilters();
      UI.showToast('Comment archived');
    } catch (error) {
      UI.showToast('Failed to archive comment', true);
    }
  }
};

/* ========================================
   Settings — Class/assignment management, bulk actions
   ======================================== */
const Settings = {
  init() {
    document.getElementById('btn-settings').addEventListener('click', () => this.open());
    document.getElementById('settings-close').addEventListener('click', () => this.close());

    // Add class
    document.getElementById('add-class-btn').addEventListener('click', () => this.addClass());
    document.getElementById('add-class-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.addClass();
    });

    // Assignment class selector
    document.getElementById('settings-assignment-class').addEventListener('change', (e) => {
      this.renderAssignments(e.target.value);
    });

    // Add assignment
    document.getElementById('add-assignment-btn').addEventListener('click', () => this.addAssignment());
    document.getElementById('add-assignment-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.addAssignment();
    });

    // Bulk actions
    document.getElementById('bulk-class-select').addEventListener('change', (e) => {
      const classId = e.target.value;
      document.getElementById('bulk-archive-class').disabled = !classId;
      this._populateBulkAssignments(classId);
    });

    document.getElementById('bulk-assignment-select').addEventListener('change', (e) => {
      document.getElementById('bulk-archive-assignment').disabled = !e.target.value;
    });

    document.getElementById('bulk-archive-class').addEventListener('click', () => this.bulkArchiveClass());
    document.getElementById('bulk-archive-assignment').addEventListener('click', () => this.bulkArchiveAssignment());
  },

  open() {
    document.getElementById('settings-overlay').classList.add('open');
    this.renderClasses();
    this._populateClassSelectors();
    this.renderAssignments('');
  },

  close() {
    document.getElementById('settings-overlay').classList.remove('open');
    // Refresh main view since classes/assignments may have changed
    Filters.renderClassPills();
    Filters.applyFilters();
  },

  // --- Classes ---
  renderClasses() {
    const container = document.getElementById('settings-classes');
    const classes = State.allClasses();
    if (classes.length === 0) {
      container.innerHTML = '<div style="color:var(--text-muted);font-size:0.85rem;padding:8px 0">No classes yet</div>';
      return;
    }

    container.innerHTML = classes.map(c => {
      const archivedClass = c.archived ? ' archived' : '';
      const archivedLabel = c.archived ? ' (archived)' : '';
      return '<div class="settings-item' + archivedClass + '" data-id="' + c.id + '">' +
        '<span class="settings-item-name">' + Filters._esc(c.name) + archivedLabel + '</span>' +
        '<div class="settings-item-actions">' +
          '<button class="settings-btn edit-class-btn" data-id="' + c.id + '">Edit</button>' +
          '<button class="settings-btn' + (c.archived ? '' : ' danger') + ' toggle-class-btn" data-id="' + c.id + '">' + (c.archived ? 'Unarchive' : 'Archive') + '</button>' +
        '</div>' +
      '</div>';
    }).join('');

    // Bind edit buttons
    container.querySelectorAll('.edit-class-btn').forEach(btn => {
      btn.addEventListener('click', () => this.editClassName(btn.dataset.id));
    });
    container.querySelectorAll('.toggle-class-btn').forEach(btn => {
      btn.addEventListener('click', () => this.toggleClassArchive(btn.dataset.id));
    });
  },

  async addClass() {
    const input = document.getElementById('add-class-input');
    const name = input.value.trim();
    if (!name) return;

    try {
      const id = await Store.saveClass({ name });
      // Refresh from Firestore to get server timestamp
      const snap = await Store.classesRef().doc(id).get();
      State.classes.push({ id, ...snap.data() });
      State.assignments[id] = [];
      input.value = '';
      this.renderClasses();
      this._populateClassSelectors();
      UI.showToast('Class added');
    } catch (error) {
      UI.showToast('Failed to add class', true);
    }
  },

  editClassName(classId) {
    const cls = State.getClass(classId);
    if (!cls) return;

    const item = document.querySelector('.settings-item[data-id="' + classId + '"]');
    const nameEl = item.querySelector('.settings-item-name');
    const currentName = cls.name;

    nameEl.outerHTML = '<input class="edit-name-input" type="text" value="' + Filters._esc(currentName) + '">';
    const input = item.querySelector('.edit-name-input');
    input.focus();
    input.select();

    const save = async () => {
      const newName = input.value.trim();
      if (newName && newName !== currentName) {
        try {
          await Store.saveClass({ id: classId, name: newName, archived: cls.archived, sortOrder: cls.sortOrder });
          cls.name = newName;
          UI.showToast('Class renamed');
        } catch (error) {
          UI.showToast('Failed to rename class', true);
        }
      }
      this.renderClasses();
      this._populateClassSelectors();
    };

    input.addEventListener('blur', save);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') input.blur();
      if (e.key === 'Escape') { input.value = currentName; input.blur(); }
    });
  },

  async toggleClassArchive(classId) {
    const cls = State.getClass(classId);
    if (!cls) return;

    if (!cls.archived) {
      const confirmed = await UI.confirm('Archive class "' + cls.name + '"? It will be hidden from filters.');
      if (!confirmed) return;
    }

    try {
      const newArchived = !cls.archived;
      await Store.saveClass({ id: classId, name: cls.name, archived: newArchived, sortOrder: cls.sortOrder });
      cls.archived = newArchived;
      this.renderClasses();
      this._populateClassSelectors();
      UI.showToast(newArchived ? 'Class archived' : 'Class unarchived');
    } catch (error) {
      UI.showToast('Failed to update class', true);
    }
  },

  // --- Assignments ---
  renderAssignments(classId) {
    const container = document.getElementById('settings-assignments');
    const addRow = document.getElementById('add-assignment-row');

    if (!classId) {
      container.innerHTML = '<div style="color:var(--text-muted);font-size:0.85rem;padding:8px 0">Select a class to manage assignments</div>';
      addRow.classList.add('hidden');
      return;
    }

    addRow.classList.remove('hidden');
    const assignments = State.allAssignmentsForClass(classId);

    if (assignments.length === 0) {
      container.innerHTML = '<div style="color:var(--text-muted);font-size:0.85rem;padding:8px 0">No assignments yet</div>';
      return;
    }

    container.innerHTML = assignments.map(a => {
      const archivedClass = a.archived ? ' archived' : '';
      const archivedLabel = a.archived ? ' (archived)' : '';
      return '<div class="settings-item' + archivedClass + '" data-id="' + a.id + '" data-class-id="' + classId + '">' +
        '<span class="settings-item-name">' + Filters._esc(a.name) + archivedLabel + '</span>' +
        '<div class="settings-item-actions">' +
          '<button class="settings-btn edit-assignment-btn" data-id="' + a.id + '" data-class-id="' + classId + '">Edit</button>' +
          '<button class="settings-btn' + (a.archived ? '' : ' danger') + ' toggle-assignment-btn" data-id="' + a.id + '" data-class-id="' + classId + '">' + (a.archived ? 'Unarchive' : 'Archive') + '</button>' +
        '</div>' +
      '</div>';
    }).join('');

    // Bind
    container.querySelectorAll('.edit-assignment-btn').forEach(btn => {
      btn.addEventListener('click', () => this.editAssignmentName(btn.dataset.classId, btn.dataset.id));
    });
    container.querySelectorAll('.toggle-assignment-btn').forEach(btn => {
      btn.addEventListener('click', () => this.toggleAssignmentArchive(btn.dataset.classId, btn.dataset.id));
    });
  },

  async addAssignment() {
    const classId = document.getElementById('settings-assignment-class').value;
    if (!classId) return;

    const input = document.getElementById('add-assignment-input');
    const name = input.value.trim();
    if (!name) return;

    try {
      const id = await Store.saveAssignment(classId, { name });
      const snap = await Store.assignmentsRef(classId).doc(id).get();
      if (!State.assignments[classId]) State.assignments[classId] = [];
      State.assignments[classId].push({ id, ...snap.data() });
      input.value = '';
      this.renderAssignments(classId);
      UI.showToast('Assignment added');
    } catch (error) {
      UI.showToast('Failed to add assignment', true);
    }
  },

  editAssignmentName(classId, assignmentId) {
    const assignment = State.getAssignment(classId, assignmentId);
    if (!assignment) return;

    const item = document.querySelector('.settings-item[data-id="' + assignmentId + '"][data-class-id="' + classId + '"]');
    const nameEl = item.querySelector('.settings-item-name');
    const currentName = assignment.name;

    nameEl.outerHTML = '<input class="edit-name-input" type="text" value="' + Filters._esc(currentName) + '">';
    const input = item.querySelector('.edit-name-input');
    input.focus();
    input.select();

    const save = async () => {
      const newName = input.value.trim();
      if (newName && newName !== currentName) {
        try {
          await Store.saveAssignment(classId, { id: assignmentId, name: newName, archived: assignment.archived, sortOrder: assignment.sortOrder });
          assignment.name = newName;
          UI.showToast('Assignment renamed');
        } catch (error) {
          UI.showToast('Failed to rename assignment', true);
        }
      }
      this.renderAssignments(classId);
    };

    input.addEventListener('blur', save);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') input.blur();
      if (e.key === 'Escape') { input.value = currentName; input.blur(); }
    });
  },

  async toggleAssignmentArchive(classId, assignmentId) {
    const assignment = State.getAssignment(classId, assignmentId);
    if (!assignment) return;

    if (!assignment.archived) {
      const confirmed = await UI.confirm('Archive assignment "' + assignment.name + '"?');
      if (!confirmed) return;
    }

    try {
      const newArchived = !assignment.archived;
      await Store.saveAssignment(classId, { id: assignmentId, name: assignment.name, archived: newArchived, sortOrder: assignment.sortOrder });
      assignment.archived = newArchived;
      this.renderAssignments(classId);
      UI.showToast(newArchived ? 'Assignment archived' : 'Assignment unarchived');
    } catch (error) {
      UI.showToast('Failed to update assignment', true);
    }
  },

  // --- Bulk Actions ---
  _populateClassSelectors() {
    const classes = State.activeClasses();
    const options = '<option value="">Select a class...</option>' + classes.map(c =>
      '<option value="' + c.id + '">' + Filters._esc(c.name) + '</option>'
    ).join('');

    document.getElementById('settings-assignment-class').innerHTML = options;
    document.getElementById('bulk-class-select').innerHTML = options;

    // Reset bulk assignments
    document.getElementById('bulk-assignment-select').innerHTML = '<option value="">Select an assignment...</option>';
    document.getElementById('bulk-assignment-select').disabled = true;
    document.getElementById('bulk-archive-class').disabled = true;
    document.getElementById('bulk-archive-assignment').disabled = true;
  },

  _populateBulkAssignments(classId) {
    const select = document.getElementById('bulk-assignment-select');
    const btn = document.getElementById('bulk-archive-assignment');
    if (!classId) {
      select.innerHTML = '<option value="">Select an assignment...</option>';
      select.disabled = true;
      btn.disabled = true;
      return;
    }
    select.disabled = false;
    const assignments = State.assignmentsForClass(classId);
    select.innerHTML = '<option value="">Select an assignment...</option>' + assignments.map(a =>
      '<option value="' + a.id + '">' + Filters._esc(a.name) + '</option>'
    ).join('');
  },

  async bulkArchiveClass() {
    const classId = document.getElementById('bulk-class-select').value;
    if (!classId) return;
    const cls = State.getClass(classId);
    if (!cls) return;

    const confirmed = await UI.confirm('Archive ALL comments for "' + cls.name + '"? This cannot be easily undone.');
    if (!confirmed) return;

    try {
      const commentIds = State.comments
        .filter(c => !c.archived && c.classIds.includes(classId))
        .map(c => c.id);

      if (commentIds.length === 0) {
        UI.showToast('No active comments found for this class');
        return;
      }

      await Store.bulkArchiveComments(commentIds);
      commentIds.forEach(id => {
        const c = State.comments.find(x => x.id === id);
        if (c) c.archived = true;
      });
      Filters.applyFilters();
      UI.showToast(commentIds.length + ' comment(s) archived');
    } catch (error) {
      UI.showToast('Bulk archive failed', true);
    }
  },

  async bulkArchiveAssignment() {
    const classId = document.getElementById('bulk-class-select').value;
    const assignmentId = document.getElementById('bulk-assignment-select').value;
    if (!classId || !assignmentId) return;

    const cls = State.getClass(classId);
    const assignment = State.getAssignment(classId, assignmentId);
    if (!cls || !assignment) return;

    const confirmed = await UI.confirm('Archive all comments for "' + assignment.name + '" in "' + cls.name + '"?');
    if (!confirmed) return;

    try {
      const commentIds = State.comments
        .filter(c => !c.archived && c.classIds.includes(classId) && c.assignmentId === assignmentId)
        .map(c => c.id);

      if (commentIds.length === 0) {
        UI.showToast('No active comments found for this assignment');
        return;
      }

      await Store.bulkArchiveComments(commentIds);
      commentIds.forEach(id => {
        const c = State.comments.find(x => x.id === id);
        if (c) c.archived = true;
      });
      Filters.applyFilters();
      UI.showToast(commentIds.length + ' comment(s) archived');
    } catch (error) {
      UI.showToast('Bulk archive failed', true);
    }
  }
};

/* ========================================
   App — Init orchestration
   ======================================== */
const App = {
  async onSignIn(user) {
    try {
      await Store.loadAll();
      Filters.renderClassPills();
      Filters.applyFilters();
    } catch (error) {
      console.error('Init error:', error);
      UI.showToast('Failed to load data', true);
    }
  },

  onSignOut() {
    State.reset();
    document.getElementById('main-content').innerHTML = '';
    document.getElementById('class-pills').innerHTML = '';
    document.getElementById('assignment-pills').innerHTML = '';
    document.getElementById('assignment-pills').classList.add('hidden');
    document.getElementById('search-input').value = '';
    document.getElementById('search-clear').classList.add('hidden');
  }
};

// --- Bootstrap ---
document.addEventListener('DOMContentLoaded', () => {
  Auth.init();
  Filters.init();
  Editor.init();
  Settings.init();
});
