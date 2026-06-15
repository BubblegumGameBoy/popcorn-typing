/*
 * ============================================================
 *  メイン / 統合  (main.js)  ― スコアアタック版
 * ============================================================
 *  タイトル → ショップ → 60秒プレイ → リザルト＆ランキング
 * ============================================================
 */
(function () {
  const cfg = CONFIG;
  const images = ASSETS.preloadImages();
  const game = GAME.Game.loadFrom(cfg);
  window.__game = game;
  Leaderboard.init(cfg);

  const audio = new FX.AudioKit();
  audio.loadSE('pop1', ASSETS.audioUrl('pop1'));
  audio.loadSE('pop2', ASSETS.audioUrl('pop2'));
  audio.loadSE('metal', ASSETS.audioUrl('popMetal'));
  audio.loadSE('result', ASSETS.audioUrl('result'));
  audio.loadBGM(ASSETS.audioUrl('bgm'));

  document.getElementById('bg').style.backgroundImage = `url("${ASSETS.imgUrl('park')}")`;

  UI.init(cfg);
  const canvas = document.getElementById('fx-canvas');
  const particles = new FX.ParticleSystem(canvas, images, cfg.fx.maxParticles);

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

  // ── お題 ──────────────────────────────────────────
  let current = null, currentWord = null;
  function nextWord() {
    currentWord = WordBank.random(3);
    current = new TypingWord(currentWord.kana);
    UI.setWord(currentWord.text);
    UI.setProgress('', current.left);
  }

  // ── 入力 ──────────────────────────────────────────
  let lastComboMult = 1, keyPop = 0;
  function onChar(ch) {
    audio.unlock();
    if (!game.running || !current) return;
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
    UI.bumpPanel();
    const cm = game.comboMult;
    const pos = randomPos();
    particles.burst(pos.x, pos.y, game.particlesPerKey, cornKey(), 1.1 + Math.min(1, cm * 0.04));
    const gs = gainStyle(cm);
    particles.addText(pos.x, pos.y - 6, '+' + FORMAT.fmt(gain), gs.color, gs.size);
    keyPop ^= 1;
    audio.play('metal', keyPop ? 1.06 : 0.92, 0.6);
    UI.setScore(game.runScore);
    UI.showCombo(game.combo, Math.round(cm * 10) / 10);
    if (cm > lastComboMult) {
      lastComboMult = cm;
      UI.pulseCombo();
      fireworksAcross(2, 4, cornKey(), 1.6);
      audio.play('result', 1.1, 0.45);
    }
    if (r.status === 'complete') {
      game.completeWord(currentWord.kana.length);
      fireworksAcross(1, 4, cornKey(), 1.4);
      nextWord();
    }
  }
  function onBackspace() { if (current && game.running) { const r = current.backspace(); UI.setProgress(r.done, r.left); } }
  function onEnter() { if (game.running && current) nextWord(); }   // むずいお題はスキップ

  attachKeyInput({ onChar, onBackspace, onEnter, isActive: () => game.running });

  // ── 画面遷移 ──────────────────────────────────────
  function gotoTitle() { UI.setTitleBest(Leaderboard.localBest()); UI.show('title'); }
  function gotoShop() { UI.refreshShop(game); UI.show('shop'); }

  let countdownTimer = null;
  function startGameFlow() {
    audio.unlock();
    UI.show('play');
    particles.resize();
    UI.setScoreIcon(cornKey());
    UI.setScore(0); UI.showCombo(0, 1); lastComboMult = 1;
    UI.setTime(game.runSeconds, game.runSeconds);
    nextWord();
    // カウントダウン
    let n = cfg.run.countdown;
    UI.setCountdown(n);
    audio.play('pop1', 1.2, 0.5);
    clearInterval(countdownTimer);
    countdownTimer = setInterval(() => {
      n--;
      if (n > 0) { UI.setCountdown(n); audio.play('pop1', 1.2, 0.5); }
      else if (n === 0) { UI.setCountdown(0); audio.play('result', 1.2, 0.6); }
      else { clearInterval(countdownTimer); UI.setCountdown(null); game.startRun(); }
    }, 700);
  }

  let lastTs = 0, currentBoard = 'local';
  async function finishRun(res) {
    audio.play('result', 1, 0.8);
    fireworksAcross(6, 6, 'gold', 2.2);
    UI.showResult(res);
    UI.show('result');
    game.save();
    // ランキング登録
    let name = localStorage.getItem('popcorn-typing-name');
    if (!name) {
      name = (prompt('ランキングに のせる なまえは？（12文字まで）', '') || 'ぼうけんしゃ').slice(0, 12);
      localStorage.setItem('popcorn-typing-name', name);
    }
    const r = await Leaderboard.submit(name, res.score, { wpm: res.wpm });
    lastTs = r.entry.ts;
    UI.setRankLine(r.localRank > 0 ? `自己ベスト ${r.localRank}位！` : 'ナイスプレイ！');
    renderBoard(currentBoard);
  }

  function renderBoard(which) {
    currentBoard = which;
    document.querySelectorAll('.rank-tab').forEach(b => b.classList.toggle('active', b.dataset.board === which));
    if (which === 'local') {
      UI.renderRankList(Leaderboard.localTop(), lastTs);
    } else {
      if (!Leaderboard.globalEnabled) {
        UI.el.rankList.innerHTML = '<div class="rank-empty">世界ランキングは準備中だよ🌍<br>（サーバー設定でON）</div>';
        return;
      }
      UI.renderRankList(null);
      Leaderboard.globalTop().then(g => { if (currentBoard === 'global') UI.renderRankList(g, lastTs); });
    }
  }

  // ── ショップ操作 ──────────────────────────────────
  const shopHandlers = {
    buyVariety(i) {
      if (i === game.varietyIndex + 1 && game.buyVariety()) {
        audio.play('result', 1.2, 0.6);
        UI.boughtFlash(UI.varietyCards[i].el);
        UI.setScoreIcon(cornKey());
        UI.refreshShop(game); game.save();
      } else { audio.play('pop1', 0.5, 0.3); }
    },
    buyArtifact(id) {
      if (game.buyArtifact(id)) {
        audio.play('result', 1.3, 0.55);
        UI.boughtFlash(UI.artifactCards[id].el);
        UI.refreshShop(game); game.save();
      } else { audio.play('pop1', 0.5, 0.3); }
    },
  };
  UI.buildShop(game, shopHandlers);

  // ── ボタン配線 ────────────────────────────────────
  document.getElementById('to-play').addEventListener('click', startGameFlow);
  document.getElementById('to-shop').addEventListener('click', gotoShop);
  document.getElementById('shop-back').addEventListener('click', gotoTitle);
  document.getElementById('shop-start').addEventListener('click', startGameFlow);
  document.getElementById('result-shop').addEventListener('click', gotoShop);
  document.getElementById('result-retry').addEventListener('click', startGameFlow);
  document.querySelectorAll('.rank-tab').forEach(b => b.addEventListener('click', () => renderBoard(b.dataset.board)));

  // ── ループ ────────────────────────────────────────
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (game.running) {
      const res = game.tickTime(dt);
      UI.setTime(game.timeLeft, game.runSeconds);
      if (res) finishRun(res);
    }
    particles.update(dt);
    particles.draw();
    requestAnimationFrame(loop);
  }

  gotoTitle();
  requestAnimationFrame(loop);
})();
