/*
 * ============================================================
 *  ゲーム状態・経済ロジック  (game.js)
 * ============================================================
 *  数字（スコア）の真実はここ。描画・入力は持たない純粋ロジック。
 *  - 所持/総生産/品種/設備/塩 を保持
 *  - 派生値（1打鍵の粒・CPS・各種倍率）を計算
 *  - 購入・転生・セーブ/ロード・オフライン生産
 * ============================================================
 */

class Game {
  constructor(config) {
    this.cfg = config;
    this.reset(true);
  }

  /** newGame=true なら塩も含め完全初期化（最初の起動用） */
  reset(newGame) {
    this.popcorn = 0;             // 所持
    this.totalRun = 0;            // この周回の総生産
    this.varietyIndex = 0;        // 現在の品種（解放済みの最高位）
    this.equip = this.cfg.equipment.map(() => 0);  // 各設備の所有数
    this.level = 1;               // タイピングレベル（手入力の主軸）
    this.combo = 0;               // 連続ノーミス
    this.maxCombo = 0;
    this.wordsCleared = 0;
    if (newGame) {
      this.totalAllTime = 0;      // 全生産（＝容器の進捗。リセットされない）
      this.containersCleared = 0; // 満タンにした容器の数
      this.cheatUnlocked = false; // クリアで解放
      this.cheatActive = false;   // チート（×100）で遊んでいるか
    }
    this.lastSeen = Date.now();
  }

  // ── 派生値 ──────────────────────────────────────────
  get variety() { return this.cfg.varieties[this.varietyIndex]; }

  /** 全生産倍率（チートモードなら ×100） */
  get globalMult() { return this.cheatActive ? this.cfg.cheat.mult : 1; }

  /** 現在のコンボ倍率 */
  get comboMult() {
    let m = 1;
    for (const tier of this.cfg.combo) if (this.combo >= tier.threshold) m = tier.mult;
    return m;
  }

  /** 1打鍵の基礎（品種 × レベル × 塩）。コンボ前。 */
  get baseOutput() {
    return this.variety.perChar * this.level * this.globalMult;
  }

  /** 1打鍵の獲得粒（コンボこみ） */
  get perChar() {
    return this.baseOutput * this.comboMult;
  }

  /** 1打鍵で飛ばす粒の数（レベルに比例、上限あり） */
  get particlesPerKey() {
    const L = this.cfg.level;
    return Math.max(1, Math.min(L.particleCap, this.level * L.particlePerLevel));
  }

  /** 次のレベルアップ費用 */
  get levelCost() {
    const L = this.cfg.level;
    return Math.floor(L.costBase * Math.pow(L.costGrowth, this.level - 1));
  }
  get canLevelUp() { return this.popcorn >= this.levelCost; }
  levelUp() {
    if (!this.canLevelUp) return false;
    this.popcorn -= this.levelCost;
    this.level++;
    return true;
  }

  /** 毎秒の自動生産（CPS、塩こみ） */
  get cps() {
    let c = 0;
    for (let i = 0; i < this.equip.length; i++) c += this.equip[i] * this.cfg.equipment[i].cps;
    return c * this.globalMult;
  }

  /** 設備 i の現在価格（所有数で上昇） */
  equipCost(i) {
    return Math.floor(this.cfg.equipment[i].cost * Math.pow(this.cfg.equipmentGrowth, this.equip[i]));
  }

  /** 次の品種（あれば） */
  get nextVariety() {
    return this.varietyIndex < this.cfg.varieties.length - 1
      ? this.cfg.varieties[this.varietyIndex + 1] : null;
  }

  // ── 加算 ────────────────────────────────────────────
  _earn(amount) {
    this.popcorn += amount;
    this.totalRun += amount;
    this.totalAllTime += amount;
  }

  /** 1文字正解。獲得粒を返す。 */
  typeChar() {
    this.combo++;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
    const gain = this.perChar;
    this._earn(gain);
    return gain;
  }

  /** ミス。コンボリセット。 */
  miss() { this.combo = 0; }

  /** 1ワード完成ボーナス。獲得粒を返す。 */
  completeWord(charCount) {
    this.wordsCleared++;
    const bonus = charCount * this.baseOutput * this.cfg.wordBonusMult * this.comboMult;
    this._earn(bonus);
    return bonus;
  }

