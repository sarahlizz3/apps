/**
 * Main Application Module
 */
const App = (function() {
    let currentScreen = 'schedule';
    let currentParams = {};
    let confirmResolve = null;

    async function init() {
        // Initialize Firebase
        await FirebaseApp.init();

        // Set up login form
        document.getElementById('login-form').addEventListener('submit', handleLogin);

        // Set up navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const screen = item.dataset.screen;
                navigate(screen);
            });
        });

        // Add event button
        document.getElementById('add-event-btn').addEventListener('click', () => {
            showAddEventModal();
        });

        // Add event modal
        document.getElementById('add-modal-close').addEventListener('click', hideAddEventModal);
        document.getElementById('parse-event-btn').addEventListener('click', handleParseEvent);
        document.getElementById('save-event-btn').addEventListener('click', handleSaveEvent);

        // Confirm modal
        document.getElementById('confirm-cancel-btn').addEventListener('click', () => {
            hideConfirmModal(false);
        });
        document.getElementById('confirm-ok-btn').addEventListener('click', () => {
            hideConfirmModal(true);
        });

        // Initialize UI modules
        ScheduleUI.init();
        ArchiveUI.init();
        EventUI.init();
        SettingsUI.init();

        // Handle hash navigation
        window.addEventListener('hashchange', handleHashChange);
        handleHashChange();

        // Online/offline indicator
        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);
        updateOnlineStatus();
    }

    function onAuthReady() {
        // Load conference names
        Storage.loadConferenceNames();

        // Subscribe to data changes
        Storage.subscribeToEvents((events) => {
            ScheduleUI.render();
            ArchiveUI.render();
        });

        Storage.subscribeToNotes((notes) => {
            ScheduleUI.setNotesMap(notes);
            ArchiveUI.setNotesMap(notes);
            ScheduleUI.render();
            ArchiveUI.render();
        });

        // Initial data load
        Storage.getEvents().then(() => {
            ScheduleUI.render();
            ArchiveUI.render();
        });
        Storage.getNotes().then((notes) => {
            ScheduleUI.setNotesMap(notes);
            ArchiveUI.setNotesMap(notes);
        });
    }

    async function handleLogin(e) {
        e.preventDefault();

        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const errorEl = document.getElementById('login-error');
        const btn = document.getElementById('login-btn');

        btn.disabled = true;
        errorEl.classList.add('hidden');

        try {
            await FirebaseApp.signIn(email, password);
        } catch (error) {
            errorEl.textContent = error.message;
            errorEl.classList.remove('hidden');
        } finally {
            btn.disabled = false;
        }
    }

    function navigate(screen, params = {}) {
        // Cleanup previous screen
        if (currentScreen === 'event') {
            EventUI.cleanup();
        }

        currentScreen = screen;
        currentParams = params;

        // Update hash
        if (screen === 'event' && params.eventId) {
            if (params.fromConference) {
                window.location.hash = `event/${params.eventId}?from=${params.fromConference}`;
            } else {
                window.location.hash = `event/${params.eventId}`;
            }
        } else if (screen === 'conference' && params.conferenceId) {
            window.location.hash = `conference/${params.conferenceId}`;
        } else {
            window.location.hash = screen;
        }

        // Update nav (archive shows as active for conference detail too)
        document.querySelectorAll('.nav-item').forEach(item => {
            const itemScreen = item.dataset.screen;
            const isActive = itemScreen === screen ||
                (itemScreen === 'archive' && screen === 'conference');
            item.classList.toggle('active', isActive);
        });

        // Show/hide screens
        document.querySelectorAll('.screen').forEach(s => {
            s.classList.remove('active');
        });

        const screenEl = document.getElementById(`screen-${screen}`);
        if (screenEl) {
            screenEl.classList.add('active');
        }

        // Screen-specific logic
        if (screen === 'event' && params.eventId) {
            EventUI.load(params.eventId, params.fromConference);
        } else if (screen === 'conference' && params.conferenceId) {
            ArchiveUI.loadConference(params.conferenceId);
        } else if (screen === 'archive') {
            ArchiveUI.render();
        } else if (screen === 'settings') {
            SettingsUI.render();
        }
    }

    function handleHashChange() {
        const hash = window.location.hash.slice(1) || 'schedule';
        const [path, query] = hash.split('?');
        const parts = path.split('/');
        const screen = parts[0];

        // Parse query params
        const params = {};
        if (query) {
            query.split('&').forEach(p => {
                const [key, value] = p.split('=');
                params[key] = value;
            });
        }

        if (screen === 'event' && parts[1]) {
            navigate('event', { eventId: parts[1], fromConference: params.from });
        } else if (screen === 'conference' && parts[1]) {
            navigate('conference', { conferenceId: parts[1] });
        } else if (['schedule', 'archive', 'settings'].includes(screen)) {
            navigate(screen);
        } else {
            navigate('schedule');
        }
    }

    function showAddEventModal() {
        document.getElementById('add-modal-overlay').classList.remove('hidden');
        document.getElementById('event-paste-input').value = '';
        document.getElementById('parsed-preview').classList.add('hidden');
        document.getElementById('event-paste-input').focus();
    }

    function hideAddEventModal() {
        document.getElementById('add-modal-overlay').classList.add('hidden');
    }

    function handleParseEvent() {
        const input = document.getElementById('event-paste-input').value;
        const parsed = Parser.parse(input);

        // Show preview
        document.getElementById('parsed-title').value = parsed.title || '';
        document.getElementById('parsed-datetime').value = parsed.startTime
            ? new Date(parsed.startTime).toLocaleString()
            : '';
        document.getElementById('parsed-location').value = parsed.location || '';
        document.getElementById('parsed-description').value = parsed.description || '';

        // Store parsed times for saving
        document.getElementById('parsed-preview').dataset.startTime = parsed.startTime || '';
        document.getElementById('parsed-preview').dataset.endTime = parsed.endTime || '';

        document.getElementById('parsed-preview').classList.remove('hidden');
    }

    async function handleSaveEvent() {
        const preview = document.getElementById('parsed-preview');

        const eventData = {
            title: document.getElementById('parsed-title').value || 'Untitled Event',
            startTime: preview.dataset.startTime || null,
            endTime: preview.dataset.endTime || null,
            location: document.getElementById('parsed-location').value || null,
            description: document.getElementById('parsed-description').value || null,
            isManual: true
        };

        try {
            await Storage.saveEvent(eventData);
            hideAddEventModal();
            showToast('Event added', 'success');
        } catch (error) {
            console.error('Failed to save event:', error);
            showToast('Failed to add event', 'error');
        }
    }

    function confirm(title, message) {
        return new Promise((resolve) => {
            confirmResolve = resolve;
            document.getElementById('confirm-title').textContent = title;
            document.getElementById('confirm-message').textContent = message;
            document.getElementById('confirm-overlay').classList.remove('hidden');
        });
    }

    function hideConfirmModal(result) {
        document.getElementById('confirm-overlay').classList.add('hidden');
        if (confirmResolve) {
            confirmResolve(result);
            confirmResolve = null;
        }
    }

    function showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type} visible`;

        setTimeout(() => {
            toast.classList.remove('visible');
        }, 3000);
    }

    function updateOnlineStatus() {
        const indicator = document.getElementById('offline-indicator');
        if (navigator.onLine) {
            indicator.classList.add('hidden');
        } else {
            indicator.classList.remove('hidden');
        }
    }

    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', init);

    return {
        navigate,
        showToast,
        confirm,
        onAuthReady
    };
})();
