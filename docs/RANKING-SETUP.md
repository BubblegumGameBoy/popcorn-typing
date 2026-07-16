# 世界ランキングのセットアップ手順

世界ランキングは Firebase Realtime Database の REST API だけで動きます(SDK・Cloud Functions・ビルド不要、無料の Spark プランでOK)。

## 1. Firebase プロジェクトと Realtime Database を作る

1. [Firebase コンソール](https://console.firebase.google.com/) でプロジェクトを作成(既存プロジェクトの流用でOK。ゲームごとにデータはパスで分離されます)
2. 左メニュー「構築 > Realtime Database」→「データベースを作成」
   - ロケーションはどこでも可(例: `asia-southeast1`)
   - セキュリティルールは「ロックモード」で開始
3. 作成後に表示される URL を控える
   - 例: `https://xxxx-default-rtdb.asia-southeast1.firebasedatabase.app`

## 2. セキュリティルールを設定する

Realtime Database の「ルール」タブに、このリポジトリの `database.rules.json` の中身を貼り付けて「公開」。

ルールの意味:

- ルート直下はすべて読み書き禁止(他ゲームのデータと干渉しない)
- `popcorn-typing/players` だけ読み取り可・`score` でインデックス
- 書き込みは「スコアが前回以上」のときだけ許可(累計型なので減少は不正)
- `name` は1〜12文字、`score` は 0以上の数値のみ（上限なし。JSONはInfinity/NaNを運べない）

## 3. ゲームに URL を設定する

`index.html` の以下の行に、手順1で控えた URL を貼る:

```html
<script>window.LEADERBOARD_URL = 'https://xxxx-default-rtdb.asia-southeast1.firebasedatabase.app';</script>
```

URL が空のままだと 🏆 ボタンごと非表示になり、ランキング機能はオフのまま動きます。

## 動作の仕組み(コスト設計)

- **1プレイヤー = 1レコード上書き**(`/popcorn-typing/players/{playerId}` に PUT)。データは増殖しない
- **送信タイミング**: ①容器クリア時 ②60秒ごとのチェック(前回送信から5分以上 かつ +1%以上成長したときだけ) ③タブを閉じる/隠したとき — いずれもスロットル込みで実際の書き込みは多くても毎時12回程度/人
- **取得**: `orderBy="score"&limitToLast=100` でサーバー側ソート、クライアントで1分キャッシュ
- **参加はオプトイン**: ランキング画面で名前を入力した人だけ送信される
- Realtime Database の無料枠は保存1GB・転送10GB/月。この設計なら数万人規模でも余裕です
