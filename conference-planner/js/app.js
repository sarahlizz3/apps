/**
 * Main Application Module
 */
const App = (function() {
    let currentScreen = 'schedule';
    let currentParams = {};
    let confirmResolve = null;
    let editingConferenceId = null;

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

        // Conferences modal
        document.getElementById('manage-conferences-btn').addEventListener('click', showConferencesModal);
        document.getElementById('conferences-modal-close').addEventListener('click', hideConferencesModal);
        document.getElementById('add-conference-btn').addEventListener('click', () => showConferenceEditModal(null));

        // Conference edit modal
        document.getElementById('conference-edit-modal-close').addEventListener('click', hideConferenceEditModal);
        document.getElementById('save-conference-btn').addEventListener('click', handleSaveConference);
        document.getElementById('delete-conference-btn').addEventListener('click', handleDeleteConference);

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

        Storage.subscribeToConferences((conferences) => {
            ArchiveUI.render();
            updateActiveConferenceLink();
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
        Storage.getConferences();
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

        // Populate conference dropdown
        populateConferenceDropdown(parsed.startTime);

        document.getElementById('parsed-preview').classList.remove('hidden');
    }

    function populateConferenceDropdown(dateStr) {
        const select = document.getElementById('parsed-conference');
        const matchingConferences = Storage.getConferencesForDate(dateStr);
        const allConferences = Storage.getCachedConferences();

        select.innerHTML = '<option value="">No conference</option>';

        // Add matching conferences first (highlighted)
        matchingConferences.forEach(conf => {
            const option = document.createElement('option');
            option.value = conf.id;
            option.textContent = conf.name;
            select.appendChild(option);
        });

        // Add separator and other conferences if there are matching ones
        if (matchingConferences.length > 0 && allConferences.length > matchingConferences.length) {
            const separator = document.createElement('option');
            separator.disabled = true;
            separator.textContent = '──────────';
            select.appendChild(separator);
        }

        // Add non-matching conferences
        allConferences.forEach(conf => {
            if (!matchingConferences.find(m => m.id === conf.id)) {
                const option = document.createElement('option');
                option.value = conf.id;
                option.textContent = conf.name + ' (dates don\'t match)';
                select.appendChild(option);
            }
        });

        // Auto-select if there's exactly one matching conference
        if (matchingConferences.length === 1) {
            select.value = matchingConferences[0].id;
        }
    }

    async function handleSaveEvent() {
        const preview = document.getElementById('parsed-preview');
        const conferenceId = document.getElementById('parsed-conference').value || null;

        const eventData = {
            title: document.getElementById('parsed-title').value || 'Untitled Event',
            startTime: preview.dataset.startTime || null,
            endTime: preview.dataset.endTime || null,
            location: document.getElementById('parsed-location').value || null,
            description: document.getElementById('parsed-description').value || null,
            conferenceId: conferenceId,
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

    // Conference management functions
    function showConferencesModal() {
        renderConferencesList();
        document.getElementById('conferences-modal-overlay').classList.remove('hidden');
    }

    function hideConferencesModal() {
        document.getElementById('conferences-modal-overlay').classList.add('hidden');
    }

    function renderConferencesList() {
        const container = document.getElementById('conferences-modal-list');
        const conferences = Storage.getCachedConferences();

        if (conferences.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="padding: 24px;">
                    <p style="color: var(--gray-400);">No conferences yet</p>
                    <p style="font-size: 0.875rem; color: var(--gray-500);">Create a conference to group your sessions</p>
                </div>
            `;
            return;
        }

        container.innerHTML = conferences.map(conf => {
            const dateRange = formatConferenceDateRange(conf.startDate, conf.endDate);
            return `
                <div class="conference-list-item" data-id="${conf.id}">
                    <div class="conference-list-info">
                        <div class="conference-list-name">${escapeHtml(conf.name)}</div>
                        <div class="conference-list-dates">${dateRange}</div>
                    </div>
                    <button class="btn btn-icon conference-edit-btn" data-id="${conf.id}" aria-label="Edit">
                        <svg viewBox="0 0 24 24" width="18" height="18">
                            <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                        </svg>
                    </button>
                </div>
            `;
        }).join('');

        // Add click handlers for conference items (navigate to detail)
        container.querySelectorAll('.conference-list-item').forEach(item => {
            item.addEventListener('click', () => {
                const confId = item.dataset.id;
                hideConferencesModal();
                navigate('conference', { conferenceId: confId });
            });
        });

        // Add click handlers for edit buttons
        container.querySelectorAll('.conference-edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const confId = btn.dataset.id;
                showConferenceEditModal(confId);
            });
        });
    }

    function formatConferenceDateRange(startDate, endDate) {
        if (!startDate || !endDate) return '';
        const start = new Date(startDate + 'T00:00:00');
        const end = new Date(endDate + 'T00:00:00');

        const sameMonth = start.getMonth() === end.getMonth();
        const sameDay = start.toDateString() === end.toDateString();

        if (sameDay) {
            return start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        } else if (sameMonth) {
            return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.getDate()}, ${end.getFullYear()}`;
        } else {
            return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
        }
    }

    function showConferenceEditModal(conferenceId) {
        editingConferenceId = conferenceId;
        const modal = document.getElementById('conference-edit-modal-overlay');
        const titleEl = document.getElementById('conference-edit-modal-title');
        const deleteBtn = document.getElementById('delete-conference-btn');

        if (conferenceId) {
            // Edit mode
            titleEl.textContent = 'Edit Conference';
            deleteBtn.classList.remove('hidden');

            const conf = Storage.getCachedConferences().find(c => c.id === conferenceId);
            if (conf) {
                document.getElementById('conference-edit-name').value = conf.name || '';
                document.getElementById('conference-edit-start').value = conf.startDate || '';
                document.getElementById('conference-edit-end').value = conf.endDate || '';
                document.getElementById('conference-edit-url').value = conf.scheduleUrl || '';
            }
        } else {
            // Add mode
            titleEl.textContent = 'Add Conference';
            deleteBtn.classList.add('hidden');

            document.getElementById('conference-edit-name').value = '';
            document.getElementById('conference-edit-start').value = '';
            document.getElementById('conference-edit-end').value = '';
            document.getElementById('conference-edit-url').value = '';
        }

        modal.classList.remove('hidden');
    }

    function hideConferenceEditModal() {
        document.getElementById('conference-edit-modal-overlay').classList.add('hidden');
        editingConferenceId = null;
    }

    async function handleSaveConference() {
        const name = document.getElementById('conference-edit-name').value.trim();
        const startDate = document.getElementById('conference-edit-start').value;
        const endDate = document.getElementById('conference-edit-end').value;
        const scheduleUrl = document.getElementById('conference-edit-url').value.trim() || null;

        if (!name) {
            showToast('Please enter a conference name', 'error');
            return;
        }
        if (!startDate || !endDate) {
            showToast('Please enter start and end dates', 'error');
            return;
        }
        if (startDate > endDate) {
            showToast('End date must be after start date', 'error');
            return;
        }

        try {
            await Storage.saveConference({
                id: editingConferenceId,
                name,
                startDate,
                endDate,
                scheduleUrl
            });

            hideConferenceEditModal();
            renderConferencesList();
            showToast(editingConferenceId ? 'Conference updated' : 'Conference created', 'success');

            // Re-render archive if we're on that screen or conference detail
            if (currentScreen === 'archive' || currentScreen === 'conference') {
                ArchiveUI.render();
                if (currentScreen === 'conference') {
                    ArchiveUI.loadConference(editingConferenceId);
                }
            }
        } catch (error) {
            console.error('Failed to save conference:', error);
            showToast('Failed to save conference', 'error');
        }
    }

    async function handleDeleteConference() {
        if (!editingConferenceId) return;

        const conf = Storage.getCachedConferences().find(c => c.id === editingConferenceId);
        const confName = conf ? conf.name : 'this conference';

        const confirmed = await confirm(
            'Delete Conference',
            `Delete "${confName}"? This will not delete the sessions, but they will no longer be grouped together.`
        );

        if (!confirmed) return;

        try {
            await Storage.deleteConference(editingConferenceId);
            hideConferenceEditModal();
            renderConferencesList();
            showToast('Conference deleted', 'success');

            // Navigate back to archive if we were viewing this conference
            if (currentScreen === 'conference' && currentParams.conferenceId === editingConferenceId) {
                navigate('archive');
            } else {
                ArchiveUI.render();
            }
        } catch (error) {
            console.error('Failed to delete conference:', error);
            showToast('Failed to delete conference', 'error');
        }
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function updateActiveConferenceLink() {
        const container = document.getElementById('active-conference-links');
        const conferences = Storage.getCachedConferences();
        const todayStr = new Date().toISOString().split('T')[0];

        // Find upcoming/active conferences (end date hasn't passed, and has a URL)
        const upcomingConfs = conferences.filter(conf =>
            conf.scheduleUrl && conf.endDate >= todayStr
        ).sort((a, b) => a.startDate.localeCompare(b.startDate));

        if (upcomingConfs.length > 0) {
            container.innerHTML = upcomingConfs.map(conf =>
                `<a class="active-conference-link" href="${escapeHtml(conf.scheduleUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(conf.name)}</a>`
            ).join('');
            container.classList.remove('hidden');
        } else {
            container.classList.add('hidden');
        }
    }

    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', init);

    return {
        navigate,
        showToast,
        confirm,
        onAuthReady,
        showConferenceEditModal,
        renderConferencesList
    };
})();
