/*
 * ============================================================
 *  ゲーム状態・経済ロジック  (game.js)  ― スコアアタック版
 * ============================================================
 *  - メタ進行（永続）: 貯金 / 解放した品種 / アーティファクトLv / 通算プレイ
 *  - 1戦（揮発）: 残り時間 / 今回スコア / コンボ / 命中・打鍵数
 *  描画・入力は持たない純粋ロジック。
 * ============================================================
 */

class Game {
  constructor(config) {
    this.cfg = config;
    // メタ（永続）
    this.bank = 0;
    this.varietyIndex = 0;
    this.artifacts = {};                       // {id: level}
    for (const a of config.artifacts) this.artifacts[a.id] = 0;
    this.totalRuns = 0;
    // 1戦
    this._resetRun();
  }

  _resetRun() {
    this.running = false;
    this.timeLeft = this.runSeconds;
    this.runScore = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.charsCorrect = 0;
    this.missCount = 0;
    this.wordsCleared = 0;
  }

  // ── 派生値 ──────────────────────────────────────────
  get variety() { return this.cfg.varieties[this.varietyIndex]; }
  artLevel(id) { return this.artifacts[id] || 0; }
  _artDef(id) { return this.cfg.artifacts.find(a => a.id === id); }

  /** kind 別の合計を計算 */
  _sumKind(kind) {
    let s = 0;
    for (const a of this.cfg.artifacts) if (a.kind === kind) s += a.perLevel * this.artLevel(a.id);
    return s;
  }

  get runSeconds() { return this.cfg.run.baseSeconds + this._sumKind('time'); }

  /** 1打鍵の基礎（品種 + flat系） */
  get base() { return this.variety.perChar + this._sumKind('flat'); }

  /** コンボ表の倍率 × combo系アーティファクト */
  get comboMult() {
    let m = 1;
    for (const tier of this.cfg.combo) if (this.combo >= tier.threshold) m = tier.mult;
    return m * (1 + this._sumKind('combo'));
  }

  /** 全獲得倍率（mult系アーティファクトの積） */
  get globalMult() {
    let g = 1;
    for (const a of this.cfg.artifacts) if (a.kind === 'mult') g *= (1 + a.perLevel * this.artLevel(a.id));
    return g;
  }

  /** 1打鍵の獲得粒 */
  get perChar() { return this.base * this.comboMult * this.globalMult; }

  /** 花火の粒数（最初は1個。コンボで少しずつ増える・上限あり） */
  get particlesPerKey() {
    const f = this.cfg.fx;
    return Math.min(f.keyBurstMax, f.keyBurstBase + Math.floor((this.comboMult - 1) * f.keyBurstPerCombo));
  }

  // ── 1戦の進行 ──────────────────────────────────────
  startRun() {
    this._resetRun();
    this.timeLeft = this.runSeconds;
    this.running = true;
  }

  /** 1文字正解。獲得粒を返す。 */
  typeChar() {
    if (!this.running) return 0;
    this.combo++;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
    const gain = this.perChar;
    this.runScore += gain;
    this.charsCorrect++;
    return gain;
  }

  miss() { if (this.running) { this.combo = 0; this.missCount++; } }

  /** ワード完成。ちょいボーナス。 */
  completeWord(charCount) {
    if (!this.running) return 0;
    this.wordsCleared++;
    const bonus = this.base * this.comboMult * this.globalMult * 2;   // 2打鍵ぶんの軽ボーナス
    this.runScore += bonus;
    return bonus;
  }

  /** 時間を進める。0になったら自動で終了し、結果を返す（まだなら null）。 */
  tickTime(dt) {
    if (!this.running) return null;
    this.timeLeft -= dt;
    if (this.timeLeft <= 0) { this.timeLeft = 0; return this.endRun(); }
    return null;
  }

  /** 1戦終了。貯金に加算し、結果オブジェクトを返す。 */
  endRun() {
    this.running = false;
    const score = Math.floor(this.runScore);
    this.bank += score;
    this.totalRuns++;
    const secs = this.runSeconds;
    const wpm = Math.round((this.charsCorrect / 5) / (secs / 60));
    const total = this.charsCorrect + this.missCount;
    const acc = total > 0 ? Math.round((this.charsCorrect / total) * 100) : 100;
    return { score, wpm, acc, maxCombo: this.maxCombo, words: this.wordsCleared, chars: this.charsCorrect };
  }

  // ── ショップ（貯金で買う） ──────────────────────────
  get nextVariety() {
    return this.varietyIndex < this.cfg.varieties.length - 1
      ? this.cfg.varieties[this.varietyIndex + 1] : null;
  }
  buyVariety() {
    const nv = this.nextVariety;
    if (!nv || this.bank < nv.cost) return false;
    this.bank -= nv.cost;
    this.varietyIndex++;
    return true;
  }

  artifactCost(id) {
    const a = this._artDef(id);
    return Math.floor(a.costBase * Math.pow(a.costGrowth, this.artLevel(id)));
  }
  artifactMaxed(id) { return this.artLevel(id) >= this._artDef(id).max; }
  buyArtifact(id) {
    if (this.artifactMaxed(id)) return false;
    const cost = this.artifactCost(id);
    if (this.bank < cost) return false;
    this.bank -= cost;
    this.artifacts[id] = this.artLevel(id) + 1;
    return true;
  }

  // ── セーブ / ロード ────────────────────────────────
  serialize() {
    return JSON.stringify({
      v: 2, bank: this.bank, varietyIndex: this.varietyIndex,
      artifacts: this.artifacts, totalRuns: this.totalRuns,
    });
  }
  load(json) {
    try {
      const d = JSON.parse(json);
      this.bank = d.bank || 0;
      this.varietyIndex = Math.min(d.varietyIndex || 0, this.cfg.varieties.length - 1);
      if (d.artifacts) for (const a of this.cfg.artifacts) this.artifacts[a.id] = d.artifacts[a.id] || 0;
      this.totalRuns = d.totalRuns || 0;
      return true;
    } catch (e) { return false; }
  }
  save() { try { localStorage.setItem(this.cfg.save.key, this.serialize()); } catch (e) {} }
  static loadFrom(config) {
    const g = new Game(config);
    try { const raw = localStorage.getItem(config.save.key); if (raw) g.load(raw); } catch (e) {}
    g._resetRun();
    return g;
  }
  hardReset() {
    try { localStorage.removeItem(this.cfg.save.key); } catch (e) {}
    this.bank = 0; this.varietyIndex = 0; this.totalRuns = 0;
    for (const a of this.cfg.artifacts) this.artifacts[a.id] = 0;
    this._resetRun();
  }
}

window.GAME = { Game };
