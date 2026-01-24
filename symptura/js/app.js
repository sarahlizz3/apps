// ========================================
// MAIN APP MODULE
// ========================================

const App = {
    currentScreen: 'log',
    symptoms: [],
    entries: [],
    dailyNotes: {},
    selectedDate: new Date(),
    unsubscribeSymptoms: null,
    unsubscribeEntries: null,
    unsubscribeNotes: null,

    // Initialize the app after auth
    init() {
        this.bindNavigation();
        this.bindSettings();
        this.bindModals();
        this.setupSwipeNavigation();
        this.loadData();
    },

    // Clear data on sign out
    clearData() {
        this.symptoms = [];
        this.entries = [];
        this.dailyNotes = {};
        
        // Unsubscribe from Firestore listeners
        if (this.unsubscribeSymptoms) this.unsubscribeSymptoms();
        if (this.unsubscribeEntries) this.unsubscribeEntries();
        if (this.unsubscribeNotes) this.unsubscribeNotes();
    },

    // Load data from Firestore
    loadData() {
        const userId = Auth.currentUser.uid;

        // Listen to symptoms collection
        this.unsubscribeSymptoms = db.collection('users').doc(userId)
            .collection('symptoms')
            .orderBy('order', 'asc')
            .onSnapshot((snapshot) => {
                this.symptoms = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                Settings.renderSymptomList();
                Log.renderSymptoms();
                History.renderFilters();
            });

        // Listen to entries collection
        this.unsubscribeEntries = db.collection('users').doc(userId)
            .collection('entries')
            .orderBy('date', 'desc')
            .onSnapshot((snapshot) => {
                this.entries = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                Log.updateSeverityDisplay();
                History.render();
            });

        // Listen to daily notes
        this.unsubscribeNotes = db.collection('users').doc(userId)
            .collection('dailyNotes')
            .onSnapshot((snapshot) => {
                this.dailyNotes = {};
                snapshot.docs.forEach(doc => {
                    this.dailyNotes[doc.id] = doc.data().note;
                });
                Log.updateDailyNote();
                History.render();
            });
    },

    // Bind navigation buttons
    bindNavigation() {
        const navButtons = document.querySelectorAll('.nav-btn');
        navButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const screen = btn.dataset.screen;
                this.navigateTo(screen);
            });
        });
    },

    // Navigate to a screen
    navigateTo(screen) {
        this.currentScreen = screen;

        // Update nav buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.screen === screen);
        });

        // Update screens
        document.querySelectorAll('.app-screen').forEach(s => {
            s.classList.toggle('active', s.dataset.screen === screen);
        });

        // Refresh screen content
        if (screen === 'history') {
            History.render();
        }
    },

    // Setup swipe navigation
    setupSwipeNavigation() {
        const container = document.getElementById('screens-container');
        let startX = 0;
        let startY = 0;
        let distX = 0;
        let distY = 0;
        const threshold = 50;

        container.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        }, { passive: true });

        container.addEventListener('touchmove', (e) => {
            distX = e.touches[0].clientX - startX;
            distY = e.touches[0].clientY - startY;
        }, { passive: true });

        container.addEventListener('touchend', () => {
            // Only handle horizontal swipes (ignore vertical scrolling)
            if (Math.abs(distX) > Math.abs(distY) && Math.abs(distX) > threshold) {
                if (distX > 0) {
                    // Swiped right
                    if (this.currentScreen === 'history') {
                        this.navigateTo('log');
                    }
                } else {
                    // Swiped left
                    if (this.currentScreen === 'log') {
                        this.navigateTo('history');
                    }
                }
            }
            distX = 0;
            distY = 0;
        });
    },

    // Bind settings button
    bindSettings() {
        document.getElementById('settings-btn').addEventListener('click', () => {
            this.openModal('settings-modal');
        });

        document.getElementById('close-settings').addEventListener('click', () => {
            this.closeModal('settings-modal');
        });

        document.getElementById('go-to-settings').addEventListener('click', () => {
            this.openModal('settings-modal');
        });
    },

    // Bind modal close handlers
    bindModals() {
        // Close modals when clicking backdrop
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal.id);
                }
            });
        });

        // Day detail modal
        document.getElementById('close-day-detail').addEventListener('click', () => {
            this.closeModal('day-detail-modal');
        });

        // Edit entry modal
        document.getElementById('close-edit-entry').addEventListener('click', () => {
            this.closeModal('edit-entry-modal');
        });

        // Confirm modal
        document.getElementById('confirm-cancel').addEventListener('click', () => {
            this.closeModal('confirm-modal');
            this.confirmCallback = null;
        });

        document.getElementById('confirm-ok').addEventListener('click', () => {
            if (this.confirmCallback) {
                this.confirmCallback();
            }
            this.closeModal('confirm-modal');
            this.confirmCallback = null;
        });
    },

    // Open a modal
    openModal(id) {
        document.getElementById(id).classList.remove('hidden');
    },

    // Close a modal
    closeModal(id) {
        document.getElementById(id).classList.add('hidden');
    },

    // Show confirmation dialog
    confirm(title, message, callback) {
        document.getElementById('confirm-title').textContent = title;
        document.getElementById('confirm-message').textContent = message;
        this.confirmCallback = callback;
        this.openModal('confirm-modal');
    },

    // Helper: Format date as YYYY-MM-DD
    formatDateKey(date) {
        return date.toISOString().split('T')[0];
    },

    // Helper: Format date for display
    formatDateDisplay(date) {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (this.formatDateKey(date) === this.formatDateKey(today)) {
            return 'Today';
        } else if (this.formatDateKey(date) === this.formatDateKey(yesterday)) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
            });
        }
    },

    // Helper: Format date for long display
    formatDateLong(date) {
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },

    // Get entries for a specific date
    getEntriesForDate(dateKey) {
        return this.entries.filter(e => e.date === dateKey);
    },

    // Get symptom by ID
    getSymptom(id) {
        return this.symptoms.find(s => s.id === id);
    }
};
