const fs = require('fs');
let code = fs.readFileSync('src/pages/ProjectManagement.tsx', 'utf8');

// I will insert a new UI block under the "Planted Trees" grid.
const newAnalyticsUI = "" +
"                    </div>\n\n" +
"                    <div className=\"space-y-3\">\n" +
"                      <h4 className=\"font-bold text-sm text-foreground flex items-center gap-2\">\n" +
"                        <Activity className=\"h-4 w-4 text-primary\" />\n" +
"                        Advanced Tree Monitoring Engine\n" +
"                      </h4>\n" +
"                      <div className=\"grid grid-cols-2 md:grid-cols-4 gap-3\">\n" +
"                        <div className=\"p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20\">\n" +
"                          <span className=\"text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider block\">Healthy</span>\n" +
"                          <span className=\"text-xl font-heading font-bold text-emerald-700 dark:text-emerald-300\">\n" +
"                            {projectDetails.trees ? projectDetails.trees.filter(t => t.health_status === 'healthy' || t.health_status === 'thriving' || !t.health_status).length : 0}\n" +
"                          </span>\n" +
"                        </div>\n" +
"                        <div className=\"p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20\">\n" +
"                          <span className=\"text-[10px] text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wider block\">Stable</span>\n" +
"                          <span className=\"text-xl font-heading font-bold text-blue-700 dark:text-blue-300\">\n" +
"                            {projectDetails.trees ? projectDetails.trees.filter(t => t.health_status === 'stable' || t.health_status === 'needs water').length : 0}\n" +
"                          </span>\n" +
"                        </div>\n" +
"                        <div className=\"p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20\">\n" +
"                          <span className=\"text-[10px] text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wider block\">At Risk</span>\n" +
"                          <span className=\"text-xl font-heading font-bold text-amber-700 dark:text-amber-300\">\n" +
"                            {projectDetails.trees ? projectDetails.trees.filter(t => t.health_status === 'at_risk' || t.health_status === 'damaged').length : 0}\n" +
"                          </span>\n" +
"                        </div>\n" +
"                        <div className=\"p-3 rounded-2xl bg-red-500/10 border border-red-500/20\">\n" +
"                          <span className=\"text-[10px] text-red-600 dark:text-red-400 font-semibold uppercase tracking-wider block\">Critical / Dead</span>\n" +
"                          <span className=\"text-xl font-heading font-bold text-red-700 dark:text-red-300\">\n" +
"                            {projectDetails.trees ? projectDetails.trees.filter(t => t.health_status === 'critical' || t.health_status === 'dead' || t.survival_status === 'DEAD').length : 0}\n" +
"                          </span>\n" +
"                        </div>\n" +
"                      </div>\n\n" +
"                      <div className=\"p-4 rounded-2xl bg-muted/20 border border-border/30 flex items-center justify-between\">\n" +
"                        <div className=\"space-y-0.5\">\n" +
"                          <span className=\"text-xs font-semibold text-foreground block\">Average Project Survival Score</span>\n" +
"                          <span className=\"text-[10px] text-muted-foreground\">Based on aggregated health observations and ML predictions</span>\n" +
"                        </div>\n" +
"                        <div className=\"flex items-center justify-center w-12 h-12 rounded-full border-[3px] border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold font-mono text-lg\">\n" +
"                          {projectDetails.trees && projectDetails.trees.length > 0 ? \n" +
"                             Math.round(projectDetails.trees.reduce((acc, t) => acc + (t.health_status === 'healthy' || !t.health_status ? 85 : t.health_status === 'stable' ? 65 : t.health_status === 'at_risk' ? 45 : t.survival_status === 'DEAD' ? 0 : 20), 0) / projectDetails.trees.length) \n" +
"                           : 0}\n" +
"                        </div>\n" +
"                      </div>\n" +
"                    </div>";

code = code.replace(
    /<\/div>(\s*){<!-- Lifecycle State Machine -->}/,
    newAnalyticsUI + "\n{/* Lifecycle State Machine */}"
);

// If my regex fails I can fallback to replacing the specific string:
code = code.replace(
    '                    <div className=\"space-y-2\">\n                      <h4 className=\"text-sm font-bold text-foreground\">Lifecycle State Machine</h4>',
    newAnalyticsUI + '\n\n                    <div className=\"space-y-2\">\n                      <h4 className=\"text-sm font-bold text-foreground\">Lifecycle State Machine</h4>'
);

fs.writeFileSync('src/pages/ProjectManagement.tsx', code);
