const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));
const results = [];
const check = (name, passed, detail) => results.push({ name, passed, detail });

const app = JSON.parse(read('app.json')).expo;
const nativeVitals = read('src/services/vision/vitalCamera.native.ts');
const infoPlist = read('ios/BioVision/Info.plist');
const privacyManifest = read('ios/BioVision/PrivacyInfo.xcprivacy');
const endpoint = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';
const facePhysModels = [
  'model.tflite',
  'sqi_model.tflite',
  'psd_model.tflite',
  'blaze_face_short_range.tflite',
  'state.bin',
  'state_index.json',
];

check('iOS bundle identifier', Boolean(app.ios?.bundleIdentifier), app.ios?.bundleIdentifier ?? 'missing');
check('iOS build number', /^\d+$/.test(app.ios?.buildNumber ?? ''), app.ios?.buildNumber ?? 'missing');
check('1024 px App Store icon', exists('ios/BioVision/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png'), 'checked-in app icon');
check('Privacy manifest', privacyManifest.includes('NSPrivacyTracking') && privacyManifest.includes('<false/>'), 'tracking disabled');
// NSMotionUsageDescription is required by App Store validation (ITMS-90683) because ExpoCamera and
// ExpoLocation link CoreMotion, even though no BioVision code reads motion. Background location stays banned.
check('Only used iOS permission purposes', !/NSLocationAlways/.test(infoPlist), 'camera, selected photos, when-in-use location, and the SDK-required motion string');

for (const model of facePhysModels) {
  check(`FacePhys native asset: ${model}`, exists(`modules/biovision-facephys/assets/${model}`), 'bundled by BioVisionFacePhys.podspec');
}

const podLock = read('ios/Podfile.lock');
const nativeAdapterReady =
  nativeVitals.includes('subscribeFaceUpdates') &&
  !nativeVitals.includes('not installed yet') &&
  podLock.includes('BioVisionFacePhys');
check('Native FacePhys runtime', nativeAdapterReady, 'vitals provider uses the BioVisionFacePhys camera output and the pod is installed');

// Anemia screening runs on the hosted backend so iOS and web share one model build.

// Eye screening, questionnaire and vitals run on the device, so no API endpoint is required for iOS.
const endpointOk = !endpoint || (/^https:\/\//.test(endpoint) && !/localhost|placeholder/i.test(endpoint));
check('Optional API endpoint is HTTPS when set', endpointOk, endpoint || 'not set (not needed on iOS)');
check('On-device eye model', read('modules/biovision-facephys/ios/ConjunctivaAnalyzer.swift').includes('conjunctiva-colour-ridge-v1'), 'colour ridge model compiled into BioVisionFacePhys');
check('Face mesh model bundled', exists('modules/biovision-facephys/assets/face_landmarks_detector.tflite'), 'MediaPipe Face Landmarker');

const bundleFlag = process.argv.indexOf('--bundle');
if (bundleFlag !== -1) {
  const bundlePath = process.argv[bundleFlag + 1];
  if (!bundlePath) throw new Error('--bundle requires a .app directory path');
  const allBundlePaths = [];
  const walk = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const child = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(child);
      else allBundlePaths.push(child);
    }
  };
  walk(bundlePath);
  for (const model of facePhysModels) {
    check(`Installed bundle contains: ${model}`, allBundlePaths.some((file) => path.basename(file) === model), bundlePath);
  }
}

for (const result of results) {
  console.log(`${result.passed ? 'PASS' : 'FAIL'}  ${result.name} — ${result.detail}`);
}

const failed = results.filter((result) => !result.passed);
console.log(`\n${results.length - failed.length}/${results.length} launch gates passed.`);
if (failed.length) process.exitCode = 1;
