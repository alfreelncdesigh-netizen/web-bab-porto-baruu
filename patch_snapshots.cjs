const fs = require('fs');

function patchFile(filepath) {
  let content = fs.readFileSync(filepath, 'utf8');
  content = content.replace(
    /snap\.forEach\(\(docSnap\) => \{\s*projs\.push\(\{ id: docSnap\.id, \.\.\.docSnap\.data\(\) \}\);\s*\}\);/,
    "snap.forEach((docSnap) => { if(!docSnap.data().isArchived) projs.push({ id: docSnap.id, ...docSnap.data() }); });"
  );
  
  content = content.replace(
    /snap\.forEach\(\(docSnap\) => \{\s*posts\.push\(\{ id: docSnap\.id, \.\.\.docSnap\.data\(\) \}\);\s*\}\);/,
    "snap.forEach((docSnap) => { if(!docSnap.data().isArchived) posts.push({ id: docSnap.id, ...docSnap.data() }); });"
  );

  content = content.replace(
    /snap\.forEach\(\(docSnap\) => \{\s*exps\.push\(\{ id: docSnap\.id, \.\.\.docSnap\.data\(\) \}\);\s*\}\);/,
    "snap.forEach((docSnap) => { if(!docSnap.data().isArchived) exps.push({ id: docSnap.id, ...docSnap.data() }); });"
  );
  
  // also check other variations
  content = content.replace(
    /snap\.forEach\(d => projs\.push\(\{ id: d\.id, \.\.\.d\.data\(\) \}\)\);/,
    "snap.forEach(d => { if(!d.data().isArchived) projs.push({ id: d.id, ...d.data() }) });"
  );
  content = content.replace(
    /snap\.forEach\(d => posts\.push\(\{ id: d\.id, \.\.\.d\.data\(\) \}\)\);/,
    "snap.forEach(d => { if(!d.data().isArchived) posts.push({ id: d.id, ...d.data() }) });"
  );
  content = content.replace(
    /snap\.forEach\(d => exps\.push\(\{ id: d\.id, \.\.\.d\.data\(\) \}\)\);/,
    "snap.forEach(d => { if(!d.data().isArchived) exps.push({ id: d.id, ...d.data() }) });"
  );
  
  fs.writeFileSync(filepath, content);
}

patchFile('src/components/PortfolioAdmin.tsx');
patchFile('src/components/BlogAdmin.tsx');
patchFile('src/components/ExperienceAdmin.tsx');
