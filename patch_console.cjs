const fs = require('fs');
const file = 'src/main.tsx';
let content = fs.readFileSync(file, 'utf8');

const interceptor = `
// Menyembunyikan peringatan offline sementara dari Firebase agar tidak dianggap sebagai error fatal
const originalConsoleError = console.error;
console.error = (...args) => {
  const msg = args[0];
  if (typeof msg === 'string' && (msg.includes('Could not reach Cloud Firestore backend') || msg.includes('auth/network-request-failed') || msg.includes('Backend didn\\'t respond') || msg.includes('Connection failed'))) {
    return;
  }
  if (msg instanceof Error && (msg.message.includes('Could not reach Cloud Firestore backend') || msg.message.includes('auth/network-request-failed') || msg.message.includes('Backend didn\\'t respond') || msg.message.includes('Connection failed'))) {
    return;
  }
  originalConsoleError(...args);
};

const originalConsoleWarn = console.warn;
console.warn = (...args) => {
  const msg = args[0];
  if (typeof msg === 'string' && (msg.includes('Could not reach Cloud Firestore backend') || msg.includes('auth/network-request-failed') || msg.includes('Backend didn\\'t respond') || msg.includes('Connection failed'))) {
    return;
  }
  if (msg instanceof Error && (msg.message.includes('Could not reach Cloud Firestore backend') || msg.message.includes('auth/network-request-failed') || msg.message.includes('Backend didn\\'t respond') || msg.message.includes('Connection failed'))) {
    return;
  }
  originalConsoleWarn(...args);
};
`;

content = content.replace(/\/\/ Menyembunyikan peringatan offline[\s\S]*?originalConsoleWarn\(\.\.\.args\);\n\};\n/g, interceptor);
fs.writeFileSync(file, content);
