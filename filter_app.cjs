const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Filter out archived projects
content = content.replace(
  "snap.forEach(d => projs.push({ id: d.id, ...d.data() }));",
  "snap.forEach(d => { if(!d.data().isArchived) projs.push({ id: d.id, ...d.data() }) });"
);

// Filter out archived blogs
content = content.replace(
  "snap.forEach(d => posts.push({ id: d.id, ...d.data() }));",
  "snap.forEach(d => { if(!d.data().isArchived) posts.push({ id: d.id, ...d.data() }) });"
);

// Filter out archived experiences
content = content.replace(
  "snap.forEach(d => exps.push({ id: d.id, ...d.data() }));",
  "snap.forEach(d => { if(!d.data().isArchived) exps.push({ id: d.id, ...d.data() }) });"
);

fs.writeFileSync('src/App.tsx', content);
