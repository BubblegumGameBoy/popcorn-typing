/*
 * ============================================================
 *  お題データ  (words.js)
 * ============================================================
 *  popcorn-typing のタイピングお題。
 *
 *  ■ 形式
 *    各お題は { text, kana } のペア。
 *      - text : 画面に見せる表示用（漢字・カタカナOK）
 *      - kana : 実際に打つひらがな（typing-engine.js が判定に使う）
 *    ※ kana は typing-engine の KANA_ROMA で扱える文字のみ
 *      （ひらがな・促音っ・拗音・長音ー）。カタカナ語はひらがな化して入れる。
 *
 *  ■ レベル分け（difficulty）
 *      1 = やさしい（単語〜短い）  2 = ふつう（短文）  3 = ちょい長め
 *    序盤は 1〜2 中心、進むほど 2〜3 を混ぜる想定。
 *
 *  ■ テーマ
 *    ポップコーン / 遊園地 / おやつ / 小学生が好きそうな元気ワード。
 *    世界観に合わせて、明るくバカっぽく。
 * ============================================================
 */

//  ★注意（typing-engine.js の制約に合わせる）
//    - 長音「ー」は打てない（a-z のみ受付）→ 母音をのばす綴りで書く
//      例: コーン → こおん / バター → ばたあ / ハッピー → はっぴい
//    - 「じぇ・てぃ」等の小書きェ系の組み合わせは未対応 → 使わない
const WORDS = [
  // ── レベル1：やさしい単語（ウォームアップ） ──
  { text: 'ポップコーン',     kana: 'ぽっぷこおん',         difficulty: 1 },
  { text: 'キャラメル',       kana: 'きゃらめる',           difficulty: 1 },
  { text: 'バター',           kana: 'ばたあ',               difficulty: 1 },
  { text: 'しお',             kana: 'しお',                 difficulty: 1 },
  { text: 'あまい',           kana: 'あまい',               difficulty: 1 },
  { text: 'おやつ',           kana: 'おやつ',               difficulty: 1 },
  { text: 'ジュース',         kana: 'じゅうす',             difficulty: 1 },
  { text: 'わたあめ',         kana: 'わたあめ',             difficulty: 1 },
  { text: 'かんらんしゃ',     kana: 'かんらんしゃ',         difficulty: 1 },
  { text: 'メリーゴーランド', kana: 'めりいごおらんど',     difficulty: 1 },
  { text: 'ゴーカート',       kana: 'ごおかあと',           difficulty: 1 },
  { text: 'おばけやしき',     kana: 'おばけやしき',         difficulty: 1 },
  { text: 'ふうせん',         kana: 'ふうせん',             difficulty: 1 },
  { text: 'チケット',         kana: 'ちけっと',             difficulty: 1 },
  { text: 'ハッピー',         kana: 'はっぴい',             difficulty: 1 },

  // ── レベル2：ふつうの短文（元気・おもしろ） ──
  { text: 'ハッピーハッピーハッピー', kana: 'はっぴいはっぴいはっぴい', difficulty: 2 },
  { text: 'ポップコーンがはじけた',   kana: 'ぽっぷこおんがはじけた',   difficulty: 2 },
  { text: 'バターのにおいがすごい',   kana: 'ばたあのにおいがすごい',   difficulty: 2 },
  { text: 'キャラメルあじがすき',     kana: 'きゃらめるあじがすき',     difficulty: 2 },
  { text: 'おかわりちょうだい',       kana: 'おかわりちょうだい',       difficulty: 2 },
  { text: 'かんらんしゃにのろう',     kana: 'かんらんしゃにのろう',     difficulty: 2 },
  { text: 'おばけやしきはこわい',     kana: 'おばけやしきはこわい',     difficulty: 2 },
  { text: 'ぜんぶたべちゃった',       kana: 'ぜんぶたべちゃった',       difficulty: 2 },
  { text: 'もっとやきたい',           kana: 'もっとやきたい',           difficulty: 2 },
  { text: 'こげちゃったかも',         kana: 'こげちゃったかも',         difficulty: 2 },
  { text: 'てんさいポップコーンや',   kana: 'てんさいぽっぷこおんや',   difficulty: 2 },
  { text: 'きょうもまんいんおれい',   kana: 'きょうもまんいんおれい',   difficulty: 2 },
  { text: 'たのしいおまつりだ',       kana: 'たのしいおまつりだ',       difficulty: 2 },
  { text: 'わたあめふわふわ',         kana: 'わたあめふわふわ',         difficulty: 2 },
  { text: 'きんのコーンだ',           kana: 'きんのこおんだ',           difficulty: 2 },
  { text: 'おなかがすいたよ',         kana: 'おなかがすいたよ',         difficulty: 2 },
  { text: 'ばくはつポップコーン',     kana: 'ばくはつぽっぷこおん',     difficulty: 2 },
  { text: 'やったぜさいこうきろく',   kana: 'やったぜさいこうきろく',   difficulty: 2 },
  { text: 'おばあちゃんありがとう',   kana: 'おばあちゃんありがとう',   difficulty: 2 },

  // ── レベル3：ちょい長め（コンボ稼ぎ用） ──
  { text: 'ポップコーンをいっぱいやこう', kana: 'ぽっぷこおんをいっぱいやこう', difficulty: 3 },
  { text: 'ゆうえんちでポップコーンをうる', kana: 'ゆうえんちでぽっぷこおんをうる', difficulty: 3 },
  { text: 'キャラメルあじをたくさんつくる', kana: 'きゃらめるあじをたくさんつくる', difficulty: 3 },
  { text: 'せかいいちのポップコーンやさん', kana: 'せかいいちのぽっぷこおんやさん', difficulty: 3 },
  { text: 'まほうのしおでもっとあまくなる', kana: 'まほうのしおでもっとあまくなる', difficulty: 3 },
  { text: 'たいようのちからでコーンをやく', kana: 'たいようのちからでこおんをやく', difficulty: 3 },
  { text: 'てをとめずにどんどんはじけさせろ', kana: 'てをとめずにどんどんはじけさせろ', difficulty: 3 },
  { text: 'みんなでたべるとおいしいねえ',     kana: 'みんなでたべるとおいしいねえ',     difficulty: 3 },
];

// ─ 便利関数：難易度でフィルタ ─
function wordsByDifficulty(level) {
  return WORDS.filter(w => w.difficulty === level);
}

// ─ 便利関数：ランダムに1問 ─
function randomWord(maxDifficulty = 3) {
  const pool = WORDS.filter(w => w.difficulty <= maxDifficulty);
  return pool[Math.floor(Math.random() * pool.length)];
}

// Node / バンドラ用エクスポート（ブラウザ直読みなら無視される）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { WORDS, wordsByDifficulty, randomWord };
}
