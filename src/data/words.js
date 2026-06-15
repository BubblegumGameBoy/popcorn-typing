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

// ────────────────────────────────────────────────
//  流行語パック（小学生〜中高生に人気のネットスラング・ミーム）
//  ※ 難易度関係なく「打ってて楽しい」ことを優先。engine 検証済み。
//    difficulty は kana 長で自動付与（下の normalize で）。
// ────────────────────────────────────────────────
const BUZZWORDS = [
  { text: 'それな', kana: 'それな' },{ text: 'わかる', kana: 'わかる' },{ text: 'わかりみ', kana: 'わかりみ' },
  { text: 'たしかに', kana: 'たしかに' },{ text: 'ほんそれ', kana: 'ほんそれ' },{ text: 'おけまる', kana: 'おけまる' },
  { text: 'とりあえずまる', kana: 'とりあえずまる' },{ text: 'りょ', kana: 'りょ' },{ text: 'まる', kana: 'まる' },
  { text: 'ぴえん', kana: 'ぴえん' },{ text: 'ぱおん', kana: 'ぱおん' },{ text: 'ぴえん超えてぱおん', kana: 'ぴえんこえてぱおん' },
  { text: 'エモい', kana: 'えもい' },{ text: 'やばい', kana: 'やばい' },{ text: 'てぇてぇ', kana: 'てえてえ' },
  { text: '尊い', kana: 'とおとい' },{ text: 'きゅんです', kana: 'きゅんです' },{ text: 'メロい', kana: 'めろい' },
  { text: 'ぷりてぃ', kana: 'ぷりてい' },{ text: 'かわちい', kana: 'かわちい' },{ text: 'はにゃ', kana: 'はにゃ' },
  { text: 'ガチ', kana: 'がち' },{ text: 'まじ', kana: 'まじ' },{ text: 'つよつよ', kana: 'つよつよ' },
  { text: 'よわよわ', kana: 'よわよわ' },{ text: 'ちょべりぐ', kana: 'ちょべりぐ' },{ text: 'しか勝たん', kana: 'しかかたん' },
  { text: 'ありよりのあり', kana: 'ありよりのあり' },{ text: 'なしよりのなし', kana: 'なしよりのなし' },{ text: 'よきよき', kana: 'よきよき' },
  { text: 'うま確', kana: 'うまかく' },{ text: 'ビジュイイじゃん', kana: 'びじゅいいじゃん' },{ text: 'ビジュ爆発', kana: 'びじゅばくはつ' },
  { text: 'きまZ', kana: 'きまずい' },{ text: 'とりま', kana: 'とりま' },{ text: 'なるはや', kana: 'なるはや' },
  { text: 'ふぁぼ', kana: 'ふぁぼ' },{ text: 'ぐぐる', kana: 'ぐぐる' },{ text: 'タピる', kana: 'たぴる' },
  { text: 'ヌン活', kana: 'ぬんかつ' },{ text: '映え', kana: 'ばえ' },{ text: '知らんけど', kana: 'しらんけど' },
  { text: '推し活', kana: 'おしかつ' },{ text: 'ガチ恋', kana: 'がちこい' },{ text: 'ひき肉です', kana: 'ひきにくです' },
  { text: '切り替えピース', kana: 'きりかえぴいす' },{ text: '厳しいって', kana: 'きびしいって' },
  { text: 'ハッピーハッピーハッピー', kana: 'はっぴいはっぴいはっぴい' },{ text: 'エッホエッホ', kana: 'えっほえっほ' },
  { text: 'チャオチャオ', kana: 'ちゃおちゃお' },{ text: 'こんにちワニ', kana: 'こんにちわに' },{ text: 'なぁぜなぁぜ', kana: 'なあぜなあぜ' },
  { text: 'しかのこのこのここしたんたん', kana: 'しかのこのこのここしたんたん' },{ text: '開示だな', kana: 'かいじだな' },
  { text: 'ナルトダンス', kana: 'なるとだんす' },{ text: 'イタリアンブレインロット', kana: 'いたりあんぶれいんろっと' },
  { text: 'ほんマネー', kana: 'ほんまねえ' },{ text: 'それガーチャー', kana: 'それがあちゃあ' },{ text: 'ちいかわ', kana: 'ちいかわ' },
  { text: '神回', kana: 'かみかい' },{ text: '草', kana: 'くさ' },{ text: '大草原', kana: 'だいそうげん' },
];

// kana長で difficulty を自動付与（未指定のもの）
function _autoDiff(w) {
  if (w.difficulty) return w;
  const n = w.kana.length;
  return Object.assign({ difficulty: n <= 4 ? 1 : n <= 9 ? 2 : 3 }, w);
}
const ALL_WORDS = WORDS.concat(BUZZWORDS.map(_autoDiff));

// ────────────────────────────────────────────────
//  WordBank: お題の取り出し（連続重複を避ける）
// ────────────────────────────────────────────────
const WordBank = {
  all: ALL_WORDS,
  _last: null,
  byDifficulty(level) { return ALL_WORDS.filter(w => w.difficulty === level); },
  random(maxDifficulty = 3) {
    const pool = ALL_WORDS.filter(w => w.difficulty <= maxDifficulty);
    let w, guard = 0;
    do { w = pool[Math.floor(Math.random() * pool.length)]; } while (w === this._last && ++guard < 8);
    this._last = w;
    return w;
  },
};

if (typeof window !== 'undefined') window.WordBank = window.WordBank || WordBank;

// Node / バンドラ用エクスポート（ブラウザ直読みなら無視される）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { WORDS, BUZZWORDS, ALL_WORDS, WordBank };
}
