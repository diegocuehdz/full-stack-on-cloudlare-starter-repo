const fs = require('fs');

// Read version from workspace package (all synced due to fixed versioning)
const appPkg = JSON.parse(fs.readFileSync('./apps/user-application/package.json', 'utf8'));
const newVersion = appPkg.version;

// Update root package.json
const rootPkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
rootPkg.version = newVersion;
fs.writeFileSync('./package.json', JSON.stringify(rootPkg, null, 2) + '\n');

console.log(`✅ Synced root version to ${newVersion}`);
