/**
 * Google Calendar API Integration
 */
const Calendar = (function() {
    const API_KEY = 'AIzaSyBMeSGxyNIkNBEhvh-zu81TsRyEEV26WQ4';
    const CALENDAR_ID = '9a92999521f429997a64896480d5338c83798c89f7623663dd8f9302dbd75a40@group.calendar.google.com';

    let lastSyncTime = null;
    let cachedEvents = [];

    async function fetchEvents(timeMin, timeMax) {
        const params = new URLSearchParams({
            key: API_KEY,
            timeMin: timeMin || new Date().toISOString(),
            timeMax: timeMax || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            singleEvents: 'true',
            orderBy: 'startTime',
            maxResults: '250'
        });

        const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events?${params}`;

        try {
            const response = await fetch(url);

            if (!response.ok) {
                const error = await response.json();
                console.error('Calendar API error:', error);
                throw new Error(error.error?.message || 'Failed to fetch calendar');
            }

            const data = await response.json();
            cachedEvents = data.items || [];
            lastSyncTime = new Date();

            return cachedEvents;
        } catch (error) {
            console.error('Failed to fetch calendar events:', error);
            throw error;
        }
    }

    async function syncWithStorage() {
        const calendarEvents = await fetchEvents();
        const syncedIds = [];

        for (const event of calendarEvents) {
            try {
                const eventId = await Storage.syncCalendarEvent(event);
                syncedIds.push(eventId);
            } catch (error) {
                console.error('Failed to sync event:', event.summary, error);
            }
        }

        return syncedIds;
    }

    function parseCalendarEvent(event) {
        return {
            id: event.id,
            title: event.summary || 'Untitled Event',
            startTime: event.start?.dateTime || event.start?.date,
            endTime: event.end?.dateTime || event.end?.date,
            location: event.location || null,
            description: event.description || null,
            isAllDay: !event.start?.dateTime
        };
    }

    function getLastSyncTime() {
        return lastSyncTime;
    }

    function getCachedEvents() {
        return cachedEvents;
    }

    return {
        fetchEvents,
        syncWithStorage,
        parseCalendarEvent,
        getLastSyncTime,
        getCachedEvents
    };
})();
