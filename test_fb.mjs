import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function run() {
  const result = { settings: null, projects: [] };
  try {
    const s = await getDoc(doc(db, 'settings', 'global'));
    if (s.exists()) {
      result.settings = s.data();
    }
  } catch (e) {
    result.settingsError = e.message;
  }

  try {
    const pSnap = await getDocs(collection(db, 'projects'));
    pSnap.forEach(d => {
      result.projects.push({ id: d.id, ...d.data() });
    });
  } catch (e) {
    result.projectsError = e.message;
  }

  fs.writeFileSync('./firestore_dump.json', JSON.stringify(result, null, 2));
  console.log('DONE');
  process.exit(0);
}

run();
