/**
 * Summary Screen - View and manage entries
 */
const SummaryUI = (function() {
    let currentYear, currentMonth;
    let categoryFilter = '';

    function init() {
        const now = DateUtils.getCurrentMonth();
        currentYear = now.year;
        currentMonth = now.month;

        bindEvents();
    }

    function goToPrevMonth() {
        const prev = DateUtils.getPreviousMonth(currentYear, currentMonth);
        currentYear = prev.year;
        currentMonth = prev.month;
        render();
    }

    function goToNextMonth() {
        const next = DateUtils.getNextMonth(currentYear, currentMonth);
        currentYear = next.year;
        currentMonth = next.month;
        render();
    }

    function bindEvents() {
        // Month navigation
        document.getElementById('prev-month').addEventListener('click', goToPrevMonth);
        document.getElementById('next-month').addEventListener('click', goToNextMonth);

        // Swipe support
        const screen = document.getElementById('screen-summary');
        App.enableSwipe(screen, goToNextMonth, goToPrevMonth);

        // Category filter
        document.getElementById('category-filter').addEventListener('change', (e) => {
            categoryFilter = e.target.value;
            renderEntries();
        });

        // Export button
        document.getElementById('export-excel-btn').addEventListener('click', () => {
            ExportUtils.exportMonthToExcel(currentYear, currentMonth);
            App.showToast('Excel file exported');
        });

        // Edit modal events
        document.getElementById('edit-category').addEventListener('change', updateEditSubcategories);
        document.getElementById('save-edit-btn').addEventListener('click', saveEditedEntry);
        document.getElementById('delete-entry-btn').addEventListener('click', deleteCurrentEntry);
    }

    function render() {
        updateMonthDisplay();
        updateCategoryFilter();
        renderEntries();
        updateMonthlyTotal();
    }

    function updateMonthDisplay() {
        document.getElementById('current-month').textContent =
            DateUtils.formatMonthYear(currentYear, currentMonth);
    }

    function updateCategoryFilter() {
        const select = document.getElementById('category-filter');
        const categories = Storage.getCategories();

        select.innerHTML = '<option value="">All Categories</option>' +
            categories.map(c =>
                `<option value="${c.id}" ${categoryFilter === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`
            ).join('');
    }

    function renderEntries() {
        const container = document.getElementById('entries-list');
        let entries = Storage.getEntriesByMonth(currentYear, currentMonth);

        if (categoryFilter) {
            entries = entries.filter(e => e.categoryId === categoryFilter);
        }

        if (entries.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" width="64" height="64">
                        <path fill="currentColor" d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
                    </svg>
                    <p>No entries for this month</p>
                </div>
            `;
            return;
        }

        const categories = Storage.getCategories();
        const categoryMap = {};
        categories.forEach(c => categoryMap[c.id] = c.name);

        const grouped = DateUtils.groupByDate(entries);

        container.innerHTML = grouped.map(group => `
            <div class="date-group">
                <div class="date-header">
                    <span class="date-header-date">${DateUtils.formatDate(group.date, { includeDay: true })}</span>
                    <span class="date-header-total">${formatCurrency(group.total)}</span>
                </div>
                ${group.entries.map(entry => `
                    <div class="entry-item" data-entry-id="${entry.id}">
                        <div class="entry-info">
                            <div class="entry-category">${escapeHtml(categoryMap[entry.categoryId] || 'Unknown')}</div>
                            <div class="entry-subcategory">${escapeHtml(entry.subcategory)}</div>
                            ${entry.note ? `<div class="entry-note-preview">${escapeHtml(entry.note)}</div>` : ''}
                        </div>
                        <div class="entry-amount">${formatCurrency(entry.amount)}</div>
                    </div>
                `).join('')}
            </div>
        `).join('');

        // Bind click events for editing
        container.querySelectorAll('.entry-item').forEach(item => {
            item.addEventListener('click', () => {
                openEditModal(item.dataset.entryId);
            });
        });
    }

    function updateMonthlyTotal() {
        let entries = Storage.getEntriesByMonth(currentYear, currentMonth);
        if (categoryFilter) {
            entries = entries.filter(e => e.categoryId === categoryFilter);
        }
        const total = entries.reduce((sum, e) => sum + e.amount, 0);
        document.getElementById('monthly-total-amount').textContent = formatCurrency(total);
    }

    function openEditModal(entryId) {
        const entry = Storage.getEntryById(entryId);
        if (!entry) return;

        const categories = Storage.getCategories();

        // Populate category dropdown
        const categorySelect = document.getElementById('edit-category');
        categorySelect.innerHTML = categories.map(c =>
            `<option value="${c.id}" ${c.id === entry.categoryId ? 'selected' : ''}>${escapeHtml(c.name)}</option>`
        ).join('');

        // Populate subcategory dropdown
        updateEditSubcategories();
        document.getElementById('edit-subcategory').value = entry.subcategory;

        // Populate other fields
        document.getElementById('edit-entry-id').value = entry.id;
        document.getElementById('edit-amount').value = entry.amount;
        document.getElementById('edit-date').value = entry.date;
        document.getElementById('edit-note').value = entry.note || '';

        App.openModal('edit-modal');
    }

    function updateEditSubcategories() {
        const categoryId = document.getElementById('edit-category').value;
        const category = Storage.getCategoryById(categoryId);
        const subcategorySelect = document.getElementById('edit-subcategory');

        if (category) {
            const subcategories = ['General', ...category.subcategories];
            subcategorySelect.innerHTML = subcategories.map(s =>
                `<option value="${s}">${escapeHtml(s)}</option>`
            ).join('');
        }
    }

    function saveEditedEntry() {
        const entryId = document.getElementById('edit-entry-id').value;
        const updates = {
            categoryId: document.getElementById('edit-category').value,
            subcategory: document.getElementById('edit-subcategory').value,
            amount: document.getElementById('edit-amount').value,
            date: document.getElementById('edit-date').value,
            note: document.getElementById('edit-note').value.trim()
        };

        Storage.updateEntry(entryId, updates);
        App.closeModal();
        render();
        App.showToast('Entry updated');
    }

    function deleteCurrentEntry() {
        const entryId = document.getElementById('edit-entry-id').value;

        App.showConfirm(
            'Delete Entry',
            'Are you sure you want to delete this entry?',
            () => {
                Storage.deleteEntry(entryId);
                App.closeModal();
                render();
                App.showToast('Entry deleted');
            }
        );
    }

    function formatCurrency(amount) {
        return '$' + amount.toFixed(2);
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    return {
        init,
        render
    };
})();
