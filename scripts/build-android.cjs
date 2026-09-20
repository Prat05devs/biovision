// Builds a signed Android release and copies it into artifacts/ with a versioned name.
// Usage: npm run android:apk   |   npm run android:aab
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const kind = process.argv[2] === 'aab' ? 'aab' : 'apk';
const root = path.resolve(__dirname, '..');
const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8')).expo;
const version = app.version;
// The native project is checked in, so build.gradle — not app.json — is the source of truth
// for versionCode.
const gradle = fs.readFileSync(path.join(root, 'android/app/build.gradle'), 'utf8');
const build = gradle.match(/versionCode\s+(\d+)/)?.[1] ?? '1';

const task = kind === 'aab' ? ':app:bundleRelease' : ':app:assembleRelease';
console.log(`Building ${kind.toUpperCase()} for ${app.name} ${version} (${build})...`);
execFileSync(path.join(root, 'android/gradlew'), [task, '--console=plain'], {
  cwd: path.join(root, 'android'),
  stdio: 'inherit',
});

const source = kind === 'aab'
  ? path.join(root, 'android/app/build/outputs/bundle/release/app-release.aab')
  : path.join(root, 'android/app/build/outputs/apk/release/app-release.apk');
if (!fs.existsSync(source)) throw new Error(`Gradle did not produce ${source}`);

const artifacts = path.join(root, 'artifacts');
fs.mkdirSync(artifacts, { recursive: true });
const target = path.join(artifacts, `BioVision-${version}-${build}-release.${kind}`);
fs.copyFileSync(source, target);
const megabytes = (fs.statSync(target).size / 1024 / 1024).toFixed(1);
console.log(`\n${path.relative(root, target)} (${megabytes} MB)`);
