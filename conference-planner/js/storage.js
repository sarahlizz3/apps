/**
 * Storage module for Firestore operations
 */
const Storage = (function() {
    let eventsCache = [];
    let notesCache = [];
    let conferenceNamesCache = {};
    let eventsListener = null;
    let notesListener = null;

    function getUserCollection(collection) {
        const userId = FirebaseApp.getUserId();
        if (!userId) return null;
        return FirebaseApp.getDb().collection('users').doc(userId).collection(collection);
    }

    // Events CRUD
    async function getEvents() {
        const col = getUserCollection('events');
        if (!col) return [];

        const snapshot = await col.orderBy('startTime', 'asc').get();
        eventsCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return eventsCache;
    }

    async function getEvent(eventId) {
        const col = getUserCollection('events');
        if (!col) return null;

        const doc = await col.doc(eventId).get();
        if (!doc.exists) return null;
        return { id: doc.id, ...doc.data() };
    }

    async function saveEvent(eventData) {
        const col = getUserCollection('events');
        if (!col) throw new Error('Not authenticated');

        const data = {
            title: eventData.title || '',
            startTime: eventData.startTime || null,
            endTime: eventData.endTime || null,
            location: eventData.location || null,
            description: eventData.description || null,
            calendarEventId: eventData.calendarEventId || null,
            isManual: eventData.isManual !== false,
            createdAt: eventData.createdAt || firebase.firestore.FieldValue.serverTimestamp()
        };

        if (eventData.id) {
            await col.doc(eventData.id).update(data);
            return eventData.id;
        } else {
            const docRef = await col.add(data);
            return docRef.id;
        }
    }

    async function deleteEvent(eventId) {
        const col = getUserCollection('events');
        if (!col) throw new Error('Not authenticated');

        // Also delete associated note
        const note = await getNoteByEventId(eventId);
        if (note) {
            await deleteNote(note.id);
        }

        await col.doc(eventId).delete();
    }

    // Notes CRUD
    async function getNotes() {
        const col = getUserCollection('notes');
        if (!col) return [];

        const snapshot = await col.get();
        notesCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return notesCache;
    }

    async function getNote(noteId) {
        const col = getUserCollection('notes');
        if (!col) return null;

        const doc = await col.doc(noteId).get();
        if (!doc.exists) return null;
        return { id: doc.id, ...doc.data() };
    }

    async function getNoteByEventId(eventId) {
        const col = getUserCollection('notes');
        if (!col) return null;

        const snapshot = await col.where('eventId', '==', eventId).limit(1).get();
        if (snapshot.empty) return null;
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() };
    }

    async function saveNote(noteData) {
        const col = getUserCollection('notes');
        if (!col) throw new Error('Not authenticated');

        const now = firebase.firestore.FieldValue.serverTimestamp();
        const data = {
            eventId: noteData.eventId,
            content: noteData.content || '',
            updatedAt: now
        };

        if (noteData.id) {
            await col.doc(noteData.id).update(data);
            return noteData.id;
        } else {
            data.createdAt = now;
            const docRef = await col.add(data);
            return docRef.id;
        }
    }

    async function deleteNote(noteId) {
        const col = getUserCollection('notes');
        if (!col) throw new Error('Not authenticated');
        await col.doc(noteId).delete();
    }

    // Real-time listeners
    function subscribeToEvents(callback) {
        const col = getUserCollection('events');
        if (!col) return () => {};

        eventsListener = col.orderBy('startTime', 'asc').onSnapshot(snapshot => {
            eventsCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            callback(eventsCache);
        });

        return () => {
            if (eventsListener) eventsListener();
        };
    }

    function subscribeToNotes(callback) {
        const col = getUserCollection('notes');
        if (!col) return () => {};

        notesListener = col.onSnapshot(snapshot => {
            notesCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            callback(notesCache);
        });

        return () => {
            if (notesListener) notesListener();
        };
    }

    // Calendar event sync - find or create event from calendar data
    async function syncCalendarEvent(calendarEvent) {
        const col = getUserCollection('events');
        if (!col) throw new Error('Not authenticated');

        // Check if we already have this calendar event
        const snapshot = await col.where('calendarEventId', '==', calendarEvent.id).limit(1).get();

        const eventData = {
            title: calendarEvent.summary || 'Untitled Event',
            startTime: calendarEvent.start?.dateTime || calendarEvent.start?.date || null,
            endTime: calendarEvent.end?.dateTime || calendarEvent.end?.date || null,
            location: calendarEvent.location || null,
            description: calendarEvent.description || null,
            calendarEventId: calendarEvent.id,
            isManual: false
        };

        if (!snapshot.empty) {
            // Update existing
            const doc = snapshot.docs[0];
            await col.doc(doc.id).update(eventData);
            return doc.id;
        } else {
            // Create new
            eventData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            const docRef = await col.add(eventData);
            return docRef.id;
        }
    }

    // Export/Import
    async function exportData() {
        const events = await getEvents();
        const notes = await getNotes();
        return { events, notes, exportedAt: new Date().toISOString() };
    }

    async function importData(data) {
        const col = getUserCollection('events');
        const notesCol = getUserCollection('notes');
        if (!col || !notesCol) throw new Error('Not authenticated');

        // Import events
        for (const event of (data.events || [])) {
            const { id, ...eventData } = event;
            await col.add(eventData);
        }

        // Import notes
        for (const note of (data.notes || [])) {
            const { id, ...noteData } = note;
            await notesCol.add(noteData);
        }
    }

    function getCachedEvents() {
        return eventsCache;
    }

    function getCachedNotes() {
        return notesCache;
    }

    // Conference names (stored in a separate collection)
    async function loadConferenceNames() {
        const col = getUserCollection('conferenceNames');
        if (!col) return {};

        const snapshot = await col.get();
        conferenceNamesCache = {};
        snapshot.docs.forEach(doc => {
            conferenceNamesCache[doc.id] = doc.data().name;
        });
        return conferenceNamesCache;
    }

    function getConferenceName(conferenceId) {
        return conferenceNamesCache[conferenceId] || null;
    }

    async function saveConferenceName(conferenceId, name) {
        const col = getUserCollection('conferenceNames');
        if (!col) throw new Error('Not authenticated');

        await col.doc(conferenceId).set({ name, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
        conferenceNamesCache[conferenceId] = name;
    }

    return {
        getEvents,
        getEvent,
        saveEvent,
        deleteEvent,
        getNotes,
        getNote,
        getNoteByEventId,
        saveNote,
        deleteNote,
        subscribeToEvents,
        subscribeToNotes,
        syncCalendarEvent,
        exportData,
        importData,
        getCachedEvents,
        getCachedNotes,
        loadConferenceNames,
        getConferenceName,
        saveConferenceName
    };
})();
