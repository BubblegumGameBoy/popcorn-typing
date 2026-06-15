/*
 * ============================================================
 *  メイン / 統合  (main.js)
 * ============================================================
 *  入力(typing-engine) → ゲーム状態(game) → 演出(effects) / 表示(ui)
 *  - 設備は自動購入（高い順）で勝手に増える＝上部に見える
 *  - 容器を満タンにするのが目的。フェーズで背景＆BGMが変わる
 *  - 全部クリアでチートモード（×100）解放
 * ============================================================
 */
(function () {
  const cfg = CONFIG;

  const images = ASSETS.preloadImages();
  const game = GAME.Game.loadFrom(cfg);
  window.__game = game;

  const audio = new FX.AudioKit();
  audio.loadSE('pop1', ASSETS.audioUrl('pop1'));
  audio.loadSE('pop2', ASSETS.audioUrl('pop2'));
  audio.loadSE('metal', ASSETS.audioUrl('popMetal'));
  audio.loadSE('result', ASSETS.audioUrl('result'));
  audio.loadBGM('bgmEarly', ASSETS.audioUrl('bgmEarly'));
  audio.loadBGM('bgmMid', ASSETS.audioUrl('bgmMid'));
  audio.loadBGM('bgmSpace', ASSETS.audioUrl('bgmSpace'));

  UI.init(cfg);
  const canvas = document.getElementById('fx-canvas');
  const particles = new FX.ParticleSystem(canvas, images, cfg.fx.maxParticles);
  const bgEl = document.getElementById('bg');

  // ── お題 ──────────────────────────────────────────
  let current = null, currentWord = null;
  function nextWord() {
    const maxDiff = Math.min(3, 1 + game.varietyIndex);
    currentWord = WordBank.random(maxDiff);
    current = new TypingWord(currentWord.kana);
    UI.setWord(currentWord.text);
    UI.setProgress('', current.left);
  }

  // ── 演出ヘルパ ────────────────────────────────────
  function cornKey() { return game.variety.img; }
  function randomPos() {
    const cr = canvas.getBoundingClientRect();
    return { x: cr.width * (0.1 + Math.random() * 0.8), y: cr.height * (0.12 + Math.random() * 0.72) };
  }
  function fireworksAcross(bursts, perBurst, key, power) {
    for (let i = 0; i < bursts; i++) { const p = randomPos(); particles.burst(p.x, p.y, perBurst, key, power); }
  }
  function gainStyle(cm) {
    if (cm >= 10) return { color: '#ff4f86', size: 42 };
    if (cm >= 6)  return { color: '#ff7a3c', size: 35 };
    if (cm >= 3)  return { color: '#f4a72a', size: 29 };
    if (cm >= 2)  return { color: '#e88a36', size: 25 };
    return { color: '#d98326', size: 21 };
  }
  // 所有している施設の画面位置（ここからポップコーンが落ちてくる）
  function facilityPositions() {
    const cr = canvas.getBoundingClientRect();
    const list = [];
    for (let i = 0; i < UI.facElems.length; i++) {
      if (game.equip[i] <= 0) continue;
      const r = UI.facElems[i].el.getBoundingClientRect();
      if (r.width < 2) continue;
      list.push({ x: r.left + r.width / 2 - cr.left, y: r.bottom - cr.top });
    }
    return list;
  }
  function emitAutoPuff() {
    const ps = facilityPositions();
    if (!ps.length) return;
    const p = ps[Math.floor(Math.random() * ps.length)];
    particles.drop(p.x, p.y, 1, cornKey());   // 施設から落下
  }
  function dropFromFacility(i, n) {
    const f = UI.facElems[i]; if (!f) return;
    const cr = canvas.getBoundingClientRect();
    const r = f.el.getBoundingClientRect();
    particles.drop(r.left + r.width / 2 - cr.left, r.bottom - cr.top, n, cornKey());
  }

  // ── フェーズ（背景＆BGM切替） ──────────────────────
  let curPhaseBg = null;
  function applyPhase(force) {
    const p = game.phase;
    if (force || p.bg !== curPhaseBg) {
      curPhaseBg = p.bg;
      bgEl.style.backgroundImage = `url("${ASSETS.imgUrl(p.bg)}")`;
      document.body.classList.toggle('space-mode', !!p.space);
      audio.playBGM(p.bgm);
    }
  }

  // ── 入力 ──────────────────────────────────────────
  let lastComboMult = 1, keyPop = 0;
  function onChar(ch) {
    audio.unlock();
    if (!current) return;
    const r = current.press(ch);
    if (r.status === 'reject') {
      game.miss();
      UI.flashMiss();
      UI.showCombo(0, 1);
      lastComboMult = 1;
      const mp = randomPos();
      particles.burst(mp.x, mp.y, 2, 'charcoal', 0.7);
      audio.play('pop1', 0.55, 0.3);
      return;
    }
    const gain = game.typeChar();
    UI.setProgress(r.done, r.left);
    UI.bumpCorn();
    const cm = game.comboMult;
    const pos = randomPos();
    particles.burst(pos.x, pos.y, game.particlesPerKey, cornKey(), 1.0 + Math.min(0.8, cm * 0.06));
    const gs = gainStyle(cm);
    particles.addText(pos.x, pos.y - 6, '+' + FORMAT.fmt(gain), gs.color, gs.size);
    keyPop ^= 1;
    audio.play('metal', keyPop ? 1.06 : 0.92, 0.6);

    UI.showCombo(game.combo, cm);
    if (cm > lastComboMult) {
      lastComboMult = cm;
      UI.pulseCombo();
      fireworksAcross(2, 5, cornKey(), 1.7);
      audio.play('result', 1.1, 0.5);
    }
    if (r.status === 'complete') {
      game.completeWord(currentWord.kana.length);
      fireworksAcross(1, 4, cornKey(), 1.4);
      nextWord();
    }
  }
  function onBackspace() { if (current) { const r = current.backspace(); UI.setProgress(r.done, r.left); } }
  function onEnter() { audio.unlock(); if (current) nextWord(); }
  // 入力下のボタン：1=レベルアップ / 2=施設購入(高い順) / 3=品種研究（すべて手動）
  function onDigit(d) {
    audio.unlock();
    if (d === '1') doLevelUp();
    else if (d === '2') doBuyFacility();
    else if (d === '3') doBuyVariety();
  }

  function doLevelUp() {
    if (game.levelUp()) {
      audio.play('result', 1.4, 0.65);
      UI.flashKeyHint('1', true);
      UI.bumpCorn();
      fireworksAcross(3, 6, cornKey(), 1.8);
      UI.toast(`⭐ レベル ${game.level}！ 粒が増えた`, { good: true });
    } else {
      audio.play('pop1', 0.5, 0.3);
      UI.flashKeyHint('1', false);
      UI.toast(`レベルUPに ${FORMAT.fmt(game.levelCost)} 粒 必要`, {});
    }
  }
  function doBuyFacility() {
    const r = game.buyBestEquip();   // コスト高い順に1個だけ購入
    if (r) {
      audio.play('pop1', 0.85, 0.45);
      UI.flashKeyHint('2', true);
      UI.updateFacilities(game);
      dropFromFacility(r.index, 10);   // その施設からポップコーンが落ちる
      if (r.first) UI.toast(`⚙️ ${cfg.equipment[r.index].name} 設置！`, { good: true });
    } else {
      audio.play('pop1', 0.5, 0.25);
      UI.flashKeyHint('2', false);
      UI.toast('施設を買う粒が足りない…', {});
    }
  }
  function doBuyVariety() {
    if (game.nextVariety && game.buyVariety()) {
      UI.setCornSprite(cornKey());
      audio.play('result', 1.2, 0.6);
      UI.flashKeyHint('3', true);
      fireworksAcross(5, 7, cornKey(), 2.0);
      UI.toast(`🌽 ${game.variety.name} を研究！`, { good: true, big: true });
    } else {
      audio.play('pop1', 0.5, 0.25);
      UI.flashKeyHint('3', false);
    }
  }

  // ── クリア＆チート ────────────────────────────────
  function onContainerCleared(cleared) {
    const lastC = cleared[cleared.length - 1];
    const reward = cleared.reduce((s, c) => s + c.reward, 0);
    UI.clearContainerAnim();
    fireworksAcross(8, 8, cornKey(), 2.3);
    audio.play('result', 1.0, 0.7);
    UI.toast(`🎉「${lastC.name}」満タン！ +${FORMAT.fmt(reward)}粒 → 次は「${lastC.nextName}」`, { good: true, big: true });
    applyPhase(false);
    // 全部クリア（最後の容器＝宇宙ぜんぶ）でチート解放
    const finalIdx = cfg.containers.length - 1;
    if (cleared.some(c => c.index === finalIdx) && !game.cheatActive) {
      game.cheatUnlocked = true;
      audio.play('result', 0.9, 0.9);
      UI.showCheatModal();
    }
  }

  // ── ループ ────────────────────────────────────────
  let last = performance.now();
  let acc = 0, puffTimer = 0, lastTotal = 0, genRate = 0;
  function loop(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    game.tick(dt);
    const inst = dt > 0 ? (game.totalRun - lastTotal) / dt : 0;
    lastTotal = game.totalRun;
    genRate += (inst - genRate) * Math.min(1, dt * 5);

    const cleared = game.collectContainerRewards();
    if (cleared.length) onContainerCleared(cleared);

    if (game.cps > 0) {
      const rate = Math.min(7, 1 + Math.log10(game.cps + 1) * 2.2);
      puffTimer -= dt;
      if (puffTimer <= 0) { puffTimer = 1 / rate; emitAutoPuff(); }
    }
    particles.update(dt);
    particles.draw();
    acc += dt;
    if (acc >= 0.1) { acc = 0; UI.refresh(game); UI.setGen(genRate, 1e5); }
    requestAnimationFrame(loop);
  }

  // ── 起動 ──────────────────────────────────────────
  function startGame() {
    document.getElementById('title-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
    particles.resize();

    UI.setCornSprite(cornKey());
    UI.buildFacilities(game);
    applyPhase(true);
    UI.refresh(game);
    lastTotal = game.totalRun;
    nextWord();

    const off = game.applyOffline();
    if (off.gain > 1) {
      const mins = Math.round(off.seconds / 60);
      UI.toast(`🍿 留守の${mins >= 60 ? Math.round(mins / 60) + '時間' : mins + '分'}で ${FORMAT.fmt(off.gain)} 粒 焼けてたよ！`, { good: true, big: true });
    }

    attachKeyInput({ onChar, onBackspace, onEnter, onDigit, isActive: () => true });

    // 入力下のボタン（クリックでも数字キーと同じ）
    document.querySelectorAll('.key-hint').forEach((b) => {
      b.addEventListener('click', () => { audio.unlock(); onDigit(b.dataset.key); });
    });
    document.getElementById('mute-btn').addEventListener('click', (e) => {
      const muted = audio.toggleMute();
      e.target.textContent = muted ? '🔇' : '🔊';
    });
    // チートモーダル
    document.getElementById('cheat-yes').addEventListener('click', () => {
      game.startCheatRun();
      UI.hideCheatModal();
      UI.buildFacilities(game);
      applyPhase(true);
      UI.setCornSprite(cornKey());
      UI.refresh(game);
      lastTotal = game.totalRun; genRate = 0; lastComboMult = 1;
      UI.toast('😈 チートモード！ ポップコーン ×100 でスタート！', { good: true, big: true });
      audio.play('result', 1.1, 0.9);
    });
    document.getElementById('cheat-no').addEventListener('click', () => UI.hideCheatModal());

    audio.unlock();
    requestAnimationFrame(loop);

    setInterval(() => game.save(), cfg.save.intervalMs);
    window.addEventListener('beforeunload', () => game.save());
  }

  document.getElementById('start-btn').addEventListener('click', startGame);
})();
