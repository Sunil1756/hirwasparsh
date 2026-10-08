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

// We need to use regex to remove the TabsTriggers for the mock tabs.
const triggerRegex = /<TabsTrigger value="(schedules|work_orders|notifications|alerts|escalations|analytics)"[\s\S]*?<\/TabsTrigger>/g;
code = code.replace(triggerRegex, '');

// We need to use regex to remove the TabsContents for the mock tabs.
const contentRegex = /<TabsContent value="(schedules|work_orders|notifications|alerts|escalations|analytics)"[\s\S]*?<\/TabsContent>/g;
code = code.replace(contentRegex, '');

fs.writeFileSync('src/pages/MonitoringDashboard.tsx', code);
