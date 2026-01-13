const fs = require('fs');
const content = fs.readFileSync('linkedin-content-new.txt', 'utf8');
fs.writeFileSync('content-linkedin.js', content);
console.log('Done');
