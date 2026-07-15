/*
 * ============================================================
 *  世界ランキング  (leaderboard.js)
 * ============================================================
 *  Firebase Realtime Database の REST API だけで読み書き（SDK不要）。
 *  window.LEADERBOARD_URL（index.html で設定）が無ければ機能ごと無効。
 *
 *  ■ 設計（書き込み超過を防ぐ）
 *    - 1プレイヤー = 1レコードを PUT で上書き（POSTで増殖させない）
 *    - 送信トリガーは3つだけ:
 *        1) 容器クリア時（数分に1回のイベント）
 *        2) 定期チェック: 前回送信から throttleMs 経過 かつ スコアが伸びた
 *        3) タブ離脱時（visibilitychange → fetch keepalive）
 *    - 名前を入力した人だけ参加（オプトイン）。未入力なら一切送信しない。
 *
 *  ■ データ構造（ゲームごとにパスを分離）
 *    /popcorn-typing/players/{playerId} = { name, score, updatedAt }
 * ============================================================
 */

const Leaderboard = {
  cfg: null,
  _lastSentScore: 0,
  _lastSentAt: 0,
  _cache: null,        // { list, fetchedAt }

  init(cfg) {
    this.cfg = cfg.ranking;
    this._lastSentScore = Number(localStorage.getItem(this.cfg.storageKey + ':sentScore')) || 0;
  },

  get enabled() { return !!window.LEADERBOARD_URL; },

  // ── プレイヤーID（端末ごとに1つ。初回生成して保存） ──────
  get playerId() {
    const key = this.cfg.storageKey + ':id';
    let id = localStorage.getItem(key);
    if (!id) {
      id = (crypto.randomUUID ? crypto.randomUUID() : 'p' + Date.now() + Math.random().toString(36).slice(2));
      try { localStorage.setItem(key, id); } catch (e) {}
    }
    return id;
  },

  // ── 名前（入力した人だけランキング参加） ──────────────
  get name() { return localStorage.getItem(this.cfg.storageKey + ':name') || ''; },
  setName(name) {
    const n = String(name || '').trim().slice(0, this.cfg.nameMax);
    try { localStorage.setItem(this.cfg.storageKey + ':name', n); } catch (e) {}
    return n;
  },
  get joined() { return this.name.length > 0; },

  _url() { return String(window.LEADERBOARD_URL).replace(/\/+$/, ''); },
  _playerUrl() { return `${this._url()}/${this.cfg.path}/players/${this.playerId}.json`; },

  // ── 送信（1レコード上書き） ────────────────────────────
  /** スコアを送る。keepalive=true はタブ離脱時用。 */
  async submit(score, keepalive) {
    if (!this.enabled || !this.joined) return false;
    // JSの安全整数を超えると精度が壊れるのでクランプ
    const s = Math.min(Math.floor(score), this.cfg.scoreCap);
    if (s <= this._lastSentScore && !keepalive) return false;
    try {
      await fetch(this._playerUrl(), {
        method: 'PUT',
        keepalive: !!keepalive,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: this.name, score: Math.max(s, this._lastSentScore), updatedAt: { '.sv': 'timestamp' } }),
      });
      this._lastSentScore = Math.max(s, this._lastSentScore);
      this._lastSentAt = Date.now();
      try { localStorage.setItem(this.cfg.storageKey + ':sentScore', String(this._lastSentScore)); } catch (e) {}
      return true;
    } catch (e) { return false; }
  },

  /** 定期チェック用：スロットル条件を満たすときだけ送信 */
  maybeSubmit(score) {
    if (!this.enabled || !this.joined) return;
    const now = Date.now();
    if (now - this._lastSentAt < this.cfg.throttleMs) return;
    if (score < this._lastSentScore * (1 + this.cfg.minGrowth)) return;
    this.submit(score);
  },

  /** タブ離脱時：スロットル無視で最終値を送る（keepaliveで確実に） */
  flush(score) {
    if (!this.enabled || !this.joined) return;
    if (Math.floor(score) <= this._lastSentScore) return;
    this.submit(score, true);
  },

  // ── 取得（Top N。サーバー側ソート＋短期キャッシュ） ──────
  async top() {
    if (!this.enabled) return null;
    const now = Date.now();
    if (this._cache && now - this._cache.fetchedAt < this.cfg.cacheMs) return this._cache.list;
    try {
      const q = `orderBy="score"&limitToLast=${this.cfg.keep}`;
      const res = await fetch(`${this._url()}/${this.cfg.path}/players.json?${q}`);
      if (!res.ok) return this._cache ? this._cache.list : null;
      const data = await res.json();
      const list = data
        ? Object.entries(data).map(([id, v]) => ({ id, name: v.name || '？？？', score: v.score || 0 }))
        : [];
      list.sort((a, b) => b.score - a.score);
      this._cache = { list, fetchedAt: now };
      return list;
    } catch (e) { return this._cache ? this._cache.list : null; }
  },
};

window.Leaderboard = Leaderboard;
