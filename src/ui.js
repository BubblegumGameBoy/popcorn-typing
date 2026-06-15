/*
 * ============================================================
 *  UI 描画  (ui.js)
 * ============================================================
 *  DOM の組み立てと更新だけを担当（ゲームロジックは持たない）。
 *  ショップは一度だけ build し、毎フレーム refresh で数値/購入可否を更新。
 * ============================================================
 */

const UI = {
  el: {},
  cfg: null,
  shopBuilt: false,

  init(cfg) {
    this.cfg = cfg;
    const $ = (id) => document.getElementById(id);
    this.el = {
      popcorn: $('popcorn-count'), cps: $('cps-count'), perChar: $('perchar-count'),
      level: $('level-count'),
      salt: $('salt-count'), saltIcon: $('salt-icon'), hudCorn: $('hud-corn-icon'),
      cornSprite: $('corn-sprite'), wordDisplay: $('word-display'),
      romajiDone: $('romaji-done'), romajiLeft: $('romaji-left'),
      typingPanel: $('typing-panel'),
      comboBadge: $('combo-badge'), comboNum: $('combo-num'), comboMult: $('combo-mult'),
      pileFill: $('pile-fill'), pileLabel: $('pile-label'),
      khVariety: $('kh-variety'), khLevel: $('kh-level'), khEquip: $('kh-equip'),
      stage: $('stage'), worldWatermark: $('world-watermark'),
      slots: ['slot-tier0', 'slot-tier1', 'slot-tier2'].map(id => {
        const el = $(id);
        return { el, img: el.querySelector('img'), count: el.querySelector('.equip-count'), pick: -1 };
      }),
      tabVariety: $('tab-variety'), tabEquip: $('tab-equip'), tabPrestige: $('tab-prestige'),
      toastArea: $('toast-area'),
    };
    // アイコン類
    this.el.saltIcon.src = ASSETS.imgUrl('salt');
    // タブ切り替え
    document.querySelectorAll('.tab').forEach(btn => {
      btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
    });
  },

  // 数字キーヒントの表示更新
  _kh(costEl, key, costText, affordable, maxed) {
    costEl.textContent = maxed ? 'MAX' : '🍿' + costText;
    const btn = costEl.closest('.key-hint');
    if (btn) {
      btn.classList.toggle('affordable', affordable && !maxed);
      btn.classList.toggle('locked', !affordable && !maxed);
      btn.classList.toggle('maxed', maxed);
    }
  },

  switchTab(name) {
    document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('tab-' + name).classList.add('active');
  },

  // ── 初回ビルド ──────────────────────────────────────
  buildShop(game, handlers) {
    this.handlers = handlers;
    // 品種
    this.el.tabVariety.innerHTML = '';
    this.varietyRows = this.cfg.varieties.map((v, i) => {
      const row = this._itemRow(v.img, v.name, v.desc);
      row.addEventListener('click', () => handlers.buyVariety(i));
      this.el.tabVariety.appendChild(row.el);
      return row;
    });
    // 設備
    this.el.tabEquip.innerHTML = '';
    this.equipRows = this.cfg.equipment.map((e, i) => {
      const row = this._itemRow(e.img, e.name, e.desc);
      row.addEventListener('click', () => handlers.buyEquip(i));
      this.el.tabEquip.appendChild(row.el);
      return row;
    });
    // 転生
    this._buildPrestige(handlers);
    // 数字キーのヒントボタン（クリックでも数字キーと同じ動作）
    document.querySelectorAll('.key-hint').forEach(btn => {
      btn.addEventListener('click', () => handlers.onDigit && handlers.onDigit(btn.dataset.key));
    });
    this.shopBuilt = true;
  },

  _itemRow(imgKey, name, desc) {
    const el = document.createElement('div');
    el.className = 'shop-item';
    el.innerHTML =
      `<img src="${ASSETS.imgUrl(imgKey)}" alt="">
       <div class="si-body">
         <div class="si-name">${name}</div>
         <div class="si-desc">${desc}</div>
         <div class="si-meta"><span class="si-cost"></span><span class="si-owned"></span></div>
         <div class="si-rate"></div>
       </div>`;
    return {
      el,
      cost: el.querySelector('.si-cost'),
      owned: el.querySelector('.si-owned'),
      rate: el.querySelector('.si-rate'),
      addEventListener: (...a) => el.addEventListener(...a),
    };
  },

  _buildPrestige(handlers) {
    const p = this.el.tabPrestige;
    p.innerHTML =
      `<div class="prestige-box">
        <img class="salt-big" src="${ASSETS.imgUrl('salt')}" alt="salt">
        <h3>お店を売却して転生</h3>
        <p>すべてを失うかわりに <b>伝説の塩</b> を手に入れる。<br>塩1個につき<b>ぜんぶの生産が +10%</b>、ずっと続く。</p>
        <p>今ここで売ると…</p>
        <div class="prestige-gain"><span id="salt-gain">0</span> 個の塩</div>
        <p id="prestige-after"></p>
        <button id="prestige-btn" disabled>まだ早い…</button>
        <p id="prestige-hint" style="margin-top:10px;"></p>
        <button class="reset-link" id="hard-reset">▸ 最初から完全リセット</button>
      </div>`;
    document.getElementById('prestige-btn').addEventListener('click', handlers.prestige);
    document.getElementById('hard-reset').addEventListener('click', handlers.hardReset);
    this.el.saltGain = document.getElementById('salt-gain');
    this.el.prestigeBtn = document.getElementById('prestige-btn');
    this.el.prestigeAfter = document.getElementById('prestige-after');
    this.el.prestigeHint = document.getElementById('prestige-hint');
  },

  // ── 毎フレーム更新 ──────────────────────────────────
  refresh(game) {
    const F = FORMAT;
    this.el.popcorn.textContent = F.fmt(game.popcorn);
    this.el.cps.textContent = F.fmtRate(game.cps);
    this.el.perChar.textContent = F.fmt(game.perChar);
    this.el.level.textContent = game.level;
    this.el.salt.textContent = F.fmt(game.salt);

    // 数字キーのヒント（コスト＋購入可否）
    const nv = game.nextVariety;
    this._kh(this.el.khVariety, '1', nv ? F.fmt(nv.cost) : 'MAX', nv ? game.popcorn >= nv.cost : false, !nv);
    this._kh(this.el.khLevel, '2', F.fmt(game.levelCost), game.canLevelUp, false);
    let cheapest = Infinity;
    for (let i = 0; i < this.cfg.equipment.length; i++) cheapest = Math.min(cheapest, game.equipCost(i));
    this._kh(this.el.khEquip, '3', F.fmt(cheapest), game.popcorn >= cheapest, false);

    // 品種
    this.varietyRows.forEach((row, i) => {
      const v = this.cfg.varieties[i];
      if (i <= game.varietyIndex) {
        row.cost.textContent = i === game.varietyIndex ? '使用中' : '解放ずみ';
        row.cost.classList.remove('cant');
        row.owned.textContent = '';
        row.rate.textContent = `1打鍵 ${F.fmt(v.perChar)} 粒`;
        row.el.classList.remove('locked', 'affordable');
        if (i === game.varietyIndex) row.el.classList.add('affordable');
      } else if (i === game.varietyIndex + 1) {
        const can = game.popcorn >= v.cost;
        row.cost.textContent = '🍿 ' + F.fmt(v.cost);
        row.cost.classList.toggle('cant', !can);
        row.owned.textContent = '研究する';
        row.rate.textContent = `1打鍵 ${F.fmt(v.perChar)} 粒`;
        row.el.classList.toggle('affordable', can);
        row.el.classList.toggle('locked', !can);
      } else {
        row.cost.textContent = '？？？';
        row.cost.classList.add('cant');
        row.owned.textContent = '';
        row.rate.textContent = '';
        row.el.classList.add('locked');
        row.el.classList.remove('affordable');
      }
    });

    // 設備
    this.equipRows.forEach((row, i) => {
      const e = this.cfg.equipment[i];
      const cost = game.equipCost(i);
      const can = game.popcorn >= cost;
      row.cost.textContent = '🍿 ' + F.fmt(cost);
      row.cost.classList.toggle('cant', !can);
      row.owned.textContent = '×' + game.equip[i];
      row.rate.textContent = `+${F.fmtRate(e.cps)} 粒/秒` + (game.equip[i] > 0 ? `（計 ${F.fmtRate(e.cps * game.equip[i])}）` : '');
      row.el.classList.toggle('affordable', can);
      row.el.classList.toggle('locked', !can);
    });

    // 転生
    const gain = game.saltGain;
    this.el.saltGain.textContent = F.fmt(gain);
    const newMult = 1 + (game.salt + gain) * this.cfg.prestige.saltMult;
    this.el.prestigeAfter.textContent = gain > 0
      ? `全生産が ×${newMult.toFixed(1)} になるよ`
      : 'もっと焼いてから売ろう';
    if (game.canPrestige) {
      this.el.prestigeBtn.disabled = false;
      this.el.prestigeBtn.textContent = `🧂 売却して塩 ${F.fmt(gain)} 個もらう`;
      this.el.prestigeHint.textContent = gain < 5 ? 'もう少し粘ると塩がドカッと増えるよ👀' : 'いい頃合い！一気に強くなる✨';
    } else {
      this.el.prestigeBtn.disabled = true;
      this.el.prestigeBtn.textContent = 'まだ早い…';
      this.el.prestigeHint.textContent = `あと ${F.fmt(Math.max(0, this.cfg.prestige.base - game.totalAllTime))} 粒で塩1個`;
    }

    // 山盛りメーター（次の塩1個までの進捗）
    this._updatePile(game);

    // ステージ上の設備
    this.updateEquipStage(game);
  },

  // ステージ各層の「代表設備」を表示（全部出すとうるさいので層ごと1台＝最上位）
  //   tier0: フライパン/＋おばあちゃん  tier1: レンジ/映画館/ポン菓子  tier2: 工場
  //   ワールドは中央の透かしとして別表示。
  EQUIP_TIERS: [[0, 1], [2, 3, 4], [5]],
  updateEquipStage(game) {
    this.EQUIP_TIERS.forEach((cand, t) => {
      let pick = -1;
      for (const i of cand) if (game.equip[i] > 0) pick = i;   // 最上位の所有
      const slot = this.el.slots[t];
      if (pick >= 0) {
        if (slot.pick !== pick) { slot.img.src = ASSETS.imgUrl(this.cfg.equipment[pick].img); slot.pick = pick; }
        slot.el.classList.remove('hidden');
        slot.count.textContent = game.equip[pick] > 1 ? '×' + game.equip[pick] : '';
      } else {
        slot.el.classList.add('hidden'); slot.pick = -1;
      }
    });
    // ワールド（最上位）＝中央の透かし
    const w = this.el.worldWatermark;
    if (game.equip[6] > 0) {
      if (!w.src) w.src = ASSETS.imgUrl(this.cfg.equipment[6].img);
      w.classList.remove('hidden');
    } else w.classList.add('hidden');
  },

  // 「○○を手に入れた！」フキダシ（要素の上に出す）
  equipBubble(targetEl, text) {
    if (!targetEl) return;
    const sr = this.el.stage.getBoundingClientRect();
    const tr = targetEl.getBoundingClientRect();
    const b = document.createElement('div');
    b.className = 'equip-bubble';
    b.textContent = text;
    b.style.left = (tr.left + tr.width / 2 - sr.left) + 'px';
    b.style.top = (tr.top - sr.top + 8) + 'px';
    this.el.stage.appendChild(b);
    setTimeout(() => b.remove(), 2600);
  },

  _updatePile(game) {
    // 現在塩→次の塩 までの総生産進捗（sqrt曲線の逆算）
    const base = this.cfg.prestige.base;
    const cur = game.salt;
    const lo = base * cur * cur;
    const hi = base * (cur + 1) * (cur + 1);
    const ratio = Math.max(0, Math.min(1, (game.totalAllTime - lo) / (hi - lo)));
    this.el.pileFill.style.width = (ratio * 100).toFixed(1) + '%';
    this.el.pileLabel.textContent = game.canPrestige
      ? `🧂 転生できる！（塩 +${FORMAT.fmt(game.saltGain)}）`
      : `次の塩まで ${(ratio * 100).toFixed(0)}%`;
  },

  // ── タイピング表示 ──────────────────────────────────
  setWord(text) { this.el.wordDisplay.textContent = text; },
  setProgress(done, left) {
    this.el.romajiDone.textContent = done;
    this.el.romajiLeft.textContent = left;
  },
  setCornSprite(imgKey) {
    const url = ASSETS.imgUrl(imgKey);
    this.el.cornSprite.src = url;
    this.el.hudCorn.src = url;
  },
  bumpCorn() {
    const c = this.el.cornSprite;
    c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump');
  },
  flashMiss() {
    const p = this.el.typingPanel;
    p.classList.remove('miss'); void p.offsetWidth; p.classList.add('miss');
  },

  // ── コンボ ──────────────────────────────────────────
  showCombo(combo, mult) {
    const b = this.el.comboBadge;
    if (combo >= 2) {
      b.classList.remove('hidden');
      this.el.comboNum.textContent = combo;
      this.el.comboMult.textContent = '×' + mult;
    } else {
      b.classList.add('hidden');
    }
  },
  pulseCombo() {
    const b = this.el.comboBadge;
    b.classList.remove('pulse'); void b.offsetWidth; b.classList.add('pulse');
  },

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
