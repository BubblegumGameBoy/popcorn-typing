/*
 * ============================================================
 *  日本語タイピング・エンジン  (typing-engine.js)
 * ============================================================
 *
 *  ■ 何をするもの？
 *    ひらがなのワードを「ローマ字」で入力させるタイピング判定エンジン。
 *    - ヘボン式・訓令式の両方を許容（し = shi / si どちらでもOK）
 *    - 促音「っ」（子音重ね）・拗音「きゃ」等に対応
 *    - 「ん」は n / nn 両対応
 *    - IME（日本語入力）を完全に回避する入力取得方式つき
 *      → 変換ONのままでも詰まらない（子供・初心者の離脱対策）
 *
 *  ■ 依存ゼロ。ブラウザでもNode（判定ロジックのみ）でも動く。
 *  ■ 使い方は最下部の「USAGE」を参照。
 *
 *  ※ 出典: ソルジャータイピング（spacebar-clicker）の入力エンジンを踏襲。
 * ============================================================
 */

// ────────────────────────────────────────────────
// 1. かな → ローマ字テーブル
//    各かなに「許容する綴りの配列」を持たせる。
//    配列の先頭がデフォルト表示（お手本として見せる綴り）。
//    2つ目以降は別表記（訓令式など）も正解として受理する。
// ────────────────────────────────────────────────
const KANA_ROMA = {
  'あ':['a'],'い':['i'],'う':['u'],'え':['e'],'お':['o'],
  'か':['ka'],'き':['ki'],'く':['ku'],'け':['ke'],'こ':['ko'],
  'が':['ga'],'ぎ':['gi'],'ぐ':['gu'],'げ':['ge'],'ご':['go'],
  'さ':['sa'],'し':['shi','si'],'す':['su'],'せ':['se'],'そ':['so'],
  'ざ':['za'],'じ':['ji','zi'],'ず':['zu'],'ぜ':['ze'],'ぞ':['zo'],
  'た':['ta'],'ち':['chi','ti'],'つ':['tsu','tu'],'て':['te'],'と':['to'],
  'だ':['da'],'ぢ':['ji','di'],'づ':['zu','du'],'で':['de'],'ど':['do'],
  'な':['na'],'に':['ni'],'ぬ':['nu'],'ね':['ne'],'の':['no'],
  'は':['ha'],'ひ':['hi'],'ふ':['fu','hu'],'へ':['he'],'ほ':['ho'],
  'ば':['ba'],'び':['bi'],'ぶ':['bu'],'べ':['be'],'ぼ':['bo'],
  'ぱ':['pa'],'ぴ':['pi'],'ぷ':['pu'],'ぺ':['pe'],'ぽ':['po'],
  'ま':['ma'],'み':['mi'],'む':['mu'],'め':['me'],'も':['mo'],
  'や':['ya'],'ゆ':['yu'],'よ':['yo'],
  'ら':['ra'],'り':['ri'],'る':['ru'],'れ':['re'],'ろ':['ro'],
  'わ':['wa'],'ゐ':['i'],'ゑ':['e'],'を':['wo','o'],'ん':['nn','n'],
  // 拗音
  'きゃ':['kya'],'きゅ':['kyu'],'きょ':['kyo'],
  'しゃ':['sha','sya'],'しゅ':['shu','syu'],'しょ':['sho','syo'],
  'ちゃ':['cha','tya'],'ちゅ':['chu','tyu'],'ちょ':['cho','tyo'],
  'にゃ':['nya'],'にゅ':['nyu'],'にょ':['nyo'],
  'ひゃ':['hya'],'ひゅ':['hyu'],'ひょ':['hyo'],
  'みゃ':['mya'],'みゅ':['myu'],'みょ':['myo'],
  'りゃ':['rya'],'りゅ':['ryu'],'りょ':['ryo'],
  'ぎゃ':['gya'],'ぎゅ':['gyu'],'ぎょ':['gyo'],
  'じゃ':['ja','zya'],'じゅ':['ju','zyu'],'じょ':['jo','zyo'],
  'びゃ':['bya'],'びゅ':['byu'],'びょ':['byo'],
  'ぴゃ':['pya'],'ぴゅ':['pyu'],'ぴょ':['pyo'],
  // 外来音
  'ふぁ':['fa'],'ふぃ':['fi'],'ふぇ':['fe'],'ふぉ':['fo'],
  'うぃ':['wi'],'うぇ':['we'],
  // 長音記号は綴りなし（直前の母音を伸ばすだけ）
  'ー':['']
};

