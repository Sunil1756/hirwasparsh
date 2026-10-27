import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

describe("Platform Zero-Crash Resilience & Reference Error Safeguard", () => {
  it("strictly ensures MonitoringDashboard.tsx has zero undefined console components", () => {
    const monitoringDashboardPath = path.resolve(__dirname, "../pages/MonitoringDashboard.tsx");
    const content = fs.readFileSync(monitoringDashboardPath, "utf8");

    // The 5 undefined components that previously caused the ReferenceError in Protected Mode
    const forbiddenConsoles = [
      "MonitoringScheduleConsole",
      "MonitoringTaskConsole",
      "NotificationCenterConsole",
      "AlertManagementConsole",
      "EscalationWorkflowConsole",
    ];

    forbiddenConsoles.forEach((forbidden) => {
      expect(content).not.toContain(forbidden);
    });

    // Verify valid functional tabs are present
    expect(content).toContain('value="requiring_monitoring"');
    expect(content).toContain('value="overdue"');
    expect(content).toContain('value="recent"');
    expect(content).toContain('value="analytics"');
    expect(content).toContain('value="needs_review"');
  });

  it("verifies that all critical pages and modules have zero TS2304 'Cannot find name' errors", () => {
    try {
      execSync("npx tsc -p tsconfig.app.json --noEmit", { stdio: "pipe" });
      // If tsc passes completely, 0 errors
      expect(true).toBe(true);
    } catch (e: any) {
      const output = (e.stdout || "").toString() + (e.stderr || "").toString();
      const cannotFindErrors = output
        .split("\n")
        .map((l: string) => l.trim())
        .filter((l: string) => l.includes("Cannot find name") || l.includes("error TS2304"));

      // Must be strictly zero undefined identifier errors
      expect(cannotFindErrors).toHaveLength(0);
    }
  }, 180000);

  it("verifies that CreateObservationModal properly destructures tree coordinate props", () => {
    const modalPath = path.resolve(__dirname, "../components/CreateObservationModal.tsx");
    const content = fs.readFileSync(modalPath, "utf8");

    expect(content).toContain("treeLatitude");
    expect(content).toContain("treeLongitude");
  });

  it("verifies that TreeMap properly hooks projects and project_boundaries queries", () => {
    const treeMapPath = path.resolve(__dirname, "../pages/TreeMap.tsx");
    const content = fs.readFileSync(treeMapPath, "utf8");

    expect(content).toContain('queryKey: ["project_boundaries"]');
    expect(content).toContain('queryKey: ["projects"]');
  });
});
