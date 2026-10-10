const fs = require('fs');

function patch(file, regex, replacement) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(regex, replacement);
  fs.writeFileSync(file, content);
}

patch('src/components/PortfolioAdmin.tsx', /snapshot\.forEach\(\(doc\) => \{[\s\S]*?projs\.push\(\{ id: doc\.id, \.\.\.data \}\);[\s\S]*?\}\);/m, `snapshot.forEach((doc) => {
      const data = doc.data() as any;
      if (!data.isArchived) projs.push({ id: doc.id, ...data });
     });`);

patch('src/components/BlogAdmin.tsx', /snapshot\.forEach\(\(doc\) => \{[\s\S]*?posts\.push\(\{ id: doc\.id, \.\.\.data \}\);[\s\S]*?\}\);/m, `snapshot.forEach((doc) => {
      const data = doc.data() as any;
      if (!data.isArchived) posts.push({ id: doc.id, ...data });
     });`);

