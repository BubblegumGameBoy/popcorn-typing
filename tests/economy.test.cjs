const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const context = vm.createContext({ window: {}, Date, localStorage: { getItem() { return null; } } });
for (const f of ['config', 'game']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/', f + '.js'), 'utf8'), context);
const cfg = context.window.CONFIG;
const Game = context.window.GAME.Game;
test('opening is sparse even with a high combo; rush needs sustained progress', () => {
  const g = new Game(cfg);
  assert.equal(g.particlesPerKey, 1); assert.equal(g.wordParticles, 2);
  for (let i = 0; i < 100; i++) g.typeChar();
  assert.equal(g.particlesPerKey, 1); assert.equal(g.heat, 0);
  for (let i = 0; i < 5; i++) g.completeWord(6);
  assert.equal(g.particlesPerKey, 1); assert.equal(g.activateRush(), false);
  g.wordsCleared = 12; assert.equal(g.particlesPerKey, 2);
  g.wordsCleared = 35; assert.equal(g.particlesPerKey, 3);
  g.heat = 100; assert.equal(g.activateRush(), true);
  assert.equal(g.particlesPerKey, 12);
  assert.equal(g.wordParticles, 24);
});
test('background and music follow every container boundary regardless of word count', () => {
  for (const words of [0, 25, 900]) {
    const g = new Game(cfg); g.wordsCleared = words;
    let total = 0;
    for (let idx = 0; idx < cfg.containers.length; idx++) {
      g.totalAllTime = total;
      const expected = cfg.phases.find(p => idx < p.until);
      assert.equal(g.phase.bg, expected.bg);
      assert.equal(g.phase.bgm, expected.bgm);
      if (idx > 0) {
        g.totalAllTime = total - 1;
        assert.equal(g.phase.bgm, cfg.phases.find(p => idx - 1 < p.until).bgm);
      }
      total += cfg.containers[idx].cap;
    }
    g.totalAllTime = 1e12;
    assert.equal(g.phase.bg, 'space');
    assert.equal(g.phase.bgm, 'bgm6');
  }
});
test('typing heats production, a full charge waits, rush cannot stack', () => {
  const g = new Game(cfg); g.equip[0] = 1; g.wordsCleared = cfg.overdrive.unlockWords;
  for (let i = 0; i < 200; i++) g.typeChar();
  assert.equal(g.heat, 100); assert.equal(g.cps, 3);
  g.tick(20); assert.equal(g.heat, 100);
  assert.equal(g.activateRush(), true); assert.equal(g.activateRush(), false);
  assert.equal(g.cps, 8); assert.equal(g.heat, 0);
  assert.equal(g.tick(13), 97); assert.equal(g.rushLeft, 0);
});
test('heat decay is independent of update frequency', () => {
  const a = new Game(cfg), b = new Game(cfg);
  a.equip[0] = b.equip[0] = 1; a.heat = b.heat = 6;
  a.tick(30); for (let i = 0; i < 300; i++) b.tick(.1);
  assert.ok(Math.abs(a.popcorn - b.popcorn) < 1e-8);
  assert.equal(a.heat, 0);
});
test('10th facility doubles the whole line and purchase pays exactly once', () => {
  const g = new Game(cfg); g.equip[0] = 9; g.popcorn = g.equipCost(0);
  assert.equal(g.buyEquip(0), true); assert.equal(g.popcorn, 0);
  assert.equal(g.idleCps, 20); assert.equal(g.buyEquip(0), false);
});
test('automation saves for its chosen target and protects level funds', () => {
  const g = new Game(cfg); g.autoEnabled = true;
  const t = g.autoTarget(); g.popcorn = t.cost + g.levelCost - 1;
  g.autoBuy(); assert.equal(g.equip[t.index], 0);
  g.popcorn++; g.autoBuy(); assert.equal(g.equip[t.index], 1);
  assert.equal(g.popcorn, g.levelCost);
});
test('word completion scales with factory output', () => {
  const a = new Game(cfg), b = new Game(cfg); b.equip[0] = 10;
  assert.ok(b.completeWord(5) > a.completeWord(5));
});
test('save preserves automation, offline gains exclude temporary boosts', () => {
  const g = new Game(cfg); g.equip[0] = 10; g.autoEnabled = true; g.heat = 100; g.activateRush();
  const copy = new Game(cfg); assert.equal(copy.load(g.serialize()), true);
  assert.equal(copy.autoEnabled, true); assert.equal(copy.rushLeft, 0); assert.equal(copy.heat, 0);
  copy.lastSeen = Date.now() - 24 * 3600e3;
  const off = copy.applyOffline();
  assert.equal(off.gain, 20 * .5 * 8 * 3600); assert.equal(off.capped, true);
});
test('container rewards do not recursively advance progress', () => {
  const g = new Game(cfg); g._earn(500);
  assert.equal(g.collectContainerRewards().length, 1);
  assert.equal(g.totalAllTime, 500); assert.equal(g.popcorn, 750);
  assert.equal(g.collectContainerRewards().length, 0);
});
test('facility shortcut purchases the displayed target or waits', () => {
  const g = new Game(cfg); g.equip[0] = 1; g.popcorn = 100;
  assert.equal(g.nextEquipIndex(), 1); assert.equal(g.buyNextEquip(), null);
  assert.equal(g.popcorn, 100); g.popcorn = 320;
  assert.equal(g.buyNextEquip().index, 1); assert.equal(g.equip[1], 1);
});
test('early scenes progress kitchen to stall to park at container boundaries', () => {
  const g = new Game(cfg);
  assert.equal(g.phase.bg, 'kitchen');
  g.totalAllTime = 499; assert.equal(g.phase.bg, 'kitchen');
  g.totalAllTime = 500; assert.equal(g.phase.bg, 'stall');
  g.wordsCleared = 25; assert.equal(g.phase.bg, 'stall');
  g.totalAllTime = 3500; assert.equal(g.phase.bg, 'park');
  g.wordsCleared = 75; assert.equal(g.phase.bg, 'park');
  assert.equal(g.phase.bgm, 'bgm1');
});
