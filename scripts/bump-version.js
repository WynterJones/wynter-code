#!/usr/bin/env node

/**
 * Version Bump Script
 *
 * Syncs version across:
 * - package.json
 * - src-tauri/Cargo.toml
 * - src-tauri/tauri.conf.json
 *
 * Usage:
 *   node scripts/bump-version.js <version>
 *   node scripts/bump-version.js patch   # 1.0.0 -> 1.0.1
 *   node scripts/bump-version.js minor   # 1.0.0 -> 1.1.0
 *   node scripts/bump-version.js major   # 1.0.0 -> 2.0.0
 *   node scripts/bump-version.js 1.2.3   # Set specific version
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");

function readJSON(filePath) {
  return JSON.parse(readFileSync(filePath, "utf-8"));
}

function writeJSON(filePath, data) {
  writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
}

function bumpVersion(current, type) {
  const [major, minor, patch] = current.split(".").map(Number);

  switch (type) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
      return `${major}.${minor}.${patch + 1}`;
    default:
      // Assume it's a specific version string
      if (/^\d+\.\d+\.\d+$/.test(type)) {
        return type;
      }
      throw new Error(`Invalid version or bump type: ${type}`);
  }
}

function updateCargoToml(filePath, newVersion) {
  let content = readFileSync(filePath, "utf-8");

  // Update version in [package] section
  content = content.replace(
    /^(version\s*=\s*")[\d.]+(")/m,
    `$1${newVersion}$2`
  );

  writeFileSync(filePath, content);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("Usage: node bump-version.js <version|patch|minor|major>");
    process.exit(1);
  }

  const bumpType = args[0];

  // Read current version from package.json
  const packageJsonPath = join(rootDir, "package.json");
  const packageJson = readJSON(packageJsonPath);
  const currentVersion = packageJson.version;

  // Calculate new version
  const newVersion = bumpVersion(currentVersion, bumpType);

  console.log(`Bumping version: ${currentVersion} -> ${newVersion}`);

  // Update package.json
  packageJson.version = newVersion;
  writeJSON(packageJsonPath, packageJson);
  console.log(`  Updated: package.json`);

  // Update tauri.conf.json
  const tauriConfPath = join(rootDir, "src-tauri", "tauri.conf.json");
  const tauriConf = readJSON(tauriConfPath);
  tauriConf.version = newVersion;
  writeJSON(tauriConfPath, tauriConf);
  console.log(`  Updated: src-tauri/tauri.conf.json`);

  // Update Cargo.toml
  const cargoTomlPath = join(rootDir, "src-tauri", "Cargo.toml");
  updateCargoToml(cargoTomlPath, newVersion);
  console.log(`  Updated: src-tauri/Cargo.toml`);

  console.log(`\nVersion bumped to ${newVersion}`);
  console.log(`\nTo release:`);
  console.log(`  git add -A`);
  console.log(`  git commit -m "chore: bump version to ${newVersion}"`);
  console.log(`  git tag v${newVersion}`);
  console.log(`  git push && git push --tags`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
