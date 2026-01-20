const fs = require('fs');

const packages = [
  { name: 'user-application', path: './apps/user-application/CHANGELOG.md', icon: '📦' },
  { name: 'data-service', path: './apps/data-service/CHANGELOG.md', icon: '🔧' },
  { name: '@repo/data-ops', path: './packages/data-ops/CHANGELOG.md', icon: '📚' }
];

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  updateRootChangelog: args.includes('--update-root-changelog'),
  version: args.find(arg => arg.startsWith('--version='))?.split('=')[1],
  commitSha: args.find(arg => arg.startsWith('--commit='))?.split('=')[1],
  frontendUrl: args.find(arg => arg.startsWith('--frontend-url='))?.split('=')[1],
  backendUrl: args.find(arg => arg.startsWith('--backend-url='))?.split('=')[1],
};

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

// Aggregate changelogs from all packages
let releaseNotes = '';

for (const pkg of packages) {
  const changes = extractLatestChangelog(pkg.path);
  if (changes) {
    releaseNotes += `\n## ${pkg.icon} ${pkg.name}\n\n${changes}\n\n---\n`;
  }
}

// Always write release notes for GitHub release
fs.writeFileSync('.github/release-notes.md', releaseNotes);
console.log('✅ Release notes aggregated from all CHANGELOGs');

// Optionally update root CHANGELOG.md
if (options.updateRootChangelog) {
  if (!options.version) {
    console.error('❌ Error: --version is required when using --update-root-changelog');
    process.exit(1);
  }
  
  updateRootChangelog(releaseNotes, options);
}

function updateRootChangelog(changelogContent, options) {
  const changelogPath = './CHANGELOG.md';
  const version = options.version;
  
  // Build the new version entry
  let newEntry = `## ${version}\n\n`;
  
  // Add deployment info if provided
  if (options.commitSha || options.frontendUrl || options.backendUrl) {
    newEntry += `### 🚀 Production Deployment\n\n`;
    
    if (options.commitSha) {
      newEntry += `**Commit:** ${options.commitSha}\n\n`;
    }
    
    if (options.frontendUrl || options.backendUrl) {
      newEntry += `#### Deployment URLs\n`;
      if (options.frontendUrl) {
        newEntry += `- **Frontend:** ${options.frontendUrl}\n`;
      }
      if (options.backendUrl) {
        newEntry += `- **Backend:** ${options.backendUrl}\n`;
      }
      newEntry += `\n---\n\n`;
    }
  }
  
  // Add the aggregated changelog content
  newEntry += changelogContent;
  newEntry += `\n`;
  
  // Read existing CHANGELOG or create new
  let changelog = '';
  
  if (fs.existsSync(changelogPath)) {
    const existing = fs.readFileSync(changelogPath, 'utf8');
    
    // Check if file has the standard header
    if (existing.startsWith('# Changelog')) {
      // Find where to insert (after header, before first version)
      const versionMatch = existing.match(/\n## v?[0-9]/);
      
      if (versionMatch) {
        // Insert before first version
        const insertIndex = versionMatch.index + 1; // +1 to keep the newline
        changelog = existing.slice(0, insertIndex) + newEntry + existing.slice(insertIndex);
      } else {
        // No versions yet, append after header
        changelog = existing.trim() + '\n\n' + newEntry;
      }
    } else {
      // No standard header, prepend everything
      const header = `# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n`;
      changelog = header + newEntry + existing;
    }
  } else {
    // Create new CHANGELOG with header
    changelog = `# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n${newEntry}`;
  }
  
  // Write back
  fs.writeFileSync(changelogPath, changelog);
  console.log(`✅ Updated root CHANGELOG.md with ${version}`);
}
