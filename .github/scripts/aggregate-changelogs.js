const fs = require('fs');

const packages = [
  { name: 'user-application', path: './apps/user-application/CHANGELOG.md', icon: '📦' },
  { name: 'data-service', path: './apps/data-service/CHANGELOG.md', icon: '🔧' },
  { name: '@repo/data-ops', path: './packages/data-ops/CHANGELOG.md', icon: '📚' }
];

function extractLatestChangelog(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  let inVersion = false;
  let result = [];
  
  for (const line of lines) {
    if (line.match(/^## [0-9]/)) {
      if (inVersion) break; // Hit next version, stop
      inVersion = true;
      continue; // Skip the version header
    }
    if (inVersion) {
      result.push(line);
    }
  }
  
  return result.join('\n').trim();
}

let releaseNotes = '';

for (const pkg of packages) {
  const changes = extractLatestChangelog(pkg.path);
  if (changes) {
    releaseNotes += `\n## ${pkg.icon} ${pkg.name}\n\n${changes}\n\n---\n`;
  }
}

// Write to file for gh release
fs.writeFileSync('.github/release-notes.md', releaseNotes);
console.log('✅ Release notes aggregated from all CHANGELOGs');
