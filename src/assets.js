/*
 * ============================================================
 *  アセット・マニフェスト  (assets.js)
 * ============================================================
 *  画像・音声の論理キー → 実ファイルパス の対応表。
 *  - 画像は軽量化済みの assets/web/ を参照（元画像は assets/images/ に保持）
 *  - 音声は assets/audio/
 *  - 日本語ファイル名・スペースを含むため encodeURI() でURL化して使う
 * ============================================================
 */

const IMG_BASE = 'assets/web/';
const AUDIO_BASE = 'assets/';

const IMAGES = {
  // 品種（打鍵スプライト／通貨アイコン兼用）
  normal:      'corn/普通ポップコーン 焦げ無し.png',
  normal2:     'corn/普通ポップコーン 焦げ無し ２.png',
  normalLight: 'corn/普通ポップコーン ちょっと焦げあり.png',
  normalBurnt: 'corn/普通ポップコーン 焦げあり.png',
  caramel:     'corn/キャラメルポップコーン１.png',
  caramel2:    'corn/キャラメルポップコーン２.png',
  truffle:     'corn/トリュフポップコーン.png',
  gold:        'corn/純金のポップコーン.png',
  charcoal:    'corn/ポップコーン 真っ黒こげ（どのタイプのポップコーンでも使える）.png',

  // 設備
  pan:        'equipment/アーティファクト 鍋のみ.png',
  panGrandma: 'equipment/アーティファクト 鍋＋ばあちゃん.png',
  microwave:  'equipment/アーティファクト 電子レンジ.png',
  cinema:     'equipment/アーティファクト 映画館の業務用マシーン.png',
  ponkashi:   'equipment/アーティファクト ポン菓子.png',
  factory:    'equipment/アーティファクト ポップコーン工場.png',
  world:      'equipment/アーティファクト ポップコーンワールド.png',

  // 転生通貨
  salt: 'artifacts/塩.png',

  // 背景
  park: 'background/遊園地.png',
};

const AUDIO = {
  pop1:     'audio/se/ポンッ！.mp3',
  pop2:     'audio/se/ポンッ！_2.mp3',
  popMetal: 'audio/se/ポンッ！金属音っぽい音.mp3',
  result:   'audio/se/結果発表.mp3',
  bgm:      'audio/bgm/popでかわいいダンス曲.mp3',
};

/** 画像URL（encodeURI 済み）を返す */
function imgUrl(key) {
  return encodeURI(IMG_BASE + IMAGES[key]);
}
/** 音声URL（encodeURI 済み）を返す */
function audioUrl(key) {
  return encodeURI(AUDIO_BASE + AUDIO[key]);
}

/** 全画像をプリロードして {key: HTMLImageElement} を返す */
function preloadImages() {
  const out = {};
  for (const key of Object.keys(IMAGES)) {
    const im = new Image();
    im.src = imgUrl(key);
    out[key] = im;
  }
  return out;
}

window.ASSETS = { IMAGES, AUDIO, imgUrl, audioUrl, preloadImages };
