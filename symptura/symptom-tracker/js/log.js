// ========================================
// LOG MODULE
// ========================================

const Log = {
    init() {
        this.bindDateNavigation();
        this.bindDailyNote();
    },

    // Bind date navigation controls
    bindDateNavigation() {
        const prevBtn = document.getElementById('prev-date');
        const nextBtn = document.getElementById('next-date');
        const dateDisplay = document.getElementById('date-display');
        const datePicker = document.getElementById('date-picker');

        prevBtn.addEventListener('click', () => {
            App.selectedDate.setDate(App.selectedDate.getDate() - 1);
            this.updateDateDisplay();
            this.updateSeverityDisplay();
            this.updateDailyNote();
        });

        nextBtn.addEventListener('click', () => {
            App.selectedDate.setDate(App.selectedDate.getDate() + 1);
            this.updateDateDisplay();
            this.updateSeverityDisplay();
            this.updateDailyNote();
        });

        dateDisplay.addEventListener('click', () => {
            datePicker.showPicker();
        });

        datePicker.addEventListener('change', (e) => {
            App.selectedDate = new Date(e.target.value + 'T12:00:00');
            this.updateDateDisplay();
            this.updateSeverityDisplay();
            this.updateDailyNote();
        });

        this.updateDateDisplay();
    },

    // Update date display
    updateDateDisplay() {
        const display = document.getElementById('date-display');
        display.textContent = App.formatDateDisplay(App.selectedDate);
        
        // Update hidden date picker value
        document.getElementById('date-picker').value = App.formatDateKey(App.selectedDate);
    },

    // Bind daily note controls
    bindDailyNote() {
        const toggle = document.getElementById('toggle-daily-note');
        const content = document.getElementById('daily-note-content');
        const saveBtn = document.getElementById('save-daily-note');

        toggle.addEventListener('click', () => {
            const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
            toggle.setAttribute('aria-expanded', !isExpanded);
            content.classList.toggle('collapsed', isExpanded);
        });

        saveBtn.addEventListener('click', () => this.saveDailyNote());

        // Save on blur or enter
        document.getElementById('daily-note').addEventListener('blur', () => {
            this.saveDailyNote();
        });
    },

    // Update daily note display for selected date
    updateDailyNote() {
        const textarea = document.getElementById('daily-note');
        const dateKey = App.formatDateKey(App.selectedDate);
        textarea.value = App.dailyNotes[dateKey] || '';
    },

    // Save daily note
    async saveDailyNote() {
        const textarea = document.getElementById('daily-note');
        const note = textarea.value.trim();
        const dateKey = App.formatDateKey(App.selectedDate);
        const userId = Auth.currentUser.uid;

        try {
            if (note) {
                await db.collection('users').doc(userId)
                    .collection('dailyNotes')
                    .doc(dateKey)
                    .set({ note, date: dateKey });
            } else {
                // Delete empty notes
                await db.collection('users').doc(userId)
                    .collection('dailyNotes')
                    .doc(dateKey)
                    .delete();
            }
        } catch (error) {
            console.error('Error saving daily note:', error);
        }
    },

    // Render symptom cards for logging
    renderSymptoms() {
        const container = document.getElementById('symptoms-log-list');
        const emptyMessage = document.getElementById('no-symptoms-message');

        if (App.symptoms.length === 0) {
            container.classList.add('hidden');
            emptyMessage.classList.remove('hidden');
            return;
        }

        container.classList.remove('hidden');
        emptyMessage.classList.add('hidden');

        container.innerHTML = App.symptoms.map(symptom => `
            <div class="symptom-log-card" data-symptom-id="${symptom.id}" style="--symptom-color: ${symptom.color}">
                <div class="symptom-log-header">
                    <div class="symptom-color-dot" style="background-color: ${symptom.color}; color: ${symptom.color}"></div>
                    <span class="symptom-log-name">${Settings.escapeHtml(symptom.name)}</span>
                </div>
                <div class="severity-buttons">
                    <button class="severity-btn" data-severity="mild">Mild</button>
                    <button class="severity-btn" data-severity="mid">Mid</button>
                    <button class="severity-btn" data-severity="strong">Strong</button>
                </div>
            </div>
        `).join('');

        // Bind severity buttons
        container.querySelectorAll('.severity-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const card = e.target.closest('.symptom-log-card');
                const symptomId = card.dataset.symptomId;
                const severity = e.target.dataset.severity;
                this.logSeverity(symptomId, severity);
            });
        });

        this.updateSeverityDisplay();
    },

    // Update severity button states based on logged entries
    updateSeverityDisplay() {
        const dateKey = App.formatDateKey(App.selectedDate);
        const todayEntries = App.getEntriesForDate(dateKey);

        // Reset all buttons
        document.querySelectorAll('.symptom-log-card').forEach(card => {
            card.querySelectorAll('.severity-btn').forEach(btn => {
                btn.classList.remove('active');
            });

            const symptomId = card.dataset.symptomId;
            const entry = todayEntries.find(e => e.symptomId === symptomId);
            
            if (entry) {
                const activeBtn = card.querySelector(`.severity-btn[data-severity="${entry.severity}"]`);
                if (activeBtn) {
                    activeBtn.classList.add('active');
                }
            }
        });
    },

    // Log a severity for a symptom
    async logSeverity(symptomId, severity) {
        const dateKey = App.formatDateKey(App.selectedDate);
        const userId = Auth.currentUser.uid;

        // Check if entry already exists for this symptom today
        const existingEntry = App.entries.find(
            e => e.symptomId === symptomId && e.date === dateKey
        );

        try {
            if (existingEntry) {
                // Update existing entry
                await db.collection('users').doc(userId)
                    .collection('entries')
                    .doc(existingEntry.id)
                    .update({ severity });
            } else {
                // Create new entry
                await db.collection('users').doc(userId)
                    .collection('entries')
                    .add({
                        symptomId,
                        severity,
                        date: dateKey,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
            }

            // Visual feedback - briefly highlight the button
            const card = document.querySelector(`.symptom-log-card[data-symptom-id="${symptomId}"]`);
            const btn = card.querySelector(`.severity-btn[data-severity="${severity}"]`);
            btn.style.transform = 'scale(0.95)';
            setTimeout(() => {
                btn.style.transform = '';
            }, 100);
        } catch (error) {
            console.error('Error logging severity:', error);
        }
    }
};

// Initialize log when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    Log.init();
});
