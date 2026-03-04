/**
 * Settings UI Module
 */
const SettingsUI = (function() {
    function init() {
        // Sync button
        document.getElementById('settings-sync-btn').addEventListener('click', handleSync);

        // Export backup
        document.getElementById('export-data-btn').addEventListener('click', handleExport);

        // Import backup
        document.getElementById('import-data-input').addEventListener('change', handleImport);

        // Sign out
        document.getElementById('logout-btn').addEventListener('click', handleLogout);
    }

    function render() {
        // User email
        const user = FirebaseApp.getUser();
        document.getElementById('user-email').textContent = user?.email || 'Not signed in';

        // Last sync time
        const lastSync = Calendar.getLastSyncTime();
        const syncStatus = document.getElementById('sync-status');
        if (lastSync) {
            syncStatus.textContent = `Last synced: ${lastSync.toLocaleString()}`;
        } else {
            syncStatus.textContent = 'Not yet synced';
        }
    }

    async function handleSync() {
        const btn = document.getElementById('settings-sync-btn');
        btn.disabled = true;
        btn.textContent = 'Syncing...';

        try {
            await Calendar.syncWithStorage();
            render();
            App.showToast('Calendar synced successfully', 'success');
        } catch (error) {
            console.error('Sync failed:', error);
            App.showToast('Sync failed: ' + error.message, 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Sync Now';
        }
    }

    async function handleExport() {
        try {
            const data = await Storage.exportData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `conference-planner-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();

            URL.revokeObjectURL(url);
            App.showToast('Backup exported', 'success');
        } catch (error) {
            console.error('Export failed:', error);
            App.showToast('Export failed', 'error');
        }
    }

    async function handleImport(e) {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            const confirmed = await App.confirm(
                'Import Backup',
                `This will add ${data.events?.length || 0} events and ${data.notes?.length || 0} notes. Continue?`
            );

            if (confirmed) {
                await Storage.importData(data);
                App.showToast('Backup imported', 'success');
            }
        } catch (error) {
            console.error('Import failed:', error);
            App.showToast('Import failed: Invalid file', 'error');
        }

        // Reset input
        e.target.value = '';
    }

    function handleLogout() {
        FirebaseApp.signOut();
    }

    return {
        init,
        render
    };
})();
