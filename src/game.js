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
    this.combo = 0;               // 連続ノーミス
    this.maxCombo = 0;
    this.wordsCleared = 0;
    if (newGame) {
      this.salt = 0;              // 転生通貨（永続）
      this.totalAllTime = 0;      // 全周回の総生産（塩算出のもと）
      this.prestiges = 0;
    }
    this.lastSeen = Date.now();
  }

  // ── 派生値 ──────────────────────────────────────────
  get variety() { return this.cfg.varieties[this.varietyIndex]; }

  /** 塩による全生産倍率（フェーズA） */
  get globalMult() { return 1 + this.salt * this.cfg.prestige.saltMult; }

  /** 現在のコンボ倍率 */
  get comboMult() {
    let m = 1;
    for (const tier of this.cfg.combo) if (this.combo >= tier.threshold) m = tier.mult;
    return m;
  }

  /** 1打鍵の獲得粒（コンボ・塩こみ） */
  get perChar() {
    return this.variety.perChar * this.comboMult * this.globalMult;
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
    const bonus = charCount * this.variety.perChar * this.cfg.wordBonusMult
                  * this.comboMult * this.globalMult;
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

  // ── 転生（プレステージ） ────────────────────────────
  /** 今転生したら得られる塩の総数（累計ベース） */
  get potentialSalt() {
    return Math.floor(Math.sqrt(this.totalAllTime / this.cfg.prestige.base));
  }
  /** 今回の転生で増える塩 */
  get saltGain() {
    return Math.max(0, this.potentialSalt - this.salt);
  }
  get canPrestige() {
    return this.saltGain >= this.cfg.prestige.minSalt;
  }
  prestige() {
    if (!this.canPrestige) return false;
    this.salt = this.potentialSalt;
    this.prestiges++;
    // 周回リセット（塩・累計・転生回数は維持）
    this.reset(false);
    return true;
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
      varietyIndex: this.varietyIndex, equip: this.equip,
      salt: this.salt, prestiges: this.prestiges,
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
      this.salt = d.salt || 0;
      this.prestiges = d.prestiges || 0;
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
