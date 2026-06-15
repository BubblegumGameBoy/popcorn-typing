/*
 * ============================================================
 *  UI 描画  (ui.js)  ― スコアアタック版
 * ============================================================
 *  画面（タイトル/ショップ/プレイ/リザルト）の切替と描画。
 * ============================================================
 */
const UI = {
  cfg: null, el: {},

  init(cfg) {
    this.cfg = cfg;
    const $ = (id) => document.getElementById(id);
    this.el = {
      screens: {
        title: $('title-screen'), shop: $('shop-screen'),
        play: $('play-screen'), result: $('result-screen'),
      },
      titleBest: $('title-best'),
      shopBank: $('shop-bank'), shopVarieties: $('shop-varieties'), shopArtifacts: $('shop-artifacts'),
      timeLeft: $('time-left'), runScore: $('run-score'), scoreIcon: $('score-icon'),
      timeBarFill: $('time-bar-fill'),
      playCombo: $('play-combo'), playComboNum: $('play-combo-num'), playComboMult: $('play-combo-mult'),
      wordDisplay: $('word-display'), romajiDone: $('romaji-done'), romajiLeft: $('romaji-left'),
      typingPanel: $('typing-panel'),
      countdown: $('countdown'), countdownNum: $('countdown-num'),
      resultScore: $('result-score'), resultRankline: $('result-rankline'),
      resultWpm: $('result-wpm'), resultAcc: $('result-acc'), resultCombo: $('result-combo'), resultWords: $('result-words'),
      rankList: $('rank-list'),
      toastArea: $('toast-area'),
    };
    this.el.scoreIcon.src = ASSETS.imgUrl('normal');
  },

  show(name) {
    for (const k in this.el.screens) this.el.screens[k].classList.toggle('hidden', k !== name);
  },

  // ── ショップ ────────────────────────────────────────
  buildShop(game, handlers) {
    this.handlers = handlers;
    // 品種
    this.el.shopVarieties.innerHTML = '';
    this.varietyCards = game.cfg.varieties.map((v, i) => {
      const c = this._card(v.img, v.name, v.desc);
      c.el.addEventListener('click', () => handlers.buyVariety(i));
      this.el.shopVarieties.appendChild(c.el);
      return c;
    });
    // アーティファクト
    this.el.shopArtifacts.innerHTML = '';
    this.artifactCards = {};
    game.cfg.artifacts.forEach((a) => {
      const c = this._card(a.img, a.name, a.desc);
      c.el.addEventListener('click', () => handlers.buyArtifact(a.id));
      this.el.shopArtifacts.appendChild(c.el);
      this.artifactCards[a.id] = c;
    });
  },
  _card(imgKey, name, desc) {
    const el = document.createElement('div');
    el.className = 'shop-card';
    el.innerHTML =
      `<img src="${ASSETS.imgUrl(imgKey)}" alt="">
       <div class="sc-body">
         <div class="sc-name">${name} <span class="sc-lv"></span></div>
         <div class="sc-desc">${desc}</div>
         <div class="sc-cost"></div>
       </div>`;
    return { el, lv: el.querySelector('.sc-lv'), cost: el.querySelector('.sc-cost') };
  },
  refreshShop(game) {
    const F = FORMAT;
    this.el.shopBank.textContent = F.fmt(game.bank);
    // 品種
    this.varietyCards.forEach((c, i) => {
      const v = game.cfg.varieties[i];
      c.el.classList.remove('affordable', 'locked', 'maxed');
      if (i <= game.varietyIndex) {
        c.lv.textContent = i === game.varietyIndex ? '使用中' : '取得済';
        c.cost.textContent = `1打鍵 ${F.fmt(v.perChar)}粒`;
        c.el.classList.add('maxed');
      } else if (i === game.varietyIndex + 1) {
        const can = game.bank >= v.cost;
        c.lv.textContent = '';
        c.cost.textContent = '🍿 ' + F.fmt(v.cost);
        c.cost.classList.toggle('cant', !can);
        c.el.classList.add(can ? 'affordable' : 'locked');
      } else {
        c.lv.textContent = '';
        c.cost.textContent = '？？？';
        c.el.classList.add('locked');
      }
    });
    // アーティファクト
    game.cfg.artifacts.forEach((a) => {
      const c = this.artifactCards[a.id];
      const lv = game.artLevel(a.id);
      c.lv.textContent = 'Lv' + lv;
      c.el.classList.remove('affordable', 'locked', 'maxed');
      if (game.artifactMaxed(a.id)) { c.cost.textContent = 'MAX'; c.el.classList.add('maxed'); return; }
      const cost = game.artifactCost(a.id);
      const can = game.bank >= cost;
      c.cost.textContent = '🍿 ' + F.fmt(cost);
      c.cost.classList.toggle('cant', !can);
      c.el.classList.add(can ? 'affordable' : 'locked');
    });
  },
  boughtFlash(cardEl) {
    cardEl.classList.remove('bought'); void cardEl.offsetWidth; cardEl.classList.add('bought');
  },

  setTitleBest(v) { this.el.titleBest.textContent = FORMAT.fmt(v); },

  // ── プレイ ──────────────────────────────────────────
  setTime(sec, total) {
    this.el.timeLeft.textContent = Math.ceil(sec);
    this.el.timeBarFill.style.width = (Math.max(0, sec) / total * 100) + '%';
    this.el.timeLeft.parentElement.classList.toggle('warn', sec <= 10);
  },
  setScore(v) { this.el.runScore.textContent = FORMAT.fmt(v); },
  setWord(t) { this.el.wordDisplay.textContent = t; },
  setProgress(done, left) { this.el.romajiDone.textContent = done; this.el.romajiLeft.textContent = left; },
  setScoreIcon(imgKey) { this.el.scoreIcon.src = ASSETS.imgUrl(imgKey); },
  bumpPanel() { const p = this.el.typingPanel; p.classList.remove('bump'); void p.offsetWidth; p.classList.add('bump'); },
  flashMiss() { const p = this.el.typingPanel; p.classList.remove('miss'); void p.offsetWidth; p.classList.add('miss'); },
  showCombo(combo, mult) {
    const b = this.el.playCombo;
    if (combo >= 2) { b.classList.add('show'); this.el.playComboNum.textContent = combo; this.el.playComboMult.textContent = '×' + mult; }
    else b.classList.remove('show');
  },
  pulseCombo() { const b = this.el.playCombo; b.classList.remove('pulse'); void b.offsetWidth; b.classList.add('pulse'); },
  setCountdown(n) {
    if (n === null) { this.el.countdown.classList.add('hidden'); return; }
    this.el.countdown.classList.remove('hidden');
    this.el.countdownNum.textContent = n > 0 ? n : 'スタート！';
    const e = this.el.countdownNum; e.style.animation = 'none'; void e.offsetWidth; e.style.animation = '';
  },

  // ── リザルト ────────────────────────────────────────
  showResult(res) {
    const F = FORMAT;
    this.el.resultScore.textContent = F.fmt(res.score);
    this.el.resultWpm.textContent = res.wpm;
    this.el.resultAcc.textContent = res.acc;
    this.el.resultCombo.textContent = res.maxCombo;
    this.el.resultWords.textContent = res.words;
    this.el.resultRankline.textContent = '';
  },
  setRankLine(text) { this.el.resultRankline.textContent = text; },
  renderRankList(entries, myTs) {
    const F = FORMAT;
    if (!entries) { this.el.rankList.innerHTML = '<div class="rank-empty">読み込み中…</div>'; return; }
    if (!entries.length) { this.el.rankList.innerHTML = '<div class="rank-empty">まだ記録がないよ</div>'; return; }
    this.el.rankList.innerHTML = entries.map((e, i) =>
      `<li class="${e.ts === myTs ? 'me' : ''}"><span class="rk-pos">${i + 1}</span><span class="rk-name">${this._esc(e.name)}</span><span class="rk-score">🍿${F.fmt(e.score)}</span></li>`
    ).join('');
  },
  _esc(s) { return String(s).replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c])); },

  toast(msg, opts = {}) {
    const t = document.createElement('div');
    t.className = 'toast' + (opts.good ? ' good' : '') + (opts.big ? ' big' : '');
    t.textContent = msg;
    this.el.toastArea.appendChild(t);
    setTimeout(() => t.remove(), 3200);
  },
};
window.UI = UI;
