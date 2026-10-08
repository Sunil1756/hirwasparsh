const fs = require('fs');
const path = require('path');

// 1. Delete lockfiles
const filesToDelete = [
  'bun.lock',
  'bun.lockb',
  'playwright-fixture.ts',
  'playwright.config.ts'
];

for (const file of filesToDelete) {
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
    console.log('Deleted ' + file);
  }
}

// 2. Replace Lovable variables in Supabase functions
const functionDirs = ['detect-species', 'tree-assistant', 'verify-project', 'verify-tree'];
for (const dir of functionDirs) {
  const filePath = path.join('supabase', 'functions', dir, 'index.ts');
  if (fs.existsSync(filePath)) {
    let code = fs.readFileSync(filePath, 'utf8');
    
    // Replace API Key var
    code = code.replace(/LOVABLE_API_KEY/g, 'GEMINI_API_KEY');
    
    // Replace Gateway URL
    code = code.replace(
        /https:\/\/ai\.gateway\.lovable\.dev\/v1\/chat\/completions/g, 
        'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'
    );
    
    fs.writeFileSync(filePath, code);
    console.log('Cleaned ' + filePath);
  }
}
