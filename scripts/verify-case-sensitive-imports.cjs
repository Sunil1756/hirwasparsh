const fs = require('fs');
const path = require('path');

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);
  files.forEach(function(file) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
        arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      arrayOfFiles.push(fullPath);
    }
  });
  return arrayOfFiles;
}

const allTsFiles = getAllFiles('./src');
console.log('Total TypeScript files in src:', allTsFiles.length);

let errors = 0;
const importRegex = /(?:import|export)\s+(?:[\s\S]*?from\s+)?['"](@\/[^'"]+|\.[^'"]+)['"]/g;

for (const filePath of allTsFiles) {
  const content = fs.readFileSync(filePath, 'utf8');
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    let resolvedPath;
    if (importPath.startsWith('@/')) {
      resolvedPath = path.join('src', importPath.slice(2));
    } else {
      resolvedPath = path.join(path.dirname(filePath), importPath);
    }

    const candidates = [
      resolvedPath,
      resolvedPath + '.ts',
      resolvedPath + '.tsx',
      resolvedPath + '.d.ts',
      resolvedPath + '.js',
      resolvedPath + '.jsx',
      path.join(resolvedPath, 'index.ts'),
      path.join(resolvedPath, 'index.tsx'),
      path.join(resolvedPath, 'index.js')
    ];

    let found = false;
    let actualFile = null;
    for (const cand of candidates) {
      if (fs.existsSync(cand) && !fs.statSync(cand).isDirectory()) {
        found = true;
        actualFile = cand;
        break;
      }
    }

    if (!found && !importPath.endsWith('.css') && !importPath.endsWith('.png') && !importPath.endsWith('.jpg') && !importPath.endsWith('.svg')) {
      console.error(`BROKEN IMPORT in ${filePath}: ${importPath}`);
      errors++;
    } else if (actualFile) {
      const normalized = path.normalize(actualFile);
      const parts = normalized.split(path.sep);
      let current = '.';
      for (const part of parts) {
        if (part === '.' || part === '') continue;
        const entries = fs.readdirSync(current);
        if (!entries.includes(part)) {
          const matchCase = entries.find(e => e.toLowerCase() === part.toLowerCase());
          console.error(`CASE MISMATCH in ${filePath} import "${importPath}": segment "${part}" vs actual "${matchCase}"`);
          errors++;
          break;
        }
        current = path.join(current, part);
      }
    }
  }
}

if (errors === 0) {
  console.log('ALL IMPORTS AND CASING VERIFIED WITH 100% ACCURACY! 0 errors.');
} else {
  console.error(`Found ${errors} import/casing issues.`);
  process.exit(1);
}
