import fs from 'fs';
import path from 'path';

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
let fixedFiles = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Regex to remove duplicate className attributes from JSX elements
  content = content.replace(/<([a-zA-Z0-9_.]+)\b([\s\S]*?)(\/?>)/g, (match, tag, attrs, closing) => {
    const classMatches = [...attrs.matchAll(/className=(?:(["'\`])([\s\S]*?)\1|\{([\s\S]*?)\})/g)];
    if (classMatches.length > 1) {
      let count = 0;
      let cleanAttrs = attrs.replace(/className=(?:(["'\`])([\s\S]*?)\1|\{([\s\S]*?)\})/g, (m) => {
        count++;
        // Keep only the last className attribute (which contains the full conditional classes)
        return count === classMatches.length ? m : '';
      }).trim();
      // Ensure single space padding
      cleanAttrs = cleanAttrs.replace(/\s+/g, ' ');
      if (cleanAttrs) cleanAttrs = ' ' + cleanAttrs;

      return `<${tag}${cleanAttrs} ${closing.startsWith('/') ? '/' : ''}>`;
    }
    return match;
  });

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    fixedFiles++;
    console.log(`[DEDUPED] ${file}`);
  }
});

console.log(`Deduped className attributes in ${fixedFiles} files.`);
