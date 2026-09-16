const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const ctx = vm.createContext({ window: { devicePixelRatio: 1, addEventListener() {} } });
vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/particles.js'), 'utf8') + '\nthis.Particles = ParticleSystem;', ctx);
function create() {
  const canvas = { getContext: () => ({ setTransform() {} }), getBoundingClientRect: () => ({ width: 1000, height: 650 }) };
  return new ctx.Particles(canvas, {}, 480, { maxSettled: 1200 });
}
function advance(p, seconds) { for(let i = 0; i < seconds * 60; i++) p.update(1 / 60); }
test('early manual popcorn lands and remains after flight has ended', () => {
  const p = create(); p.fountain(500, 330, 80, 'normal'); advance(p, 10);
  assert.equal(p.active, 0); assert.equal(p.pile.length, 80);
  assert.ok(p.pile.every(k => k.alpha === 1));
  assert.ok(Math.max(...p.heights) > 15);
  advance(p, 55); assert.equal(p.pile.length, 0);
});
test('automation has bounded airborne and settled budgets', () => {
  const p = create(); p.drop(300, 0, 480, 'normal');
  assert.equal(p.autoActive, 120);
  for(let i = 0; i < 15; i++) { advance(p, 3); p.drop(300, 0, 480, 'normal'); }
  assert.ok(p.pile.length <= 420); assert.ok(p.autoActive <= 120);
});
test('dense manual bursts stay bounded and preserve finite coordinates', () => {
  const p = create();
  for(let i = 0; i < 30; i++) { p.fountain(500, 330, 100, 'normal', 2); advance(p, .5); }
  assert.ok(p.pile.length <= 1200); assert.ok(p.active <= 480);
  assert.ok(p.pile.every(k => Number.isFinite(k.y) && k.u >= 0 && k.u <= 1));
  assert.ok(Math.max(...p.heights) <= 145);
});
test('automatic output never overwrites settled player kernels at its quota', () => {
  const p = create(); p.fountain(500, 330, 100, 'normal'); advance(p, 8);
  for(let i = 0; i < 6; i++) { p.drop(300, 0, 120, 'normal'); advance(p, 3); }
  assert.equal(p.pile.filter(k => k.source === 'manual').length, 100);
});
