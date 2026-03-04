/**
 * Archive UI Module - Past conferences from Firestore
 */
const ArchiveUI = (function() {
    let currentConferenceId = null;
    let notesMap = {};

    function init() {
        document.getElementById('conference-back-btn').addEventListener('click', () => {
            App.navigate('archive');
        });

        document.getElementById('edit-conference-btn').addEventListener('click', () => {
            if (currentConferenceId) {
                App.showConferenceEditModal(currentConferenceId);
            }
        });
        document.getElementById('export-notes-btn').addEventListener('click', exportNotesToMarkdown);
    }

    function setNotesMap(notes) {
        notesMap = {};
        notes.forEach(note => {
            notesMap[note.eventId] = note;
        });
    }

    function render() {
        const conferences = Storage.getCachedConferences();
        const events = Storage.getCachedEvents();
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        // Filter to past conferences only (end date has passed)
        const pastConferences = conferences.filter(conf => conf.endDate < todayStr);

        // Get events for each conference
        const conferencesWithEvents = pastConferences.map(conf => {
            const confEvents = events.filter(e => e.conferenceId === conf.id);
            const eventsWithNotes = confEvents.filter(e => notesMap[e.id]?.content).length;
            return {
                ...conf,
                events: confEvents,
                eventsWithNotes
            };
        });

        const container = document.getElementById('conferences-list');

        if (conferencesWithEvents.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" width="64" height="64">
                        <path fill="currentColor" d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z"/>
                    </svg>
                    <p>No past conferences</p>
                    <p style="font-size: 0.875rem; margin-top: 8px;">Past conferences will appear here after their end date</p>
                </div>
            `;
            return;
        }

        container.innerHTML = conferencesWithEvents.map(conf => {
            const notesBadge = conf.eventsWithNotes > 0
                ? `<span class="notes-badge">${conf.eventsWithNotes} notes</span>`
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

    function formatDateRange(startDate, endDate) {
        // Handle both Date objects and ISO date strings
        const start = typeof startDate === 'string' ? new Date(startDate + 'T00:00:00') : new Date(startDate);
        const end = typeof endDate === 'string' ? new Date(endDate + 'T00:00:00') : new Date(endDate);

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
        const conferences = Storage.getCachedConferences();
        const conf = conferences.find(c => c.id === conferenceId);

        if (!conf) {
            App.showToast('Conference not found', 'error');
            App.navigate('archive');
            return;
        }

        document.getElementById('conference-title').textContent = conf.name;

        // Show/hide schedule URL link
        const urlLink = document.getElementById('conference-url-link');
        if (conf.scheduleUrl) {
            urlLink.href = conf.scheduleUrl;
            document.getElementById('conference-url-text').textContent = 'View Schedule';
            urlLink.classList.remove('hidden');
        } else {
            urlLink.classList.add('hidden');
        }

        const container = document.getElementById('conference-events-list');
        const events = Storage.getCachedEvents();
        const confEvents = events.filter(e => e.conferenceId === conferenceId);

        // Sort events by date
        const sortedEvents = [...confEvents].sort((a, b) =>
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

    function exportNotesToMarkdown() {
        const conferences = Storage.getCachedConferences();
        const conf = conferences.find(c => c.id === currentConferenceId);
        if (!conf) {
            App.showToast('Conference not found', 'error');
            return;
        }

        const events = Storage.getCachedEvents();
        const confEvents = events.filter(e => e.conferenceId === currentConferenceId);

        // Sort events by date
        const sortedEvents = [...confEvents].sort((a, b) =>
            new Date(a.startTime) - new Date(b.startTime)
        );

        // Build markdown content
        let markdown = `# ${conf.name}\n\n`;
        markdown += `*${formatDateRange(conf.startDate, conf.endDate)}*\n\n---\n\n`;

        let hasAnyNotes = false;

        sortedEvents.forEach(event => {
            const note = notesMap[event.id];
            if (note && note.content) {
                hasAnyNotes = true;

                // Event header
                markdown += `## ${event.title}\n\n`;

                // Event metadata
                const eventDate = new Date(event.startTime);
                const dateStr = eventDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                });

                const timeStr = formatEventTime(event);
                if (timeStr) {
                    markdown += `**${dateStr}, ${timeStr}**\n`;
                } else {
                    markdown += `**${dateStr}**\n`;
                }

                if (event.location) {
                    markdown += `*${event.location}*\n`;
                }

                markdown += '\n';

                // Note content
                markdown += note.content;
                markdown += '\n\n---\n\n';
            }
        });

        if (!hasAnyNotes) {
            App.showToast('No notes to export', 'error');
            return;
        }

        // Create and download file
        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        // Create filename from conference name
        const filename = conf.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '') + '-notes.md';

        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        App.showToast('Notes exported', 'success');
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
