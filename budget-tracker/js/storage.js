/**
 * Storage Module - Data layer using Firestore
 */
const Storage = (function() {
    // Cache for performance
    let categoriesCache = null;
    let entriesCache = null;
    let listeners = [];

    // Generate UUID
    function generateId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    // Get user's Firestore collection reference
    function getUserCollection(collectionName) {
        const userId = FirebaseApp.getUserId();
        if (!userId) {
            console.error('No user logged in');
            return null;
        }
        return FirebaseApp.getDb().collection('users').doc(userId).collection(collectionName);
    }

    // Initialize real-time listeners
    function initListeners() {
        const userId = FirebaseApp.getUserId();
        if (!userId) return;

        // Clear existing listeners
        listeners.forEach(unsubscribe => unsubscribe());
        listeners = [];

        // Categories listener
        const categoriesRef = getUserCollection('categories');
        if (categoriesRef) {
            const unsubCategories = categoriesRef.onSnapshot((snapshot) => {
                categoriesCache = [];
                snapshot.forEach((doc) => {
                    categoriesCache.push({ id: doc.id, ...doc.data() });
                });
                categoriesCache.sort((a, b) => a.order - b.order);
                // Notify app of data change
                if (typeof App !== 'undefined' && App.onDataChange) {
                    App.onDataChange();
                }
            }, (error) => {
                console.error('Categories listener error:', error);
            });
            listeners.push(unsubCategories);
        }

        // Entries listener
        const entriesRef = getUserCollection('entries');
        if (entriesRef) {
            const unsubEntries = entriesRef.onSnapshot((snapshot) => {
                entriesCache = [];
                snapshot.forEach((doc) => {
                    entriesCache.push({ id: doc.id, ...doc.data() });
                });
                // Notify app of data change
                if (typeof App !== 'undefined' && App.onDataChange) {
                    App.onDataChange();
                }
            }, (error) => {
                console.error('Entries listener error:', error);
            });
            listeners.push(unsubEntries);
        }
    }

    // Stop listeners
    function stopListeners() {
        listeners.forEach(unsubscribe => unsubscribe());
        listeners = [];
        categoriesCache = null;
        entriesCache = null;
    }

    // ===== CATEGORIES =====

    function getCategories() {
        return categoriesCache || [];
    }

    function getCategoryById(id) {
        const categories = getCategories();
        return categories.find(c => c.id === id);
    }

    async function addCategory(name) {
        const categoriesRef = getUserCollection('categories');
        if (!categoriesRef) return null;

        const categories = getCategories();
        const newCategory = {
            name: name.trim(),
            order: categories.length,
            subcategories: [],
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        const docRef = await categoriesRef.add(newCategory);
        return { id: docRef.id, ...newCategory };
    }

    async function updateCategory(id, updates) {
        const categoriesRef = getUserCollection('categories');
        if (!categoriesRef) return null;

        await categoriesRef.doc(id).update(updates);
        return { id, ...updates };
    }

    async function deleteCategory(id) {
        const categoriesRef = getUserCollection('categories');
        const entriesRef = getUserCollection('entries');
        if (!categoriesRef || !entriesRef) return false;

        // Delete the category
        await categoriesRef.doc(id).delete();

        // Delete all entries for this category
        const entriesSnapshot = await entriesRef.where('categoryId', '==', id).get();
        const batch = FirebaseApp.getDb().batch();
        entriesSnapshot.forEach((doc) => {
            batch.delete(doc.ref);
        });
        await batch.commit();

        // Reorder remaining categories
        const categories = getCategories().filter(c => c.id !== id);
        const reorderBatch = FirebaseApp.getDb().batch();
        categories.forEach((cat, index) => {
            reorderBatch.update(categoriesRef.doc(cat.id), { order: index });
        });
        await reorderBatch.commit();

        return true;
    }

    async function reorderCategories(orderedIds) {
        const categoriesRef = getUserCollection('categories');
        if (!categoriesRef) return;

        const batch = FirebaseApp.getDb().batch();
        orderedIds.forEach((id, index) => {
            batch.update(categoriesRef.doc(id), { order: index });
        });
        await batch.commit();
    }

    // ===== SUBCATEGORIES =====

    async function addSubcategory(categoryId, name) {
        const category = getCategoryById(categoryId);
        if (!category) return false;

        if (!category.subcategories.includes(name.trim())) {
            const newSubcategories = [...category.subcategories, name.trim()];
            await updateCategory(categoryId, { subcategories: newSubcategories });
            return true;
        }
        return false;
    }

    async function deleteSubcategory(categoryId, name) {
        const category = getCategoryById(categoryId);
        if (!category) return false;

        const newSubcategories = category.subcategories.filter(s => s !== name);
        await updateCategory(categoryId, { subcategories: newSubcategories });

        // Update entries with this subcategory to "General"
        const entriesRef = getUserCollection('entries');
        if (entriesRef) {
            const snapshot = await entriesRef
                .where('categoryId', '==', categoryId)
                .where('subcategory', '==', name)
                .get();

            const batch = FirebaseApp.getDb().batch();
            snapshot.forEach((doc) => {
                batch.update(doc.ref, { subcategory: 'General' });
            });
            await batch.commit();
        }

        return true;
    }

    // ===== ENTRIES =====

    function getEntries() {
        return entriesCache || [];
    }

    function getEntriesByMonth(year, month) {
        const entries = getEntries();
        return entries.filter(e => {
            const date = new Date(e.date);
            return date.getFullYear() === year && date.getMonth() === month;
        }).sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    function getEntriesByYear(year) {
        const entries = getEntries();
        return entries.filter(e => {
            const date = new Date(e.date);
            return date.getFullYear() === year;
        });
    }

    function getEntriesByCategory(categoryId) {
        const entries = getEntries();
        return entries.filter(e => e.categoryId === categoryId);
    }

    function getEntryById(id) {
        const entries = getEntries();
        return entries.find(e => e.id === id);
    }

    async function addEntry(entry) {
        const entriesRef = getUserCollection('entries');
        if (!entriesRef) return null;

        const newEntry = {
            categoryId: entry.categoryId,
            subcategory: entry.subcategory || 'General',
            amount: parseFloat(entry.amount) || 0,
            note: entry.note || '',
            date: entry.date || new Date().toISOString().split('T')[0],
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        const docRef = await entriesRef.add(newEntry);
        return { id: docRef.id, ...newEntry };
    }

    async function updateEntry(id, updates) {
        const entriesRef = getUserCollection('entries');
        if (!entriesRef) return null;

        if (updates.amount !== undefined) {
            updates.amount = parseFloat(updates.amount) || 0;
        }

        await entriesRef.doc(id).update(updates);
        return { id, ...updates };
    }

    async function deleteEntry(id) {
        const entriesRef = getUserCollection('entries');
        if (!entriesRef) return false;

        await entriesRef.doc(id).delete();
        return true;
    }

    // ===== DATA MANAGEMENT =====

    function exportAllData() {
        return {
            version: 1,
            exportedAt: new Date().toISOString(),
            categories: getCategories(),
            entries: getEntries()
        };
    }

    async function importData(data) {
        try {
            if (!data.categories || !data.entries) {
                throw new Error('Invalid data format');
            }

            const categoriesRef = getUserCollection('categories');
            const entriesRef = getUserCollection('entries');
            if (!categoriesRef || !entriesRef) return false;

            // Clear existing data first
            await clearAllData();

            // Import categories
            for (const cat of data.categories) {
                const { id, ...catData } = cat;
                await categoriesRef.doc(id).set(catData);
            }

            // Import entries
            for (const entry of data.entries) {
                const { id, ...entryData } = entry;
                await entriesRef.doc(id).set(entryData);
            }

            return true;
        } catch (e) {
            console.error('Error importing data:', e);
            return false;
        }
    }

    async function clearAllData() {
        const categoriesRef = getUserCollection('categories');
        const entriesRef = getUserCollection('entries');
        if (!categoriesRef || !entriesRef) return false;

        // Delete all categories
        const catSnapshot = await categoriesRef.get();
        const catBatch = FirebaseApp.getDb().batch();
        catSnapshot.forEach((doc) => catBatch.delete(doc.ref));
        await catBatch.commit();

        // Delete all entries
        const entrySnapshot = await entriesRef.get();
        const entryBatch = FirebaseApp.getDb().batch();
        entrySnapshot.forEach((doc) => entryBatch.delete(doc.ref));
        await entryBatch.commit();

        return true;
    }

    // ===== STATISTICS =====

    function getMonthlyTotal(year, month) {
        const entries = getEntriesByMonth(year, month);
        return entries.reduce((sum, e) => sum + e.amount, 0);
    }

    function getCategoryTotals(year, month) {
        const entries = getEntriesByMonth(year, month);
        const categories = getCategories();
        const totals = {};

        categories.forEach(cat => {
            totals[cat.id] = {
                name: cat.name,
                total: 0
            };
        });

        entries.forEach(e => {
            if (totals[e.categoryId]) {
                totals[e.categoryId].total += e.amount;
            }
        });

        return totals;
    }

    function getYearlyTotals(year) {
        const entries = getEntriesByYear(year);
        const monthlyTotals = Array(12).fill(0);

        entries.forEach(e => {
            const month = new Date(e.date).getMonth();
            monthlyTotals[month] += e.amount;
        });

        return monthlyTotals;
    }

    // Public API
    return {
        // Initialization
        initListeners,
        stopListeners,

        // Categories
        getCategories,
        getCategoryById,
        addCategory,
        updateCategory,
        deleteCategory,
        reorderCategories,

        // Subcategories
        addSubcategory,
        deleteSubcategory,

        // Entries
        getEntries,
        getEntriesByMonth,
        getEntriesByYear,
        getEntriesByCategory,
        getEntryById,
        addEntry,
        updateEntry,
        deleteEntry,

        // Data management
        exportAllData,
        importData,
        clearAllData,

        // Statistics
        getMonthlyTotal,
        getCategoryTotals,
        getYearlyTotals
    };
})();
