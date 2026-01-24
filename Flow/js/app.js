/* ============================================
   Flow App - Main Application
   ============================================ */

const App = {
  currentPanel: 'lists',
  isDesktop: false,
  panelsWrapper: null,
  panels: {},
  navButtons: {},
  initialized: false,

  // Called once auth is ready
  async init(user) {
    if (this.initialized) return;
    this.initialized = true;

    // Set user for storage (need email for sharing)
    Storage.setUser(user.uid, user.email);

    // Update user email display
    document.getElementById('user-email').textContent = user.email;

    // Get references
    this.panelsWrapper = document.querySelector('.panels-wrapper');
    this.panels = {
      scratchpad: document.getElementById('panel-scratchpad'),
      lists: document.getElementById('panel-lists'),
      notes: document.getElementById('panel-notes')
    };

    // Get nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
      const target = btn.dataset.target;
      this.navButtons[target] = btn;
    });

    // Check viewport size
    this.checkViewport();
    window.addEventListener('resize', UI.debounce(() => this.checkViewport(), 150));

    // Initialize UI module
    UI.init();

    // Initialize feature modules (async for Firestore)
    await Scratchpad.init();
    await Lists.init();
    await Notes.init();

    // Setup navigation
    this.setupNavigation();

    // Setup user menu
    this.setupUserMenu();

    // Scroll to Lists panel on mobile (starting position)
    if (!this.isDesktop) {
      this.navigateToPanel('lists', false);
    }

    // Set up desktop accordion
    if (this.isDesktop) {
      this.setupDesktopAccordion();
    }

    // Hide loading spinner
    document.getElementById('loading-spinner').classList.add('hidden');
  },

  // Reset app state on sign out
  reset() {
    this.initialized = false;
    this.currentPanel = 'lists';
    
    // Clear containers
    document.getElementById('lists-container').innerHTML = '';
    document.getElementById('notes-grid').innerHTML = '';
    document.getElementById('scratchpad-grid').innerHTML = '';
    document.getElementById('tags-filter').innerHTML = '';
    
    // Reset nav
    Object.values(this.navButtons).forEach(btn => btn.classList.remove('active'));
    if (this.navButtons.lists) this.navButtons.lists.classList.add('active');
    
    // Show loading spinner for next login
    document.getElementById('loading-spinner').classList.remove('hidden');
  },

  setupUserMenu() {
    const menuBtn = document.getElementById('user-menu-btn');
    const dropdown = document.getElementById('user-dropdown');
    const signOutBtn = document.getElementById('sign-out-btn');

    // Toggle dropdown
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('hidden');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target) && e.target !== menuBtn) {
        dropdown.classList.add('hidden');
      }
    });

    // Sign out
    signOutBtn.addEventListener('click', async () => {
      dropdown.classList.add('hidden');
      this.reset();
      await Auth.signOut();
    });
  },

  checkViewport() {
    const wasDesktop = this.isDesktop;
    this.isDesktop = window.innerWidth >= 768;

    // Handle layout change
    if (wasDesktop !== this.isDesktop) {
      if (this.isDesktop) {
        this.setupDesktopAccordion();
      } else {
        this.removeDesktopAccordion();
      }
    }
  },

  setupNavigation() {
    // Nav button clicks
    Object.entries(this.navButtons).forEach(([target, btn]) => {
      btn.addEventListener('click', () => this.navigateToPanel(target));
    });

    // Track scroll position for mobile swipe navigation
    if (!this.isDesktop) {
      this.panelsWrapper.addEventListener('scroll', UI.debounce(() => {
        this.updateActiveNavFromScroll();
      }, 50));
    }

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      // Only handle if not in an input
      if (e.target.matches('input, textarea')) return;

      if (e.key === 'ArrowLeft') {
        this.navigatePrev();
      } else if (e.key === 'ArrowRight') {
        this.navigateNext();
      }
    });
  },

  navigateToPanel(panelName, smooth = true) {
    const panel = this.panels[panelName];
    if (!panel) return;

    this.currentPanel = panelName;

    // Update nav buttons
    Object.entries(this.navButtons).forEach(([target, btn]) => {
      btn.classList.toggle('active', target === panelName);
    });

    // On mobile, scroll to the panel
    if (!this.isDesktop) {
      panel.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
        inline: 'center'
      });
    }
  },

  updateActiveNavFromScroll() {
    const scrollLeft = this.panelsWrapper.scrollLeft;
    const panelWidth = this.panelsWrapper.offsetWidth;
    
    // Determine which panel is most visible
    const panelIndex = Math.round(scrollLeft / panelWidth);
    const panelNames = ['scratchpad', 'lists', 'notes'];
    const activePanelName = panelNames[panelIndex] || 'lists';

    if (activePanelName !== this.currentPanel) {
      this.currentPanel = activePanelName;
      
      // Update nav buttons
      Object.entries(this.navButtons).forEach(([target, btn]) => {
        btn.classList.toggle('active', target === activePanelName);
      });
    }
  },

  navigatePrev() {
    const order = ['scratchpad', 'lists', 'notes'];
    const currentIndex = order.indexOf(this.currentPanel);
    if (currentIndex > 0) {
      this.navigateToPanel(order[currentIndex - 1]);
    }
  },

  navigateNext() {
    const order = ['scratchpad', 'lists', 'notes'];
    const currentIndex = order.indexOf(this.currentPanel);
    if (currentIndex < order.length - 1) {
      this.navigateToPanel(order[currentIndex + 1]);
    }
  },

  // Desktop accordion setup
  setupDesktopAccordion() {
    // Add accordion indicators inline with titles
    const listsTitle = this.panels.lists.querySelector('.panel-header h1');
    const scratchpadTitle = this.panels.scratchpad.querySelector('.panel-header h1');

    // Add indicator to Lists title
    if (!listsTitle.querySelector('.accordion-indicator')) {
      const indicator = document.createElement('span');
      indicator.className = 'accordion-indicator';
      indicator.innerHTML = '▼';
      listsTitle.appendChild(indicator);
    }

    // Add indicator to Scratchpad title  
    if (!scratchpadTitle.querySelector('.accordion-indicator')) {
      const indicator = document.createElement('span');
      indicator.className = 'accordion-indicator';
      indicator.innerHTML = '▼';
      scratchpadTitle.appendChild(indicator);
    }

    // Set initial state: Lists expanded, Scratchpad collapsed
    this.panels.lists.classList.add('expanded');
    this.panels.lists.classList.remove('collapsed');
    this.panels.scratchpad.classList.add('collapsed');
    this.panels.scratchpad.classList.remove('expanded');

    // Make entire headers clickable to toggle
    const listsHeader = this.panels.lists.querySelector('.panel-header');
    const scratchpadHeader = this.panels.scratchpad.querySelector('.panel-header');

    listsHeader.style.cursor = 'pointer';
    listsHeader.addEventListener('click', (e) => {
      if (e.target.closest('input, button')) return;
      this.expandPanel('lists');
    });

    scratchpadHeader.style.cursor = 'pointer';
    scratchpadHeader.addEventListener('click', (e) => {
      // Don't toggle if clicking on search or other interactive elements
      if (e.target.closest('input, button')) return;
      this.expandPanel('scratchpad');
    });
  },

  removeDesktopAccordion() {
    document.querySelectorAll('.accordion-indicator').forEach(el => el.remove());
    
    // Reset panel states
    this.panels.scratchpad.classList.remove('collapsed', 'expanded');
    this.panels.lists.classList.remove('collapsed', 'expanded');
    
    // Remove cursor styles
    this.panels.scratchpad.querySelector('.panel-header').style.cursor = '';
    this.panels.lists.querySelector('.panel-header').style.cursor = '';
  },

  expandPanel(panelName) {
    if (panelName === 'lists') {
      this.panels.lists.classList.remove('collapsed');
      this.panels.lists.classList.add('expanded');
      this.panels.scratchpad.classList.add('collapsed');
      this.panels.scratchpad.classList.remove('expanded');
    } else {
      this.panels.scratchpad.classList.remove('collapsed');
      this.panels.scratchpad.classList.add('expanded');
      this.panels.lists.classList.add('collapsed');
      this.panels.lists.classList.remove('expanded');
    }
  }
};

// Initialize auth when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Set up auth callback
  Auth.onAuthReady = (user) => App.init(user);
  
  // Initialize auth module
  Auth.init();
});

// Make App available globally for debugging
window.App = App;
