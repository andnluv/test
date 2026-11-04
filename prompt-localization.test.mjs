import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizePromptTranslation,cleanTranslation,PromptNameTranslator,PROMPT_NAME_SELECTOR} from './prompt-localization.js';
test('empty default has no preset translation dictionary',()=>{
 const s=normalizePromptTranslation();
 assert.equal(s.profileId,'');assert.equal(s.autoTranslate,true);
 assert.deepEqual(Object.keys(s.cache),[]);
});
test('normalize rejects malformed translations and limits size',()=>{
 const s=normalizePromptTranslation({profileId:'prof1',cache:{'Narrative Style':'서술 방식','Deleted':'', 'Bad':77}});
 assert.equal(s.profileId,'prof1');assert.equal(s.cache['Narrative Style'],'서술 방식');assert.equal(s.cache.Deleted,undefined);assert.equal(s.cache.Bad,undefined);
});
test('model translation cleans wrappers but rejects explanations',()=>{
 assert.equal(cleanTranslation('번역: 캐릭터 일관성','Character Consistency'),'캐릭터 일관성');
 assert.equal(cleanTranslation('```text\n서술 스타일\n```','Narrative Style'),'서술 스타일');
 assert.equal(cleanTranslation('Here is the translation:\n서술 스타일','Narrative Style'),'');
});
test('profile service names filtered without changing current profile',()=>{
 globalThis.window={SillyTavern:{getContext:()=>({CONNECT_API_MAP:{openai:{selected:'openai'},text:{selected:'textgenerationwebui'},unknown:{selected:'bad'}},extensionSettings:{disabledExtensions:[],connectionManager:{selectedProfile:'rp-profile',profiles:[{id:'rp-profile',name:'RP',api:'openai'},{id:'translate',name:'번역',api:'text'},{id:'unsupported',name:'Unsupported',api:'unknown'}]}}})}};
 const t=new PromptNameTranslator({getSettings:()=>({cache:{}})});
 assert.deepEqual(t.getProfiles().map(p=>p.id),['rp-profile','translate']);
 assert.equal(window.SillyTavern.getContext().extensionSettings.connectionManager.selectedProfile,'rp-profile');
});
test('selector targets display-only prompt manager label',()=>assert.match(PROMPT_NAME_SELECTOR,/data-pm-name/));
