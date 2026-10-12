const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./src');
let count = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let orig = content;

  // Replace any className="dark:bg-slate-800..." that is followed by another className= in the same JSX element tag
  // We can find any `<tag ... className="dark:bg-..." ... className= ... >`
  content = content.replace(/(<[a-zA-Z0-9_.]+[^>]*?)\s+className="dark:bg-slate-800[^"]*"/g, (match, prefix) => {
    return prefix;
  });

  if (content !== orig) {
    fs.writeFileSync(file, content, 'utf8');
    count++;
    console.log('Cleaned multiline duplicate in: ' + file);
  }
});

console.log('Total files cleaned:', count);
