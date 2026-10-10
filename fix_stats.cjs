const fs = require('fs');
let content = fs.readFileSync('src/components/Stats.tsx', 'utf8');

content = content.replace(
`          ))}
         </div>
          ))}
         </div>`,
`          ))}
         </div>`
);

fs.writeFileSync('src/components/Stats.tsx', content);