  /** 自動生産を dt 秒ぶん加算 */
  tick(dt) {
    const g = this.cps * dt;
    if (g > 0) this._earn(g);
    return g;
  }

  // ── 購入 ────────────────────────────────────────────
  buyVariety() {
    const nv = this.nextVariety;
    if (!nv || this.popcorn < nv.cost) return false;
    this.popcorn -= nv.cost;
    this.varietyIndex++;
    return true;
  }

  buyEquip(i) {
    const cost = this.equipCost(i);
    if (this.popcorn < cost) return false;
    this.popcorn -= cost;
    this.equip[i]++;
    return true;
  }

  /** キーボード用：買える中で最も進んだ設備を1つ買う。買えたら index を返す。 */
  buyBestEquip() {
    for (let i = this.cfg.equipment.length - 1; i >= 0; i--) {
      if (this.popcorn >= this.equipCost(i)) { const first = this.equip[i] === 0; this.buyEquip(i); return { index: i, first }; }
    }
    return null;
  }

  /** 施設購入ボタン用：まだ持っていない設備を「安い順」に優先。全種そろったら高い順。 */
  buyNextEquip() {
    let target = -1, cheapest = Infinity;
    for (let i = 0; i < this.cfg.equipment.length; i++) {
      if (this.equip[i] === 0) {
        const c = this.equipCost(i);
        if (this.popcorn >= c && c < cheapest) { cheapest = c; target = i; }
      }
    }
    if (target < 0) {                       // 全種所持 → 高い順に増強
      for (let i = this.cfg.equipment.length - 1; i >= 0; i--) {
        if (this.popcorn >= this.equipCost(i)) { target = i; break; }
      }
    }
    if (target < 0) return null;
    const first = this.equip[target] === 0;
    this.buyEquip(target);
    return { index: target, first };
  }

  /** 次に施設購入で買う設備の index（予測。コスト表示用）。買えない時は -1。 */
  nextEquipIndex() {
    let target = -1, cheapest = Infinity;
    for (let i = 0; i < this.cfg.equipment.length; i++) {
      if (this.equip[i] === 0) { const c = this.equipCost(i); if (c < cheapest) { cheapest = c; target = i; } }
    }
    if (target >= 0) return target;          // 未所持の最安（買えなくても目標として表示）
    for (let i = this.cfg.equipment.length - 1; i >= 0; i--) {
      if (this.popcorn >= this.equipCost(i)) return i;
    }
    return this.cfg.equipment.length - 1;
  }

  /** 自動購入：レベルアップ用に levelCost を残し、余りで品種→高い設備の順に強化。
      新規に設置した設備の index 配列を返す（演出用）。 */
  autoBuy() {
    const reserve = this.levelCost;
    const newlyPlaced = [];
    let guard = 0;
    // 品種（解放できるなら、予約を残して）
    while (this.nextVariety && (this.popcorn - this.nextVariety.cost) >= reserve && guard++ < 50) {
      this.buyVariety();
    }
    // 設備：高い順に、予約を残して買えるだけ
    while (guard++ < 500) {
      let best = -1;
      for (let i = this.cfg.equipment.length - 1; i >= 0; i--) {
        if ((this.popcorn - this.equipCost(i)) >= reserve) { best = i; break; }
      }
      if (best < 0) break;
      const first = this.equip[best] === 0;
      this.buyEquip(best);
      if (first) newlyPlaced.push(best);
    }
    return newlyPlaced;
  }

  // ── フェーズ＆クリア ────────────────────────────────
  get phase() {
    const idx = this.containerState().index;
    for (const p of this.cfg.phases) if (idx < p.until) return p;
    return this.cfg.phases[this.cfg.phases.length - 1];
  }
  get isGameCleared() { return this.containersCleared >= this.cfg.containers.length; }

  /** チートモードで最初から（全リセットして ×100 で再挑戦） */
  startCheatRun() {
    this.reset(true);
    this.cheatUnlocked = true;
    this.cheatActive = true;
  }

