/* ============================================
   Scratchpad Module
   Multi-clipboard temporary storage
   ============================================ */

const Scratchpad = {
  slots: [],
  container: null,
  addButton: null,

  async init() {
    this.container = document.getElementById('scratchpad-grid');
    this.addButton = document.getElementById('add-clipboard-btn');
    
    await this.loadSlots();
    this.render();
    this.setupEventListeners();
  },

  async loadSlots() {
    this.slots = await Storage.getClipboards();
    
    // Ensure at least one slot exists
    if (this.slots.length === 0) {
      this.slots.push({
        id: Storage.generateId(),
        content: ''
      });
      await this.save();
    }
  },

  async save() {
    await Storage.saveClipboards(this.slots);
  },

  render() {
    this.container.innerHTML = '';
    
    this.slots.forEach((slot, index) => {
      const slotEl = this.createSlotElement(slot, index);
      this.container.appendChild(slotEl);
    });
  },

  createSlotElement(slot, index) {
    const slotEl = document.createElement('div');
    slotEl.className = 'clipboard-slot';
    slotEl.dataset.id = slot.id;

    slotEl.innerHTML = `
      <button class="clipboard-delete" aria-label="Delete clipboard slot" title="Delete">×</button>
      <textarea 
        placeholder="Paste or type content here..." 
        aria-label="Clipboard slot ${index + 1}"
      >${UI.escapeHtml(slot.content)}</textarea>
      <div class="clipboard-actions">
        <button class="btn btn-small btn-copy" title="Copy with formatting">
          Copy
        </button>
        <button class="btn btn-small btn-copy-plain" title="Copy as plain text">
          Copy Plain
        </button>
      </div>
    `;

    // Setup textarea auto-save
    const textarea = slotEl.querySelector('textarea');
    textarea.addEventListener('input', UI.debounce(() => {
      slot.content = textarea.value;
      this.save();
    }, 300));

    // Setup copy button (with formatting)
    slotEl.querySelector('.btn-copy').addEventListener('click', () => {
      this.copyToClipboard(slot.content, true);
    });

    // Setup copy plain button
    slotEl.querySelector('.btn-copy-plain').addEventListener('click', () => {
      this.copyToClipboard(slot.content, false);
    });

    // Setup delete button
    slotEl.querySelector('.clipboard-delete').addEventListener('click', () => {
      this.deleteSlot(slot.id);
    });

    return slotEl;
  },

  async copyToClipboard(content, preserveFormatting) {
    try {
      if (preserveFormatting && navigator.clipboard.write) {
        // Try to copy with formatting
        const blob = new Blob([content], { type: 'text/plain' });
        const clipboardItem = new ClipboardItem({ 'text/plain': blob });
        await navigator.clipboard.write([clipboardItem]);
      } else {
        // Plain text copy
        await navigator.clipboard.writeText(content);
      }
      
      UI.showToast({ 
        message: 'Copied to clipboard!',
        duration: 2000 
      });
    } catch (err) {
      console.error('Failed to copy:', err);
      UI.showToast({ 
        message: 'Failed to copy. Try selecting and copying manually.',
        duration: 3000 
      });
    }
  },

  addSlot() {
    const newSlot = {
      id: Storage.generateId(),
      content: ''
    };
    
    this.slots.push(newSlot);
    this.save();
    this.render();

    // Focus the new textarea
    const newSlotEl = this.container.querySelector(`[data-id="${newSlot.id}"] textarea`);
    if (newSlotEl) {
      newSlotEl.focus();
    }
  },

  deleteSlot(id) {
    // Don't delete if it's the only slot
    if (this.slots.length <= 1) {
      UI.showToast({ 
        message: 'You need at least one clipboard slot.',
        duration: 2000 
      });
      return;
    }

    const index = this.slots.findIndex(s => s.id === id);
    if (index > -1) {
      this.slots.splice(index, 1);
      this.save();
      this.render();
    }
  },

  setupEventListeners() {
    this.addButton.addEventListener('click', () => this.addSlot());
  }
};

// Make Scratchpad available globally
window.Scratchpad = Scratchpad;
