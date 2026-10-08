const fs = require('fs');
let code = fs.readFileSync('src/services/projectService.ts', 'utf8');

code = code.replace(
    '.select("id, status")',
    '.select("id, status, health_status, survival_status")'
);

fs.writeFileSync('src/services/projectService.ts', code);
