const fs = require('fs');
let code = fs.readFileSync('src/pages/PlantTree.tsx', 'utf8');

code = code.replace(/import { treeRegistrationService } from "@\/services\/treeRegistrationService";\n?/g, '');

const localFunc = `
async function fetchNextTreeCode() {
  const currentYear = new Date().getFullYear();
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc("generate_ge_tree_code");
    if (!rpcError && rpcData) return rpcData;
  } catch {}
  try {
    const { count, error } = await supabase.from("trees").select("id", { count: "exact", head: true });
    const nextNumber = (count !== null && !error) ? count + 1 : Math.floor(Date.now() % 900000) + 100000;
    const safeSeq = Math.max(1, Math.floor(nextNumber));
    const paddedSeq = String(safeSeq).padStart(6, "0");
    return \`GE-\${currentYear}-\${paddedSeq}\`;
  } catch {
    const fallbackSeq = Math.floor(Date.now() % 900000) + 100001;
    return \`GE-\${currentYear}-\${String(fallbackSeq).padStart(6, "0")}\`;
  }
}
`;

code = code.replace(/export default function PlantTree/, localFunc + "\nexport default function PlantTree");
code = code.replace(/const nextTreeCode = await treeRegistrationService\.fetchNextTreeCode\(\);/g, 'const nextTreeCode = await fetchNextTreeCode();');

fs.writeFileSync('src/pages/PlantTree.tsx', code);
