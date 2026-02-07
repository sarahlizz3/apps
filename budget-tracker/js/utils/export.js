/**
 * Export Utilities - Excel export using SheetJS
 */
const ExportUtils = (function() {
    function formatCurrency(amount) {
        return '$' + amount.toFixed(2);
    }

    function exportToExcel(entries, filename) {
        if (typeof XLSX === 'undefined') {
            alert('Excel export library not loaded. Please check your internet connection.');
            return false;
        }

        const categories = Storage.getCategories();
        const categoryMap = {};
        categories.forEach(c => categoryMap[c.id] = c.name);

        // Prepare data for export
        const data = entries.map(entry => ({
            'Date': entry.date,
            'Category': categoryMap[entry.categoryId] || 'Unknown',
            'Subcategory': entry.subcategory,
            'Amount': entry.amount,
            'Note': entry.note || ''
        }));

        // Add summary row
        const total = entries.reduce((sum, e) => sum + e.amount, 0);
        data.push({});
        data.push({
            'Date': '',
            'Category': '',
            'Subcategory': 'TOTAL',
            'Amount': total,
            'Note': ''
        });

        // Create workbook and worksheet
        const ws = XLSX.utils.json_to_sheet(data);

        // Set column widths
        ws['!cols'] = [
            { wch: 12 },  // Date
            { wch: 15 },  // Category
            { wch: 15 },  // Subcategory
            { wch: 12 },  // Amount
            { wch: 30 }   // Note
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Budget');

        // Generate file and download
        XLSX.writeFile(wb, filename);
        return true;
    }

    function exportMonthToExcel(year, month) {
        const entries = Storage.getEntriesByMonth(year, month);
        const monthName = DateUtils.getMonthName(month);
        const filename = `Budget_${monthName}_${year}.xlsx`;
        return exportToExcel(entries, filename);
    }

    function exportAllToExcel() {
        const entries = Storage.getEntries();
        const filename = `Budget_All_${DateUtils.getToday()}.xlsx`;
        return exportToExcel(entries, filename);
    }

    function downloadJSON(data, filename) {
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function exportBackup() {
        const data = Storage.exportAllData();
        const filename = `budget_backup_${DateUtils.getToday()}.json`;
        downloadJSON(data, filename);
        return true;
    }

    return {
        exportToExcel,
        exportMonthToExcel,
        exportAllToExcel,
        exportBackup,
        downloadJSON
    };
})();
