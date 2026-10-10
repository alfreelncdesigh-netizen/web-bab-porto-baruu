const fs = require('fs');
let rules = fs.readFileSync('firestore.rules', 'utf8');
const newRule = `
    match /archiveFolders/{folderId} {
      allow read: if isAdmin();
      allow write: if isAdmin();
    }
`;
rules = rules.replace(/match \/experiences\/\{expId\} \{/, newRule + '    match /experiences/{expId} {');
fs.writeFileSync('firestore.rules', rules);
