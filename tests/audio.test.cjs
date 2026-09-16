const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
function wav(name) {
  const b = fs.readFileSync(path.join(__dirname,'../assets/audio/se/tuned',name));
  assert.equal(b.toString('ascii',0,4), 'RIFF');
  let rate, channels, bits, samples;
  for (let off = 12; off + 8 <= b.length;) {
    const id = b.toString('ascii',off,off+4), size = b.readUInt32LE(off+4), p = off+8;
    if (id === 'fmt ') { assert.equal(b.readUInt16LE(p),1); channels=b.readUInt16LE(p+2); rate=b.readUInt32LE(p+4); bits=b.readUInt16LE(p+14); }
    if (id === 'data') { samples=[]; for(let i=p;i<p+size;i+=2)samples.push(b.readInt16LE(i)/32768); }
    off = p + size + (size % 2);
  }
  assert.equal(channels,1); assert.equal(bits,16);
  return {samples,rate};
}
test('both typing variants start within 4 ms and retain their full original tails and levels', () => {
  const a=wav('type-pop-a.wav'), b=wav('type-pop-b.wav');
  for (const {samples,rate} of [a,b]) {
    assert.ok(samples.findIndex(v=>Math.abs(v)>.007)/rate < .004);
    assert.ok(samples.length/rate > 2);
    assert.ok(samples.reduce((peak,v)=>Math.max(peak,Math.abs(v)),0) > .71);
    assert.ok(Math.abs(samples.at(-1)) < .0001);
  }
  assert.notDeepEqual(a.samples,b.samples);
});
