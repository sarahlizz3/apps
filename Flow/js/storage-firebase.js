/* ============================================
   Storage Module (Firestore)
   Maintains same API as localStorage version
   ============================================ */

const Storage = {
  userId: null,
  userEmail: null,

  // Set user ID and email (called after auth)
  setUser(userId, email) {
    this.userId = userId;
    this.userEmail = email?.toLowerCase();
    console.log('Storage: user set to', userId, email);
  },

  // Helper: get user document path (for notes, tags, clipboards)
  userPath() {
    if (!this.userId) throw new Error('No user ID set');
    return `users/${this.userId}`;
  },

  // Generate unique ID
  generateId() {
    return db.collection('_').doc().id;
  },

  // ============================================
  // Categories (Lists) - Top-level for sharing
  // ============================================
  
  async getCategories() {
    console.log('getCategories called for user:', this.userId, this.userEmail);
    try {
      // Get categories I own (sort client-side to avoid needing composite index)
      const ownedSnapshot = await db.collection('categories')
        .where('ownerId', '==', this.userId)
        .get();
      
      console.log('Owned categories from DB:', ownedSnapshot.docs.length);
      
      // Get categories shared with me
      const sharedSnapshot = await db.collection('categories')
        .where('sharedWith', 'array-contains', this.userEmail)
        .get();
      
      console.log('Shared categories from DB:', sharedSnapshot.docs.length);
      
      const owned = ownedSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        isShared: false,
        isOwner: true
      }));
      
      // Sort by order client-side
      owned.sort((a, b) => (a.order || 0) - (b.order || 0));
      
      const shared = sharedSnapshot.docs
        .filter(doc => doc.data().ownerId !== this.userId) // Don't duplicate owned
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          isShared: true,
          isOwner: false
        }));
      
      // Combine and sort (owned first, then shared)
      const result = [...owned, ...shared];
      console.log('getCategories returning:', result.length, 'categories');
      return result;
    } catch (error) {
      console.error('Error getting categories:', error);
      return [];
    }
  },

  async saveCategories(categories) {
    console.log('saveCategories called with:', categories.length, 'categories');
    try {
      const batch = db.batch();
      
      // Only save categories the user owns
      const ownedCategories = categories.filter(c => c.isOwner !== false);
      console.log('Owned categories to save:', ownedCategories.length);
      
      // Get existing owned categories to handle deletions
      const existingSnapshot = await db.collection('categories')
        .where('ownerId', '==', this.userId)
        .get();
      
      console.log('Existing categories in DB:', existingSnapshot.docs.length);
      
      const newIds = new Set(ownedCategories.map(c => c.id));
      
      // Delete removed categories
      existingSnapshot.docs.forEach(doc => {
        if (!newIds.has(doc.id)) {
          batch.delete(doc.ref);
        }
      });
      
      // Set all current owned categories
      ownedCategories.forEach((category, index) => {
        const docRef = db.collection('categories').doc(category.id);
        const data = {
          name: category.name,
          order: index,
          sublists: category.sublists || [],
          ownerId: this.userId,
          ownerEmail: this.userEmail,
          sharedWith: category.sharedWith || [],
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        console.log('Saving category:', category.id, data.name);
        batch.set(docRef, data, { merge: true });
      });
      
      await batch.commit();
      console.log('Categories saved successfully');
      return true;
    } catch (error) {
      console.error('Error saving categories:', error);
      return false;
    }
  },

  async saveCategory(category) {
    try {
      // Determine if user is owner (for new categories or owned ones)
      const isOwner = category.isOwner !== false && (!category.ownerId || category.ownerId === this.userId);
      
      const data = {
        name: category.name,
        order: category.order || 0,
        sublists: category.sublists || [],
        sharedWith: category.sharedWith || [],
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      // Only set owner fields if this is a new category or user is owner
      if (isOwner) {
        data.ownerId = this.userId;
        data.ownerEmail = this.userEmail;
      }
      
      await db.collection('categories').doc(category.id).set(data, { merge: true });
      return true;
    } catch (error) {
      console.error('Error saving category:', error);
      return false;
    }
  },

  async deleteCategory(categoryId) {
    try {
      await db.collection('categories').doc(categoryId).delete();
      return true;
    } catch (error) {
      console.error('Error deleting category:', error);
      return false;
    }
  },

  async shareCategory(categoryId, email) {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      await db.collection('categories').doc(categoryId).update({
        sharedWith: firebase.firestore.FieldValue.arrayUnion(normalizedEmail)
      });
      return true;
    } catch (error) {
      console.error('Error sharing category:', error);
      return false;
    }
  },

  async unshareCategory(categoryId, email) {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      await db.collection('categories').doc(categoryId).update({
        sharedWith: firebase.firestore.FieldValue.arrayRemove(normalizedEmail)
      });
      return true;
    } catch (error) {
      console.error('Error unsharing category:', error);
      return false;
    }
  },

  // ============================================
  // Notes - User-specific
  // ============================================
  
  async getNotes() {
    try {
      const snapshot = await db.collection(this.userPath() + '/notes')
        .orderBy('updatedAt', 'desc')
        .get();
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || new Date().toISOString()
        };
      });
    } catch (error) {
      console.error('Error getting notes:', error);
      return [];
    }
  },

  async saveNotes(notes) {
    try {
      const batch = db.batch();
      const colRef = db.collection(this.userPath() + '/notes');
      
      // Get existing to delete removed
      const existing = await colRef.get();
      const newIds = new Set(notes.map(n => n.id));
      
      existing.docs.forEach(doc => {
        if (!newIds.has(doc.id)) {
          batch.delete(doc.ref);
        }
      });
      
      notes.forEach(note => {
        const docRef = colRef.doc(note.id);
        batch.set(docRef, {
          title: note.title || 'Untitled',
          body: note.body || '',
          tags: note.tags || [],
          createdAt: note.createdAt ? new Date(note.createdAt) : firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      });
      
      await batch.commit();
      return true;
    } catch (error) {
      console.error('Error saving notes:', error);
      return false;
    }
  },

  async saveNote(note) {
    try {
      await db.collection(this.userPath() + '/notes').doc(note.id).set({
        title: note.title || 'Untitled',
        body: note.body || '',
        tags: note.tags || [],
        createdAt: note.createdAt ? new Date(note.createdAt) : firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      return true;
    } catch (error) {
      console.error('Error saving note:', error);
      return false;
    }
  },

  async deleteNote(noteId) {
    try {
      await db.collection(this.userPath() + '/notes').doc(noteId).delete();
      return true;
    } catch (error) {
      console.error('Error deleting note:', error);
      return false;
    }
  },

  // ============================================
  // Tags - User-specific
  // ============================================
  
  async getTags() {
    try {
      const snapshot = await db.collection(this.userPath() + '/tags').get();
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting tags:', error);
      return [];
    }
  },

  async saveTags(tags) {
    try {
      const batch = db.batch();
      const colRef = db.collection(this.userPath() + '/tags');
      
      // Get existing to delete removed
      const existing = await colRef.get();
      const newIds = new Set(tags.map(t => t.id));
      
      existing.docs.forEach(doc => {
        if (!newIds.has(doc.id)) {
          batch.delete(doc.ref);
        }
      });
      
      tags.forEach(tag => {
        const docRef = colRef.doc(tag.id || this.generateId());
        batch.set(docRef, {
          name: tag.name,
          color: tag.color
        });
      });
      
      await batch.commit();
      return true;
    } catch (error) {
      console.error('Error saving tags:', error);
      return false;
    }
  },

  // ============================================
  // Clipboards (Scratchpad) - User-specific
  // ============================================
  
  async getClipboards() {
    try {
      const snapshot = await db.collection(this.userPath() + '/clipboards')
        .orderBy('order')
        .get();
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting clipboards:', error);
      return [];
    }
  },

  async saveClipboards(clipboards) {
    try {
      const batch = db.batch();
      const colRef = db.collection(this.userPath() + '/clipboards');
      
      // Get existing to delete removed
      const existing = await colRef.get();
      const newIds = new Set(clipboards.map(c => c.id));
      
      existing.docs.forEach(doc => {
        if (!newIds.has(doc.id)) {
          batch.delete(doc.ref);
        }
      });
      
      clipboards.forEach((clipboard, index) => {
        const docRef = colRef.doc(clipboard.id);
        batch.set(docRef, {
          content: clipboard.content || '',
          order: index
        });
      });
      
      await batch.commit();
      return true;
    } catch (error) {
      console.error('Error saving clipboards:', error);
      return false;
    }
  },

  async saveClipboard(clipboard) {
    try {
      await db.collection(this.userPath() + '/clipboards').doc(clipboard.id).set({
        content: clipboard.content || '',
        order: clipboard.order || 0
      }, { merge: true });
      return true;
    } catch (error) {
      console.error('Error saving clipboard:', error);
      return false;
    }
  },

  async deleteClipboard(clipboardId) {
    try {
      await db.collection(this.userPath() + '/clipboards').doc(clipboardId).delete();
      return true;
    } catch (error) {
      console.error('Error deleting clipboard:', error);
      return false;
    }
  }
};
