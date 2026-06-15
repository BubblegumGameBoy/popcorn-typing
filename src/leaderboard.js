/*
 * ============================================================
 *  ランキング  (leaderboard.js)
 * ============================================================
 *  - 端末内ランキング: localStorage（即動く・サーバー不要）
 *  - 世界ランキング: window.LEADERBOARD_URL（Firebase Realtime DB のURL）が
 *      設定されていれば有効化。REST API だけで読み書き（SDK不要）。
 *      例: window.LEADERBOARD_URL = 'https://xxxx-default-rtdb.firebaseio.com';
 *      ※ DBルールで /scores の読み書きを許可しておくこと。
 * ============================================================
 */

const Leaderboard = {
  cfg: null,
  init(cfg) { this.cfg = cfg.ranking; },

  // ── 端末内 ──────────────────────────────────────────
  _readLocal() {
    try { return JSON.parse(localStorage.getItem(this.cfg.localKey)) || []; }
    catch (e) { return []; }
  },
  localTop() {
    return this._readLocal().sort((a, b) => b.score - a.score).slice(0, this.cfg.keep);
  },
  localBest() {
    const t = this.localTop();
    return t.length ? t[0].score : 0;
  },
  addLocal(entry) {
    const list = this._readLocal();
    list.push(entry);
    list.sort((a, b) => b.score - a.score);
    const top = list.slice(0, this.cfg.keep);
    try { localStorage.setItem(this.cfg.localKey, JSON.stringify(top)); } catch (e) {}
    // 何位に入ったか（1始まり、圏外なら -1）
    const rank = top.findIndex(e => e === entry || (e.score === entry.score && e.ts === entry.ts));
    return rank >= 0 ? rank + 1 : -1;
  },

  // ── 世界ランキング（任意・要 Firebase URL） ──────────
  get globalEnabled() { return !!window.LEADERBOARD_URL; },
  async submitGlobal(entry) {
    if (!this.globalEnabled) return false;
    try {
      await fetch(window.LEADERBOARD_URL + '/scores.json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
      return true;
    } catch (e) { return false; }
  },
  async globalTop(limit) {
    if (!this.globalEnabled) return null;
    try {
      const res = await fetch(window.LEADERBOARD_URL + '/scores.json');
      const data = await res.json();
      const arr = data ? Object.values(data) : [];
      arr.sort((a, b) => b.score - a.score);
      return arr.slice(0, limit || this.cfg.keep);
    } catch (e) { return null; }
  },

  // ── まとめて登録（端末内＋世界） ────────────────────
  async submit(name, score, meta) {
    const entry = Object.assign({ name: (name || 'ぼうけんしゃ').slice(0, 12), score, ts: Date.now() }, meta || {});
    const localRank = this.addLocal(entry);
    let globalOk = false;
    if (this.globalEnabled) globalOk = await this.submitGlobal(entry);
    return { entry, localRank, globalOk };
  },
};

window.Leaderboard = Leaderboard;
