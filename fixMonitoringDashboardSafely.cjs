const fs = require('fs');
let code = fs.readFileSync('src/pages/MonitoringDashboard.tsx', 'utf8');

// Remove imports
const importsToRemove = [
  'import { MonitoringScheduleConsole } from "@/components/monitoring/MonitoringScheduleConsole";',
  'import { MonitoringTaskConsole } from "@/components/monitoring/MonitoringTaskConsole";',
  'import { NotificationCenterConsole } from "@/components/monitoring/NotificationCenterConsole";',
  'import { AlertManagementConsole } from "@/components/monitoring/AlertManagementConsole";',
  'import { EscalationWorkflowConsole } from "@/components/monitoring/EscalationWorkflowConsole";',
  'import { MonitoringAnalyticsConsole } from "@/components/monitoring/MonitoringAnalyticsConsole";'
];

for (const imp of importsToRemove) {
  code = code.replace(imp, '');
}

// Set activeTab default to 'requiring_monitoring' instead of 'schedules' or 'work_orders'
code = code.replace(
  'const [activeTab, setActiveTab] = useState("schedules");', 
  'const [activeTab, setActiveTab] = useState("requiring_monitoring");'
);
code = code.replace(
  'const [activeTab, setActiveTab] = useState<string>("schedules");', 
  'const [activeTab, setActiveTab] = useState<string>("requiring_monitoring");'
);

// Manually replace TabsTriggers
const triggers = [
  'schedules', 'work_orders', 'notifications', 'alerts', 'escalations'
];
for (const trigger of triggers) {
  const regex = new RegExp('<TabsTrigger value="' + trigger + '"[\\\\s\\\\S]*?<\\\\/TabsTrigger>', 'g');
  code = code.replace(regex, '');
}

// Manually replace TabsContents for mock tabs
const contents = [
  'schedules', 'work_orders', 'notifications', 'alerts', 'escalations'
];
for (const content of contents) {
  const regex = new RegExp('<TabsContent value="' + content + '"[\\\\s\\\\S]*?<\\\\/TabsContent>', 'g');
  code = code.replace(regex, '');
}

// Just remove MonitoringAnalyticsConsole from the analytics tab
code = code.replace('<MonitoringAnalyticsConsole />', '');

fs.writeFileSync('src/pages/MonitoringDashboard.tsx', code);
