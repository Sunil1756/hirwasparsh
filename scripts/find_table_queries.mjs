import fs from "fs";
import path from "path";

function walk(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  fs.readdirSync(dir).forEach((file) => {
    if (file === "node_modules" || file === ".git" || file === "dist" || file === "scripts") return;
    const p = path.join(dir, file);
    if (fs.statSync(p).isDirectory()) results = results.concat(walk(p));
    else if (file.endsWith(".ts") || file.endsWith(".tsx") || file.endsWith(".js")) results.push(p);
  });
  return results;
}

const files = walk("src");
const tableUsage = {};

files.forEach((f) => {
  const content = fs.readFileSync(f, "utf8");
  const regex = /\.from\((['"])(.*?)\1\)/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const tbl = match[2];
    if (!tableUsage[tbl]) tableUsage[tbl] = [];
    tableUsage[tbl].push(f);
  }
});

console.log("Supabase Tables Queried Across Frontend:");
console.log(JSON.stringify(tableUsage, null, 2));
