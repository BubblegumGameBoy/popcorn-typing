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
      khLevel: $('kh-level'), khEquip: $('kh-equip'), khVariety: $('kh-variety'),
      cheatModal: $('cheat-modal'),
      toastArea: $('toast-area'),
    };
  },

  // 施設を上部に大きめ表示（表示専用。購入は下のボタンで）
  buildFacilities(game) {
    this.el.facilityStrip.innerHTML = '';
    this.facElems = game.cfg.equipment.map((e) => {
      const d = document.createElement('div');
      d.className = 'fac hidden';
      d.title = e.name;
      d.innerHTML = `<img src="${ASSETS.imgUrl(e.img)}" alt="${e.name}"><span class="fac-n"></span>`;
      this.el.facilityStrip.appendChild(d);
      return { el: d, n: d.querySelector('.fac-n') };
    });
    this.facCount = game.equip.slice();
  },
  updateFacilities(game) {
    for (let i = 0; i < this.facElems.length; i++) {
      const f = this.facElems[i], c = game.equip[i];
      f.el.classList.toggle('hidden', c <= 0);
      if (c > 0) {
        f.n.textContent = '×' + c;
        if (c > (this.facCount[i] || 0)) { f.el.classList.remove('bump'); void f.el.offsetWidth; f.el.classList.add('bump'); }
      }
      this.facCount[i] = c;
    }
  },

  // 入力下のボタン（コスト＋購入可否）
  _kh(costEl, costText, affordable, maxed) {
    costEl.textContent = maxed ? 'MAX' : '🍿' + costText;
    const btn = costEl.closest('.key-hint');
    if (btn) {
      btn.classList.toggle('affordable', affordable && !maxed);
      btn.classList.toggle('locked', !affordable && !maxed);
    }
  },
  flashKeyHint(key, ok) {
    const btn = document.querySelector('.key-hint[data-key="' + key + '"]');
    if (!btn) return;
    const cls = ok ? 'pressed' : 'press-fail';
    btn.classList.remove(cls); void btn.offsetWidth; btn.classList.add(cls);
    setTimeout(() => btn.classList.remove(cls), 420);
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

    // 入力下のボタン：1=レベル / 2=施設(高い順) / 3=品種
    this._kh(this.el.khLevel, F.fmt(game.levelCost), game.canLevelUp, false);
    const eqi = game.nextEquipIndex();
    const eqCost = game.equipCost(eqi);
    this._kh(this.el.khEquip, F.fmt(eqCost), game.popcorn >= eqCost, false);
    const nv = game.nextVariety;
    if (nv) this._kh(this.el.khVariety, F.fmt(nv.cost), game.popcorn >= nv.cost, false);
    else this._kh(this.el.khVariety, F.fmt(game.goldLevelCost), game.popcorn >= game.goldLevelCost, false); // 純金レベル研究（天井なし）

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
