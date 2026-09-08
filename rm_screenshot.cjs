const fs = require('fs');
let content = fs.readFileSync('src/components/CheckoutModal.tsx', 'utf8');

// I will just use a simpler regex
const regex = /<div className="p-3\.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2\.5 shadow-2xs">[\s\S]*?3 Screens"}[\s\S]*?<\/button>\n\s*<\/div>\n\s*<\/div>/g;
content = content.replace(regex, '');

fs.writeFileSync('src/components/CheckoutModal.tsx', content);
