interface PackageJson {
  name: string;
  version: string;
  [key: string]: any;
}

// Read version from workspace package (all synced due to fixed versioning)
const appPkgFile = Bun.file('./apps/user-application/package.json');
const appPkg = await appPkgFile.json() as PackageJson;
const newVersion = appPkg.version;

// Update root package.json
const rootPkgFile = Bun.file('./package.json');
const rootPkg = await rootPkgFile.json() as PackageJson;
rootPkg.version = newVersion;

await Bun.write('./package.json', JSON.stringify(rootPkg, null, 2) + '\n');

console.log(`✅ Synced root version to ${newVersion}`);

export {};
