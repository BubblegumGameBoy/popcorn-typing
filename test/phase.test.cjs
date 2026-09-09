const fs=require('node:fs'),vm=require('node:vm'),test=require('node:test'),assert=require('node:assert/strict');
const source=fs.readFileSync(require('node:path').join(__dirname,'../src/main.js'),'utf8');
test('music can change while a phase keeps the same background',()=>{
 const played=[],ctx=vm.createContext({game:{phase:{bg:'town',bgm:'bgm4',space:false}},bgEl:{style:{}},ASSETS:{imgUrl:s=>s},document:{body:{classList:{toggle(){}}}},audio:{playBGM:s=>played.push(s)}});
 vm.runInContext(source.slice(source.indexOf('let curPhaseBg'),source.indexOf('// ── 入力')),ctx);
 vm.runInContext('applyPhase(false);game.phase={bg:"town",bgm:"bgm5",space:false};applyPhase(false);applyPhase(false)',ctx);
 assert.deepEqual(played,['bgm4','bgm5']);
});