// ────────────────────────────────────────────────
// 2. かな文字列 → 「単位ごとの許容ローマ字配列」のリストに分解
//    例: "しゃっきん"
//      → [ ['sha','sya'], ['kki'... 促音処理], ['n','nn'] ] のような形
//    - 拗音（2文字）を先に拾う
//    - 促音「っ」は次の単位の頭子音を重ねる（kk, ss, tt...）
// ────────────────────────────────────────────────
function kanaUnits(kana) {
  const raw = [];
  let i = 0;
  // まず2文字（拗音）優先で生のかな単位に分割
  while (i < kana.length) {
    const two = kana.substr(i, 2);
    if (KANA_ROMA[two]) { raw.push(two); i += 2; }
    else { raw.push(kana[i]); i += 1; }
  }
  // 各単位を許容ローマ字配列へ。促音「っ」は次単位に畳み込む
  const out = [];
  let dbl = false;
  for (const u of raw) {
    if (u === 'っ') { dbl = true; continue; }
    let vars = (KANA_ROMA[u] || [u]).slice();
    if (dbl) {
      // 直後の頭文字が子音なら重ねる（kka, ssi...）。母音始まりは重ねない
      vars = vars.map(v => {
        const c = v[0];
        return (/[a-z]/.test(c) && !'aiueo'.includes(c)) ? c + v : v;
      });
      dbl = false;
    }
    out.push(vars);
  }
  return out;
}

// ────────────────────────────────────────────────
// 3. 入力判定: 入力文字列が units の有効な接頭辞かどうか
//    戻り値: 'complete'（完全一致） | 'partial'（途中まで正しい） | 'no'（誤り）
//    複数綴りの分岐を再帰で全探索するので
//    「si と打ってる途中」「shi と打ってる途中」どちらも partial になる。
// ────────────────────────────────────────────────
function kanaMatch(units, input) {
  function rec(ui, si) {
    if (si === input.length) return ui === units.length ? 'complete' : 'partial';
    if (ui === units.length) return 'no';
    let res = 'no';
    for (const v of units[ui]) {
      if (v && input.startsWith(v, si)) {
        const r = rec(ui + 1, si + v.length);
        if (r === 'complete') return 'complete';
        if (r === 'partial') res = 'partial';
      } else if (v.startsWith(input.slice(si))) {
        // 入力がこの綴りの途中まで（例: 's' は 'shi' の途中）
        res = 'partial';
      }
    }
    return res;
  }
  return rec(0, 0);
}

// ────────────────────────────────────────────────
// 4. 残り表示用ローマ字を構築
//    すでに打った input に沿った綴りで「残りの綴り」を返す。
//    例: "shi" の "sh" まで打っていたら残りは "i"。
//        "si" の "s" まで打っていたら残りは "i"（si綴りに追従）。
//    UIで「done（打った分）＋left（残り）」を出すのに使う。
// ────────────────────────────────────────────────
function kanaDisplay(units, input) {
  function rec(ui, si) {
    if (si === input.length) {
      let rem = '';
      for (let k = ui; k < units.length; k++) rem += units[k][0]; // 残りはデフォルト綴り
      return rem;
    }
    if (ui === units.length) return null;
    // ぴったり1単位ぶん消費できるならそちらを優先
    for (const v of units[ui]) {
      if (v && input.startsWith(v, si)) {
        const r = rec(ui + 1, si + v.length);
        if (r !== null) return r;
      }
    }
    // 単位の途中まで打っている場合は、その綴りの残りを返す
    const part = input.slice(si);
    for (const v of units[ui]) {
      if (v.startsWith(part)) {
        let rem = v.slice(part.length);
        for (let k = ui + 1; k < units.length; k++) rem += units[k][0];
        return rem;
      }
    }
    return null;
  }
  const rem = rec(0, 0);
  return rem === null ? '' : rem;
}


