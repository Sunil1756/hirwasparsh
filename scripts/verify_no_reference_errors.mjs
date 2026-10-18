import { execSync } from "child_process";
import fs from "fs";
import path from "path";

console.log("==================================================================");
console.log("🔒 GREEN ENLIGHTENMENT ZERO-CRASH REFERENCE ERROR AUDITOR");
console.log("==================================================================");

// 1. Scan src/pages/MonitoringDashboard.tsx for the deleted pseudo consoles
const monitoringDashboardPath = path.resolve("src/pages/MonitoringDashboard.tsx");
const content = fs.readFileSync(monitoringDashboardPath, "utf8");

const forbiddenConsoles = [
  "MonitoringScheduleConsole",
  "MonitoringTaskConsole",
  "NotificationCenterConsole",
  "AlertManagementConsole",
  "EscalationWorkflowConsole",
];

const foundForbidden = forbiddenConsoles.filter((c) => content.includes(c));
if (foundForbidden.length > 0) {
  console.error(`❌ CRITICAL FAILURE: Forbidden undefined console(s) found in MonitoringDashboard.tsx: ${foundForbidden.join(", ")}`);
  process.exit(1);
} else {
  console.log("✅ Passed: Zero forbidden undefined consoles in MonitoringDashboard.tsx");
}

// 2. Run TypeScript diagnostic to assert ZERO 'Cannot find name' errors across the app
try {
  console.log("🔍 Scanning tsconfig.app.json for any undefined identifiers (TS2304)...");
  execSync("npx tsc -p tsconfig.app.json --noEmit", { stdio: "pipe" });
  console.log("✅ Passed: Zero TypeScript reference errors found.");
} catch (e) {
  const output = (e.stdout || "").toString() + (e.stderr || "").toString();
  const cannotFind = output
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.includes("Cannot find name") || l.includes("error TS2304"));

  if (cannotFind.length > 0) {
    console.error(`❌ CRITICAL FAILURE: ${cannotFind.length} undefined identifier(s) detected:`);
    cannotFind.forEach((err) => console.error("   " + err));
    process.exit(1);
  } else {
    console.log("✅ Passed: Zero undefined identifier errors found in application source code.");
  }
}

console.log("🎉 ALL PLATFORM REFERENCE INTEGRITY CHECKS PASSED!");
process.exit(0);
