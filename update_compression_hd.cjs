const fs = require('fs');

function patch(filepath) {
  let content = fs.readFileSync(filepath, 'utf8');
  
  // Update to ultra HD / near lossless
  content = content.replace(
    /maxSizeMB: 1\.5, maxWidthOrHeight: 1920/g,
    'maxSizeMB: 8, maxWidthOrHeight: 3840'
  );
  content = content.replace(
    /initialQuality: 0\.9/g,
    'initialQuality: 1'
  );

  fs.writeFileSync(filepath, content);
}

patch('src/components/PortfolioAdmin.tsx');
patch('src/components/BlogAdmin.tsx');
patch('src/components/ExperienceAdmin.tsx');