// ────────────────────────────────────────────────
// 5. ワード単位のラッパー（任意・便利クラス）
//    1ワードぶんの状態（かな・units・打った文字）を保持し、
//    1文字入力するたびに結果を返す。
// ────────────────────────────────────────────────
class TypingWord {
  constructor(kana) {
    this.kana  = kana;
    this.units = kanaUnits(kana);
    this.input = '';            // 確定済みの正しい入力
  }
  /**
   * 1文字打鍵を処理する。
   * @param {string} ch  1文字（a-z 想定）
   * @returns {{status:'progress'|'complete'|'reject', done:string, left:string}}
   *   - progress : 正しい打鍵。done/left 更新。
   *   - complete : このワードが打ち終わった。
   *   - reject   : ミスタイプ（input は変化しない）。
   */
  press(ch) {
    const next = this.input + ch.toLowerCase();
    const st = kanaMatch(this.units, next);
    if (st === 'no') {
      return { status: 'reject', done: this.input, left: kanaDisplay(this.units, this.input) };
    }
    this.input = next;
    if (st === 'complete') {
      return { status: 'complete', done: this.input, left: '' };
    }
    return { status: 'progress', done: this.input, left: kanaDisplay(this.units, this.input) };
  }
  /** バックスペース1文字 */
  backspace() {
    this.input = this.input.slice(0, -1);
    return { status: 'progress', done: this.input, left: kanaDisplay(this.units, this.input) };
  }
  get done()    { return this.input; }
  get left()    { return kanaDisplay(this.units, this.input); }
  get isDone()  { return kanaMatch(this.units, this.input) === 'complete'; }
}


// ────────────────────────────────────────────────
// 6. IME完全回避の入力取得（ブラウザ用）
//    ★ここが「変換なしで対応・離脱防止」の肝★
//
//    通常の <input> に打たせると、IMEがONだと「あ」が入力され
//    確定操作が必要になり、子供や初心者が詰まる。
//    対策：
//      - テキスト入力欄を使わず document.keydown を直接拾う
//      - e.isComposing（IME変換中）は完全に無視
//      - 受け付けるのは a-z のみ。日本語・記号・スペースは捨てる
//    これでIMEがONのままでもローマ字打鍵がそのまま通る。
//
//    使い方:
//      const detach = attachKeyInput({
//        onChar:      (ch) => { ... },   // a-z が1文字来た
//        onBackspace: ()   => { ... },
//        onEnter:     ()   => { ... },   // 任意
//        isActive:    ()   => gameRunning, // 任意。falseなら無視
//      });
//      // やめるとき: detach();
// ────────────────────────────────────────────────
function attachKeyInput({ onChar, onBackspace, onEnter, onEscape, isActive } = {}) {
  const handler = (e) => {
    if (e.isComposing) return;                    // IME変換中は無視
    if (isActive && !isActive()) {
      // 非アクティブ時もEnter/Escだけは通したい場合はここで分岐可
    }
    if (e.key === 'Enter')  { if (onEnter)  onEnter(e);  return; }
    if (e.key === 'Escape') { if (onEscape) onEscape(e); return; }
    if (isActive && !isActive()) return;
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (onBackspace) onBackspace();
      return;
    }
    // a-z（大文字も小文字化して受理）。それ以外（かな・記号・スペース）は捨てる
    if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
      e.preventDefault();
      if (onChar) onChar(e.key.toLowerCase());
    }
  };
  document.addEventListener('keydown', handler);
  return () => document.removeEventListener('keydown', handler); // detach関数
}


// Node / バンドラ用エクスポート（ブラウザ直読みなら無視される）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { KANA_ROMA, kanaUnits, kanaMatch, kanaDisplay, TypingWord, attachKeyInput };
}
