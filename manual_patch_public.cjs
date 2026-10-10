const fs = require('fs');

function patch(file, regex, replacement) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(regex, replacement);
  fs.writeFileSync(file, content);
}

patch('src/components/Portfolio.tsx', /snapshot\.forEach\(\(doc\) => \{[\s\S]*?projData\.push\(\{ id: doc\.id, \.\.\.doc\.data\(\) \} as Project\);[\s\S]*?\}\);/m, `snapshot.forEach((doc) => {
      const data = doc.data() as any;
      if (!data.isArchived) projData.push({ id: doc.id, ...data });
     });`);

patch('src/components/Blog.tsx', /snapshot\.forEach\(\(docSnap\) => \{[\s\S]*?loadedPosts\.push\(\{ id: docSnap\.id, \.\.\.docSnap\.data\(\) \} as BlogPost\);[\s\S]*?\}\);/m, `snapshot.forEach((docSnap) => {
      const data = docSnap.data() as any;
      if (!data.isArchived) loadedPosts.push({ id: docSnap.id, ...data });
     });`);

patch('src/components/Experience.tsx', /snap\.forEach\(d => data\.push\(\{ id: d\.id, \.\.\.d\.data\(\) \}\)\);/m, `snap.forEach(d => {
            const dataDoc = d.data() as any;
            if (!dataDoc.isArchived) data.push({ id: d.id, ...dataDoc });
          });`);

