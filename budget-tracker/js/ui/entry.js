/**
 * Entry Screen - Quick expense entry
 */
const EntryUI = (function() {
    // Track selected subcategories per category
    let selectedSubcategories = {};
    // Track expanded note fields per category
    let expandedNotes = {};

    function init() {
        bindEvents();
    }

    function bindEvents() {
        document.getElementById('save-entry-btn').addEventListener('click', saveEntries);
    }

    function render() {
        const container = document.getElementById('entry-categories');
        const categories = Storage.getCategories();

        if (categories.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" width="64" height="64">
                        <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                    </svg>
                    <p>No categories yet!</p>
                    <p>Go to Settings to add categories first.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = categories.map(category => renderCategoryCard(category)).join('');

        // Bind events for each category
        categories.forEach(category => {
            bindCategoryEvents(category);
        });
    }

    function renderCategoryCard(category) {
        const subcategories = ['General', ...category.subcategories];
        const selectedSub = selectedSubcategories[category.id] || 'General';
        const isExpanded = expandedNotes[category.id] || false;
        const hasSubcategories = category.subcategories.length > 0;

        return `
            <div class="category-card" data-category-id="${category.id}">
                <div class="category-card-header">
                    <h3>${escapeHtml(category.name)}</h3>
                </div>
                <input
                    type="number"
                    class="input input-large category-amount-input"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    inputmode="decimal"
                    data-category-id="${category.id}"
                >
                ${hasSubcategories ? `
                    <div class="subcategory-buttons">
                        ${subcategories.map((sub, index) => {
                            const color = ColorUtils.getSubcategoryColor(index);
                            const isActive = sub === selectedSub;
                            const style = isActive
                                ? `background-color: ${color}; border-color: ${color}; color: #000000;`
                                : `border-color: ${color}; color: ${color}; background-color: transparent;`;
                            return `
                                <button
                                    class="btn subcategory-btn ${isActive ? 'active' : ''}"
                                    data-subcategory="${escapeHtml(sub)}"
                                    data-color="${color}"
                                    style="${style}"
                                >${escapeHtml(sub)}</button>
                            `;
                        }).join('')}
                    </div>
                ` : ''}
                <div class="note-toggle ${isExpanded ? 'expanded' : ''}" data-category-id="${category.id}">
                    <svg viewBox="0 0 24 24" width="20" height="20">
                        <path fill="currentColor" d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
                    </svg>
                    <span>Add note</span>
                </div>
                <div class="note-input-container ${isExpanded ? 'visible' : ''}">
                    <textarea
                        class="input textarea category-note-input"
                        placeholder="Optional note..."
                        rows="2"
                        data-category-id="${category.id}"
                    ></textarea>
                </div>
            </div>
        `;
    }

    function bindCategoryEvents(category) {
        const card = document.querySelector(`.category-card[data-category-id="${category.id}"]`);
        if (!card) return;

        // Subcategory buttons
        card.querySelectorAll('.subcategory-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const color = btn.dataset.color;

                // Update all buttons in this card
                card.querySelectorAll('.subcategory-btn').forEach(b => {
                    const btnColor = b.dataset.color;
                    b.classList.remove('active');
                    b.style.backgroundColor = 'transparent';
                    b.style.borderColor = btnColor;
                    b.style.color = btnColor;
                });

                // Activate clicked button
                btn.classList.add('active');
                btn.style.backgroundColor = color;
                btn.style.borderColor = color;
                btn.style.color = '#000000';  // True black for max contrast

                selectedSubcategories[category.id] = btn.dataset.subcategory;
            });
        });

        // Note toggle
        const noteToggle = card.querySelector('.note-toggle');
        const noteContainer = card.querySelector('.note-input-container');
        noteToggle.addEventListener('click', () => {
            const isExpanded = noteToggle.classList.toggle('expanded');
            noteContainer.classList.toggle('visible', isExpanded);
            expandedNotes[category.id] = isExpanded;
        });
    }

    function saveEntries() {
        const categories = Storage.getCategories();
        let savedCount = 0;
        const today = DateUtils.getToday();

        categories.forEach(category => {
            const amountInput = document.querySelector(
                `.category-amount-input[data-category-id="${category.id}"]`
            );
            const noteInput = document.querySelector(
                `.category-note-input[data-category-id="${category.id}"]`
            );

            const amount = parseFloat(amountInput?.value);
            if (amount && amount > 0) {
                Storage.addEntry({
                    categoryId: category.id,
                    subcategory: selectedSubcategories[category.id] || 'General',
                    amount: amount,
                    note: noteInput?.value?.trim() || '',
                    date: today
                });
                savedCount++;

                // Clear inputs
                amountInput.value = '';
                if (noteInput) noteInput.value = '';
            }
        });

        if (savedCount > 0) {
            // Reset selections
            selectedSubcategories = {};
            expandedNotes = {};

            // Re-render to reset UI state
            render();

            App.showToast(`Saved ${savedCount} ${savedCount === 1 ? 'entry' : 'entries'}`);
        } else {
            App.showToast('Enter an amount to save', 'error');
        }
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
