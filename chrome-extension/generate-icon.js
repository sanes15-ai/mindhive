const fs = require('fs');

// Create a simple SVG icon
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128">
  <rect width="128" height="128" fill="#9333ea" rx="24"/>
  <text x="64" y="88" font-size="80" text-anchor="middle" fill="white">🧠</text>
</svg>`;

fs.writeFileSync('assets/icon.svg', svg);
console.log('✓ Created assets/icon.svg');
