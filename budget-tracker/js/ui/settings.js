/**
 * Settings Screen - Category and data management
 */
const SettingsUI = (function() {
    function init() {
        bindEvents();
    }

    function bindEvents() {
        // Add category button
        document.getElementById('add-category-btn').addEventListener('click', () => {
            showCategoryModal();
        });

        // Category modal save
        document.getElementById('save-category-btn').addEventListener('click', saveCategory);

        // Category modal delete
        document.getElementById('delete-category-btn').addEventListener('click', () => {
            const categoryId = document.getElementById('edit-category-id').value;
            if (categoryId) {
                App.showConfirm(
                    'Delete Category',
                    'Are you sure you want to delete this category? All entries in this category will also be deleted.',
                    () => {
                        Storage.deleteCategory(categoryId);
                        App.closeModal();
                        render();
                        App.showToast('Category deleted');
                    }
                );
            }
        });

        // Excel export
        document.getElementById('settings-export-excel-btn').addEventListener('click', () => {
            ExportUtils.exportAllToExcel();
            App.showToast('Excel file exported');
        });

        // Data management
        document.getElementById('export-data-btn').addEventListener('click', () => {
            ExportUtils.exportBackup();
            App.showToast('Backup exported');
        });

        document.getElementById('import-data-input').addEventListener('change', handleImport);

        document.getElementById('clear-data-btn').addEventListener('click', () => {
            App.showConfirm(
                'Clear All Data',
                'Are you sure you want to delete ALL data? This cannot be undone.',
                () => {
                    Storage.clearAllData();
                    render();
                    App.showToast('All data cleared');
                }
            );
        });
    }

    function render() {
        renderCategories();
    }

    function renderCategories() {
        const container = document.getElementById('categories-list');
        const categories = Storage.getCategories();

        if (categories.length === 0) {
            container.innerHTML = '<p class="empty-state">No categories yet. Add one to get started!</p>';
            return;
        }

        container.innerHTML = categories.map(category => `
            <div class="category-settings-card" data-id="${category.id}">
                <div class="category-settings-header">
                    <span class="settings-item-name">${escapeHtml(category.name)}</span>
                    <button class="btn btn-icon edit-category-btn" aria-label="Edit">
                        <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                    </button>
                </div>
                <div class="subcategories-inline">
                    ${category.subcategories.length > 0 ? `
                        <div class="subcategory-chips">
                            ${category.subcategories.map(sub => `
                                <span class="subcategory-chip" data-name="${escapeHtml(sub)}">
                                    ${escapeHtml(sub)}
                                    <button class="chip-delete" aria-label="Delete ${escapeHtml(sub)}">
                                        <svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                                    </button>
                                </span>
                            `).join('')}
                        </div>
                    ` : '<p class="subcategory-hint">No subcategories</p>'}
                    <div class="add-subcategory-inline">
                        <input type="text" class="input input-small new-subcategory-input" placeholder="Add subcategory..." data-category-id="${category.id}">
                        <button class="btn btn-small btn-secondary add-subcategory-btn" data-category-id="${category.id}">+</button>
                    </div>
                </div>
            </div>
        `).join('');

        // Bind edit buttons
        container.querySelectorAll('.edit-category-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const card = e.target.closest('.category-settings-card');
                const categoryId = card.dataset.id;
                showCategoryModal(categoryId);
            });
        });

        // Bind subcategory delete buttons
        container.querySelectorAll('.chip-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const chip = e.target.closest('.subcategory-chip');
                const card = e.target.closest('.category-settings-card');
                const categoryId = card.dataset.id;
                const subName = chip.dataset.name;

                App.showConfirm(
                    'Delete Subcategory',
                    `Delete "${subName}"? Entries will be moved to "General".`,
                    () => {
                        Storage.deleteSubcategory(categoryId, subName);
                        render();
                        App.showToast('Subcategory deleted');
                    }
                );
            });
        });

        // Bind add subcategory buttons
        container.querySelectorAll('.add-subcategory-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const categoryId = btn.dataset.categoryId;
                addSubcategory(categoryId);
            });
        });

        // Bind enter key on subcategory inputs
        container.querySelectorAll('.new-subcategory-input').forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const categoryId = input.dataset.categoryId;
                    addSubcategory(categoryId);
                }
            });
        });
    }

    function showCategoryModal(categoryId = null) {
        const modal = document.getElementById('category-modal');
        const title = document.getElementById('category-modal-title');
        const nameInput = document.getElementById('category-name-input');
        const idInput = document.getElementById('edit-category-id');
        const deleteBtn = document.getElementById('delete-category-btn');

        if (categoryId) {
            const category = Storage.getCategoryById(categoryId);
            title.textContent = 'Edit Category';
            nameInput.value = category.name;
            idInput.value = categoryId;
            deleteBtn.classList.remove('hidden');
        } else {
            title.textContent = 'Add Category';
            nameInput.value = '';
            idInput.value = '';
            deleteBtn.classList.add('hidden');
        }

        App.openModal('category-modal');
        nameInput.focus();
    }

    function saveCategory() {
        const nameInput = document.getElementById('category-name-input');
        const idInput = document.getElementById('edit-category-id');
        const name = nameInput.value.trim();

        if (!name) {
            App.showToast('Please enter a category name', 'error');
            return;
        }

        if (idInput.value) {
            Storage.updateCategory(idInput.value, { name });
            App.showToast('Category updated');
        } else {
            Storage.addCategory(name);
            App.showToast('Category added');
        }

        App.closeModal();
        render();
    }

    function addSubcategory(categoryId) {
        const input = document.querySelector(`.new-subcategory-input[data-category-id="${categoryId}"]`);
        const name = input.value.trim();

        if (!name) {
            return;
        }

        const success = Storage.addSubcategory(categoryId, name);
        if (success) {
            input.value = '';
            render();
            App.showToast('Subcategory added');
        } else {
            App.showToast('Subcategory already exists', 'error');
        }
    }

    function handleImport(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const data = JSON.parse(event.target.result);
                App.showConfirm(
                    'Import Data',
                    'This will replace all existing data. Continue?',
                    () => {
                        if (Storage.importData(data)) {
                            render();
                            App.showToast('Data imported successfully');
                        } else {
                            App.showToast('Failed to import data', 'error');
                        }
                    }
                );
            } catch (err) {
                App.showToast('Invalid file format', 'error');
            }
        };
        reader.readAsText(file);

        // Reset input
        e.target.value = '';
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
