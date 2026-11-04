import test from 'node:test';
import assert from 'node:assert/strict';
import {THEMES,normalizeDesign,selectTheme,FONTS} from './design.js';
test('all three are complete semantic palettes',()=>{assert.equal(Object.keys(THEMES).length,3);for(const theme of Object.values(THEMES))for(const key of ['bg','surface','raised','text','muted','accent','border','user','ai','font'])assert.ok(theme[key],key);});
test('select theme resets custom overrides and chooses its font',()=>{const d=selectTheme({theme:'paper',custom:{bg:'#000000'}},'studio');assert.equal(d.theme,'studio');assert.equal(d.custom.bg,THEMES.studio.bg);assert.equal(d.font,THEMES.studio.font);});
test('invalid palette and metric inputs sanitized',()=>{const d=normalizeDesign({theme:'unknown',size:'abc',readWidth:999999,custom:{bg:'red'}});assert.equal(d.theme,'paper');assert.equal(d.size,17);assert.equal(d.readWidth,1100);assert.equal(d.custom.bg,THEMES.paper.bg);});
test('bundled fonts offered',()=>assert.ok(Object.keys(FONTS).length>=3));
