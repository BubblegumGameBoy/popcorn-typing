/*
 * ============================================================
 *  メイン / 統合  (main.js)
 * ============================================================
 *  すべてを配線して動かす。
 *  入力(typing-engine) → ゲーム状態(game) → 演出(effects) / 表示(ui)
 * ============================================================
 */
(function () {
  const cfg = CONFIG;

  // ── 準備 ──────────────────────────────────────────
  const images = ASSETS.preloadImages();
  const game = GAME.Game.loadFrom(cfg);
  const audio = new FX.AudioKit();
  audio.loadSE('pop1', ASSETS.audioUrl('pop1'));
  audio.loadSE('pop2', ASSETS.audioUrl('pop2'));
  audio.loadSE('metal', ASSETS.audioUrl('popMetal'));
  audio.loadSE('result', ASSETS.audioUrl('result'));
  audio.loadBGM(ASSETS.audioUrl('bgm'));

  // 背景
  document.getElementById('bg').style.backgroundImage = `url("${ASSETS.imgUrl('park')}")`;

  UI.init(cfg);
  const canvas = document.getElementById('fx-canvas');
  const particles = new FX.ParticleSystem(canvas, images, cfg.fx.maxParticles);

  // ── お題の管理 ────────────────────────────────────
  let current = null;     // TypingWord
  let currentWord = null; // {text, kana}

  function nextWord() {
    // 進行に応じて少しずつ難しめも混ぜる（難易度上限は品種で開放）
    const maxDiff = Math.min(3, 1 + game.varietyIndex);
    currentWord = WordBank.random(maxDiff);
    current = new TypingWord(currentWord.kana);
    UI.setWord(currentWord.text);
    UI.setProgress('', current.left);
  }

  // ── 演出ヘルパ ────────────────────────────────────
  function spawnPoint() {
    const cr = canvas.getBoundingClientRect();
    const sp = UI.el.cornSprite.getBoundingClientRect();
    return { x: sp.left + sp.width / 2 - cr.left, y: sp.top + sp.height / 2 - cr.top };
  }
  function cornKey() { return game.variety.img; }

  let lastComboMult = 1;

  // ── 入力ハンドラ ──────────────────────────────────
  function onChar(ch) {
    audio.unlock();
    if (!current) return;
    const r = current.press(ch);

    if (r.status === 'reject') {
      game.miss();
      UI.flashMiss();
      UI.showCombo(0, 1);
      lastComboMult = 1;
      // ミスは焦げポップで軽くフィードバック
      const p = spawnPoint();
      particles.burst(p.x, p.y, 1, 'charcoal', 0.6);
      return;
    }

    // 正解打鍵
    const gain = game.typeChar();
    UI.setProgress(r.done, r.left);
    UI.bumpCorn();
    const p = spawnPoint();
    particles.burst(p.x, p.y, cfg.fx.typePop, cornKey(), 1);
    // ピッチを少し揺らして連打を気持ちよく
    audio.play(Math.random() < 0.5 ? 'pop1' : 'pop2', 0.92 + Math.random() * 0.28, 0.5);

    // コンボ更新
    const cm = game.comboMult;
    UI.showCombo(game.combo, cm);
    if (cm > lastComboMult) {
      lastComboMult = cm;
      UI.pulseCombo();
      particles.burst(p.x, p.y, cfg.fx.comboBurst, cornKey(), 1.6);
      audio.play('metal', 1, 0.6);
      UI.toast(`コンボ ×${cm}！`, { good: true });
    }

    if (r.status === 'complete') {
      const bonus = game.completeWord(currentWord.kana.length);
      // ターンッ！と大破裂
      particles.burst(p.x, p.y, cfg.fx.wordBurst, cornKey(), 2);
      audio.play('metal', 1.1, 0.7);
      checkUnlockHints();
      nextWord();
    }
  }

  function onBackspace() {
    if (!current) return;
    const r = current.backspace();
    UI.setProgress(r.done, r.left);
  }

  function onEnter() {
    // むずかしいお題はEnterで次へ（コンボは維持。ボーナスなし）
    audio.unlock();
    if (current) nextWord();
  }

  // ── 進行ヒント（品種解放など気づきを促す） ──────────
  let hintedVariety = -1;
  function checkUnlockHints() {
    const nv = game.nextVariety;
    if (nv && game.popcorn >= nv.cost && hintedVariety < game.varietyIndex) {
      hintedVariety = game.varietyIndex;
      UI.toast(`🌽「${nv.name}」が研究できる！ショップを見て`, { good: true });
    }
  }

  // ── 購入ハンドラ ──────────────────────────────────
  const handlers = {
    buyVariety(i) {
      if (i !== game.varietyIndex + 1) return;
      if (game.buyVariety()) {
        UI.setCornSprite(cornKey());
        UI.toast(`🌽 ${game.variety.name} を研究した！`, { good: true, big: true });
        audio.play('result', 1.2, 0.5);
        const p = spawnPoint();
        particles.burst(p.x, p.y, 30, cornKey(), 2.2);
      }
    },
    buyEquip(i) {
      if (game.buyEquip(i)) {
        audio.play('pop1', 0.8, 0.5);
        if (game.equip[i] === 1) UI.toast(`⚙️ ${cfg.equipment[i].name} を設置！`, { good: true });
      }
    },
    prestige() {
      const gain = game.saltGain;
      if (!game.canPrestige) return;
      if (!confirm(`お店を売却して転生します。\n塩を ${FORMAT.fmt(gain)} 個もらい、全生産が永続で強くなります。\nポップコーンと設備はリセットされます。よろしい？`)) return;
      game.prestige();
      audio.play('result', 1, 0.8);
      UI.setCornSprite(cornKey());
      UI.toast(`🧂 転生！ 塩 ${FORMAT.fmt(game.salt)} 個（全生産 ×${(game.globalMult).toFixed(1)}）`, { good: true, big: true });
      // 黄金の大破裂
      const p = spawnPoint();
      particles.burst(p.x, p.y, 60, 'gold', 2.5);
      hintedVariety = -1;
      nextWord();
      game.save();
    },
    hardReset() {
      if (!confirm('セーブを消して最初から完全にやり直します。本当に？')) return;
      game.hardReset();
      UI.setCornSprite(cornKey());
      hintedVariety = -1;
      nextWord();
      game.save();
      UI.toast('🔄 最初からスタート！');
    },
  };

  // ── メインループ ──────────────────────────────────
  let last = performance.now();
  let acc = 0;       // UI更新の間引き
  function loop(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    game.tick(dt);
    particles.update(dt);
    particles.draw();
    acc += dt;
    if (acc >= 0.1) { acc = 0; UI.refresh(game); }  // 数値は10fpsで十分
    requestAnimationFrame(loop);
  }

  // ── 起動 ──────────────────────────────────────────
  function startGame() {
    document.getElementById('title-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
    particles.resize();

    UI.setCornSprite(cornKey());
    UI.buildShop(game, handlers);
    UI.refresh(game);
    nextWord();

    // オフライン生産
    const off = game.applyOffline();
    if (off.gain > 1) {
      const mins = Math.round(off.seconds / 60);
      UI.toast(`🍿 留守の${mins >= 60 ? Math.round(mins/60)+'時間' : mins+'分'}で ${FORMAT.fmt(off.gain)} 粒 焼けてたよ！`, { good: true, big: true });
    }

    // 入力
    attachKeyInput({ onChar, onBackspace, onEnter, isActive: () => true });

    // ミュート
    document.getElementById('mute-btn').addEventListener('click', (e) => {
      const muted = audio.toggleMute();
      e.target.textContent = muted ? '🔇' : '🔊';
    });

    audio.unlock();
    requestAnimationFrame(loop);

    // オートセーブ
    setInterval(() => game.save(), cfg.save.intervalMs);
    window.addEventListener('beforeunload', () => game.save());
  }

  document.getElementById('start-btn').addEventListener('click', startGame);
})();
