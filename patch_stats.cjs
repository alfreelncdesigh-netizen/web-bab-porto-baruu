const fs = require('fs');
let content = fs.readFileSync('src/components/Stats.tsx', 'utf8');

// Filter active ones (isArchived !== true) inside snapshot listener or before setting the state
content = content.replace(
  /setProjects\(snapshot\.docs\.map\(d => \(\{id: d\.id, \.\.\.d\.data\(\)\}\)\)\);/g,
  `const activeProjects = snapshot.docs.map(d => ({id: d.id, ...d.data()})).filter((p: any) => p.isArchived !== true);\n        setProjects(activeProjects);`
);

content = content.replace(
  /const loaded = snapshot\.docs\.map\(d => \(\{id: d\.id, \.\.\.d\.data\(\)\}\)\);/g,
  `const loaded = snapshot.docs.map(d => ({id: d.id, ...d.data()})).filter((o: any) => o.isArchived !== true);`
);

content = content.replace(
  /setBlogs\(snapshot\.docs\.map\(d => \(\{id: d\.id, \.\.\.d\.data\(\)\}\)\)\);/g,
  `const activeBlogs = snapshot.docs.map(d => ({id: d.id, ...d.data()})).filter((b: any) => b.isArchived !== true);\n        setBlogs(activeBlogs);`
);

content = content.replace(
  /setMessages\(snapshot\.docs\.map\(d => \(\{id: d\.id, \.\.\.d\.data\(\)\}\)\)\);/g,
  `const activeMsgs = snapshot.docs.map(d => ({id: d.id, ...d.data()})).filter((m: any) => m.isArchived !== true);\n        setMessages(activeMsgs);`
);

// We need to also filter 0 values or just let the length handle it. The length will be 0 if there are no items.
// Let's make sure the display shows 0 properly. The lengths will automatically be 0.
fs.writeFileSync('src/components/Stats.tsx', content);
