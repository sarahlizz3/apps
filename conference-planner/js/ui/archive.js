/**
 * Archive UI Module - Past conferences grouped by date proximity
 */
const ArchiveUI = (function() {
    let conferences = [];
    let currentConferenceId = null;
    let notesMap = {};

    function init() {
        document.getElementById('conference-back-btn').addEventListener('click', () => {
            App.navigate('archive');
        });

        document.getElementById('edit-conference-name-btn').addEventListener('click', showEditNameModal);
        document.getElementById('conference-name-modal-close').addEventListener('click', hideEditNameModal);
        document.getElementById('save-conference-name-btn').addEventListener('click', saveConferenceName);
    }

    function setNotesMap(notes) {
        notesMap = {};
        notes.forEach(note => {
            notesMap[note.eventId] = note;
        });
    }

    function render() {
        const events = Storage.getCachedEvents();
        const now = new Date();

        // Filter to past events only
        const pastEvents = events.filter(e => {
            if (!e.startTime) return false;
            return new Date(e.startTime) < now;
        });

        // Group into conferences (events within 7 days of each other)
        conferences = groupIntoConferences(pastEvents);

        const container = document.getElementById('conferences-list');

        if (conferences.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" width="64" height="64">
                        <path fill="currentColor" d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z"/>
                    </svg>
                    <p>No past conferences</p>
                    <p style="font-size: 0.875rem; margin-top: 8px;">Past events will appear here grouped by conference</p>
                </div>
            `;
            return;
        }

        container.innerHTML = conferences.map(conf => {
            const eventsWithNotes = conf.events.filter(e => notesMap[e.id]?.content).length;
            const notesBadge = eventsWithNotes > 0
                ? `<span class="notes-badge">${eventsWithNotes} notes</span>`
                : '';

            return `
                <div class="conference-card" data-conference-id="${conf.id}">
                    <div class="conference-info">
                        <div class="conference-name">${escapeHtml(conf.name)}</div>
                        <div class="conference-meta">
                            <span>${conf.events.length} session${conf.events.length !== 1 ? 's' : ''}</span>
                            <span>${formatDateRange(conf.startDate, conf.endDate)}</span>
                        </div>
                        ${notesBadge}
                    </div>
                    <div class="event-arrow">
                        <svg viewBox="0 0 24 24" width="20" height="20">
                            <path fill="currentColor" d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                        </svg>
                    </div>
                </div>
            `;
        }).join('');

        // Add click handlers
        container.querySelectorAll('.conference-card').forEach(card => {
            card.addEventListener('click', () => {
                const confId = card.dataset.conferenceId;
                App.navigate('conference', { conferenceId: confId });
            });
        });
    }

    function groupIntoConferences(events) {
        if (events.length === 0) return [];

        // Sort by start time descending (most recent first)
        const sorted = [...events].sort((a, b) =>
            new Date(b.startTime) - new Date(a.startTime)
        );

        const groups = [];
        let currentGroup = null;

        sorted.forEach(event => {
            const eventDate = new Date(event.startTime);

            if (!currentGroup) {
                currentGroup = {
                    events: [event],
                    startDate: eventDate,
                    endDate: eventDate
                };
            } else {
                // Check if within 7 days of current group
                const daysDiff = Math.abs(eventDate - currentGroup.endDate) / (1000 * 60 * 60 * 24);

                if (daysDiff <= 7) {
                    currentGroup.events.push(event);
                    if (eventDate < currentGroup.startDate) currentGroup.startDate = eventDate;
                    if (eventDate > currentGroup.endDate) currentGroup.endDate = eventDate;
                } else {
                    groups.push(currentGroup);
                    currentGroup = {
                        events: [event],
                        startDate: eventDate,
                        endDate: eventDate
                    };
                }
            }
        });

        if (currentGroup) {
            groups.push(currentGroup);
        }

        // Generate IDs and names, load saved names
        return groups.map((group, index) => {
            const id = generateConferenceId(group.startDate, group.endDate);
            const savedName = Storage.getConferenceName(id);
            const defaultName = formatDateRange(group.startDate, group.endDate);

            return {
                id,
                name: savedName || defaultName,
                events: group.events,
                startDate: group.startDate,
                endDate: group.endDate
            };
        });
    }

    function generateConferenceId(startDate, endDate) {
        const start = startDate.toISOString().split('T')[0];
        const end = endDate.toISOString().split('T')[0];
        return `conf-${start}-${end}`;
    }

    function formatDateRange(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);

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

    function loadConference(conferenceId) {
        currentConferenceId = conferenceId;
        const conf = conferences.find(c => c.id === conferenceId);

        if (!conf) {
            App.showToast('Conference not found', 'error');
            App.navigate('archive');
            return;
        }

        document.getElementById('conference-title').textContent = conf.name;

        const container = document.getElementById('conference-events-list');

        // Sort events by date
        const sortedEvents = [...conf.events].sort((a, b) =>
            new Date(a.startTime) - new Date(b.startTime)
        );

        // Group by date
        const grouped = {};
        sortedEvents.forEach(event => {
            const dateKey = getLocalDateKey(new Date(event.startTime));
            if (!grouped[dateKey]) grouped[dateKey] = [];
            grouped[dateKey].push(event);
        });

        container.innerHTML = '';

        for (const [dateKey, dayEvents] of Object.entries(grouped)) {
            const group = document.createElement('div');
            group.className = 'date-group';

            const header = document.createElement('div');
            header.className = 'date-header';
            header.innerHTML = `<span class="date-header-date">${formatDateHeader(dateKey)}</span>`;
            group.appendChild(header);

            dayEvents.forEach(event => {
                const item = createEventItem(event);
                group.appendChild(item);
            });

            container.appendChild(group);
        }
    }

    function getLocalDateKey(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function formatDateHeader(dateKey) {
        const [year, month, day] = dateKey.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
        });
    }

    function createEventItem(event) {
        const item = document.createElement('div');
        item.className = 'event-item';
        item.dataset.eventId = event.id;

        const hasNote = notesMap[event.id] && notesMap[event.id].content;

        const timeStr = formatEventTime(event);
        const locationStr = event.location ? `<span class="event-location">${escapeHtml(event.location)}</span>` : '';

        item.innerHTML = `
            <div class="event-info">
                <div class="event-title ${hasNote ? 'has-notes' : ''}">${escapeHtml(event.title)}</div>
                <div class="event-meta">
                    ${timeStr ? `<span class="event-time">${timeStr}</span>` : ''}
                    ${locationStr}
                </div>
            </div>
            ${hasNote ? '<span class="note-indicator-icon" title="Has notes"><svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg></span>' : ''}
            <div class="event-arrow">
                <svg viewBox="0 0 24 24" width="20" height="20">
                    <path fill="currentColor" d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                </svg>
            </div>
        `;

        item.addEventListener('click', () => {
            App.navigate('event', { eventId: event.id, fromConference: currentConferenceId });
        });

        return item;
    }

    function formatEventTime(event) {
        if (!event.startTime) return '';

        const start = new Date(event.startTime);
        const end = event.endTime ? new Date(event.endTime) : null;

        const isAllDay = start.getHours() === 0 && start.getMinutes() === 0;
        if (isAllDay) return 'All day';

        const startStr = start.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });

        if (end) {
            const endStr = end.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
            return `${startStr} - ${endStr}`;
        }

        return startStr;
    }

    function showEditNameModal() {
        const conf = conferences.find(c => c.id === currentConferenceId);
        if (!conf) return;

        document.getElementById('conference-name-input').value = conf.name;
        document.getElementById('conference-name-modal-overlay').classList.remove('hidden');
    }

    function hideEditNameModal() {
        document.getElementById('conference-name-modal-overlay').classList.add('hidden');
    }

    async function saveConferenceName() {
        const name = document.getElementById('conference-name-input').value.trim();
        if (!name) return;

        await Storage.saveConferenceName(currentConferenceId, name);

        // Update local state
        const conf = conferences.find(c => c.id === currentConferenceId);
        if (conf) conf.name = name;

        document.getElementById('conference-title').textContent = name;
        hideEditNameModal();
        App.showToast('Conference renamed', 'success');
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function getCurrentConferenceId() {
        return currentConferenceId;
    }

    return {
        init,
        render,
        loadConference,
        setNotesMap,
        getCurrentConferenceId
    };
})();
