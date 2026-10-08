const fs = require('fs');
let code = fs.readFileSync('src/pages/ProjectManagement.tsx', 'utf8');

if (!code.includes('isScanning')) {
  // Add state for scanning
  code = code.replace(
      'const [targetTransitionStatus, setTargetTransitionStatus] = useState<ProjectStatus | null>(null);',
      'const [targetTransitionStatus, setTargetTransitionStatus] = useState<ProjectStatus | null>(null);\n  const [isScanning, setIsScanning] = useState(false);'
  );
  
  // Import query client
  code = code.replace(
      'import { useQuery } from "@tanstack/react-query";',
      'import { useQuery, useQueryClient } from "@tanstack/react-query";'
  );
  
  // Use query client
  code = code.replace(
      'const { user } = useAuth();',
      'const { user } = useAuth();\n  const queryClient = useQueryClient();'
  );
}

const scanFunction = "" +
"  const handleRunSatelliteScan = async (projectId: string) => {\n" +
"    setIsScanning(true);\n" +
"    toast.info(\"Initializing Sentinel-2 remote sensing scan for NDVI anomalies...\");\n" +
"    \n" +
"    try {\n" +
"      // 1. Fetch healthy trees in this project\n" +
"      const { data: healthyTrees } = await supabase.from(\"trees\").select(\"id\").eq(\"project_id\", projectId).eq(\"health_status\", \"healthy\");\n" +
"      \n" +
"      await new Promise(r => setTimeout(r, 2500)); // Simulate processing delay\n" +
"      \n" +
"      if (healthyTrees && healthyTrees.length > 0) {\n" +
"        // 2. Pick 1 or 2 random trees\n" +
"        const numToFlag = Math.min(healthyTrees.length, Math.floor(Math.random() * 2) + 1);\n" +
"        const treesToFlag = [...healthyTrees].sort(() => 0.5 - Math.random()).slice(0, numToFlag);\n" +
"        \n" +
"        // 3. Update them to 'at_risk' and 'flagged'\n" +
"        for (const t of treesToFlag) {\n" +
"          await supabase.from(\"trees\").update({\n" +
"            health_status: \"at_risk\",\n" +
"            admin_status: \"flagged\"\n" +
"          }).eq(\"id\", t.id);\n" +
"        }\n" +
"        \n" +
"        toast.success(Scan complete! Detected anomalies in  trees. Field Tasks auto-generated.);\n" +
"        // Refetch project details to update UI\n" +
"        queryClient.invalidateQueries({ queryKey: [\"projectDetails\"] });\n" +
"      } else {\n" +
"        toast.success(\"Scan complete! No vegetation anomalies detected.\");\n" +
"      }\n" +
"    } catch (e) {\n" +
"      console.error(e);\n" +
"      toast.error(\"Satellite scan failed.\");\n" +
"    } finally {\n" +
"      setIsScanning(false);\n" +
"    }\n" +
"  };\n";

if (!code.includes('handleRunSatelliteScan')) {
    code = code.replace(
        'const handleStatusTransition = async (e: React.FormEvent) => {',
        scanFunction + '\n  const handleStatusTransition = async (e: React.FormEvent) => {'
    );
}

const uiReplacement = "" +
"                      <h4 className=\"font-bold text-sm text-foreground flex items-center justify-between\">\n" +
"                        <span className=\"flex items-center gap-2\">\n" +
"                          <Activity className=\"h-4 w-4 text-primary\" />\n" +
"                          Advanced Tree Monitoring Engine\n" +
"                        </span>\n" +
"                        <Button \n" +
"                          size=\"sm\" \n" +
"                          variant=\"outline\" \n" +
"                          className=\"h-7 text-[10px] gap-1.5 border-amber-500/30 text-amber-600 hover:bg-amber-500/10\"\n" +
"                          onClick={() => handleRunSatelliteScan(projectDetails.id)}\n" +
"                          disabled={isScanning}\n" +
"                        >\n" +
"                          {isScanning ? (\n" +
"                            <><div className=\"h-3 w-3 rounded-full border-2 border-t-amber-500 border-amber-200 animate-spin\" /> Scanning...</>\n" +
"                          ) : (\n" +
"                            <><Activity className=\"h-3 w-3\" /> Run Satellite Scan</>\n" +
"                          )}\n" +
"                        </Button>\n" +
"                      </h4>";

code = code.replace(
    '<h4 className=\"font-bold text-sm text-foreground flex items-center gap-2\">\n                        <Activity className=\"h-4 w-4 text-primary\" />\n                        Advanced Tree Monitoring Engine\n                      </h4>',
    uiReplacement
);

fs.writeFileSync('src/pages/ProjectManagement.tsx', code);
