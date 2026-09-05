import fs from "fs";
import path from "path";

const srcDir = path.resolve("src");

function getAllFiles(dir, exts = [".ts", ".tsx", ".js", ".jsx"]) {
  let files = [];
  for (const item of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (item !== "node_modules" && item !== ".git" && item !== "dist") {
        files = files.concat(getAllFiles(fullPath, exts));
      }
    } else if (exts.includes(path.extname(fullPath))) {
      files.push(fullPath);
    }
  }
  return files;
}

const allSrcFiles = getAllFiles(srcDir);

console.log("====================================================================");
console.log(`DEEP CODEBASE INSPECTION: Scanning ${allSrcFiles.length} source files...`);
console.log("====================================================================\n");

const issues = {
  mockDataFound: [],
  comingSoonFound: [],
  fakeTimeouts: [],
  todoComments: [],
};

allSrcFiles.forEach((file) => {
  const content = fs.readFileSync(file, "utf-8");
  const relPath = path.relative(process.cwd(), file);

  // 1. Search for MOCK or DUMMY data
  const mockMatches = content.match(/const\s+(MOCK_|DUMMY_|SAMPLE_|FAKE_)[A-Z0-9_]*\s*=/g);
  if (mockMatches) {
    issues.mockDataFound.push({ file: relPath, matches: mockMatches });
  }

  // 2. Search for "Coming soon" toasts or placeholders
  const comingSoon = content.match(/["'](Coming soon|Under construction|Feature in development|Work in progress)["']/gi);
  if (comingSoon) {
    issues.comingSoonFound.push({ file: relPath, count: comingSoon.length });
  }

  // 3. Search for simulated fake delays
  const fakeDelays = content.match(/setTimeout\(\s*\(\)\s*=>\s*\{[^}]*toast/g);
  if (fakeDelays) {
    issues.fakeTimeouts.push({ file: relPath, count: fakeDelays.length });
  }

  // 4. Search for TODOs / FIXMEs
  const todos = content.match(/\/\/\s*(TODO|FIXME|HACK):?.*/gi);
  if (todos) {
    issues.todoComments.push({ file: relPath, todos });
  }
});

console.log("1. MOCK DATA ARRAYS FOUND:");
if (issues.mockDataFound.length === 0) {
  console.log("  ✅ None! No global mock data variables found.");
} else {
  issues.mockDataFound.forEach((m) => {
    console.log(`  ⚠️ ${m.file} -> ${m.matches.join(", ")}`);
  });
}

console.log("\n2. 'COMING SOON' PLACEHOLDERS:");
if (issues.comingSoonFound.length === 0) {
  console.log("  ✅ None! No 'coming soon' placeholding toasts found.");
} else {
  issues.comingSoonFound.forEach((c) => {
    console.log(`  ⚠️ ${c.file} -> ${c.count} instances`);
  });
}

console.log("\n3. TODO / FIXME COMMENTS:");
if (issues.todoComments.length === 0) {
  console.log("  ✅ None!");
} else {
  issues.todoComments.forEach((t) => {
    console.log(`  ℹ️ ${t.file}:`);
    t.todos.forEach((td) => console.log(`     - ${td}`));
  });
}

console.log("\n====================================================================");
