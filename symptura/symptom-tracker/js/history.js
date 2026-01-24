// ========================================
// HISTORY MODULE
// ========================================

const History = {
    currentView: 'calendar',
    calendarDate: new Date(),
    trendRange: 'week',
    activeFilters: new Set(),
    chart: null,
    editingEntryId: null,

    init() {
        this.bindViewToggle();
        this.bindCalendarNav();
        this.bindTrendRange();
        this.bindFilterButtons();
        this.bindEditModal();
    },

    // Bind view toggle buttons
    bindViewToggle() {
        document.getElementById('calendar-view-btn').addEventListener('click', () => {
            this.switchView('calendar');
        });

        document.getElementById('trend-view-btn').addEventListener('click', () => {
            this.switchView('trend');
        });
    },

    // Switch between calendar and trend views
    switchView(view) {
        this.currentView = view;

        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.id === `${view}-view-btn`);
        });

        document.getElementById('calendar-view').classList.toggle('hidden', view !== 'calendar');
        document.getElementById('trend-view').classList.toggle('hidden', view !== 'trend');

        if (view === 'trend') {
            this.renderTrendChart();
        }
    },

    // Bind calendar navigation
    bindCalendarNav() {
        document.getElementById('prev-month').addEventListener('click', () => {
            this.calendarDate.setMonth(this.calendarDate.getMonth() - 1);
            this.renderCalendar();
        });

        document.getElementById('next-month').addEventListener('click', () => {
            this.calendarDate.setMonth(this.calendarDate.getMonth() + 1);
            this.renderCalendar();
        });
    },

    // Bind trend range buttons
    bindTrendRange() {
        document.getElementById('trend-week').addEventListener('click', () => {
            this.trendRange = 'week';
            document.querySelectorAll('.range-btn').forEach(btn => {
                btn.classList.toggle('active', btn.id === 'trend-week');
            });
            this.renderTrendChart();
        });

        document.getElementById('trend-month').addEventListener('click', () => {
            this.trendRange = 'month';
            document.querySelectorAll('.range-btn').forEach(btn => {
                btn.classList.toggle('active', btn.id === 'trend-month');
            });
            this.renderTrendChart();
        });
    },

    // Bind filter buttons
    bindFilterButtons() {
        document.getElementById('filter-all').addEventListener('click', () => {
            this.activeFilters = new Set(App.symptoms.map(s => s.id));
            this.updateFilterChips();
            this.render();
        });

        document.getElementById('filter-none').addEventListener('click', () => {
            this.activeFilters.clear();
            this.updateFilterChips();
            this.render();
        });
    },

    // Bind edit entry modal
    bindEditModal() {
        document.querySelectorAll('#edit-severity-buttons .severity-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const severity = e.target.dataset.severity;
                this.updateEntrySeverity(severity);
            });
        });
    },

    // Render filter chips
    renderFilters() {
        const container = document.getElementById('symptom-filter-chips');
        
        // Initialize filters if empty
        if (this.activeFilters.size === 0 && App.symptoms.length > 0) {
            this.activeFilters = new Set(App.symptoms.map(s => s.id));
        }

        container.innerHTML = App.symptoms.map(symptom => `
            <button class="filter-chip ${this.activeFilters.has(symptom.id) ? 'active' : ''}" 
                    data-symptom-id="${symptom.id}"
                    style="background-color: ${this.hexToRgba(symptom.color, 0.15)}; color: ${symptom.color}">
                ${Settings.escapeHtml(symptom.name)}
            </button>
        `).join('');

        container.querySelectorAll('.filter-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const id = chip.dataset.symptomId;
                if (this.activeFilters.has(id)) {
                    this.activeFilters.delete(id);
                } else {
                    this.activeFilters.add(id);
                }
                this.updateFilterChips();
                this.render();
            });
        });
    },

    // Update filter chip visual state
    updateFilterChips() {
        document.querySelectorAll('.filter-chip').forEach(chip => {
            chip.classList.toggle('active', this.activeFilters.has(chip.dataset.symptomId));
        });
    },

    // Main render function
    render() {
        this.renderCalendar();
        this.renderEntryList();
        if (this.currentView === 'trend') {
            this.renderTrendChart();
        }
    },

    // Render calendar view
    renderCalendar() {
        const label = document.getElementById('calendar-month-label');
        label.textContent = this.calendarDate.toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric'
        });

        const container = document.getElementById('calendar-days');
        const year = this.calendarDate.getFullYear();
        const month = this.calendarDate.getMonth();

        // Get first day of month and total days
        const firstDay = new Date(year, month, 1).getDay();
        const totalDays = new Date(year, month + 1, 0).getDate();
        const today = App.formatDateKey(new Date());

        let html = '';

        // Empty cells before first day
        for (let i = 0; i < firstDay; i++) {
            html += '<div class="calendar-day empty"></div>';
        }

        // Day cells
        for (let day = 1; day <= totalDays; day++) {
            const date = new Date(year, month, day);
            const dateKey = App.formatDateKey(date);
            const isToday = dateKey === today;
            
            // Get entries for this day (filtered)
            const dayEntries = App.entries.filter(e => 
                e.date === dateKey && this.activeFilters.has(e.symptomId)
            );

            // Create dots for symptoms logged
            const dots = dayEntries.slice(0, 4).map(entry => {
                const symptom = App.getSymptom(entry.symptomId);
                if (!symptom) return '';
                const opacity = entry.severity === 'mild' ? 0.5 : entry.severity === 'mid' ? 0.75 : 1;
                return `<div class="calendar-dot" style="background-color: ${symptom.color}; opacity: ${opacity}"></div>`;
            }).join('');

            html += `
                <div class="calendar-day ${isToday ? 'today' : ''}" data-date="${dateKey}">
                    <span class="calendar-day-number">${day}</span>
                    ${dots ? `<div class="calendar-day-dots">${dots}</div>` : ''}
                </div>
            `;
        }

        container.innerHTML = html;

        // Bind click handlers
        container.querySelectorAll('.calendar-day:not(.empty)').forEach(cell => {
            cell.addEventListener('click', () => {
                this.showDayDetail(cell.dataset.date);
            });
        });
    },

    // Show day detail modal
    showDayDetail(dateKey) {
        const date = new Date(dateKey + 'T12:00:00');
        document.getElementById('day-detail-date').textContent = App.formatDateLong(date);

        const container = document.getElementById('day-detail-content');
        const dayEntries = App.entries.filter(e => e.date === dateKey);
        const note = App.dailyNotes[dateKey];

        if (dayEntries.length === 0 && !note) {
            container.innerHTML = '<p class="empty-state">No entries for this day.</p>';
        } else {
            let html = '';

            // Daily note
            if (note) {
                html += `<div class="daily-note-entry">${Settings.escapeHtml(note)}</div>`;
            }

            // Entries
            dayEntries.forEach(entry => {
                const symptom = App.getSymptom(entry.symptomId);
                if (!symptom) return;

                html += `
                    <div class="entry-item">
                        <div class="entry-color" style="background-color: ${symptom.color}; color: ${symptom.color}"></div>
                        <span class="entry-name">${Settings.escapeHtml(symptom.name)}</span>
                        <span class="entry-severity ${entry.severity}">${this.capitalize(entry.severity)}</span>
                    </div>
                `;
            });

            container.innerHTML = html;
        }

        App.openModal('day-detail-modal');
    },

    // Render entry list
    renderEntryList() {
        const container = document.getElementById('entry-list');
        
        // Filter entries
        const filteredEntries = App.entries.filter(e => this.activeFilters.has(e.symptomId));

        if (filteredEntries.length === 0) {
            container.innerHTML = '<p class="empty-state">No entries yet.</p>';
            return;
        }

        // Group by date
        const grouped = {};
        filteredEntries.forEach(entry => {
            if (!grouped[entry.date]) {
                grouped[entry.date] = [];
            }
            grouped[entry.date].push(entry);
        });

        // Sort dates descending
        const sortedDates = Object.keys(grouped).sort().reverse().slice(0, 14); // Last 14 days with entries

        let html = '';
        sortedDates.forEach(dateKey => {
            const date = new Date(dateKey + 'T12:00:00');
            const note = App.dailyNotes[dateKey];

            html += `<div class="entry-date-group">
                <div class="entry-date-header">${App.formatDateDisplay(date)}</div>`;

            // Daily note
            if (note) {
                html += `<div class="daily-note-entry">${Settings.escapeHtml(note)}</div>`;
            }

            // Entries
            grouped[dateKey].forEach(entry => {
                const symptom = App.getSymptom(entry.symptomId);
                if (!symptom) return;

                html += `
                    <div class="entry-item" data-entry-id="${entry.id}">
                        <div class="entry-color" style="background-color: ${symptom.color}; color: ${symptom.color}"></div>
                        <span class="entry-name">${Settings.escapeHtml(symptom.name)}</span>
                        <span class="entry-severity ${entry.severity}">${this.capitalize(entry.severity)}</span>
                        <div class="entry-actions">
                            <button class="edit-entry-btn" title="Edit">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                                </svg>
                            </button>
                            <button class="delete-entry-btn" title="Delete">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                `;
            });

            html += '</div>';
        });

        container.innerHTML = html;

        // Bind action buttons
        container.querySelectorAll('.edit-entry-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const entryId = e.target.closest('.entry-item').dataset.entryId;
                this.openEditModal(entryId);
            });
        });

        container.querySelectorAll('.delete-entry-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const entryId = e.target.closest('.entry-item').dataset.entryId;
                this.confirmDeleteEntry(entryId);
            });
        });
    },

    // Open edit entry modal
    openEditModal(entryId) {
        const entry = App.entries.find(e => e.id === entryId);
        if (!entry) return;

        const symptom = App.getSymptom(entry.symptomId);
        if (!symptom) return;

        this.editingEntryId = entryId;
        document.getElementById('edit-entry-symptom').textContent = symptom.name;

        // Highlight current severity
        document.querySelectorAll('#edit-severity-buttons .severity-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.severity === entry.severity);
        });

        App.openModal('edit-entry-modal');
    },

    // Update entry severity
    async updateEntrySeverity(severity) {
        if (!this.editingEntryId) return;

        const userId = Auth.currentUser.uid;

        try {
            await db.collection('users').doc(userId)
                .collection('entries')
                .doc(this.editingEntryId)
                .update({ severity });

            App.closeModal('edit-entry-modal');
            this.editingEntryId = null;
        } catch (error) {
            console.error('Error updating entry:', error);
        }
    },

    // Confirm delete entry
    confirmDeleteEntry(entryId) {
        App.confirm(
            'Delete Entry',
            'Are you sure you want to delete this entry?',
            () => this.deleteEntry(entryId)
        );
    },

    // Delete entry
    async deleteEntry(entryId) {
        const userId = Auth.currentUser.uid;

        try {
            await db.collection('users').doc(userId)
                .collection('entries')
                .doc(entryId)
                .delete();
        } catch (error) {
            console.error('Error deleting entry:', error);
        }
    },

    // Render trend chart
    renderTrendChart() {
        const ctx = document.getElementById('trend-chart').getContext('2d');

        // Calculate date range
        const endDate = new Date();
        const startDate = new Date();
        if (this.trendRange === 'week') {
            startDate.setDate(startDate.getDate() - 7);
        } else {
            startDate.setDate(startDate.getDate() - 30);
        }

        // Generate date labels
        const labels = [];
        const dateKeys = [];
        const current = new Date(startDate);
        while (current <= endDate) {
            dateKeys.push(App.formatDateKey(current));
            labels.push(current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            current.setDate(current.getDate() + 1);
        }

        // Build datasets for each filtered symptom
        const datasets = [];
        const filteredSymptoms = App.symptoms.filter(s => this.activeFilters.has(s.id));

        filteredSymptoms.forEach(symptom => {
            const data = dateKeys.map(dateKey => {
                const entry = App.entries.find(e => 
                    e.date === dateKey && e.symptomId === symptom.id
                );
                // Return 0 for no entry, so the chart shows gaps properly
                if (!entry) return 0;
                return entry.severity === 'mild' ? 1 : entry.severity === 'mid' ? 2 : 3;
            });

            datasets.push({
                label: symptom.name,
                data: data,
                borderColor: symptom.color,
                backgroundColor: this.hexToRgba(symptom.color, 0.1),
                fill: false,
                tension: 0.2,
                spanGaps: false,
                pointRadius: (context) => {
                    // Larger points for actual symptoms, tiny for zeros
                    return context.raw === 0 ? 1 : 5;
                },
                pointBackgroundColor: (context) => {
                    return context.raw === 0 ? 'transparent' : symptom.color;
                },
                pointBorderColor: (context) => {
                    return context.raw === 0 ? 'transparent' : symptom.color;
                },
                pointHoverRadius: 6,
                borderWidth: 2
            });
        });

        // Destroy existing chart
        if (this.chart) {
            this.chart.destroy();
        }

        // Create new chart
        this.chart = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: {
                            color: '#a0a0b8',
                            usePointStyle: true,
                            padding: 10,
                            font: { size: 11 }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(15, 15, 24, 0.9)',
                        borderColor: 'rgba(255, 255, 255, 0.08)',
                        borderWidth: 1,
                        titleColor: '#e8e8f0',
                        bodyColor: '#a0a0b8',
                        callbacks: {
                            label: (context) => {
                                const severities = ['None', 'Mild', 'Mid', 'Strong'];
                                return `${context.dataset.label}: ${severities[context.raw]}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: { 
                            color: '#6a6a80',
                            font: { size: 10 },
                            maxRotation: 45,
                            minRotation: 0
                        },
                        grid: { color: 'rgba(255, 255, 255, 0.04)' }
                    },
                    y: {
                        min: 0,
                        max: 3,
                        ticks: {
                            color: '#6a6a80',
                            font: { size: 10 },
                            stepSize: 1,
                            callback: (value) => {
                                const labels = ['None', 'Mild', 'Mid', 'Strong'];
                                return labels[value] || '';
                            }
                        },
                        grid: { color: 'rgba(255, 255, 255, 0.04)' }
                    }
                }
            }
        });
    },

    // Helper: Convert hex to rgba
    hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    },

    // Helper: Capitalize string
    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
};

// Initialize history when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    History.init();
});
