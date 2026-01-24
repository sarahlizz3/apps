/* ============================================
   UI Module
   Common UI utilities: modals, toasts, confirmations
   ============================================ */

const UI = {
  // Element references (initialized in init)
  elements: {},

  init() {
    this.elements = {
      modalOverlay: document.getElementById('modal-overlay'),
      modal: document.getElementById('modal'),
      modalTitle: document.getElementById('modal-title'),
      modalBody: document.getElementById('modal-body'),
      modalFooter: document.getElementById('modal-footer'),
      modalClose: document.getElementById('modal-close'),
      confirmOverlay: document.getElementById('confirm-overlay'),
      confirmMessage: document.getElementById('confirm-message'),
      confirmCancel: document.getElementById('confirm-cancel'),
      confirmOk: document.getElementById('confirm-ok'),
      toast: document.getElementById('toast'),
      toastMessage: document.getElementById('toast-message'),
      toastAction: document.getElementById('toast-action')
    };

    this.setupModalListeners();
    this.setupConfirmListeners();
  },

  // ============================================
  // Modal Methods
  // ============================================
  
  showModal({ title, content, footer, onClose }) {
    this.elements.modalTitle.textContent = title;
    this.elements.modalBody.innerHTML = '';
    this.elements.modalFooter.innerHTML = '';

    // Add content
    if (typeof content === 'string') {
      this.elements.modalBody.innerHTML = content;
    } else if (content instanceof HTMLElement) {
      this.elements.modalBody.appendChild(content);
    }

    // Add footer buttons
    if (footer) {
      if (typeof footer === 'string') {
        this.elements.modalFooter.innerHTML = footer;
      } else if (footer instanceof HTMLElement) {
        this.elements.modalFooter.appendChild(footer);
      }
    }

    // Store close callback
    this._modalCloseCallback = onClose;

    // Show modal
    this.elements.modalOverlay.hidden = false;
    document.body.style.overflow = 'hidden';

    // Focus first input if present
    const firstInput = this.elements.modalBody.querySelector('input, textarea');
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 100);
    }
  },

  closeModal() {
    this.elements.modalOverlay.hidden = true;
    document.body.style.overflow = '';
    
    if (this._modalCloseCallback) {
      this._modalCloseCallback();
      this._modalCloseCallback = null;
    }
  },

  setupModalListeners() {
    // Close button
    this.elements.modalClose.addEventListener('click', () => this.closeModal());

    // Click outside to close
    this.elements.modalOverlay.addEventListener('click', (e) => {
      if (e.target === this.elements.modalOverlay) {
        this.closeModal();
      }
    });

    // Escape key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.elements.modalOverlay.hidden) {
        this.closeModal();
      }
    });
  },

  // ============================================
  // Confirmation Dialog Methods
  // ============================================

  confirm({ message, confirmText = 'Delete', cancelText = 'Cancel', onConfirm, onCancel }) {
    this.elements.confirmMessage.textContent = message;
    this.elements.confirmOk.textContent = confirmText;
    this.elements.confirmCancel.textContent = cancelText;

    // Store callbacks
    this._confirmCallback = onConfirm;
    this._cancelCallback = onCancel;

    // Show dialog
    this.elements.confirmOverlay.hidden = false;
    this.elements.confirmCancel.focus();
  },

  closeConfirm() {
    this.elements.confirmOverlay.hidden = true;
    this._confirmCallback = null;
    this._cancelCallback = null;
  },

  setupConfirmListeners() {
    this.elements.confirmOk.addEventListener('click', () => {
      if (this._confirmCallback) {
        this._confirmCallback();
      }
      this.closeConfirm();
    });

    this.elements.confirmCancel.addEventListener('click', () => {
      if (this._cancelCallback) {
        this._cancelCallback();
      }
      this.closeConfirm();
    });

    // Click outside to cancel
    this.elements.confirmOverlay.addEventListener('click', (e) => {
      if (e.target === this.elements.confirmOverlay) {
        if (this._cancelCallback) {
          this._cancelCallback();
        }
        this.closeConfirm();
      }
    });
  },

  // ============================================
  // Toast Notification Methods
  // ============================================

  showToast({ message, action, actionText = 'Undo', duration = 5000 }) {
    // Clear any existing timeout
    if (this._toastTimeout) {
      clearTimeout(this._toastTimeout);
    }

    this.elements.toastMessage.textContent = message;
    
    if (action) {
      this.elements.toastAction.textContent = actionText;
      this.elements.toastAction.hidden = false;
      this.elements.toastAction.onclick = () => {
        action();
        this.hideToast();
      };
    } else {
      this.elements.toastAction.hidden = true;
    }

    this.elements.toast.hidden = false;

    // Auto-hide after duration
    this._toastTimeout = setTimeout(() => this.hideToast(), duration);
  },

  hideToast() {
    this.elements.toast.hidden = true;
    if (this._toastTimeout) {
      clearTimeout(this._toastTimeout);
      this._toastTimeout = null;
    }
  },

  // ============================================
  // Form Helpers
  // ============================================

  createFormGroup({ label, type = 'text', name, value = '', placeholder = '', hint = '', required = false }) {
    const group = document.createElement('div');
    group.className = 'form-group';

    const labelEl = document.createElement('label');
    labelEl.setAttribute('for', name);
    labelEl.textContent = label;
    group.appendChild(labelEl);

    let input;
    if (type === 'textarea') {
      input = document.createElement('textarea');
      input.rows = 5;
    } else {
      input = document.createElement('input');
      input.type = type;
    }

    input.id = name;
    input.name = name;
    input.value = value;
    input.placeholder = placeholder;
    if (required) input.required = true;

    group.appendChild(input);

    if (hint) {
      const hintEl = document.createElement('span');
      hintEl.className = 'hint';
      hintEl.textContent = hint;
      group.appendChild(hintEl);
    }

    return group;
  },

  createButton({ text, className = 'btn', onClick }) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = className;
    btn.textContent = text;
    if (onClick) btn.addEventListener('click', onClick);
    return btn;
  },

  // ============================================
  // Utility Methods
  // ============================================

  // Debounce function for search inputs
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Escape HTML to prevent XSS
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  // Simple markdown to HTML (for notes preview)
  simpleMarkdown(text) {
    if (!text) return '';
    
    return this.escapeHtml(text)
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Code
      .replace(/`(.+?)`/g, '<code>$1</code>')
      // Line breaks
      .replace(/\n/g, '<br>');
  },

  // Get contrasting text color for a background
  getContrastColor(hexColor) {
    // Remove # if present
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    return luminance > 0.5 ? '#121417' : '#e8eaed';
  }
};

// Make UI available globally
window.UI = UI;
