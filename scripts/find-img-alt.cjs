const fs = require('fs');
const path = require('path');

function scanDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
        scanDir(fullPath, fileList);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.jsx') || file.endsWith('.html') || file.endsWith('.ts')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const baseDir = path.resolve(__dirname, '..');
const files = scanDir(baseDir);

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const imgRegex = /<img\b([^>]*)>/gi;
  let match;
  while ((match = imgRegex.exec(content)) !== null) {
    const attrs = match[1];
    const altMatch = attrs.match(/\balt\s*=\s*(["'][^"']*["']|\{[^}]*\})/i);
    const altValue = altMatch ? altMatch[1] : 'NONE';
    console.log(path.relative(baseDir, file).replace(/\\/g, '/'), '->', altValue);
  }
}
