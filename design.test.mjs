import test from 'node:test';
import assert from 'node:assert/strict';
import {THEMES,normalizeDesign,selectTheme,resetPalette,FONTS} from './design.js';
test('all four are complete semantic palettes',()=>{assert.equal(Object.keys(THEMES).length,4);for(const theme of Object.values(THEMES))for(const key of ['bg','surface','raised','text','muted','accent','border','user','ai','font'])assert.ok(theme[key],key);});
test('theme switching preserves typography and per-theme palette',()=>{const first=normalizeDesign({theme:'paper',font:'ibmplex',dialogueFont:'ridibatang',custom:{bg:'#000000'}});const studio=selectTheme(first,'studio');assert.equal(studio.theme,'studio');assert.equal(studio.font,'ibmplex');assert.equal(studio.dialogueFont,'ridibatang');assert.equal(studio.custom.bg,THEMES.studio.bg);const paper=selectTheme(studio,'paper');assert.equal(paper.custom.bg,'#000000');assert.equal(resetPalette(paper,'paper').custom.bg,THEMES.paper.bg);});
test('invalid palette and metric inputs sanitized',()=>{const d=normalizeDesign({theme:'unknown',size:'abc',readWidth:999999,custom:{bg:'red'}});assert.equal(d.theme,'paper');assert.equal(d.size,17);assert.equal(d.readWidth,undefined);assert.equal(d.messageGap,undefined);assert.equal(d.custom.bg,THEMES.paper.bg);});
test('bundled fonts offered',()=>assert.ok(Object.keys(FONTS).length>=3));

test('dialogue typography persists and defaults to narration font',()=>{const d=normalizeDesign({font:'nanumgothic',dialogueFont:'nanummyeongjo'});assert.equal(d.dialogueFont,'nanummyeongjo');assert.equal(normalizeDesign({font:'nanumgothic'}).dialogueFont,'nanumgothic');});
test('legacy width and gap ignored',()=>{const d=normalizeDesign({readWidth:520,messageGap:9});assert.ok(!('readWidth' in d));assert.ok(!('messageGap' in d));});

const selected=['pretendard','kopubdotum','nanumsquareround','ibmplex','ridibatang','kopubbatang','hahmlet','busandandi','zenserif','mona12','sanhayeop','gangwon','geulbang'];
test('13 selected fonts are available as options without assuming local redistribution',()=>{for(const id of selected)assert.ok(FONTS[id],id);assert.equal(FONTS.hahmlet.source,'web');assert.equal(FONTS.kopubdotum.source,'local');});
test('distinct narration and dialogue fonts are preserved',()=>{const d=normalizeDesign({font:'ibmplex',dialogueFont:'mona12'});assert.equal(d.font,'ibmplex');assert.equal(d.dialogueFont,'mona12');});

test('icon styling flags preserved',()=>{const d=normalizeDesign({iconStyle:'soft',iconTone:'accent'});assert.equal(d.iconStyle,'soft');assert.equal(d.iconTone,'accent');});

test('porcelain is pure white and preserves font and previously selected palettes',()=>{
 const initial=normalizeDesign({theme:'paper',font:'ibmplex',dialogueFont:'hahmlet'});
 const next=selectTheme(initial,'porcelain');
 assert.equal(next.custom.bg,'#FFFFFF');
 assert.equal(next.font,'ibmplex');
 assert.equal(next.dialogueFont,'hahmlet');
 const edited=normalizeDesign({...next,palettes:{...next.palettes,porcelain:{...next.custom,accent:'#153E82',border:'#97B2D4'}}});
 assert.equal(selectTheme(selectTheme(edited,'studio'),'porcelain').custom.accent,'#153E82');
});

import {readFileSync} from 'node:fs';
const sheet=readFileSync(new URL('./style.css',import.meta.url),'utf8');
test('Paper and Studio enforce full-width user and AI cards',()=>{
 for(const theme of ['paper','studio']){
  assert.match(sheet,new RegExp(`html\\[data-ttk-theme="${theme}"\\] #chat \\.mes\\[is_user="true"\\]`));
 }
 assert.match(sheet,/margin-inline:0!important/);
 assert.match(sheet,/width:100%!important/);
});
test('reasoning controls theme background and text instead of gray',()=>{
 assert.match(sheet,/mes_reasoning_header/);
 assert.match(sheet,/mes_reasoning_summary/);
 assert.match(sheet,/background:var\(--ttk-raised\)!important/);
 assert.match(sheet,/color:var\(--ttk-text\)!important/);
});
