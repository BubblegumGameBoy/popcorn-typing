// Non-destructive SE preparation. Requires ffmpeg on PATH.
const fs = require('node:fs');
const cp = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '../assets/audio/se');
const out = path.join(root, 'tuned'); fs.mkdirSync(out, { recursive: true });
const rate = 48000;
const specs = [
  ['ポンッ！.mp3', 'type-pop-a.wav', Infinity, null, true],
  ['ポンッ！_2.mp3', 'type-pop-b.wav', Infinity, null, true],
];
const report = [];
for (const [input, output, duration, targetPeak, trim] of specs) {
  const buf = cp.execFileSync('ffmpeg', ['-v','error','-i',path.join(root,input),'-f','f32le','-ac','1','-ar',String(rate),'pipe:1']);
  const samples = new Float32Array(buf.buffer, buf.byteOffset, buf.length / 4);
  const peak = samples.reduce((p,v) => Math.max(p, Math.abs(v)), 0);
  const onset = samples.findIndex(v => Math.abs(v) > peak * .01);
  const start = trim ? Math.max(0, onset - Math.round(rate * .001)) : 0;
  const result = new Float32Array(Math.min(Math.round(rate * duration), samples.length - start));
  for (let i = 0; i < result.length; i++) {
    // Keep the original level and full decay; only remove leading silence.
    result[i] = samples[start + i];
  }
  cp.execFileSync('ffmpeg', ['-v','error','-y','-f','f32le','-ar',String(rate),'-ac','1','-i','pipe:0','-c:a','pcm_s16le',path.join(out,output)], { input: Buffer.from(result.buffer) });
  report.push({ input, output, originalSeconds: samples.length / rate, removedLeadMs: start / rate * 1000, outputSeconds: result.length / rate, peakLimit: targetPeak });
}
fs.writeFileSync(path.join(out,'measurements.json'), JSON.stringify(report,null,2) + '\n');
console.log(JSON.stringify(report,null,2));
