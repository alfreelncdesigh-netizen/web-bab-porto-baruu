const fs = require('fs');

function patchCompression(filepath) {
  let content = fs.readFileSync(filepath, 'utf8');
  
  // Replace aggressive compression settings with HD settings
  content = content.replace(
    /maxSizeMB:\s*0\.03\s*,\s*maxWidthOrHeight:\s*500/g,
    'maxSizeMB: 1.5, maxWidthOrHeight: 1920'
  );
  
  content = content.replace(
    /initialQuality:\s*0\.8/g,
    'initialQuality: 0.9'
  );

  fs.writeFileSync(filepath, content);
}

patchCompression('src/components/PortfolioAdmin.tsx');
patchCompression('src/components/BlogAdmin.tsx');
patchCompression('src/components/ExperienceAdmin.tsx');
