/*
 * ============================================================
 *  UI 描画  (ui.js)
 * ============================================================
 *  画面の更新だけを担当（ゲームロジックは持たない）。
 *  - 上部HUD：所持/CPS/レベル/1打鍵/施設ストリップ/チートバッジ
 *  - 中央：容器（目的）＋タイピング
 *  - 左上：レベルUPボタン（中央と重ならない位置）
 * ============================================================
 */
const UI = {
  cfg: null, el: {}, facElems: [], facCount: [],

  init(cfg) {
    this.cfg = cfg;
    const $ = (id) => document.getElementById(id);
    this.el = {
      popcorn: $('popcorn-count'), cps: $('cps-count'), perChar: $('perchar-count'),
      level: $('level-count'), hudCorn: $('hud-corn-icon'), cheatBadge: $('cheat-badge'),
      facilityStrip: $('facility-strip'),
      wordDisplay: $('word-display'), romajiDone: $('romaji-done'), romajiLeft: $('romaji-left'),
      typingPanel: $('typing-panel'),
      genFill: $('gen-fill'), genLabel: $('gen-label'),
      comboBadge: $('combo-badge'), comboNum: $('combo-num'), comboMult: $('combo-mult'),
      containerName: $('container-name'), containerBox: $('container-box'),
      containerFill: $('container-fill'), containerAmount: $('container-amount'),
      containerBarFill: $('container-bar-fill'),
      levelupBtn: $('levelup-btn'), luCost: $('lu-cost'),
      cheatModal: $('cheat-modal'),
      toastArea: $('toast-area'),
    };
  },

  // 施設を「見える購入ボタン」として上部に並べる（自動で買われるが手動も可）
  buildFacilities(game, handlers) {
    this.el.facilityStrip.innerHTML = '';
    this.facElems = game.cfg.equipment.map((e, i) => {
      const d = document.createElement('button');
      d.className = 'fac';
      d.title = e.name;
      d.innerHTML = `<img src="${ASSETS.imgUrl(e.img)}" alt="${e.name}"><span class="fac-n"></span><span class="fac-cost"></span>`;
      d.addEventListener('click', () => handlers.buyEquip(i));
      this.el.facilityStrip.appendChild(d);
      return { el: d, n: d.querySelector('.fac-n'), cost: d.querySelector('.fac-cost') };
    });
    this.facCount = game.equip.slice();
  },
  updateFacilities(game) {
    const F = FORMAT;
    for (let i = 0; i < this.facElems.length; i++) {
      const f = this.facElems[i], c = game.equip[i];
      const cost = game.equipCost(i);
      const can = game.popcorn >= cost;
      f.n.textContent = c > 0 ? '×' + c : '';
      f.cost.textContent = '🍿' + F.fmt(cost);
      f.el.classList.toggle('owned', c > 0);
      f.el.classList.toggle('affordable', can);
      if (c > (this.facCount[i] || 0)) {   // 増えたらバウンド
        f.el.classList.remove('bump'); void f.el.offsetWidth; f.el.classList.add('bump');
      }
      this.facCount[i] = c;
    }
  },

  setCornSprite(imgKey) { this.el.hudCorn.src = ASSETS.imgUrl(imgKey); },

  // ── 毎フレーム更新 ──────────────────────────────────
  refresh(game) {
    const F = FORMAT;
    this.el.popcorn.textContent = F.fmt(game.popcorn);
    this.el.cps.textContent = F.fmtRate(game.cps);
    this.el.perChar.textContent = F.fmt(game.perChar);
    this.el.level.textContent = game.level;
    this.el.cheatBadge.classList.toggle('hidden', !game.cheatActive);

    // レベルUPボタン
    this.el.luCost.textContent = '🍿' + F.fmt(game.levelCost);
    this.el.levelupBtn.classList.toggle('affordable', game.canLevelUp);

    this.updateFacilities(game);
    this.updateContainer(game);
  },

  updateContainer(game) {
    const c = game.containerState();
    this.el.containerName.textContent = c.name;
    const pct = c.pct * 100;
    this.el.containerFill.style.height = pct.toFixed(1) + '%';
    this.el.containerBarFill.style.width = pct.toFixed(1) + '%';
    this.el.containerAmount.textContent = FORMAT.fmt(c.filled) + ' / ' + FORMAT.fmt(c.cap);
  },
  clearContainerAnim() {
    const b = this.el.containerBox;
    b.classList.remove('clear'); void b.offsetWidth; b.classList.add('clear');
  },

  // ── タイピング表示 ──────────────────────────────────
  setWord(text) { this.el.wordDisplay.textContent = text; },
  setProgress(done, left) { this.el.romajiDone.textContent = done; this.el.romajiLeft.textContent = left; },
  bumpCorn() { const p = this.el.typingPanel; p.classList.remove('bump'); void p.offsetWidth; p.classList.add('bump'); },
  flashMiss() { const p = this.el.typingPanel; p.classList.remove('miss'); void p.offsetWidth; p.classList.add('miss'); },
  setGen(rate, scale) {
    const pct = Math.max(0, Math.min(100, (Math.log10(rate + 1) / Math.log10(scale + 1)) * 100));
    this.el.genFill.style.height = pct.toFixed(0) + '%';
    this.el.genLabel.innerHTML = FORMAT.fmtRate(rate) + '<small>粒/秒</small>';
  },
  flashLevelup() {
    const b = this.el.levelupBtn;
    b.classList.remove('pressed'); void b.offsetWidth; b.classList.add('pressed');
    setTimeout(() => b.classList.remove('pressed'), 440);
  },

  // ── コンボ ──────────────────────────────────────────
  showCombo(combo, mult) {
    const b = this.el.comboBadge;
    if (combo >= 2) { b.classList.remove('hidden'); this.el.comboNum.textContent = combo; this.el.comboMult.textContent = '×' + mult; }
    else b.classList.add('hidden');
  },
  pulseCombo() { const b = this.el.comboBadge; b.classList.remove('pulse'); void b.offsetWidth; b.classList.add('pulse'); },

  // ── チートモーダル ──────────────────────────────────
  showCheatModal() { this.el.cheatModal.classList.remove('hidden'); },
  hideCheatModal() { this.el.cheatModal.classList.add('hidden'); },

  // ── トースト ────────────────────────────────────────
  toast(msg, opts = {}) {
    const t = document.createElement('div');
    t.className = 'toast' + (opts.good ? ' good' : '') + (opts.big ? ' big' : '');
    t.textContent = msg;
    this.el.toastArea.appendChild(t);
    setTimeout(() => t.remove(), 3200);
  },
};
window.UI = UI;
