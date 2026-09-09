/* English controls; practice text and Japanese story are preserved. */
(function installEnglishUi(config){
 'use strict';
 const en=new URLSearchParams(location.search).get('lang')==='en';
 if(!en)return;
 const dictionary=config.dictionary;
 const excluded='script,style,textarea,input,#word-display,#word-kana,#word-roma,#romaji-guide,#word-text,#typing-text';
 function translate(text){
  const key=text.trim();
  if(Object.hasOwn(dictionary,key))return text.replace(key,dictionary[key]);
  return text.replace(/^(\d+) ステップ$/,'$1 steps').replace(/^Wave (\d+) からリトライ$/,'Retry Wave $1')
    .replace('大きな古時計','My Grandfather’s Clock').replace('エリーゼのために','Für Elise').replace('トルコ行進曲','Turkish March')
    .replace('H.C. Work (チュートリアル)','H. C. Work (lesson)').replace('L.v. ベートーヴェン','L. van Beethoven').replace('W.A. モーツァルト','W. A. Mozart');
 }
 function walk(root){
  if(root.nodeType===3){
   if(root.parentElement?.closest(excluded))return;
   const next=translate(root.nodeValue);
   if(next!==root.nodeValue)root.nodeValue=next;
   return;
  }
  if(root.nodeType!==1||root.matches(excluded))return;
  for(const attr of ['placeholder','title','aria-label']){
   if(root.hasAttribute(attr)){const old=root.getAttribute(attr),next=translate(old);if(next!==old)root.setAttribute(attr,next);}
  }
  for(const child of root.childNodes)walk(child);
 }
 function start(){
  document.documentElement.lang='en';
  walk(document.body);
  const help=document.createElement('details');help.id='english-controls-help';
  help.style.cssText='position:fixed;right:8px;bottom:8px;z-index:100000;max-width:min(340px,90vw);border:1px solid #819caf;border-radius:8px;background:#132c40;color:#fff;padding:8px 12px;font:14px/1.5 system-ui;text-align:left;box-shadow:0 2px 12px #0006';
  const summary=document.createElement('summary');summary.textContent='English · How to play';summary.style.cursor='pointer';
  const body=document.createElement('p');body.textContent=config.help;body.style.cssText='max-height:38vh;overflow:auto;margin:10px 0';
  const link=document.createElement('a');const url=new URL(location.href);url.searchParams.set('lang','ja');link.href=url.href;link.textContent='日本語';link.style.color='#a6efff';
  help.append(summary,body,link);document.body.appendChild(help);
  new MutationObserver(records=>{
   for(const record of records){
    if(record.type==='characterData')walk(record.target);
    else for(const added of record.addedNodes)walk(added);
   }
  }).observe(document.body,{subtree:true,childList:true,characterData:true});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})({"dictionary":{"読み込み中…":"Loading…","もう一度！":"Play again","もう一度":"Play again","最初から、もう一度":"Play again from the start","最初から":"Start over","Wave 1 からやり直す":"Restart at Wave 1","名前":"Name","なまえ":"Name","スコア":"Score","正確率":"Accuracy","タイピング速度":"Typing speed","閉じる":"Close","音量":"Volume","音のオン/オフ":"Sound on/off","ランキング":"Leaderboard","世界ランキング":"World leaderboard","🏆 世界ランキング":"🏆 World leaderboard","全画面":"Fullscreen","サウンド":"Sound","START":"START","ホームへ":"Home","挑 戦 す る":"Start today’s challenge","討伐済み！また明日":"Cleared! Come back tomorrow","タイトルへ戻る（ランキングを見る）":"Back to title / leaderboard","討 伐 成 功 ！":"BOSS DEFEATED!","なまえ（ランキング用）":"Name for the leaderboard","軍勢":"Army","軍勢DPS":"Army DPS","打鍵/分":"Keys/min","通算討伐":"Total clears","連続討伐":"Daily streak","討 伐 ！":"DEFEATED!","討伐すると本日のランキングに載ります":"Defeat the boss to submit your score to today’s leaderboard.","─ 本日の討伐者ランキング ─":"Today’s leaderboard","また明日、新たな神格が現れる──":"A new deity arrives tomorrow.","ことばを打ちきると兵士が召喚される（IMEはOFFのままでOK）":"Complete the displayed romaji to summon a soldier. Keep IME off.","キーを押して名曲を演奏しよう":"Play piano pieces with your keyboard","任意のキーを押して演奏してください":"Press keys to play. In lessons, press the highlighted letter.","← 曲選択":"← Choose a piece","演奏完了！":"Piece complete!","曲を選ぶ":"Choose a piece","ホームポジション":"Home position","まず両手をキーボードのここに置こう":"Rest your fingers on these keys.","小指":"Little","薬指":"Ring","中指":"Middle","人差し指":"Index","← 左手":"← Left hand","右手 →":"Right hand →","準備できた！スタート ▶":"Ready! Start ▶","練習":"Lesson","初級":"Beginner","上級":"Advanced","ホームポジションを覚えよう":"Learn the home position","ホームポジションで弾けます":"Play from the home position","テンポが速め・応用向け":"Faster tempo / advanced","ピアノ音源を読み込み中…":"Loading piano sounds…","準備OK！最初のタイルを待ってね":"Ready! Wait for the first tile.","放置型タイピングゲーム":"Idle typing game","🍿 ポップコーン":"🍿 Popcorn","タイピング":"Typing","▶ はじめる":"▶ Start","※ キーボードでローマ字入力するゲームです（PC推奨）":"Use a physical keyboard to type romaji. PC recommended.","レベル":"Level","1打鍵":"Per key","レベルUP":"Level up","施設購入":"Buy facility","品種研究":"New variety","コンボ":"Combo","粒/秒":"/ sec","ぜんぶ満タン！ゲームクリア！":"Every container is full! Game clear!","チートモード解放！":"100× mode unlocked!","😈 チートで遊ぶ！":"😈 Play at 100×!","読み込めなかった…（時間をおいて開いてね）":"Could not load. Please try again later.","まだ誰もいないよ。1位になるチャンス！":"No scores yet. You can be the first!","最初からやり直す":"Start over","打って弾けさせて、容器をいっぱいに！":"Type, pop corn and fill each container!","放置している間も焼けてどんどん増えるよ🍿":"Your facilities keep roasting while you rest. 🍿","タイルが降ってきたら、光ったキーを押そう。":"Press the highlighted key when its tile arrives.","押したらすぐホームポジションに指を戻すのがコツ！":"Return your finger to the home position after each key.","大きな古時計":"My Grandfather’s Clock","エリーゼのために":"Für Elise","トルコ行進曲":"Turkish March","H.C. Work (チュートリアル)":"H. C. Work (lesson)","L.v. ベートーヴェン":"L. van Beethoven","W.A. モーツァルト":"W. A. Mozart","クトゥルフタイピング":"Cthulhu Typing","ことばを打つたび、兵士が召喚され自動で戦う。":"Complete words to summon soldiers who fight automatically.","長いことばほど強い兵士が来る。軍勢を増やして、今日の神格を討て。":"Longer kana words summon stronger soldiers. Build an army to defeat today’s deity.","倒したら今日はクリア。また明日、新たな神格が現れる。":"One successful clear per day. A new deity arrives tomorrow.","1日1体・Enterでも開始 ／ スコア＝打鍵速度×正確率×ボス強度":"One clear per day · Enter to start · Score = typing speed × accuracy × boss strength","ソルジャータイピング":"Soldier Typing","ソルジャータイピング２":"Soldier Typing 2","タイピングして兵士を召喚し、ボスを倒して５Waveクリアせよ！":"Type to summon soldiers and clear all five waves!","ワードをローマ字で入力 → 兵士召喚":"Complete the romaji word → summon a soldier","7体に1体は弓兵（遠距離攻撃）が出る":"Every seventh soldier is a ranged archer","味方が敵陣に侵入 → ボス出現！":"Reach enemy territory → the boss appears","城壁に到達 → 城ダメージ（ボス出現後のみ）":"Reach the enemy wall → damage it after the boss appears","ボス撃破 または 敵城破壊 → Waveクリア":"Defeat the boss or destroy its castle → wave clear","Waveクリア後 →":"After a wave clears →","Enterキー":"Enter","で次のWaveへ":"to continue","SI / SHI どちらでもOK（入力の揺れ許容）":"Both SI and SHI are accepted","IME（日本語変換）はOFFにしてください":"Keep Japanese IME off","音声設定":"Audio settings","🏰 敵城":"🏰 Enemy castle","敵城HP":"Enemy castle HP","なまえを入力":"Enter a nickname","入力したら Enter":"Press Enter when ready","記録中…":"Saving…"},"help":"Press Start, click inside the game and copy the displayed Latin letters. Keep IME off. 1 = level up; 2 = buy an affordable facility; 3 = research a variety. Enter skips a word. A wrong letter resets your combo. Facilities produce while you rest; saving requires browser storage."});
