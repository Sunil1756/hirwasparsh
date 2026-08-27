import fs from "fs";
import path from "path";

function walk(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  fs.readdirSync(dir).forEach((file) => {
    if (file === "node_modules" || file === ".git" || file === "dist" || file === "scripts") return;
    const p = path.join(dir, file);
    if (fs.statSync(p).isDirectory()) results = results.concat(walk(p));
    else if (file.endsWith(".tsx") || file.endsWith(".ts")) results.push(p);
  });
  return results;
}

const files = walk("src");
const issues = [];

files.forEach((f) => {
  const content = fs.readFileSync(f, "utf8");
  const lines = content.split("\n");

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;

    // Check for risky patterns
    if (/\buser\.id\b/.test(line) && !/user\?\.id/.test(line) && !/if\s*\(!user\)/.test(line)) {
      // Check if user is checked before
      issues.push({ file: f, line: lineNum, type: "Potential Unsafe user.id Access", text: line.trim() });
    }

    if (/\.toLocaleString\(\)/.test(line) && !/\?\./.test(line) && !/\(.*\s*\|\|\s*0\)/.test(line) && !/\bNumber\(/.test(line) && !/\bcount\b/.test(line)) {
      issues.push({ file: f, line: lineNum, type: "Potential Unsafe .toLocaleString() on undefined", text: line.trim() });
    }
  });
});

console.log(`Found ${issues.length} potential risk lines:`);
console.log(JSON.stringify(issues.slice(0, 30), null, 2));
