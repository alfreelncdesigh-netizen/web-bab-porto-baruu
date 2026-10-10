const fs = require('fs');
let content = fs.readFileSync('src/lib/firebase.ts', 'utf8');

content = content.replace(
  /let authInstance;\ntry \{\n  authInstance = getAuth\(app\);\n\} catch \(e\) \{\n  try \{\n    authInstance = initializeAuth\(app, \{ \n      persistence: browserLocalPersistence, \n      popupRedirectResolver: browserPopupRedirectResolver \n    \}\);\n  \} catch \(err\) \{\n    authInstance = initializeAuth\(app, \{ \n      persistence: inMemoryPersistence, \n      popupRedirectResolver: browserPopupRedirectResolver \n    \}\);\n  \}\n\}/,
  `let authInstance;
try {
  authInstance = initializeAuth(app, { 
    persistence: browserLocalPersistence, 
    popupRedirectResolver: browserPopupRedirectResolver 
  });
} catch (e) {
  authInstance = getAuth(app);
}`
);

fs.writeFileSync('src/lib/firebase.ts', content);
