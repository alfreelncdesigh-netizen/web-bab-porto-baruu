const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const fs = require('fs');
const cfg = require('./firebase-applet-config.json');

const app = initializeApp(cfg);
const db = getFirestore(app, cfg.firestoreDatabaseId);

async function run() {
  const result = { projects: [], blogs: [], templates: [] };
  const pSnap = await getDocs(collection(db, 'projects'));
  pSnap.forEach(d => {
    const data = d.data();
    result.projects.push({
      id: d.id,
      title: data.title,
      category: data.category,
      image: (data.image || '').startsWith('data:') ? 'DATA_URL_' + (data.image || '').length : data.image,
      images: Array.isArray(data.images) ? data.images.map(img => img && img.startsWith('data:') ? 'DATA_URL_' + img.length : img) : data.images
    });
  });

  const bSnap = await getDocs(collection(db, 'blogPosts'));
  bSnap.forEach(d => {
    const data = d.data();
    result.blogs.push({
      id: d.id,
      title: data.title,
      coverImage: (data.coverImage || '').startsWith('data:') ? 'DATA_URL_' + (data.coverImage || '').length : data.coverImage,
      image: (data.image || '').startsWith('data:') ? 'DATA_URL_' + (data.image || '').length : data.image
    });
  });

  const tSnap = await getDocs(collection(db, 'templates'));
  tSnap.forEach(d => {
    const data = d.data();
    result.templates.push({
      id: d.id,
      title: data.title,
      image: (data.image || '').startsWith('data:') ? 'DATA_URL_' + (data.image || '').length : data.image
    });
  });

  fs.writeFileSync('./inspect_result.json', JSON.stringify(result, null, 2));
  console.log('DONE WRITING INSPECT RESULT');
  process.exit(0);
}

run().catch(err => {
  console.error('ERROR:', err);
  process.exit(1);
});
