// ========================================
// SETTINGS MODULE
// ========================================

const Settings = {
    editingSymptomId: null,

    init() {
        document.getElementById('add-symptom-btn').addEventListener('click', () => this.addSymptom());
        
        // Handle enter key in symptom name input
        document.getElementById('new-symptom-name').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addSymptom();
            }
        });
    },

    // Render symptom list in settings
    renderSymptomList() {
        const container = document.getElementById('symptom-list');
        
        if (App.symptoms.length === 0) {
            container.innerHTML = '<p class="empty-state">No symptoms added yet.</p>';
            return;
        }

        container.innerHTML = App.symptoms.map((symptom, index) => `
            <div class="symptom-item" data-id="${symptom.id}">
                <div class="symptom-item-color" style="background-color: ${symptom.color}"></div>
                <span class="symptom-item-name">${this.escapeHtml(symptom.name)}</span>
                <div class="symptom-item-actions">
                    <button class="move-up-btn" title="Move up" ${index === 0 ? 'disabled' : ''}>
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                            <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/>
                        </svg>
                    </button>
                    <button class="move-down-btn" title="Move down" ${index === App.symptoms.length - 1 ? 'disabled' : ''}>
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                            <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/>
                        </svg>
                    </button>
                    <button class="edit-btn" title="Edit">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                        </svg>
                    </button>
                    <button class="delete-btn" title="Delete">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                        </svg>
                    </button>
                </div>
            </div>
        `).join('');

        // Bind action buttons
        container.querySelectorAll('.move-up-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.closest('.symptom-item').dataset.id;
                this.moveSymptom(id, -1);
            });
        });

        container.querySelectorAll('.move-down-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.closest('.symptom-item').dataset.id;
                this.moveSymptom(id, 1);
            });
        });

        container.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.closest('.symptom-item').dataset.id;
                this.startEditSymptom(id);
            });
        });

        container.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.closest('.symptom-item').dataset.id;
                this.confirmDeleteSymptom(id);
            });
        });
    },

    // Add new symptom
    async addSymptom() {
        const nameInput = document.getElementById('new-symptom-name');
        const colorInput = document.getElementById('new-symptom-color');
        
        const name = nameInput.value.trim();
        const color = colorInput.value;
        
        if (!name) {
            nameInput.focus();
            return;
        }

        const userId = Auth.currentUser.uid;
        const order = App.symptoms.length;

        try {
            await db.collection('users').doc(userId)
                .collection('symptoms')
                .add({
                    name,
                    color,
                    order,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            
            // Clear input
            nameInput.value = '';
            // Randomize next color
            colorInput.value = this.getRandomColor();
        } catch (error) {
            console.error('Error adding symptom:', error);
        }
    },

    // Start editing a symptom
    startEditSymptom(id) {
        const symptom = App.getSymptom(id);
        if (!symptom) return;

        const item = document.querySelector(`.symptom-item[data-id="${id}"]`);
        const nameSpan = item.querySelector('.symptom-item-name');
        const colorDiv = item.querySelector('.symptom-item-color');
        
        // Replace with edit form
        nameSpan.innerHTML = `<input type="text" class="edit-name-input" value="${this.escapeHtml(symptom.name)}">`;
        colorDiv.innerHTML = `<input type="color" class="edit-color-input" value="${symptom.color}">`;
        
        // Change edit button to save button
        const editBtn = item.querySelector('.edit-btn');
        editBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
        `;
        editBtn.classList.add('save-btn');
        editBtn.classList.remove('edit-btn');
        
        // Handle save
        const saveHandler = () => {
            const newName = item.querySelector('.edit-name-input').value.trim();
            const newColor = item.querySelector('.edit-color-input').value;
            if (newName) {
                this.saveSymptom(id, newName, newColor);
            }
        };

        editBtn.removeEventListener('click', editBtn._clickHandler);
        editBtn._clickHandler = saveHandler;
        editBtn.addEventListener('click', saveHandler);
        
        // Focus name input
        item.querySelector('.edit-name-input').focus();
        
        // Handle enter key
        item.querySelector('.edit-name-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                saveHandler();
            }
        });
    },

    // Save edited symptom
    async saveSymptom(id, name, color) {
        const userId = Auth.currentUser.uid;
        
        try {
            await db.collection('users').doc(userId)
                .collection('symptoms')
                .doc(id)
                .update({ name, color });
        } catch (error) {
            console.error('Error saving symptom:', error);
        }
    },

    // Confirm delete symptom
    confirmDeleteSymptom(id) {
        const symptom = App.getSymptom(id);
        if (!symptom) return;

        App.confirm(
            'Delete Symptom',
            `Delete "${symptom.name}"? This will also delete all logged entries for this symptom.`,
            () => this.deleteSymptom(id)
        );
    },

    // Delete symptom
    async deleteSymptom(id) {
        const userId = Auth.currentUser.uid;
        
        try {
            // Delete the symptom
            await db.collection('users').doc(userId)
                .collection('symptoms')
                .doc(id)
                .delete();

            // Delete all entries for this symptom
            const entriesSnapshot = await db.collection('users').doc(userId)
                .collection('entries')
                .where('symptomId', '==', id)
                .get();

            const batch = db.batch();
            entriesSnapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();

            // Update order of remaining symptoms
            this.reorderSymptoms();
        } catch (error) {
            console.error('Error deleting symptom:', error);
        }
    },

    // Move symptom up or down
    async moveSymptom(id, direction) {
        const index = App.symptoms.findIndex(s => s.id === id);
        const newIndex = index + direction;
        
        if (newIndex < 0 || newIndex >= App.symptoms.length) return;

        const userId = Auth.currentUser.uid;
        const batch = db.batch();

        // Swap orders
        const currentRef = db.collection('users').doc(userId).collection('symptoms').doc(App.symptoms[index].id);
        const swapRef = db.collection('users').doc(userId).collection('symptoms').doc(App.symptoms[newIndex].id);

        batch.update(currentRef, { order: newIndex });
        batch.update(swapRef, { order: index });

        try {
            await batch.commit();
        } catch (error) {
            console.error('Error reordering symptom:', error);
        }
    },

    // Reorder all symptoms after deletion
    async reorderSymptoms() {
        const userId = Auth.currentUser.uid;
        const batch = db.batch();

        App.symptoms.forEach((symptom, index) => {
            const ref = db.collection('users').doc(userId).collection('symptoms').doc(symptom.id);
            batch.update(ref, { order: index });
        });

        try {
            await batch.commit();
        } catch (error) {
            console.error('Error reordering symptoms:', error);
        }
    },

    // Get a random color from palette
    getRandomColor() {
        const colors = [
            '#e8a0b8', '#8cd0d8', '#b8a0d8', '#e8c0a0', '#a0d8b8',
            '#d0a0d8', '#a0c8e8', '#e8b0a0', '#a0d8d0', '#c8b0e8'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    },

    // Escape HTML to prevent XSS
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Initialize settings when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    Settings.init();
});
