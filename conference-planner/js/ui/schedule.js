/**
 * Schedule UI Module
 */
const ScheduleUI = (function() {
    let notesMap = {};

    function init() {
        document.getElementById('refresh-calendar-btn').addEventListener('click', handleRefresh);
    }

    async function handleRefresh() {
        const btn = document.getElementById('refresh-calendar-btn');
        btn.disabled = true;
        btn.textContent = 'Syncing...';

        try {
            await Calendar.syncWithStorage();
            App.showToast('Calendar synced', 'success');
        } catch (error) {
            console.error('Sync failed:', error);
            App.showToast('Sync failed: ' + error.message, 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Sync Calendar';
        }
    }

    function setNotesMap(notes) {
        notesMap = {};
        notes.forEach(note => {
            notesMap[note.eventId] = note;
        });
    }

    function render() {
        const events = Storage.getCachedEvents();
        const container = document.getElementById('events-list');

        if (events.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" width="64" height="64">
                        <path fill="currentColor" d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm-8 4H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z"/>
                    </svg>
                    <p>No events</p>
                    <p style="font-size: 0.875rem; margin-top: 8px;">Sync from calendar or add events manually</p>
                </div>
            `;
            return;
        }

        // Group events by date
        const grouped = groupByDate(events);
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

    function groupByDate(events) {
        const groups = {};

        events.forEach(event => {
            const date = event.startTime ? new Date(event.startTime) : new Date();
            const dateKey = date.toISOString().split('T')[0];

            if (!groups[dateKey]) {
                groups[dateKey] = [];
            }
            groups[dateKey].push(event);
        });

        // Sort by date
        const sorted = {};
        Object.keys(groups).sort().forEach(key => {
            sorted[key] = groups[key];
        });

        return sorted;
    }

    function formatDateHeader(dateKey) {
        const date = new Date(dateKey + 'T12:00:00');
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (dateKey === today.toISOString().split('T')[0]) {
            return 'Today';
        } else if (dateKey === tomorrow.toISOString().split('T')[0]) {
            return 'Tomorrow';
        }

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
        const noteIndicator = hasNote ? '<span class="note-indicator" title="Has notes">📝</span>' : '';

        item.innerHTML = `
            <div class="event-info">
                <div class="event-title">${escapeHtml(event.title)} ${noteIndicator}</div>
                <div class="event-meta">
                    ${timeStr ? `<span class="event-time">${timeStr}</span>` : ''}
                    ${locationStr}
                </div>
            </div>
            <div class="event-arrow">
                <svg viewBox="0 0 24 24" width="20" height="20">
                    <path fill="currentColor" d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                </svg>
            </div>
        `;

        item.addEventListener('click', () => {
            App.navigate('event', { eventId: event.id });
        });

        return item;
    }

    function formatEventTime(event) {
        if (!event.startTime) return '';

        const start = new Date(event.startTime);
        const end = event.endTime ? new Date(event.endTime) : null;

        // Check if all-day (no time component or midnight)
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

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    return {
        init,
        render,
        setNotesMap
    };
})();
