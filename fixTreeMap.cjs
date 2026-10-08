const fs = require('fs');
let code = fs.readFileSync('src/pages/TreeMap.tsx', 'utf8');

// Remove import
code = code.replace(/import { ModuleASatelliteEngine } from "@\/components\/ModuleASatelliteEngine";\n?/g, '');

// Remove component usage
const regex = /<ModuleASatelliteEngine[\s\S]*?\/>/g;
code = code.replace(regex, '');

fs.writeFileSync('src/pages/TreeMap.tsx', code);
