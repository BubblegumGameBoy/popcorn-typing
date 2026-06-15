/*
 * ============================================================
 *  ゲームバランス設定  (config.js)
 * ============================================================
 *  数値はすべてここに集約。チューニングはこのファイルだけで完結。
 *
 *  ■ 設計思想（バランスの背骨）
 *    - 序盤: 自力タイピングで稼ぐ（1打鍵 1〜数粒）。設備は「鍋」から。
 *    - 中盤: 品種研究で1打鍵が ×5→×50→×1000 とインフレ。
 *            設備も並行で増やし、CPS（毎秒生産）が主役に。
 *    - 終盤: ポップコーンワールド等でCPS爆発 → 数兆粒 → 転生。
 *    - 転生: 塩を獲得し、全生産に永続倍率。次周回が加速。
 *
 *    コスト成長率 1.15（クリッカー定番）で「買うほど次が重い」。
 *    各設備の価格帯は約10倍ずつ離し、常に「次の目標」が見える。
 * ============================================================
 */

const CONFIG = {

  // ── 品種（自力タイピングの1打鍵あたり） ──────────────
  //   highest unlocked が「現在の品種」。打鍵スプライトも切り替わる。
  //   ※ インフレを抑えめに（数字より見た目重視）。レベルでも伸びる。
  varieties: [
    { id: 'normal',  name: '普通のコーン',     img: 'normal',  perChar: 1,  cost: 0,      desc: '1文字 = 1粒。すべての始まり。' },
    { id: 'caramel', name: 'キャラメルコーン', img: 'caramel', perChar: 3,  cost: 300,    desc: '1文字 = 3粒。あまくてカリッ。' },
    { id: 'truffle', name: 'トリュフ塩コーン', img: 'truffle', perChar: 10, cost: 6000,   desc: '1文字 = 10粒。高級な香り。' },
    { id: 'gold',    name: '純金のコーン',     img: 'gold',    perChar: 30, cost: 80000,  desc: '1文字 = 30粒。食べられるのか…？' },
  ],

  // ── レベル（タイピングで上げる。手入力がいちばん強い源泉） ──
  //   レベルが上がるほど 1打鍵の粒が増え、はじける粒の数も増える（Lv2=2個）。
  level: {
    base: 1,          // 1打鍵 = variety.perChar × level × combo × salt
    costBase: 60,     // Lv2 にするコスト
    costGrowth: 1.55, // レベルごとのコスト上昇
    particlePerLevel: 1,   // レベル1につき はじける粒 +1
    particleCap: 14,       // 1打鍵で飛ぶ粒の上限（描画保護）
  },

  // ── 設備（自動生産・あくまで“軽い味付け”） ──────────────
  //   ★手入力が最強★ なので cps は控えめ（数秒に数粒〜）。
  //   見た目（画面に置かれて、ぽんぽん弾ける）で楽しませるのが主目的。
  //   tier でステージ上のグループ分け（序盤/中盤/終盤）。
  equipment: [
    { id: 'pan',        name: 'フライパン',             img: 'pan',        cost: 60,       cps: 0.3,  tier: 0, desc: '鍋ひとつ。ぽつ…ぽつ…と弾ける。' },
    { id: 'panGrandma', name: 'フライパン＋おばあちゃん', img: 'panGrandma', cost: 400,      cps: 1,    tier: 0, desc: 'おばあちゃん参戦。買うほど人数が増える。' },
    { id: 'microwave',  name: '電子レンジ',             img: 'microwave',  cost: 3000,     cps: 3,    tier: 1, desc: 'チンッ！で焼ける。' },
    { id: 'cinema',     name: '映画館の業務用マシン',     img: 'cinema',     cost: 24000,    cps: 9,    tier: 1, desc: '映画のお供を生産。' },
    { id: 'ponkashi',   name: '屋台のポン菓子機',         img: 'ponkashi',   cost: 180000,   cps: 26,   tier: 1, desc: 'ボンッ！と弾ける。' },
    { id: 'factory',    name: '巨大ポップコーン工場',     img: 'factory',    cost: 1500000,  cps: 75,   tier: 2, desc: 'ラインで生産。' },
    { id: 'world',      name: 'ポップコーンワールド',     img: 'world',      cost: 12000000, cps: 220,  tier: 2, desc: '中央に浮かぶ黄金の島。ガンガン自動生成。' },
  ],
  equipmentGrowth: 1.18,   // 1台買うごとの価格上昇率

  // ── コンボ（連続ノーミス打鍵の倍率） ────────────────
  //   threshold 文字以上の連続正解で mult 倍。ミスで 0 にリセット。
  combo: [
    { threshold: 0,   mult: 1 },
    { threshold: 10,  mult: 2 },
    { threshold: 25,  mult: 3 },
    { threshold: 50,  mult: 4 },
    { threshold: 100, mult: 6 },
    { threshold: 200, mult: 10 },
  ],

  // ── ワード完成ボーナス ──────────────────────────────
  //   1ワード打ち切ると、文字数 × 基礎粒 × wordBonusMult の臨時ボーナス＋大破裂。
  wordBonusMult: 3,

  // ── 容器（目的）：満タンにしたら、もっとデカい容器へ ──────
  //   cap = この容器を満タンにするのに必要な「累計生産」の増分。
  //   クリアで報酬（cap × rewardRate の粒）をもらえる。
  //   リスト終端を超えたら capを ×growthBeyond し続ける（無限）。
  //   space:true の容器から背景が宇宙に。
  containers: [
    { name: 'Sカップ',        cap: 300 },
    { name: 'Mカップ',        cap: 1500 },
    { name: 'Lカップ',        cap: 9000 },
    { name: 'メガバケツ',      cap: 50000 },
    { name: '一斗缶',         cap: 300000 },
    { name: '屋台ワゴン',      cap: 2e6 },
    { name: 'ダンプトラック',  cap: 1.2e7 },
    { name: 'ビルまるごと',    cap: 8e7 },
    { name: '大きな山',       cap: 5e8 },
    { name: '街ぜんぶ',       cap: 3e9 },
    { name: '日本列島',       cap: 2e10 },
    { name: '地球',          cap: 1.5e11, space: true },
    { name: '月もいっしょに',  cap: 1e12,   space: true },
    { name: '太陽系',         cap: 8e12,   space: true },
    { name: '天の川銀河',      cap: 6e13,   space: true },
    { name: '宇宙ぜんぶ',      cap: 5e14,   space: true },
  ],
  containerGrowthBeyond: 8,   // 終端超えで cap を ×8 ずつ
  containerRewardRate: 0.5,   // クリア報酬 = cap × これ（粒）

  // ── 自動購入（クリック不要・もってる粒で高い設備から強化） ──
  autoBuy: {
    intervalMs: 200,    // 自動購入の間隔
    // レベルアップ用に levelCost ぶんは残す（プレイヤーが2キーで上げられるように）
  },

  // ── チートモード（クリア後に解放：全生産 ×100 で遊べる） ──
  cheat: { mult: 100 },

  // ── フェーズ（容器の進み具合で背景＆BGMを切り替え） ──────
  //   container index が until 未満ならそのフェーズ。
  phases: [
    { until: 5,        bg: 'park',  bgm: 'bgmEarly', space: false },
    { until: 11,       bg: 'town',  bgm: 'bgmMid',   space: false },
    { until: Infinity, bg: 'space', bgm: 'bgmSpace', space: true  },
  ],

  // ── オフライン生産 ──────────────────────────────────
  offline: {
    rate: 0.5,            // 留守中は通常CPSの50%
    capHours: 8,          // 最大8時間ぶんまで
  },

  // ── 演出・描画 ──────────────────────────────────────
  fx: {
    maxParticles: 180,    // 画面に同時表示する粒の上限（オブジェクトプール）
    typePop: 2,           // 1打鍵で飛ばす粒数
    wordBurst: 18,        // ワード完成時の破裂粒数
    comboBurst: 24,       // コンボ更新時の破裂粒数
  },

  // ── セーブ ──────────────────────────────────────────
  save: {
    key: 'popcorn-typing-save-v1',
    intervalMs: 5000,     // オートセーブ間隔
  },
};

window.CONFIG = CONFIG;
