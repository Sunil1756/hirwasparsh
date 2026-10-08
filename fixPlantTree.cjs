const fs = require('fs');
let code = fs.readFileSync('src/pages/PlantTree.tsx', 'utf8');

if (!code.includes('useQuery')) {
    code = code.replace('import { useAuth } from "@/contexts/AuthContext";', 'import { useAuth } from "@/contexts/AuthContext";\nimport { useQuery } from "@tanstack/react-query";');
}

code = code.replace(
    'const projectId = searchParams.get("project") || driveId;',
    'const initialProjectId = searchParams.get("project") || driveId;\n  const [projectId, setProjectId] = useState(initialProjectId);'
);

code = code.replace(
    'const { user } = useAuth();',
    'const { user, profile } = useAuth();'
);

const fetchProjectsCode = "" +
"  const { data: orgProjects } = useQuery({\n" +
"    queryKey: [\"org_projects\", user?.id],\n" +
"    queryFn: async () => {\n" +
"      if (profile?.role !== \"organization\") return [];\n" +
"      const { data, error } = await supabase\n" +
"        .from(\"projects\")\n" +
"        .select(\"id, name, status\")\n" +
"        .eq(\"org_id\", profile.org_id);\n" +
"      if (error) throw error;\n" +
"      return data || [];\n" +
"    },\n" +
"    enabled: !!user && profile?.role === \"organization\",\n" +
"  });\n";

code = code.replace('const [searchParams] = useSearchParams();', fetchProjectsCode + '\n  const [searchParams] = useSearchParams();');

const projectSelectorUI = "" +
"          {/* Project Selection (Organizations Only) */}\n" +
"          {profile?.role === \"organization\" && orgProjects && orgProjects.length > 0 && (\n" +
"            <div className=\"glass-card rounded-2xl p-6 mb-6\">\n" +
"              <h2 className=\"font-heading font-semibold text-lg flex items-center gap-2 mb-4\">\n" +
"                <Building2 className=\"h-5 w-5 text-primary\" />\n" +
"                Assign to Plantation Project\n" +
"              </h2>\n" +
"              <div className=\"space-y-4\">\n" +
"                <div className=\"space-y-2\">\n" +
"                  <Label>Select Project</Label>\n" +
"                  <select\n" +
"                    className=\"flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50\"\n" +
"                    value={projectId || \"\"}\n" +
"                    onChange={(e) => setProjectId(e.target.value || null)}\n" +
"                  >\n" +
"                    <option value=\"\">-- Independent Tree (No Project) --</option>\n" +
"                    {orgProjects.map(p => (\n" +
"                      <option key={p.id} value={p.id}>{p.name}</option>\n" +
"                    ))}\n" +
"                  </select>\n" +
"                </div>\n" +
"              </div>\n" +
"            </div>\n" +
"          )}\n";

code = code.replace(
    '<div className="glass-card rounded-2xl p-6 mb-6">',
    projectSelectorUI + '\n          <div className="glass-card rounded-2xl p-6 mb-6">'
);

code = code.replace(
    'planting_type: "individual", // Explicit individual data partition\n            plot_id: null,\n            org_id: null,',
    'planting_type: projectId ? "project" : "individual",\n            plot_id: null,\n            org_id: profile?.org_id || null,\n            project_id: projectId || null,'
);

fs.writeFileSync('src/pages/PlantTree.tsx', code);
