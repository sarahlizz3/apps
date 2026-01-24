// ========================================
// EXPORT MODULE
// ========================================

const Export = {
    init() {
        document.getElementById('export-csv').addEventListener('click', () => this.exportToCsv());
    },

    // Export all data to CSV
    exportToCsv() {
        if (App.entries.length === 0) {
            alert('No entries to export.');
            return;
        }

        // Build CSV content
        const headers = ['Date', 'Symptom', 'Severity', 'Daily Note'];
        const rows = [];

        // Sort entries by date
        const sortedEntries = [...App.entries].sort((a, b) => a.date.localeCompare(b.date));

        // Group by date to include daily notes once per date
        const processedDates = new Set();

        sortedEntries.forEach(entry => {
            const symptom = App.getSymptom(entry.symptomId);
            if (!symptom) return;

            const note = !processedDates.has(entry.date) ? (App.dailyNotes[entry.date] || '') : '';
            processedDates.add(entry.date);

            rows.push([
                entry.date,
                symptom.name,
                this.capitalize(entry.severity),
                note
            ]);
        });

        // Convert to CSV format
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => this.escapeCsvCell(cell)).join(','))
        ].join('\n');

        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        const filename = `symptom-tracker-export-${App.formatDateKey(new Date())}.csv`;
        
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    },

    // Escape CSV cell content
    escapeCsvCell(cell) {
        const str = String(cell);
        // If cell contains comma, quote, or newline, wrap in quotes and escape internal quotes
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
    },

    // Capitalize string
    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
};

// Initialize export when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    Export.init();
});
