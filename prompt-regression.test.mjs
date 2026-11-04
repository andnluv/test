import test from 'node:test';
import assert from 'node:assert/strict';
import { PromptNameTranslator, parseBatch, isTranslationCandidate, getPromptLabels } from './prompt-localization.js';

test('batch parser keeps all eight requested labels in order',()=>{
 const sources=Array.from({length:8},(_,i)=>`标签-${i}`);
 const raw='```json\n'+JSON.stringify(sources.map((_,i)=>`번역 ${i+1}`))+'\n```';
 const parsed=parseBatch(raw,sources);
 assert.equal(parsed.size,8);
 assert.equal(parsed.get(sources[7]),'번역 8');
 assert.equal(isTranslationCandidate('리디바탕'),false);
 assert.equal(isTranslationCandidate('长思考'),true);
});

test('collects and batches 27 names rather than stopping after 14',async()=>{
 const names=Array.from({length:27},(_,i)=>`Item ${i+1}`);
 const elements=names.map(source=>({
  getAttribute:key=>key==='data-pm-name'?source:'',
  querySelector:()=>({childNodes:[{nodeType:3}],textContent:source}),
 }));
 const oldDoc=globalThis.document;
 globalThis.document={querySelectorAll:()=>elements};
 try{
  const config={profileId:'p1',autoTranslate:true,cache:{}};
  const t=new PromptNameTranslator({getSettings:()=>config});
  const calls=[];
  t.enabled=true;
  t.getProfiles=()=>[{id:'p1'}];
  t.applyCached=()=>{};
  t.loadService=async()=>({sendRequest:async(_id,msg)=>{
   const batch=JSON.parse(msg[1].content);
   calls.push(batch);
   return {content:JSON.stringify(batch.map(x=>`번역 ${x}`))};
  }});
  await t.translateMissing();
  assert.equal(Object.keys(config.cache).length,27);
  assert.equal(calls.length,4);
  assert.deepEqual(calls.map(x=>x.length),[8,8,8,3]);
 }finally{globalThis.document=oldDoc;}
});
