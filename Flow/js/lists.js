/* ============================================
   Lists Module
   Categories → Sub-lists → Checklist Items
   ============================================ */

const Lists = {
  categories: [],
  container: null,
  addButton: null,
  searchInput: null,
  searchQuery: '',
  recentlyCleared: null, // For undo functionality

  async init() {
    this.container = document.getElementById('lists-container');
    this.addButton = document.getElementById('add-category-btn');
    this.searchInput = document.getElementById('lists-search');
    
    await this.loadCategories();
    this.render();
    this.setupEventListeners();
  },

  async loadCategories() {
    this.categories = await Storage.getCategories();
  },

  async save() {
    await Storage.saveCategories(this.categories);
  },

  render() {
    this.container.innerHTML = '';
    
    const filteredCategories = this.filterCategories();
    
    if (filteredCategories.length === 0) {
      if (this.searchQuery) {
        this.container.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>
            <p class="empty-state-message">No matches found for "${UI.escapeHtml(this.searchQuery)}"</p>
          </div>
        `;
      } else {
        this.container.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="8" y1="6" x2="21" y2="6"></line>
                <line x1="8" y1="12" x2="21" y2="12"></line>
                <line x1="8" y1="18" x2="21" y2="18"></line>
                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                <line x1="3" y1="18" x2="3.01" y2="18"></line>
              </svg>
            </div>
            <p class="empty-state-message">No lists yet. Add a category to get started!</p>
          </div>
        `;
      }
      return;
    }

    filteredCategories.forEach(category => {
      const categoryEl = this.createCategoryElement(category);
      this.container.appendChild(categoryEl);
    });
  },

  filterCategories() {
    if (!this.searchQuery) return this.categories;
    
    const query = this.searchQuery.toLowerCase();
    
    return this.categories.map(category => {
      // Check if category name matches
      const categoryMatches = category.name.toLowerCase().includes(query);
      
      // Filter sublists
      const filteredSublists = category.sublists.map(sublist => {
        const sublistMatches = sublist.name.toLowerCase().includes(query);
        
        // Filter items
        const filteredItems = sublist.items.filter(item => 
          item.text.toLowerCase().includes(query)
        );
        
        if (sublistMatches || filteredItems.length > 0) {
          return { ...sublist, items: sublistMatches ? sublist.items : filteredItems };
        }
        return null;
      }).filter(Boolean);
      
      if (categoryMatches || filteredSublists.length > 0) {
        return { ...category, sublists: categoryMatches ? category.sublists : filteredSublists };
      }
      return null;
    }).filter(Boolean);
  },

  createCategoryElement(category) {
    const categoryEl = document.createElement('div');
    categoryEl.className = 'category' + (category.expanded !== false ? ' expanded' : '');
    categoryEl.dataset.id = category.id;

    // Show shared badge if shared with others OR if it's shared with me
    const isSharedWithOthers = category.sharedWith && category.sharedWith.length > 0;
    const sharedBadge = category.isShared 
      ? `<span class="shared-badge" title="Shared by ${category.ownerEmail || 'someone'}">Shared</span>` 
      : (isSharedWithOthers ? '<span class="shared-badge" title="You\'re sharing this">Sharing</span>' : '');

    // Only show share/delete buttons if user owns this category
    const isOwner = category.isOwner !== false;
    const shareButton = isOwner ? `
      <button class="btn btn-icon-only share-category" aria-label="Share category" title="Share">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="18" cy="5" r="3"></circle>
          <circle cx="6" cy="12" r="3"></circle>
          <circle cx="18" cy="19" r="3"></circle>
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
        </svg>
      </button>
    ` : '';
    
    const deleteButton = isOwner ? `
      <button class="btn btn-icon-only delete-category" aria-label="Delete category" title="Delete">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
    ` : '';

    categoryEl.innerHTML = `
      <div class="category-header">
        <span class="category-title">
          ${UI.escapeHtml(category.name)}
          ${sharedBadge}
        </span>
        <div class="category-actions">
          ${shareButton}
          <button class="btn btn-icon-only edit-category" aria-label="Edit category" title="Edit">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          ${deleteButton}
          <span class="category-toggle">▼</span>
        </div>
      </div>
      <div class="category-content">
        <div class="sublists-container"></div>
        <button class="btn btn-add btn-small add-sublist">
          <span class="btn-icon">+</span>
          Add Sub-list
        </button>
      </div>
    `;

    // Toggle expand/collapse
    const header = categoryEl.querySelector('.category-header');
    header.addEventListener('click', (e) => {
      if (!e.target.closest('button')) {
        category.expanded = !categoryEl.classList.contains('expanded');
        categoryEl.classList.toggle('expanded');
        this.save();
      }
    });

    // Edit category
    categoryEl.querySelector('.edit-category').addEventListener('click', (e) => {
      e.stopPropagation();
      this.showEditCategoryModal(category);
    });

    // Delete category (only exists for owners)
    const deleteBtn = categoryEl.querySelector('.delete-category');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.confirmDeleteCategory(category);
      });
    }

    // Share category (only exists for owners)
    const shareBtn = categoryEl.querySelector('.share-category');
    if (shareBtn) {
      shareBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showShareCategoryModal(category);
      });
    }

    // Add sublist
    categoryEl.querySelector('.add-sublist').addEventListener('click', () => {
      this.showAddSublistModal(category);
    });

    // Render sublists
    const sublistsContainer = categoryEl.querySelector('.sublists-container');
    category.sublists.forEach(sublist => {
      const sublistEl = this.createSublistElement(category, sublist);
      sublistsContainer.appendChild(sublistEl);
    });

    return categoryEl;
  },

  createSublistElement(category, sublist) {
    const sublistEl = document.createElement('div');
    sublistEl.className = 'sublist';
    sublistEl.dataset.id = sublist.id;

    sublistEl.innerHTML = `
      <div class="sublist-header">
        <span class="sublist-title">${UI.escapeHtml(sublist.name)}</span>
        <div class="sublist-actions">
          <button class="btn btn-icon-only edit-sublist" aria-label="Edit sub-list" title="Edit">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button class="btn btn-icon-only delete-sublist" aria-label="Delete sub-list" title="Delete">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>
      <div class="checklist"></div>
      <form class="add-item-form">
        <input type="text" placeholder="Add item..." aria-label="Add new item">
        <button type="submit" class="btn btn-primary btn-small">Add</button>
      </form>
      <button class="clear-completed" style="display: none;">Clear completed</button>
    `;

    // Edit sublist
    sublistEl.querySelector('.edit-sublist').addEventListener('click', () => {
      this.showEditSublistModal(category, sublist);
    });

    // Delete sublist
    sublistEl.querySelector('.delete-sublist').addEventListener('click', () => {
      this.confirmDeleteSublist(category, sublist);
    });

    // Add item form
    const form = sublistEl.querySelector('.add-item-form');
    const input = form.querySelector('input');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (text) {
        this.addItem(category, sublist, text);
        input.value = '';
        input.focus();
      }
    });

    // Render checklist items
    const checklistEl = sublistEl.querySelector('.checklist');
    sublist.items.forEach(item => {
      const itemEl = this.createChecklistItemElement(category, sublist, item);
      checklistEl.appendChild(itemEl);
    });

    // Clear completed button
    const clearBtn = sublistEl.querySelector('.clear-completed');
    const hasCompleted = sublist.items.some(item => item.checked);
    clearBtn.style.display = hasCompleted ? 'block' : 'none';
    clearBtn.addEventListener('click', () => {
      this.clearCompleted(category, sublist);
    });

    return sublistEl;
  },

  createChecklistItemElement(category, sublist, item) {
    const itemEl = document.createElement('div');
    itemEl.className = 'checklist-item' + (item.checked ? ' checked' : '');
    itemEl.dataset.id = item.id;

    itemEl.innerHTML = `
      <input type="checkbox" id="item-${item.id}" ${item.checked ? 'checked' : ''}>
      <label for="item-${item.id}">${UI.escapeHtml(item.text)}</label>
      <button class="delete-item" aria-label="Delete item" title="Delete">×</button>
    `;

    // Toggle checked state
    const checkbox = itemEl.querySelector('input');
    checkbox.addEventListener('change', () => {
      item.checked = checkbox.checked;
      itemEl.classList.toggle('checked', item.checked);
      this.save();
      
      // Update clear completed button visibility
      this.render();
    });

    // Delete item
    itemEl.querySelector('.delete-item').addEventListener('click', () => {
      const index = sublist.items.findIndex(i => i.id === item.id);
      if (index > -1) {
        sublist.items.splice(index, 1);
        this.save();
        this.render();
      }
    });

    return itemEl;
  },

  // ============================================
  // Category Operations
  // ============================================

  showAddCategoryModal() {
    const content = document.createElement('div');
    content.appendChild(UI.createFormGroup({
      label: 'Category Name',
      name: 'category-name',
      placeholder: 'e.g., Shopping, Work, Home...',
      required: true
    }));

    const footer = document.createElement('div');
    footer.appendChild(UI.createButton({
      text: 'Cancel',
      className: 'btn btn-secondary',
      onClick: () => UI.closeModal()
    }));
    footer.appendChild(UI.createButton({
      text: 'Add Category',
      className: 'btn btn-primary',
      onClick: () => {
        const input = document.getElementById('category-name');
        const name = input.value.trim();
        if (name) {
          this.addCategory(name);
          UI.closeModal();
        }
      }
    }));

    UI.showModal({
      title: 'Add Category',
      content,
      footer
    });
  },

  addCategory(name) {
    const category = {
      id: Storage.generateId(),
      name,
      expanded: true,
      shared: false,
      sublists: []
    };
    
    this.categories.push(category);
    this.save();
    this.render();
  },

  showEditCategoryModal(category) {
    const content = document.createElement('div');
    content.appendChild(UI.createFormGroup({
      label: 'Category Name',
      name: 'category-name',
      value: category.name,
      required: true
    }));

    const footer = document.createElement('div');
    footer.appendChild(UI.createButton({
      text: 'Cancel',
      className: 'btn btn-secondary',
      onClick: () => UI.closeModal()
    }));
    footer.appendChild(UI.createButton({
      text: 'Save',
      className: 'btn btn-primary',
      onClick: () => {
        const input = document.getElementById('category-name');
        const name = input.value.trim();
        if (name) {
          category.name = name;
          this.save();
          this.render();
          UI.closeModal();
        }
      }
    }));

    UI.showModal({
      title: 'Edit Category',
      content,
      footer
    });
  },

  confirmDeleteCategory(category) {
    UI.confirm({
      message: `Delete "${category.name}" and all its lists? This cannot be undone.`,
      onConfirm: () => {
        const index = this.categories.findIndex(c => c.id === category.id);
        if (index > -1) {
          this.categories.splice(index, 1);
          this.save();
          this.render();
        }
      }
    });
  },

  showShareCategoryModal(category) {
    const content = document.createElement('div');
    
    // Email input
    content.appendChild(UI.createFormGroup({
      label: 'Share with (email)',
      name: 'share-email',
      type: 'email',
      placeholder: 'person@example.com',
      required: true
    }));

    // Currently shared with
    const sharedList = document.createElement('div');
    sharedList.className = 'shared-users-list';
    
    if (category.sharedWith && category.sharedWith.length > 0) {
      const label = document.createElement('label');
      label.textContent = 'Currently shared with:';
      label.style.marginBottom = 'var(--space-xs)';
      label.style.display = 'block';
      label.style.fontSize = 'var(--font-sm)';
      label.style.color = 'var(--text-secondary)';
      sharedList.appendChild(label);

      category.sharedWith.forEach(email => {
        const userEl = document.createElement('div');
        userEl.className = 'shared-user';
        userEl.innerHTML = `
          <span class="shared-user-email">${UI.escapeHtml(email)}</span>
          <button class="btn btn-icon-only remove-share" data-email="${UI.escapeHtml(email)}" title="Remove">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        `;
        sharedList.appendChild(userEl);
      });
    }
    content.appendChild(sharedList);

    const footer = document.createElement('div');
    footer.appendChild(UI.createButton({
      text: 'Cancel',
      className: 'btn btn-secondary',
      onClick: () => UI.closeModal()
    }));
    footer.appendChild(UI.createButton({
      text: 'Share',
      className: 'btn btn-primary',
      onClick: async () => {
        try {
          const emailInput = document.getElementById('share-email');
          const email = emailInput?.value?.trim()?.toLowerCase();
          
          if (!email) {
            UI.toast('Please enter an email address');
            return;
          }
          
          if (!email.includes('@')) {
            UI.toast('Please enter a valid email address');
            return;
          }

          if (category.sharedWith && category.sharedWith.includes(email)) {
            UI.toast('Already shared with this email');
            return;
          }

          const success = await Storage.shareCategory(category.id, email);
          
          if (success) {
            if (!category.sharedWith) category.sharedWith = [];
            category.sharedWith.push(email);
            
            UI.closeModal();
            UI.toast(`Shared "${category.name}" with ${email}`);
            this.render();
          } else {
            UI.toast('Failed to share. Please try again.');
          }
        } catch (err) {
          console.error('Share error:', err);
          UI.toast('Error sharing. Please try again.');
        }
      }
    }));

    UI.showModal({
      title: `Share "${category.name}"`,
      content,
      footer
    });

    // Add remove share handlers
    setTimeout(() => {
      document.querySelectorAll('.remove-share').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const email = e.currentTarget.dataset.email;
          const success = await Storage.unshareCategory(category.id, email);
          if (success) {
            category.sharedWith = category.sharedWith.filter(e => e !== email);
            UI.closeModal();
            UI.toast(`Removed ${email} from "${category.name}"`);
            this.render();
          }
        });
      });
    }, 100);
  },

  // ============================================
  // Sublist Operations
  // ============================================

  showAddSublistModal(category) {
    const content = document.createElement('div');
    content.appendChild(UI.createFormGroup({
      label: 'Sub-list Name',
      name: 'sublist-name',
      placeholder: 'e.g., Costco, Target, Meijer...',
      required: true
    }));

    const footer = document.createElement('div');
    footer.appendChild(UI.createButton({
      text: 'Cancel',
      className: 'btn btn-secondary',
      onClick: () => UI.closeModal()
    }));
    footer.appendChild(UI.createButton({
      text: 'Add Sub-list',
      className: 'btn btn-primary',
      onClick: () => {
        const input = document.getElementById('sublist-name');
        const name = input.value.trim();
        if (name) {
          this.addSublist(category, name);
          UI.closeModal();
        }
      }
    }));

    UI.showModal({
      title: 'Add Sub-list',
      content,
      footer
    });
  },

  addSublist(category, name) {
    const sublist = {
      id: Storage.generateId(),
      name,
      items: []
    };
    
    category.sublists.push(sublist);
    this.save();
    this.render();
  },

  showEditSublistModal(category, sublist) {
    const content = document.createElement('div');
    content.appendChild(UI.createFormGroup({
      label: 'Sub-list Name',
      name: 'sublist-name',
      value: sublist.name,
      required: true
    }));

    const footer = document.createElement('div');
    footer.appendChild(UI.createButton({
      text: 'Cancel',
      className: 'btn btn-secondary',
      onClick: () => UI.closeModal()
    }));
    footer.appendChild(UI.createButton({
      text: 'Save',
      className: 'btn btn-primary',
      onClick: () => {
        const input = document.getElementById('sublist-name');
        const name = input.value.trim();
        if (name) {
          sublist.name = name;
          this.save();
          this.render();
          UI.closeModal();
        }
      }
    }));

    UI.showModal({
      title: 'Edit Sub-list',
      content,
      footer
    });
  },

  confirmDeleteSublist(category, sublist) {
    UI.confirm({
      message: `Delete "${sublist.name}" and all its items? This cannot be undone.`,
      onConfirm: () => {
        const index = category.sublists.findIndex(s => s.id === sublist.id);
        if (index > -1) {
          category.sublists.splice(index, 1);
          this.save();
          this.render();
        }
      }
    });
  },

  // ============================================
  // Item Operations
  // ============================================

  addItem(category, sublist, text) {
    const item = {
      id: Storage.generateId(),
      text,
      checked: false
    };
    
    sublist.items.push(item);
    this.save();
    this.render();
  },

  clearCompleted(category, sublist) {
    const completed = sublist.items.filter(item => item.checked);
    
    if (completed.length === 0) return;

    // Store for undo
    this.recentlyCleared = {
      category,
      sublist,
      items: [...completed]
    };

    // Remove completed items
    sublist.items = sublist.items.filter(item => !item.checked);
    this.save();
    this.render();

    // Show toast with undo option
    UI.showToast({
      message: `Cleared ${completed.length} item${completed.length > 1 ? 's' : ''}`,
      action: () => this.restoreCleared(),
      actionText: 'Undo',
      duration: 8000
    });
  },

  restoreCleared() {
    if (!this.recentlyCleared) return;

    const { sublist, items } = this.recentlyCleared;
    
    // Restore items
    items.forEach(item => {
      item.checked = false;
      sublist.items.push(item);
    });
    
    this.save();
    this.render();
    this.recentlyCleared = null;
  },

  // ============================================
  // Event Listeners
  // ============================================

  setupEventListeners() {
    this.addButton.addEventListener('click', () => this.showAddCategoryModal());

    // Search with debounce
    this.searchInput.addEventListener('input', UI.debounce((e) => {
      this.searchQuery = e.target.value.trim();
      this.render();
    }, 200));
  }
};

// Make Lists available globally
window.Lists = Lists;
