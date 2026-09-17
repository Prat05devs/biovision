// Parity check: the TypeScript HRV port must match vitalcamera-sdk's psd.worker `_runHrv`.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');

const port = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/services/vision/facePhysHrv.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: port.exports, Math });

const workerSource = fs.readFileSync('node_modules/vitalcamera-sdk/src/workers/psd.worker.js', 'utf8');
const reference = {};
vm.runInNewContext(`${workerSource}\nreference.run = _runHrv;`, { self: {}, reference, Math, performance: { now: () => 0 } });

let seed = 7;
const random = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
let compared = 0, accepted = 0;
for (let trial = 0; trial < 400; trial += 1) {
  const bpm = 50 + random() * 70;
  const noise = random() * 0.8;
  const jitter = random() * 0.12;
  const fps = 24 + random() * 8;
  const samples = [];
  let phase = 0;
  for (let i = 0; i < Math.floor(fps * (8 + random() * 40)); i += 1) {
    phase += 2 * Math.PI * (bpm / 60) * (1 + (random() - 0.5) * jitter) / fps;
    samples.push({ t: i * 1000 / fps + (random() - 0.5) * 4, v: Math.sin(phase) + (random() - 0.5) * noise });
  }
  const expected = reference.run(samples, {});
  const actual = port.exports.computeHrv(samples);
  compared += 1;
  if (expected === null) {
    assert.equal(actual.rmssd, null, `trial ${trial}: port accepted a window the SDK rejected`);
  } else {
    accepted += 1;
    for (const key of ['rmssd', 'sdnn', 'meanRR', 'n']) {
      assert(Math.abs(actual[key] - expected[key]) < 1e-9, `trial ${trial}: ${key} ${actual[key]} != ${expected[key]}`);
    }
  }
}
console.log(`FacePhys HRV port matches the SDK on ${compared} windows (${accepted} accepted).`);