  // ── 容器（目的：満タンにする） ──────────────────────
  //   進捗は totalAllTime（全生産）に紐づく単調増加。リセットされない。
  _containerCap(i) {
    const C = this.cfg.containers, g = this.cfg.containerGrowthBeyond;
    return i < C.length ? C[i].cap : C[C.length - 1].cap * Math.pow(g, i - (C.length - 1));
  }
  _containerName(i) {
    const C = this.cfg.containers, g = this.cfg.containerGrowthBeyond;
    return i < C.length ? C[i].name : `宇宙のむこう ×${Math.round(Math.pow(g, i - (C.length - 1)))}`;
  }
  _containerSpace(i) {
    const C = this.cfg.containers;
    return i < C.length ? !!C[i].space : true;
  }
  /** 現在の容器の状態 {index, name, filled, cap, pct, space} */
  containerState() {
    let i = 0, acc = 0;
    while (i < 5000) {
      const cap = this._containerCap(i);
      if (this.totalAllTime >= acc + cap) { acc += cap; i++; } else break;
    }
    const cap = this._containerCap(i);
    const filled = this.totalAllTime - acc;
    return { index: i, name: this._containerName(i), filled, cap,
             pct: Math.max(0, Math.min(1, filled / cap)), space: this._containerSpace(i) };
  }
  /** 新たに満タンになった容器の報酬を回収。クリアした容器の配列を返す。 */
  collectContainerRewards() {
    const idx = this.containerState().index;
    const out = [];
    let guard = 0;
    while (this.containersCleared < idx && guard++ < 1000) {
      const ci = this.containersCleared;
      const reward = Math.floor(this._containerCap(ci) * this.cfg.containerRewardRate);
      this.popcorn += reward;   // 報酬は所持のみ（totalAllTimeには足さない＝暴走防止）
      out.push({ index: ci, name: this._containerName(ci), reward, nextName: this._containerName(ci + 1) });
      this.containersCleared++;
    }
    return out;
  }

  // ── オフライン生産 ──────────────────────────────────
  /** ロード時に呼ぶ。留守中の生産を加算し、得た粒を返す。 */
  applyOffline() {
    const now = Date.now();
    const elapsed = Math.max(0, (now - this.lastSeen) / 1000);
    this.lastSeen = now;
    const cap = this.cfg.offline.capHours * 3600;
    const sec = Math.min(elapsed, cap);
    const gain = this.cps * this.cfg.offline.rate * sec;
    if (gain > 0) this._earn(gain);
    return { gain, seconds: sec, capped: elapsed > cap };
  }

  // ── セーブ / ロード ────────────────────────────────
  serialize() {
    return JSON.stringify({
      v: 1,
      popcorn: this.popcorn, totalRun: this.totalRun, totalAllTime: this.totalAllTime,
      varietyIndex: this.varietyIndex, equip: this.equip, level: this.level,
      containersCleared: this.containersCleared,
      cheatUnlocked: this.cheatUnlocked, cheatActive: this.cheatActive,
      maxCombo: this.maxCombo, wordsCleared: this.wordsCleared,
      lastSeen: Date.now(),
    });
  }

  load(json) {
    try {
      const d = JSON.parse(json);
      this.popcorn = d.popcorn || 0;
      this.totalRun = d.totalRun || 0;
      this.totalAllTime = d.totalAllTime || 0;
      this.varietyIndex = Math.min(d.varietyIndex || 0, this.cfg.varieties.length - 1);
      this.equip = (d.equip && d.equip.length === this.cfg.equipment.length)
        ? d.equip.slice() : this.cfg.equipment.map(() => 0);
      this.level = d.level || 1;
      this.containersCleared = d.containersCleared || 0;
      this.cheatUnlocked = !!d.cheatUnlocked;
      this.cheatActive = !!d.cheatActive;
      this.maxCombo = d.maxCombo || 0;
      this.wordsCleared = d.wordsCleared || 0;
      this.lastSeen = d.lastSeen || Date.now();
      this.combo = 0;
      return true;
    } catch (e) { return false; }
  }

  save() {
    try { localStorage.setItem(this.cfg.save.key, this.serialize()); } catch (e) {}
  }
  static loadFrom(config) {
    const g = new Game(config);
    try {
      const raw = localStorage.getItem(config.save.key);
      if (raw) g.load(raw);
    } catch (e) {}
    return g;
  }
  hardReset() {
    try { localStorage.removeItem(this.cfg.save.key); } catch (e) {}
    this.reset(true);
  }
}

window.GAME = { Game };
