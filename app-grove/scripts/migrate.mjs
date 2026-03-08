/**
 * Data Migration Script for AppGrove
 *
 * Exports data from old Firebase projects and imports into the new AppGrove project.
 *
 * Prerequisites:
 *   npm install firebase-admin
 *   Place service account JSON files in this directory (not committed to git)
 *
 * Usage:
 *   node scripts/migrate.mjs export-health
 *   node scripts/migrate.mjs export-packing
 *   node scripts/migrate.mjs import
 *   node scripts/migrate.mjs verify
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, writeFileSync, existsSync } from 'fs';

// Each Firebase project assigns its own UID to the same Google account
const HEALTH_UID = 'PfJ8DO4hJ9flpUWxvavbuvg2RoG3';
const PACKING_UID = 'RHZFw1yQzAUx6PuYdFUzJGflKqv2';
const APPGROVE_UID = 'RHZFw1yQzAUx6PuYdFUzJGflKqv2'; // Will be set after first sign-in

const HEALTH_COLLECTIONS = ['medications', 'diagnoses', 'providers', 'explainers', 'notes'];
const PACKING_COLLECTIONS = ['tripLists', 'templatePackingLists', 'templateSections', 'reminderTemplates'];

function initProject(serviceAccountPath, projectId) {
  const app = initializeApp({
    credential: cert(JSON.parse(readFileSync(serviceAccountPath, 'utf8'))),
    projectId,
  }, projectId);
  return getFirestore(app);
}

async function exportCollections(db, uid, collections, outputFile) {
  const data = {};

  for (const collName of collections) {
    const snap = await db.collection('users').doc(uid).collection(collName).get();
    data[collName] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    console.log(`  ${collName}: ${snap.docs.length} documents`);
  }

  // Also export the user document root (for patientInfo)
  const userDoc = await db.collection('users').doc(uid).get();
  if (userDoc.exists) {
    data._userDoc = userDoc.data();
    console.log('  _userDoc: found');
  }

  writeFileSync(outputFile, JSON.stringify(data, null, 2));
  console.log(`Exported to ${outputFile}`);
}

async function importAll(db, uid) {
  const files = ['scripts/health-export.json', 'scripts/packing-export.json'];

  for (const file of files) {
    if (!existsSync(file)) {
      console.log(`Skipping ${file} (not found)`);
      continue;
    }

    const data = JSON.parse(readFileSync(file, 'utf8'));
    console.log(`\nImporting from ${file}...`);

    for (const [key, items] of Object.entries(data)) {
      if (key === '_userDoc') {
        // Merge user doc (patientInfo etc.)
        await db.collection('users').doc(uid).set(items, { merge: true });
        console.log('  _userDoc: merged');
        continue;
      }

      if (!Array.isArray(items)) continue;

      let count = 0;
      for (const item of items) {
        const { id, ...rest } = item;
        await db.collection('users').doc(uid).collection(key).doc(id).set(rest);
        count++;
      }
      console.log(`  ${key}: ${count} documents imported`);
    }
  }

  console.log('\nImport complete!');
}

async function verify(db, uid) {
  const allCollections = [...HEALTH_COLLECTIONS, ...PACKING_COLLECTIONS];

  console.log('\nAppGrove document counts:');
  for (const collName of allCollections) {
    const snap = await db.collection('users').doc(uid).collection(collName).get();
    console.log(`  ${collName}: ${snap.docs.length}`);
  }

  const userDoc = await db.collection('users').doc(uid).get();
  console.log(`  patientInfo: ${userDoc.exists && userDoc.data()?.patientInfo ? 'present' : 'missing'}`);
}

// CLI
const command = process.argv[2];

if (command === 'export-health') {
  console.log('Exporting from health-apps-c1584...');
  const db = initProject('scripts/health-apps-c1584.json', 'health-apps-c1584');
  await exportCollections(db, HEALTH_UID, HEALTH_COLLECTIONS, 'scripts/health-export.json');
} else if (command === 'export-packing') {
  console.log('Exporting from packing-list-6c12d...');
  const db = initProject('scripts/packing-list-6c12d.json', 'packing-list-6c12d');
  await exportCollections(db, PACKING_UID, PACKING_COLLECTIONS, 'scripts/packing-export.json');
} else if (command === 'import') {
  console.log('Importing into app-grove...');
  const db = initProject('scripts/app-grove.json', 'app-grove');
  await importAll(db, APPGROVE_UID);
} else if (command === 'verify') {
  console.log('Verifying app-grove...');
  const db = initProject('scripts/app-grove.json', 'app-grove');
  await verify(db, APPGROVE_UID);
} else {
  console.log('Usage: node scripts/migrate.mjs [export-health|export-packing|import|verify]');
  console.log('\nBefore running:');
  console.log('  1. Download service account keys from Firebase Console');
  console.log('     Project Settings → Service Accounts → Generate New Private Key');
  console.log('  2. Save them as:');
  console.log('     scripts/health-service-account.json');
  console.log('     scripts/packing-service-account.json');
  console.log('     scripts/appgrove-service-account.json');
  console.log('  3. Run exports first, then import, then verify');
}
