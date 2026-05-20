#!/usr/bin/env node
// Usage: node scripts/tag-version.js [patch|minor|major]
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const pkgPath = path.join(__dirname, '../package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

function incVersion(version, type) {
  let [major, minor, patch] = version.split('.').map(Number);
  if (type === 'major') {
    major++;
    minor = 0;
    patch = 0;
  } else if (type === 'minor') {
    minor++;
    patch = 0;
  } else {
    patch++;
  }
  return `${major}.${minor}.${patch}`;
}

const args = process.argv.slice(2);
const typeArg = args.find((arg) => !arg.startsWith('--'));
const isDryRun = args.includes('--dry-run');
const type = typeArg || 'patch';

if (!['patch', 'minor', 'major'].includes(type)) {
  console.error(`Invalid bump type: ${type}. Use patch, minor, or major.`);
  process.exit(1);
}

const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
if (currentBranch !== 'main') {
  console.error(`Release tagging must run from main. Current branch: ${currentBranch}`);
  process.exit(1);
}

const newVersion = incVersion(pkg.version, type);
const newTag = `v${newVersion}`;

const tagExists = execSync(`git tag --list ${newTag}`, { encoding: 'utf8' }).trim().length > 0;
if (tagExists) {
  console.error(`Tag ${newTag} already exists. Aborting to avoid collisions.`);
  process.exit(1);
}

if (isDryRun) {
  console.log(`Dry run: ${pkg.version} -> ${newVersion} (${type})`);
  console.log(`Dry run: would create tag ${newTag}`);
  process.exit(0);
}

pkg.version = newVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

execSync(`git add package.json`);
execSync(`git commit -m "chore(release): v${newVersion}"`);
execSync(`git tag ${newTag}`);
console.log(`Tagged as ${newTag}`);
