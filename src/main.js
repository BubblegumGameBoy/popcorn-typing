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
  // A non-persistent early-game preview lets existing players see the new scenes.
  const earlyPreview = new URLSearchParams(location.search).get('preview') === 'early';
  const game = earlyPreview ? new GAME.Game(cfg) : GAME.Game.loadFrom(cfg);
  window.__game = game;

  const audio = new FX.AudioKit();
  audio.loadSE('pop1', ASSETS.audioUrl('pop1'));
  audio.loadSE('pop2', ASSETS.audioUrl('pop2'));
  audio.loadSE('metal', ASSETS.audioUrl('popMetal'));
  audio.loadSE('result', ASSETS.audioUrl('result'));
  audio.loadSE('complete', ASSETS.audioUrl('complete'));
  for (const k of ['bgm1', 'bgm2', 'bgm3', 'bgm4', 'bgm5', 'bgm6']) audio.loadBGM(k, ASSETS.audioUrl(k));

  UI.init(cfg);
  Leaderboard.init(cfg);
  const canvas = document.getElementById('fx-canvas');
  const particles = new FX.ParticleSystem(canvas, images, cfg.fx.maxParticles, cfg.fx);
  const bgEl = document.getElementById('bg');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const echoes = [];
  const machineClocks = cfg.equipment.map(() => 0);
  function popOrigin() {
    const c = canvas.getBoundingClientRect(), r = UI.el.typingPanel.getBoundingClientRect();
    return { x: r.left - c.left + r.width * (.25 + Math.random() * .5), y: r.top - c.top + 8 };
  }
  function echoBurst(x, y, n, delay, power) {
    if (echoes.length < 30) echoes.push({ x, y, n, delay, power, key: cornKey() });
  }

  // ── お題 ──────────────────────────────────────────
  let current = null, currentWord = null;
  function nextWord() {
    const maxDiff = Math.min(3, 1 + game.varietyIndex);
    const minDiff = game.isGold ? 2 : 1;   // 純金到達後は短すぎる語を出さない（反復対策）
    currentWord = WordBank.random(maxDiff, minDiff);
    // 文節区切り（空白入り）があればそれで打鍵（空白はゼロ幅の表示区切り）
    const typeKana = (window.SPACING && window.SPACING[currentWord.kana]) || currentWord.kana;
    current = new TypingWord(typeKana);
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
    const scale = reducedMotion ? .1 : game.rushLeft > 0 ? 1 : .12 + game.visualTier * .16;
    for (let i = 0; i < Math.max(1, Math.ceil(bursts * scale)); i++) { const p = randomPos(); particles.burst(p.x, p.y, Math.max(1, Math.ceil(perBurst * scale)), key, power * (.65 + scale * .35)); }
  }
  function gainStyle(cm) {
    if (cm >= 10) return { color: '#ff4f86', size: 42 };
    if (cm >= 6)  return { color: '#ff7a3c', size: 35 };
    if (cm >= 3)  return { color: '#f4a72a', size: 29 };
    if (cm >= 2)  return { color: '#e88a36', size: 25 };
    return { color: '#d98326', size: 21 };
  }
  // 所有している施設の画面位置（ここからポップコーンが落ちてくる）
  // 施設はHUD（白バー）内にあるので、落下はステージ上端から始める
  function facilityPositions() {
    const cr = canvas.getBoundingClientRect();
    const list = [];
    for (let i = 0; i < UI.facElems.length; i++) {
      if (game.equip[i] <= 0) continue;
      const r = UI.facElems[i].el.getBoundingClientRect();
      if (r.width < 2) continue;
      list.push({ x: r.left + r.width / 2 - cr.left, y: Math.max(4, r.bottom - cr.top) });
    }
    return list;
  }
  function emitAutoPuff() {
    const ps = facilityPositions();
    if (!ps.length) return;
    const p = ps[Math.floor(Math.random() * ps.length)];
    particles.drop(p.x, p.y, Math.min(12, 2 + Math.floor(Math.log10(game.cps + 1)) + (game.rushLeft > 0 ? 4 : 0)), cornKey());
  }
  function dropFromFacility(i, n) {
    const f = UI.facElems[i]; if (!f) return;
    const cr = canvas.getBoundingClientRect();
    const r = f.el.getBoundingClientRect();
    particles.drop(r.left + r.width / 2 - cr.left, Math.max(4, r.bottom - cr.top), n, cornKey());
    f.el.classList.remove('puff'); void f.el.offsetWidth; f.el.classList.add('puff');
  }

  // ── フェーズ（背景＆BGM切替） ──────────────────────
  let curPhaseBg = null, curPhaseBgm = null;
  function applyPhase(force) {
    const p = game.phase;
    if (force || p.bg !== curPhaseBg) {
      curPhaseBg = p.bg;
      bgEl.style.backgroundImage = `url("${ASSETS.imgUrl(p.bg)}")`;
      document.body.classList.toggle('space-mode', !!p.space);
    }
    if (force || p.bgm !== curPhaseBgm) {
      curPhaseBgm = p.bgm;
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
    const pos = popOrigin();
    particles.fountain(pos.x, pos.y, reducedMotion ? 1 : game.particlesPerKey, cornKey(), 1 + Math.min(.8, cm * .06));
    const gs = gainStyle(cm);
    particles.addText(pos.x, pos.y - 6, '+' + FORMAT.fmt(gain), gs.color, gs.size);
    keyPop ^= 1;
    audio.play('metal', keyPop ? 1.06 : 0.92, 0.6);
    const counter = UI.el.popcorn;
    counter.classList.remove('pop-hit'); void counter.offsetWidth; counter.classList.add('pop-hit');

    UI.showCombo(game.combo, cm);
    if (cm > lastComboMult) {
      lastComboMult = cm;
      UI.pulseCombo();
      fireworksAcross(2, 5, cornKey(), 1.7);
      audio.play('result', 1.1, 0.5);
    }
    if (r.status === 'complete') {
      const bonus = game.completeWord(currentWord.kana.length);
      particles.addText(canvas.clientWidth / 2, canvas.clientHeight * .32, 'WORD! +' + FORMAT.fmt(bonus), '#df4774', 22 + game.visualTier * 3);
      audio.play('complete', 1.0, 0.7);
      particles.fountain(pos.x, pos.y, reducedMotion ? 2 : game.wordParticles, cornKey(), 1 + game.visualTier * .2);
      if (!reducedMotion && game.rushLeft > 0) {
        echoBurst(pos.x - 95, pos.y + 25, 12, .09, 1.7);
        echoBurst(pos.x + 95, pos.y + 25, 16, .19, 1.9);
      }
      nextWord();
      applyPhase(false);
    }
    if (game.heat >= 100 && !game.rushLeft) doRush();
  }
  function onBackspace() { if (current) { const r = current.backspace(); UI.setProgress(r.done, r.left); } }
  function onEnter() {
    if (UI.rankModalOpen) { joinRanking(); return; }   // モーダル中のEnterは名前決定
    audio.unlock(); if (current) nextWord();
  }
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
      fireworksAcross(10, 10, cornKey(), 2.2);   // ど派手に破裂
      UI.toast(`⭐ レベル ${game.level}！ 粒が増えた`, { good: true });
    } else {
      audio.play('pop1', 0.5, 0.3);
      UI.flashKeyHint('1', false);
      UI.toast(`レベルUPに ${FORMAT.fmt(game.levelCost)} 粒 必要`, {});
    }
  }
  function doBuyFacility() {
    const r = game.buyNextEquip();   // 安い未所持を優先（全種そろったら高い順）
    if (r) {
      audio.play('pop1', 0.85, 0.45);
      audio.play('metal', 1.0, 0.5);
      UI.flashKeyHint('2', true);
      UI.updateFacilities(game);
      fireworksAcross(8, 9, cornKey(), 2.2);   // ど派手に破裂
      dropFromFacility(r.index, 2 + game.visualTier * 2);           // その施設からどっさり落ちる
      if (cfg.equipmentMilestones.includes(game.equip[r.index])) celebrateMilestone(r.index);
      if (r.first) UI.toast(`⚙️ ${cfg.equipment[r.index].name} 設置！`, { good: true, big: true });
    } else {
      audio.play('pop1', 0.5, 0.25);
      UI.flashKeyHint('2', false);
      UI.toast('施設を買う粒が足りない…', {});
    }
  }
  function doBuyVariety() {
    if (game.nextVariety) {
      // 次の品種を研究
      if (game.buyVariety()) {
        UI.setCornSprite(cornKey());
        audio.play('result', 1.2, 0.6);
        UI.flashKeyHint('3', true);
        fireworksAcross(12, 10, cornKey(), 2.5);
        UI.toast(`🌽 ${game.variety.name}！ 1打鍵 ${FORMAT.fmt(game.varietyPerChar)}粒に！`, { good: true, big: true });
      } else { audio.play('pop1', 0.5, 0.25); UI.flashKeyHint('3', false); }
    } else {
      // 純金コーンは天井なし → レベル研究
      if (game.buyGoldLevel()) {
        audio.play('result', 1.25, 0.65);
        UI.flashKeyHint('3', true);
        fireworksAcross(14, 11, 'gold', 2.6);
        UI.toast(`🏆 純金コーン Lv${game.goldLevel + 1}！ 1打鍵 ${FORMAT.fmt(game.varietyPerChar)}粒に！`, { good: true, big: true });
      } else { audio.play('pop1', 0.5, 0.25); UI.flashKeyHint('3', false); }
    }
  }

  function doRush() {
    audio.unlock();
    if (!game.activateRush()) return;
    if (!reducedMotion) for (let i = 0; i < 7; i++) echoBurst(canvas.clientWidth * (i + 1) / 8, canvas.clientHeight * .8, 22, i * .07, 2.6);
    audio.play('result', .85, .8);
    particles.addText(canvas.clientWidth / 2, canvas.clientHeight * .22, 'POPCORN RUSH! ×8', '#e64b69', 44);
    UI.refresh(game);
  }

  function celebrateMilestone(i) {
    fireworksAcross(4, 14, cornKey(), 2);
    UI.toast(`⚡ ${cfg.equipment[i].name} ${game.equip[i]}台！ この設備の生産 ×2`, { good: true, big: true });
    audio.play('result', 1.25, .6);
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
    Leaderboard.maybeSubmit(game.totalAllTime);   // 節目で世界ランキングへ（5分スロットル付き）
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
  let acc = 0, puffTimer = 0, lastTotal = 0, genRate = 0, autoTimer = 0;
  function loop(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    game.tick(dt);
    autoTimer += dt;
    if (autoTimer >= cfg.autoBuy.intervalMs / 1000) {
      autoTimer = 0;
      const before = game.equip.slice();
      game.autoBuy();
      game.equip.forEach((n, i) => {
        if (n === before[i]) return;
        UI.updateFacilities(game);
        dropFromFacility(i, 1 + game.visualTier);
        if (cfg.equipmentMilestones.includes(n)) celebrateMilestone(i);
        else if (before[i] === 0) { dropFromFacility(i, 2 + game.visualTier * 2); audio.play('metal', .8, .35); }
      });
    }
    const inst = dt > 0 ? (game.totalRun - lastTotal) / dt : 0;
    lastTotal = game.totalRun;
    genRate += (inst - genRate) * Math.min(1, dt * 5);

    const cleared = game.collectContainerRewards();
    if (cleared.length) onContainerCleared(cleared);

    const rushActive = game.rushLeft > 0;
    document.body.classList.toggle('rush-active', rushActive);
    for (let i = 0; i < machineClocks.length; i++) {
      if (!game.equip[i]) continue;
      machineClocks[i] -= dt;
      if (machineClocks[i] <= 0) {
        machineClocks[i] = Math.max(.3, (3.2 + i * .2) / (1 + game.visualTier * .35) / (rushActive ? 2 : 1));
        const count = Math.min(14, 1 + game.visualTier + (rushActive ? 5 : 0));
        dropFromFacility(i, reducedMotion ? 1 : count);
      }
    }
    for (let i = echoes.length - 1; i >= 0; i--) {
      const e = echoes[i]; e.delay -= dt;
      if (e.delay <= 0) {
        particles.fountain(e.x, e.y, e.n, e.key, e.power);
        audio.play('pop2', 1 + e.power * .1, .22);
        echoes.splice(i, 1);
      }
    }
    particles.update(dt);
    particles.draw();
    acc += dt;
    if (acc >= 0.1) { acc = 0; UI.refresh(game); UI.setGen(genRate, 1e5); }
    requestAnimationFrame(loop);
  }

  // ── 世界ランキング ────────────────────────────────
  async function openRanking() {
    UI.setRankJoined(Leaderboard.name, game.totalAllTime);
    UI.showRankModal();
    UI.renderRanking(await Leaderboard.top(), Leaderboard.playerId);
  }
  async function joinRanking() {
    if (Leaderboard.joined) return;
    const name = UI.el.rankNameInput.value.trim();
    if (!name) { UI.el.rankNameInput.focus(); return; }
    Leaderboard.setName(name);
    UI.setRankJoined(Leaderboard.name, game.totalAllTime);
    UI.toast(`🏆 ${Leaderboard.name} でランキング参加！`, { good: true, big: true });
    await Leaderboard.submit(game.totalAllTime);          // 参加直後に初回送信
    Leaderboard._cache = null;                            // 自分を含めて取り直す
    UI.renderRanking(await Leaderboard.top(), Leaderboard.playerId);
  }
  function setupRanking() {
    const btn = document.getElementById('rank-btn');
    if (!Leaderboard.enabled) { btn.classList.add('hidden'); return; }
    btn.addEventListener('click', () => { audio.unlock(); openRanking(); });
    document.getElementById('rank-close').addEventListener('click', () => UI.hideRankModal());
    document.getElementById('rank-modal').addEventListener('click', (e) => {
      if (e.target.id === 'rank-modal') UI.hideRankModal();   // 背景クリックで閉じる
    });
    document.getElementById('rank-join-btn').addEventListener('click', joinRanking);
    // 定期チェック（実際に送るかは leaderboard.js のスロットルが判断）
    setInterval(() => Leaderboard.maybeSubmit(game.totalAllTime), 60 * 1000);
    // タブ離脱・iframeが閉じられる時に最終値を送る
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') Leaderboard.flush(game.totalAllTime);
    });
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

    // ランキングモーダル中はゲーム入力を止める（名前入力欄にキーを通す）
    attachKeyInput({
      onChar, onBackspace, onEnter, onDigit,
      onEscape: () => UI.hideRankModal(),
      isActive: () => !UI.rankModalOpen && UI.el.cheatModal.classList.contains('hidden'),
    });

    // 入力下のボタン（クリックでも数字キーと同じ）
    document.querySelectorAll('.key-hint').forEach((b) => {
      b.addEventListener('click', () => { audio.unlock(); onDigit(b.dataset.key); });
    });
    document.getElementById('mute-btn').addEventListener('click', (e) => {
      const muted = audio.toggleMute();
      e.target.textContent = muted ? '🔇' : '🔊';
    });
    // 全画面：できれば その場で全画面（埋め込みなら allowfullscreen が要る）。
    // 不可なら別タブで開く（はてな等で全画面が許可されていない時のフォールバック）。
    document.getElementById('fs-btn').addEventListener('click', () => {
      const d = document, el = d.documentElement;
      const openTab = () => { try { window.open(location.href, '_blank', 'noopener'); } catch (e) {} };
      try {
        if (d.fullscreenElement || d.webkitFullscreenElement) {
          (d.exitFullscreen || d.webkitExitFullscreen).call(d);
          return;
        }
        const req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
        if (!req) { openTab(); return; }
        const pr = req.call(el);
        if (pr && pr.then) pr.catch(openTab);   // 全画面が拒否されたら別タブ
      } catch (e) { openTab(); }
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

    setupRanking();

    audio.unlock();
    requestAnimationFrame(loop);

    if (!earlyPreview) {
      setInterval(() => game.save(), cfg.save.intervalMs);
      window.addEventListener('beforeunload', () => game.save());
    }
  }

  document.getElementById('start-btn').addEventListener('click', startGame);
})();
