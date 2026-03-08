import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const project = process.argv[2];
const file = `scripts/${project}.json`;

const app = initializeApp({
  credential: cert(JSON.parse(readFileSync(file, 'utf8'))),
  projectId: project,
}, project);

const db = getFirestore(app);
const users = await db.collection('users').listDocuments();
console.log(`Users in ${project}:`);
for (const doc of users) {
  console.log(`  ${doc.id}`);
}
