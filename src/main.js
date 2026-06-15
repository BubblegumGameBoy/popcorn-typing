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
  window.__game = game;   // デバッグ用（コンソールから状態を覗ける）
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
  function cornCenter() {
    const cr = canvas.getBoundingClientRect();
    const sp = UI.el.cornSprite.getBoundingClientRect();
    return { x: sp.left + sp.width / 2 - cr.left, y: sp.top + sp.height / 2 - cr.top, w: cr.width, h: cr.height };
  }
  function cornKey() { return game.variety.img; }

  // ステージ上の設備（スロット＋ワールド透かし）の発生位置を集める
  function autoEmitters() {
    const cr = canvas.getBoundingClientRect();
    const list = [];
    const add = (el) => {
      if (!el || el.classList.contains('hidden')) return;
      const r = el.getBoundingClientRect();
      if (r.width < 2) return;
      list.push({ x: r.left + r.width / 2 - cr.left, y: r.top + r.height * 0.35 - cr.top });
    };
    UI.el.slots.forEach(s => add(s.el));
    add(UI.el.worldWatermark);
    return list;
  }
  function emitAutoPuff() {
    const es = autoEmitters();
    if (!es.length) return;
    const e = es[Math.floor(Math.random() * es.length)];
    particles.burst(e.x, e.y, 1, cornKey(), 0.7);   // 設備からぽんっと1粒
  }
  // 設備を手に入れたフキダシ
  function showEquipUnlock(i) {
    UI.updateEquipStage(game);
    const target = i === 6 ? UI.el.worldWatermark : UI.el.slots[cfg.equipment[i].tier].el;
    UI.equipBubble(target, `${cfg.equipment[i].name} を手に入れた！`);
  }

  /** 画面全体に散らして弾けさせる（中央だけにしない） */
  function scatterBurst(count, key, power, spread) {
    const c = cornCenter();
    const band = spread === undefined ? 0.7 : spread;   // 横の散らばり（画面幅比）
    for (let i = 0; i < count; i++) {
      const x = c.w * (0.5 + (Math.random() - 0.5) * band);
      const y = c.y + (Math.random() - 0.5) * c.h * 0.35;
      particles.burst(x, y, 1, key, power);
    }
  }

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
      // ミスは焦げポップ＋鈍い音で軽くフィードバック
      scatterBurst(1, 'charcoal', 0.6, 0.2);
      audio.play('pop1', 0.5, 0.3);
      return;
    }

    // 正解打鍵：1打鍵ごとに必ず効果音＋レベルぶんの粒を散らす
    game.typeChar();
    UI.setProgress(r.done, r.left);
    UI.bumpCorn();
    scatterBurst(game.particlesPerKey, cornKey(), 1);
    // ピッチを揺らして連打を気持ちよく（毎回しっかり鳴らす）
    audio.play(Math.random() < 0.5 ? 'pop1' : 'pop2', 0.9 + Math.random() * 0.35, 0.78);

    // コンボ更新
    const cm = game.comboMult;
    UI.showCombo(game.combo, cm);
    if (cm > lastComboMult) {
      lastComboMult = cm;
      UI.pulseCombo();
      scatterBurst(cfg.fx.comboBurst, cornKey(), 1.6, 0.9);
      audio.play('metal', 1, 0.6);
      UI.toast(`コンボ ×${cm}！`, { good: true });
    }

    if (r.status === 'complete') {
      game.completeWord(currentWord.kana.length);
      // ターンッ！と大破裂（画面いっぱいに散らす）
      scatterBurst(cfg.fx.wordBurst, cornKey(), 2, 1.0);
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

  // 数字キーでキーボード完結（マウス不要）
  function onDigit(d) {
    audio.unlock();
    if (d === '1') handlers.buyVariety(game.varietyIndex + 1);
    else if (d === '2') handlers.levelUp();
    else if (d === '3') {
      const r = game.buyBestEquip();
      if (r) {
        audio.play('pop1', 0.8, 0.5);
        if (r.first) showEquipUnlock(r.index);
      } else {
        UI.toast('設備を買う粒が足りない…', {});
      }
    }
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
      if (i !== game.varietyIndex + 1) return false;
      if (game.buyVariety()) {
        UI.setCornSprite(cornKey());
        UI.toast(`🌽 ${game.variety.name} を研究した！`, { good: true, big: true });
        audio.play('result', 1.2, 0.5);
        scatterBurst(30, cornKey(), 2.2, 1.0);
        return true;
      }
      return false;
    },
    buyEquip(i) {
      const first = game.equip[i] === 0;
      if (game.buyEquip(i)) {
        audio.play('pop1', 0.8, 0.5);
        if (first) showEquipUnlock(i);
        return true;
      }
      return false;
    },
    levelUp() {
      if (game.levelUp()) {
        audio.play('metal', 1.25, 0.7);
        UI.bumpCorn();
        UI.toast(`⭐ レベル ${game.level}！ はじける粒が増えた`, { good: true, big: true });
        scatterBurst(20, cornKey(), 2, 1.0);
        return true;
      }
      UI.toast(`レベルアップに ${FORMAT.fmt(game.levelCost)} 粒 必要`, {});
      return false;
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
      scatterBurst(60, 'gold', 2.5, 1.1);
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
    onDigit(d) { onDigit(d); },   // 数字キーヒントのクリック用
  };

  // ── メインループ ──────────────────────────────────
  let last = performance.now();
  let acc = 0;        // UI更新の間引き
  let puffTimer = 0;  // 設備からの自動ポップ間隔
  function loop(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    game.tick(dt);
    // 設備が動いてるのを見せる：CPSに応じて、設備の位置からぽんぽん弾ける（軽め・上限あり）
    if (game.cps > 0) {
      const rate = Math.min(7, 1 + Math.log10(game.cps + 1) * 2.2);
      puffTimer -= dt;
      if (puffTimer <= 0) { puffTimer = 1 / rate; emitAutoPuff(); }
    }
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
    attachKeyInput({ onChar, onBackspace, onEnter, onDigit, isActive: () => true });

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
