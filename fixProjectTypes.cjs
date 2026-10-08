const fs = require('fs');
let code = fs.readFileSync('src/services/projectService.ts', 'utf8');

code = code.replace(
    'audit_history: AuditLog[];',
    'audit_history: AuditLog[];\n  trees: any[];'
);

code = code.replace(
    '        return {\n          ...projectData,\n          boundaries,\n          trees_count: trees.length,\n          alive_trees_count: trees.filter((t: any) => t.status !== "dead" && t.status !== "missing").length,',
    '        return {\n          ...projectData,\n          boundaries,\n          trees_count: trees.length,\n          alive_trees_count: trees.filter((t: any) => t.status !== "dead" && t.status !== "missing").length,\n          trees,'
);

fs.writeFileSync('src/services/projectService.ts', code);
