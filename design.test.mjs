import test from 'node:test';
import assert from 'node:assert/strict';
import {THEMES,normalizeDesign,selectTheme,FONTS} from './design.js';
test('all three are complete semantic palettes',()=>{assert.equal(Object.keys(THEMES).length,3);for(const theme of Object.values(THEMES))for(const key of ['bg','surface','raised','text','muted','accent','border','user','ai','font'])assert.ok(theme[key],key);});
test('select theme resets custom overrides and chooses its font',()=>{const d=selectTheme({theme:'paper',custom:{bg:'#000000'}},'studio');assert.equal(d.theme,'studio');assert.equal(d.custom.bg,THEMES.studio.bg);assert.equal(d.font,THEMES.studio.font);});
test('invalid palette and metric inputs sanitized',()=>{const d=normalizeDesign({theme:'unknown',size:'abc',readWidth:999999,custom:{bg:'red'}});assert.equal(d.theme,'paper');assert.equal(d.size,17);assert.equal(d.readWidth,undefined);assert.equal(d.messageGap,undefined);assert.equal(d.custom.bg,THEMES.paper.bg);});
test('bundled fonts offered',()=>assert.ok(Object.keys(FONTS).length>=3));

test('dialogue typography persists and defaults to narration font',()=>{const d=normalizeDesign({font:'nanumgothic',dialogueFont:'nanummyeongjo'});assert.equal(d.dialogueFont,'nanummyeongjo');assert.equal(normalizeDesign({font:'nanumgothic'}).dialogueFont,'nanumgothic');});
test('legacy width and gap ignored',()=>{const d=normalizeDesign({readWidth:520,messageGap:9});assert.ok(!('readWidth' in d));assert.ok(!('messageGap' in d));});

const selected=['pretendard','kopubdotum','nanumsquareround','ibmplex','ridibatang','kopubbatang','hahmlet','busandandi','zenserif','mona12','sanhayeop','gangwon','geulbang'];
test('13 selected fonts are available as options without assuming local redistribution',()=>{for(const id of selected)assert.ok(FONTS[id],id);assert.equal(FONTS.hahmlet.source,'web');assert.equal(FONTS.kopubdotum.source,'local');});
test('distinct narration and dialogue fonts are preserved',()=>{const d=normalizeDesign({font:'ibmplex',dialogueFont:'mona12'});assert.equal(d.font,'ibmplex');assert.equal(d.dialogueFont,'mona12');});
