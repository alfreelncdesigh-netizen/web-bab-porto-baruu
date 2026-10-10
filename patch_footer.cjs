const fs = require('fs');
let content = fs.readFileSync('src/components/Footer.tsx', 'utf8');

// Replace scrollToSection calls for portfolio and store with changeView
const ptRegex = /<button onClick=\{\(e\) => scrollToSection\(e, 'portfolio'\)\} /g;
const newPt = `<button onClick={() => window.dispatchEvent(new CustomEvent('changeView', { detail: { view: 'portfolio' } }))} `;
content = content.replace(ptRegex, newPt);

const stRegex = /<button onClick=\{\(e\) => scrollToSection\(e, 'store'\)\} /g;
const newSt = `<button onClick={() => window.dispatchEvent(new CustomEvent('changeView', { detail: { view: 'store' } }))} `;
content = content.replace(stRegex, newSt);

fs.writeFileSync('src/components/Footer.tsx', content);
