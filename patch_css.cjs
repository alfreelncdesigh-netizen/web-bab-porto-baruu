const fs = require('fs');
let content = fs.readFileSync('src/index.css', 'utf8');

// Replace the global scrollbar hiding code
content = content.replace(/\/\* Hilangkan slide bar \(scrollbar\) global \*\/[\s\S]*?scrollbar-width: none;  \/\* Firefox \*\/\n  }/, 
`  /* Global paragraph line-height for better readability */
  p {
    line-height: 1.8;
  }

  /* Hilangkan scrollbar di mobile saja */
  @media (max-width: 768px) {
    ::-webkit-scrollbar {
      display: none;
    }
    * {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
  }

  /* Scrollbar tipis dan minimalis untuk Desktop & Tablet */
  @media (min-width: 769px) {
    ::-webkit-scrollbar {
      width: 4px;
      height: 4px;
    }
    ::-webkit-scrollbar-track {
      background: transparent;
    }
    ::-webkit-scrollbar-thumb {
      background-color: rgba(161, 161, 170, 0.5);
      border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background-color: rgba(161, 161, 170, 0.8);
    }
    .dark ::-webkit-scrollbar-thumb {
      background-color: rgba(82, 82, 91, 0.5);
    }
    .dark ::-webkit-scrollbar-thumb:hover {
      background-color: rgba(82, 82, 91, 0.8);
    }
    html {
      scrollbar-width: thin;
      scrollbar-color: rgba(161, 161, 170, 0.5) transparent;
    }
  }`);

fs.writeFileSync('src/index.css', content);
