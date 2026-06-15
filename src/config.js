/*
 * ============================================================
 *  ゲームバランス設定  (config.js)  ― スコアアタック版
 * ============================================================
 *  ■ 新ループ
 *    60秒タイムアタックで「今回スコア（＝稼いだポップコーン）」を競う。
 *    稼いだポップコーンは全部「貯金」に貯まり、ショップで永久強化を買う。
 *    品種・アーティファクトは次戦以降ずっと有効 → やるほどスコアが伸びる。
 *
 *  ■ スコア計算（1打鍵）
 *    base   = 品種perChar + Σ(flat系アーティファクト)
 *    comboM = コンボ表の倍率 × (1 + cinema係数)
 *    globalM= Π(×系アーティファクト)
 *    1打鍵 = base × comboM × globalM
 *    制限時間 = 60 + microwave延長
 * ============================================================
 */

const CONFIG = {

  run: {
    baseSeconds: 60,         // 1戦の基本秒数（アーティファクトで延長）
    countdown: 3,            // スタート前カウントダウン
  },

  // ── 品種（1打鍵の基礎粒・永久アンロック） ──────────────
  varieties: [
    { id: 'normal',  name: '普通のコーン',     img: 'normal',  perChar: 1,   cost: 0,      desc: '1打鍵 = 1粒。すべての始まり。' },
    { id: 'caramel', name: 'キャラメルコーン', img: 'caramel', perChar: 5,   cost: 3000,   desc: '1打鍵 = 5粒。あまくてカリッ。' },
    { id: 'truffle', name: 'トリュフ塩コーン', img: 'truffle', perChar: 25,  cost: 35000,  desc: '1打鍵 = 25粒。高級な香り。' },
    { id: 'gold',    name: '純金のコーン',     img: 'gold',    perChar: 100, cost: 300000, desc: '1打鍵 = 100粒。食べられるのか…？' },
  ],

  // ── アーティファクト（設備の絵を再利用した永久パッシブ強化） ──
  //   kind: 'mult'(全獲得×) / 'flat'(基礎+) / 'combo'(コンボ倍率×) / 'time'(制限時間+秒)
  //   効果 = perLevel × Lv。cost = costBase × costGrowth^Lv。
  artifacts: [
    { id: 'salt',       name: '伝説の魔法の塩',   img: 'salt',       kind: 'mult',  perLevel: 0.30, costBase: 2000,   costGrowth: 2.0, max: 50, desc: '全獲得が Lvごとに +30%。' },
    { id: 'panGrandma', name: '黄金のフライパン', img: 'panGrandma', kind: 'flat',  perLevel: 3,    costBase: 1500,   costGrowth: 1.9, max: 50, desc: '1打鍵の基礎が Lvごとに +3。' },
    { id: 'microwave',  name: 'タイマーのおまもり', img: 'microwave',  kind: 'time',  perLevel: 3,    costBase: 6000,   costGrowth: 2.6, max: 15, desc: '制限時間が Lvごとに +3秒。' },
    { id: 'cinema',     name: 'スターのかがやき',  img: 'cinema',     kind: 'combo', perLevel: 0.15, costBase: 4000,   costGrowth: 2.2, max: 40, desc: 'コンボ倍率が Lvごとに +15%。' },
    { id: 'factory',    name: '大量生産ライン',    img: 'factory',    kind: 'mult',  perLevel: 0.25, costBase: 9000,   costGrowth: 2.3, max: 50, desc: '全獲得が Lvごとに +25%。' },
    { id: 'world',      name: '黄金時代',         img: 'world',      kind: 'mult',  perLevel: 1.0,  costBase: 250000, costGrowth: 3.0, max: 30, desc: '全獲得が Lvごとに +100%。終盤の大目玉。' },
  ],

  // ── コンボ（連続ノーミス打鍵の倍率。1戦中のみ・ミスで0） ──
  combo: [
    { threshold: 0,   mult: 1 },
    { threshold: 10,  mult: 2 },
    { threshold: 25,  mult: 3 },
    { threshold: 50,  mult: 4 },
    { threshold: 100, mult: 6 },
    { threshold: 200, mult: 10 },
  ],

  // ── 演出 ──────────────────────────────────────────
  fx: {
    maxParticles: 200,
    keyBurstBase: 5,     // 1打鍵の花火の粒数の基礎
  },

  // ── ランキング ────────────────────────────────────
  ranking: {
    localKey: 'popcorn-typing-scores-v2',
    keep: 10,            // 端末内に残す上位件数
  },

  // ── セーブ ──────────────────────────────────────────
  save: {
    key: 'popcorn-typing-save-v2',
  },
};

window.CONFIG = CONFIG;
