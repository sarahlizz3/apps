/**
 * Event Detail UI Module with Markdown Notes
 */
const EventUI = (function() {
    let currentEvent = null;
    let currentNote = null;
    let fromConference = null;
    let saveTimeout = null;
    let unsavedChanges = false;
    let isPreviewMode = false;

    const AUTOSAVE_DELAY = 2000; // 2 seconds

    function init() {
        // Back button
        document.getElementById('event-back-btn').addEventListener('click', () => {
            if (unsavedChanges) {
                saveNote();
            }
            // Go back to conference if we came from there
            if (fromConference) {
                App.navigate('conference', { conferenceId: fromConference });
            } else {
                App.navigate('schedule');
            }
        });

        // Note editor
        const noteEditor = document.getElementById('note-editor');
        noteEditor.addEventListener('input', handleNoteInput);

        // Preview toggle
        document.getElementById('preview-toggle-btn').addEventListener('click', togglePreview);

        // Manual save button
        document.getElementById('save-note-btn').addEventListener('click', () => saveNote(true));

        // Delete event button
        document.getElementById('delete-event-btn').addEventListener('click', handleDeleteEvent);
    }

    async function load(eventId, fromConf = null) {
        fromConference = fromConf;
        currentEvent = await Storage.getEvent(eventId);

        if (!currentEvent) {
            App.showToast('Event not found', 'error');
            App.navigate('schedule');
            return;
        }

        currentNote = await Storage.getNoteByEventId(eventId);

        render();
    }

    function render() {
        if (!currentEvent) return;

        // Event header
        document.getElementById('event-title').textContent = currentEvent.title;

        // Date/Time
        let dateTimeStr = '';
        if (currentEvent.startTime) {
            const start = new Date(currentEvent.startTime);
            const dateStr = start.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            const isAllDay = start.getHours() === 0 && start.getMinutes() === 0;

            if (isAllDay) {
                dateTimeStr = dateStr;
            } else {
                const timeStr = start.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                });

                if (currentEvent.endTime) {
                    const end = new Date(currentEvent.endTime);
                    const endTimeStr = end.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                    });
                    dateTimeStr = `${dateStr}, ${timeStr} - ${endTimeStr}`;
                } else {
                    dateTimeStr = `${dateStr}, ${timeStr}`;
                }
            }
        }
        document.getElementById('event-datetime').textContent = dateTimeStr;

        // Location
        const locationEl = document.getElementById('event-location');
        if (currentEvent.location) {
            locationEl.textContent = currentEvent.location;
            locationEl.classList.remove('hidden');
        } else {
            locationEl.classList.add('hidden');
        }

        // Description
        const descEl = document.getElementById('event-description');
        if (currentEvent.description) {
            descEl.textContent = currentEvent.description;
            descEl.classList.remove('hidden');
        } else {
            descEl.classList.add('hidden');
        }

        // Note editor
        const noteEditor = document.getElementById('note-editor');
        noteEditor.value = currentNote?.content || '';

        // Reset preview mode
        isPreviewMode = false;
        document.getElementById('note-editor').classList.remove('hidden');
        document.getElementById('note-preview').classList.add('hidden');
        document.getElementById('preview-toggle-btn').textContent = 'Preview';

        // Reset save status
        updateSaveStatus('saved');
        unsavedChanges = false;
    }

    function handleNoteInput() {
        unsavedChanges = true;
        updateSaveStatus('unsaved');

        // Clear existing timeout
        if (saveTimeout) {
            clearTimeout(saveTimeout);
        }

        // Set new autosave timeout
        saveTimeout = setTimeout(() => {
            saveNote();
        }, AUTOSAVE_DELAY);
    }

    async function saveNote(manual = false) {
        if (saveTimeout) {
            clearTimeout(saveTimeout);
            saveTimeout = null;
        }

        const content = document.getElementById('note-editor').value;

        updateSaveStatus('saving');

        try {
            const noteData = {
                id: currentNote?.id,
                eventId: currentEvent.id,
                content
            };

            const noteId = await Storage.saveNote(noteData);

            if (!currentNote) {
                currentNote = { id: noteId, eventId: currentEvent.id, content };
            } else {
                currentNote.content = content;
            }

            unsavedChanges = false;
            updateSaveStatus('saved');

            if (manual) {
                App.showToast('Note saved', 'success');
            }
        } catch (error) {
            console.error('Failed to save note:', error);
            updateSaveStatus('error');
            App.showToast('Failed to save note', 'error');
        }
    }

    function updateSaveStatus(status) {
        const indicator = document.getElementById('save-status');

        switch (status) {
            case 'saved':
                indicator.textContent = 'Saved';
                indicator.className = 'save-status saved';
                break;
            case 'saving':
                indicator.textContent = 'Saving...';
                indicator.className = 'save-status saving';
                break;
            case 'unsaved':
                indicator.textContent = 'Unsaved changes';
                indicator.className = 'save-status unsaved';
                break;
            case 'error':
                indicator.textContent = 'Save failed';
                indicator.className = 'save-status error';
                break;
        }
    }

    function togglePreview() {
        const editor = document.getElementById('note-editor');
        const preview = document.getElementById('note-preview');
        const btn = document.getElementById('preview-toggle-btn');

        isPreviewMode = !isPreviewMode;

        if (isPreviewMode) {
            // Render markdown
            const content = editor.value;
            preview.innerHTML = marked.parse(content || '*No notes yet*');
            editor.classList.add('hidden');
            preview.classList.remove('hidden');
            btn.textContent = 'Edit';
        } else {
            editor.classList.remove('hidden');
            preview.classList.add('hidden');
            btn.textContent = 'Preview';
            editor.focus();
        }
    }

    async function handleDeleteEvent() {
        if (!currentEvent) return;

        const confirmed = await App.confirm(
            'Delete Event',
            `Are you sure you want to delete "${currentEvent.title}"? This will also delete any associated notes.`
        );

        if (confirmed) {
            try {
                await Storage.deleteEvent(currentEvent.id);
                App.showToast('Event deleted', 'success');
                if (fromConference) {
                    App.navigate('conference', { conferenceId: fromConference });
                } else {
                    App.navigate('schedule');
                }
            } catch (error) {
                console.error('Failed to delete event:', error);
                App.showToast('Failed to delete event', 'error');
            }
        }
    }

    function cleanup() {
        if (saveTimeout) {
            clearTimeout(saveTimeout);
        }
        if (unsavedChanges) {
            saveNote();
        }
        currentEvent = null;
        currentNote = null;
        fromConference = null;
    }

    return {
        init,
        load,
        cleanup
    };
})();
