# はてなブログ用：埋め込みコード＆紹介文

> ※ ゲームは GitHub Pages 公開URL前提：`https://bubblegumgameboy.github.io/popcorn-typing/`
> まだ Pages を有効化していない場合は Settings → Pages → Deploy from a branch → / (root) で公開してください。
> 貼り付けは、はてなブログの編集画面を **「HTML編集」モード** にしてからコードを貼ってください。

---

## ① 紹介文（コピペ用）

### 見出し案
- **【放置型タイピングゲーム】キーを打つたびポップコーンがポンッ！宇宙までいっぱいにしよう🍿**
- **タイピングしながら放置でも増える。中毒性ありの「ポップコーンタイピング」作った**

### 本文（短め・エンゲージ重視）
> ⌨️ **キーを打つたび、ポップコーンがポンッ！**
>
> 【放置型タイピングゲーム】**ポップコーンタイピング** を作りました🍿
> 小さなカップを満タンにすると、容器がどんどん大きくなって…
> バケツ → トラック → ビル → 街 → **地球**、そして **宇宙ぜんぶ** まで！
>
> タイピング練習になるのに、気づいたら時間が溶ける中毒性。
> しかも**基本は放置ゲー**。離れている間も施設が自動で焼いてくれるので、
> 戻ってくると「うわ、こんなに増えてる！」が気持ちいい。
>
> 流行語やおやつネタのゆかいなお題もいっぱい。
> 👇 **下のゲームをクリックして、今すぐ弾けさせよう！**（PC・キーボード推奨）

---

## ② 埋め込みHTML（全画面ボタン版・推奨）

> 戦略メモ：**ゲーム本体(github.io)には広告を入れない**（iframeで読み込まれるため、はてな上で広告が二重表示＝AdSense規約リスク）。
> 収益もエンゲージも**はてな記事ページに集約**。大画面プレイは github 誘導ではなく **iframeを全画面化**してはてなに留めるのがベスト。

```html
<!-- 🍿 ポップコーンタイピング 埋め込み（全画面ボタン版） -->
<div style="max-width:780px;margin:24px auto;font-family:'Hiragino Maru Gothic ProN',sans-serif;">
  <div style="background:#fff7e6;border:3px solid #ffd86b;border-radius:18px;padding:16px;text-align:center;box-shadow:0 8px 24px rgba(120,80,30,.18);">
    <p style="display:inline-block;background:#ffd86b;color:#5a3b1e;font-weight:bold;font-size:12px;padding:3px 12px;border-radius:999px;margin:0 0 8px;">放置型タイピングゲーム</p>
    <h3 style="font-size:24px;color:#e8534e;margin:0 0 8px;">🍿 ポップコーンタイピング</h3>
    <p style="font-size:14px;color:#8a6a45;margin:0 0 12px;line-height:1.7;">
      打って弾けさせて、容器をいっぱいに！<br>放置している間も焼けて、どんどん増えるよ🍿<br>
      <span style="font-size:12px;">（PC・キーボード推奨。画面を1回クリックしてから打ってね）</span>
    </p>
    <div style="position:relative;width:100%;padding-top:62.5%;border-radius:12px;overflow:hidden;box-shadow:0 6px 18px rgba(120,80,30,.25);">
      <iframe id="poptype-game" src="https://bubblegumgameboy.github.io/popcorn-typing/" title="ポップコーンタイピング"
        loading="lazy" allow="autoplay; fullscreen" allowfullscreen referrerpolicy="no-referrer"
        style="position:absolute;inset:0;width:100%;height:100%;border:0;"></iframe>
    </div>
    <p style="margin:14px 0 0;">
      <button type="button"
        onclick="var f=document.getElementById('poptype-game');(f.requestFullscreen||f.webkitRequestFullscreen||f.msRequestFullscreen).call(f);"
        style="cursor:pointer;background:#e8534e;color:#fff;font-weight:bold;border:0;padding:11px 26px;border-radius:999px;box-shadow:0 4px 0 #c43c37;">
        ⛶ 全画面で遊ぶ
      </button>
    </p>
  </div>
</div>
```

### 収益・SEO戦略メモ
- **広告は iframe の"外"＝はてなページ側だけ**（既存 AdSense でOK）。github.io 側はクリーンに保つ。
- 滞在時間（エンゲージ）は **iframe を開いている間ずっと はてなページにカウント**される → 埋め込み一本でOK。github へ誘導しない。
- おすすめ配置：紹介文 → ゲーム埋め込み → **300×250 広告（遊んだ直後）** → 遊び方・特徴テキスト（SEOボリューム）→ サイドバー広告。


---

## ③ もっとシンプルに貼りたい場合（最小版）

```html
<div style="position:relative;width:100%;max-width:760px;margin:20px auto;padding-top:47.5%;">
  <iframe src="https://bubblegumgameboy.github.io/popcorn-typing/" title="ポップコーンタイピング"
    loading="lazy" allow="autoplay"
    style="position:absolute;inset:0;width:100%;height:100%;border:0;border-radius:12px;"></iframe>
</div>
```
