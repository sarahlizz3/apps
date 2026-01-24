/* ============================================
   Notes Module
   Simple notes with tags and Markdown support
   ============================================ */

const Notes = {
  notes: [],
  tags: [],
  container: null,
  tagsFilter: null,
  addButton: null,
  searchInput: null,
  searchQuery: '',
  selectedTags: [],

  // Tag color classes
  TAG_COLORS: ['tag-purple', 'tag-blue', 'tag-green', 'tag-cyan', 'tag-coral', 'tag-amber'],

  async init() {
    this.container = document.getElementById('notes-grid');
    this.tagsFilter = document.getElementById('tags-filter');
    this.addButton = document.getElementById('add-note-btn');
    this.searchInput = document.getElementById('notes-search');
    
    await this.loadNotes();
    this.render();
    this.setupEventListeners();
  },

  async loadNotes() {
    this.notes = await Storage.getNotes();
    this.tags = await Storage.getTags();
  },

  async save() {
    await Storage.saveNotes(this.notes);
    await Storage.saveTags(this.tags);
  },

  render() {
    this.renderTagsFilter();
    this.renderNotes();
  },

  renderTagsFilter() {
    this.tagsFilter.innerHTML = '';

    if (this.tags.length === 0) {
      this.tagsFilter.style.display = 'none';
      return;
    }

    this.tagsFilter.style.display = 'flex';

    // Clear all button
    if (this.selectedTags.length > 0) {
      const clearBtn = document.createElement('button');
      clearBtn.className = 'tag-filter-btn';
      clearBtn.textContent = 'Clear filters';
      clearBtn.addEventListener('click', () => {
        this.selectedTags = [];
        this.render();
      });
      this.tagsFilter.appendChild(clearBtn);
    }

    // Tag buttons
    this.tags.forEach(tag => {
      const btn = document.createElement('button');
      btn.className = 'tag-filter-btn' + (this.selectedTags.includes(tag.name) ? ' active' : '');
      btn.textContent = tag.name;
      btn.addEventListener('click', () => this.toggleTagFilter(tag.name));
      this.tagsFilter.appendChild(btn);
    });
  },

  renderNotes() {
    this.container.innerHTML = '';

    const filteredNotes = this.filterNotes();

    if (filteredNotes.length === 0) {
      if (this.searchQuery || this.selectedTags.length > 0) {
        this.container.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>
            <p class="empty-state-message">No notes match your search or filters</p>
          </div>
        `;
      } else {
        this.container.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </div>
            <p class="empty-state-message">No notes yet. Create your first note!</p>
          </div>
        `;
      }
      return;
    }

    filteredNotes.forEach(note => {
      const noteEl = this.createNoteCard(note);
      this.container.appendChild(noteEl);
    });
  },

  filterNotes() {
    let filtered = [...this.notes];

    // Filter by search query
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(note => 
        note.title.toLowerCase().includes(query) ||
        note.body.toLowerCase().includes(query) ||
        note.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Filter by selected tags
    if (this.selectedTags.length > 0) {
      filtered = filtered.filter(note =>
        this.selectedTags.every(tag => note.tags.includes(tag))
      );
    }

    // Sort by most recent
    filtered.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    return filtered;
  },

  createNoteCard(note) {
    const card = document.createElement('div');
    card.className = 'note-card';
    card.dataset.id = note.id;

    // Render markdown for preview
    const renderedBody = this.renderMarkdown(note.body || 'No content');

    card.innerHTML = `
      <h3 class="note-card-title">${UI.escapeHtml(note.title || 'Untitled')}</h3>
      <div class="note-card-preview">${renderedBody}</div>
      <div class="note-card-tags">
        ${note.tags.map(tag => `<span class="tag ${this.getTagColor(tag)}">${UI.escapeHtml(tag)}</span>`).join('')}
      </div>
    `;

    card.addEventListener('click', () => this.showEditNoteModal(note));

    return card;
  },

  renderMarkdown(text) {
    if (!text) return '';
    
    // Escape HTML first to prevent XSS
    let html = UI.escapeHtml(text);
    
    // Convert markdown to HTML
    // Headers (must be at start of line)
    html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^# (.+)$/gm, '<h2>$1</h2>');
    
    // Bold: **text** or __text__
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
    
    // Italic: *text* or _text_
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.+?)_/g, '<em>$1</em>');
    
    // Code: `text`
    html = html.replace(/`(.+?)`/g, '<code>$1</code>');
    
    // Strikethrough: ~~text~~
    html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');
    
    // Unordered lists: - item or * item
    // First, mark list items
    html = html.replace(/^[\-\*] (.+)$/gm, '{{LI}}$1{{/LI}}');
    
    // Wrap consecutive list items in ul (before converting newlines)
    html = html.replace(/({{LI}}.*?{{\/LI}}\n?)+/g, (match) => {
      // Remove newlines between list items and convert markers
      const items = match
        .replace(/{{LI}}/g, '<li>')
        .replace(/{{\/LI}}/g, '</li>')
        .replace(/\n/g, '');
      return '<ul>' + items + '</ul>';
    });
    
    // Paragraph breaks (double newline)
    html = html.replace(/\n\n+/g, '</p><p>');
    
    // Single line breaks
    html = html.replace(/\n/g, '<br>');
    
    // Wrap in paragraph tags
    html = '<p>' + html + '</p>';
    
    // Clean up empty paragraphs
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<p>(<h[234]>)/g, '$1');
    html = html.replace(/(<\/h[234]>)<\/p>/g, '$1');
    html = html.replace(/<p>(<ul>)/g, '$1');
    html = html.replace(/(<\/ul>)<\/p>/g, '$1');
    
    return html;
  },

  getPreviewText(body, maxLength = 150) {
    // Strip markdown formatting for preview
    let text = body
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/`(.+?)`/g, '$1')
      .replace(/#{1,6}\s/g, '')
      .replace(/\n/g, ' ')
      .trim();

    if (text.length > maxLength) {
      text = text.substring(0, maxLength) + '...';
    }

    return text || 'No content';
  },

  getTagColor(tagName) {
    const tag = this.tags.find(t => t.name === tagName);
    return tag ? tag.color : this.TAG_COLORS[0];
  },

  toggleTagFilter(tagName) {
    const index = this.selectedTags.indexOf(tagName);
    if (index > -1) {
      this.selectedTags.splice(index, 1);
    } else {
      this.selectedTags.push(tagName);
    }
    this.render();
  },

  // ============================================
  // Note Operations
  // ============================================

  showAddNoteModal() {
    this.showNoteModal({
      title: 'New Note',
      note: null,
      onSave: (data) => this.addNote(data)
    });
  },

  showEditNoteModal(note) {
    this.showNoteModal({
      title: 'Edit Note',
      note,
      onSave: (data) => this.updateNote(note, data),
      onDelete: () => this.confirmDeleteNote(note)
    });
  },

  showNoteModal({ title, note, onSave, onDelete }) {
    const content = document.createElement('div');

    // Title input
    content.appendChild(UI.createFormGroup({
      label: 'Title',
      name: 'note-title',
      value: note?.title || '',
      placeholder: 'Note title...'
    }));

    // Body textarea
    content.appendChild(UI.createFormGroup({
      label: 'Content',
      type: 'textarea',
      name: 'note-body',
      value: note?.body || '',
      placeholder: 'Write your note here...',
      hint: 'Supports **bold**, *italic*, and `code` formatting'
    }));

    // Tags input
    const tagsGroup = document.createElement('div');
    tagsGroup.className = 'form-group';
    tagsGroup.innerHTML = `
      <label>Tags</label>
      <div class="tags-input-container" id="tags-input-container">
        <input type="text" id="tag-input" placeholder="Add tag and press Enter..." list="tag-suggestions">
        <datalist id="tag-suggestions">
          ${this.tags.map(t => `<option value="${UI.escapeHtml(t.name)}">`).join('')}
        </datalist>
      </div>
    `;
    content.appendChild(tagsGroup);

    // Initialize tags in the container
    const currentTags = note?.tags || [];

    // Footer buttons
    const footer = document.createElement('div');
    
    if (onDelete) {
      footer.appendChild(UI.createButton({
        text: 'Delete',
        className: 'btn btn-danger',
        onClick: () => {
          UI.closeModal();
          onDelete();
        }
      }));
    }

    footer.appendChild(UI.createButton({
      text: 'Cancel',
      className: 'btn btn-secondary',
      onClick: () => UI.closeModal()
    }));

    footer.appendChild(UI.createButton({
      text: 'Save',
      className: 'btn btn-primary',
      onClick: () => {
        const titleInput = document.getElementById('note-title');
        const bodyInput = document.getElementById('note-body');
        const tagsContainer = document.getElementById('tags-input-container');
        const tagElements = tagsContainer.querySelectorAll('.tag');
        
        const tags = Array.from(tagElements).map(el => el.dataset.tag);
        
        onSave({
          title: titleInput.value.trim(),
          body: bodyInput.value,
          tags
        });
        
        UI.closeModal();
      }
    }));

    UI.showModal({ title, content, footer });

    // Setup tags input after modal is shown
    setTimeout(() => {
      this.setupTagsInput(currentTags);
    }, 100);
  },

  setupTagsInput(initialTags) {
    const container = document.getElementById('tags-input-container');
    const input = document.getElementById('tag-input');

    // Add initial tags
    initialTags.forEach(tag => this.addTagToInput(tag));

    // Handle Enter key
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const tagName = input.value.trim();
        if (tagName && !this.hasTagInInput(tagName)) {
          this.addTagToInput(tagName);
          input.value = '';
        }
      }
    });
  },

  addTagToInput(tagName) {
    const container = document.getElementById('tags-input-container');
    const input = document.getElementById('tag-input');

    const tagEl = document.createElement('span');
    tagEl.className = `tag ${this.getOrCreateTagColor(tagName)}`;
    tagEl.dataset.tag = tagName;
    tagEl.innerHTML = `
      ${UI.escapeHtml(tagName)}
      <button class="remove-tag" aria-label="Remove tag">×</button>
    `;

    tagEl.querySelector('.remove-tag').addEventListener('click', () => {
      tagEl.remove();
    });

    container.insertBefore(tagEl, input);
  },

  hasTagInInput(tagName) {
    const container = document.getElementById('tags-input-container');
    const tags = container.querySelectorAll('.tag');
    return Array.from(tags).some(el => el.dataset.tag.toLowerCase() === tagName.toLowerCase());
  },

  getOrCreateTagColor(tagName) {
    let tag = this.tags.find(t => t.name.toLowerCase() === tagName.toLowerCase());
    
    if (!tag) {
      // Assign a random color from the palette
      const colorIndex = this.tags.length % this.TAG_COLORS.length;
      tag = {
        name: tagName,
        color: this.TAG_COLORS[colorIndex]
      };
      this.tags.push(tag);
      this.save();
    }
    
    return tag.color;
  },

  addNote(data) {
    const note = {
      id: Storage.generateId(),
      title: data.title || 'Untitled',
      body: data.body,
      tags: data.tags,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.notes.push(note);
    this.save();
    this.render();
  },

  updateNote(note, data) {
    note.title = data.title || 'Untitled';
    note.body = data.body;
    note.tags = data.tags;
    note.updatedAt = new Date().toISOString();
    
    this.save();
    this.render();
  },

  confirmDeleteNote(note) {
    UI.confirm({
      message: `Delete "${note.title}"? This cannot be undone.`,
      onConfirm: () => {
        const index = this.notes.findIndex(n => n.id === note.id);
        if (index > -1) {
          this.notes.splice(index, 1);
          this.save();
          this.render();
        }
      }
    });
  },

  // ============================================
  // Event Listeners
  // ============================================

  setupEventListeners() {
    this.addButton.addEventListener('click', () => this.showAddNoteModal());

    // Search with debounce
    this.searchInput.addEventListener('input', UI.debounce((e) => {
      this.searchQuery = e.target.value.trim();
      this.render();
    }, 200));
  }
};

// Make Notes available globally
window.Notes = Notes;
