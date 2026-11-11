/** Independent, display-only localization for native SillyTavern Prompt Manager names.
 * No preset or connection profile is ever switched or modified.
 */
export const DEFAULT_PROMPT_TRANSLATION=Object.freeze({profileId:'',autoTranslate:true,cache:{},kept:[]});
const MAX_ITEMS=600;
export function normalizePromptTranslation(raw={}){
 const r=raw&&typeof raw==='object'?raw:{};
 const cache=Object.create(null);
 if(r.cache&&typeof r.cache==='object'&&!Array.isArray(r.cache)){
  for(const [key,value] of Object.entries(r.cache).slice(0,MAX_ITEMS)){
   if(key.length>180||typeof value!=='string')continue;
   const translated=value.trim().slice(0,100);
   if(translated)cache[key]=translated;
  }
 }
 // Names the model returned unchanged (proper nouns etc.). Remembered so they are not re-requested on every repaint.
 const kept=Array.isArray(r.kept)?[...new Set(r.kept.filter(x=>typeof x==='string'&&x&&x.length<=180&&!cache[x]))].slice(0,MAX_ITEMS):[];
 return {profileId:typeof r.profileId==='string'?r.profileId.slice(0,180):'',autoTranslate:r.autoTranslate!==false,cache,kept};
}
export function cleanTranslation(raw,original){
 let value=String(raw??'').trim();
 value=value.replace(/^```(?:text|json)?\s*/i,'').replace(/\s*```$/,'').trim();
 value=value.replace(/^(?:한국어\s*번역|번역|Translation)\s*[:：]\s*/i,'').trim();
 value=value.replace(/^['"“‘](.*)['"”’]$/s,'$1').trim();
 if(!value||value.length>100||value.includes('\n')||value.includes('```')||value===original)return '';
 return value;
}
// Native SillyTavern PromptManager renders the editable name in exactly one
// anchor/span. Change ONLY its text node, never add an overlay or a child span.
// Icons, drag handles, layout rules, titles and controls remain untouched.
export const PROMPT_NAME_SELECTOR='[data-pm-name][class*="prompt_manager_prompt_name"]';
const displayed=new Map();
function nameLabel(element){
 // Native versions may wrap the name with glyphs or auxiliary spans.
 // The name anchor remains the only editable display surface.
 return element.querySelector('a.prompt-manager-inspect-action, .prompt-manager-inspect-action, span[title]:not(.fa-solid):not(.fa-regular)');
}
export function getPromptLabels(root=document){
 const elements=[];
 if(root.matches?.(PROMPT_NAME_SELECTOR))elements.push(root);
 elements.push(...root.querySelectorAll(PROMPT_NAME_SELECTOR));
 return elements.map(element=>({element,source:(element.getAttribute('data-pm-name')||'').trim()})).filter(x=>x.source && nameLabel(x.element));
}
export function isTranslationCandidate(source){
 const s=String(source||'').trim();
 // v0.3.14: a name that already contains Hangul (e.g. "홍린 · HONGRIN") is treated as localized and is never sent.
 return !!s && /[A-Za-z\u3400-\u9FFF\u3040-\u30FF]/u.test(s) && !/\p{Script=Hangul}/u.test(s);
}
// Native names can contain nested spans and icon elements. Replacing textContent
// destroys those nodes, while rejecting mixed-content labels leaves the cache
// translated but the name untranslated. Retain every element and each text node.
function textParts(label){
 const parts=[];
 const iterator=document.createTreeWalker(label,NodeFilter.SHOW_TEXT,{
  acceptNode(node){
   if(node.parentElement?.closest('svg,button,input,textarea,select,script,style,[contenteditable="true"],.fa,.fas,.far,.fa-solid,.fa-regular,[data-ttk-ignore-name]'))return NodeFilter.FILTER_REJECT;
   return node.nodeValue?.trim()?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_SKIP;
  }
 });
 while(iterator.nextNode())parts.push(iterator.currentNode);
 return parts;
}
function showName({element,source},translated){
 const label=nameLabel(element);
 if(!label)return;
 let state=displayed.get(element);
 if(state && (state.source!==source || state.label!==label || !label.isConnected)){
  restoreElement(element);state=null;
 }
 if(!translated){restoreElement(element);return;}
 if(!state){
  const parts=textParts(label);
  if(!parts.length)return;
  // Preserve nested icons and links; only existing name text nodes are changed.
  // The native prompt identifier remains in data-pm-name and its preset.
  state={source,label,snapshots:parts.map(n=>[n,n.nodeValue])};
  displayed.set(element,state);
 }
 const [first,...rest]=state.snapshots;
 if(first[0].isConnected && first[0].nodeValue!==translated)first[0].nodeValue=translated;
 for(const [node] of rest)if(node.isConnected && node.nodeValue!=='')node.nodeValue='';
 element.classList.add('ttk-prompt-localized');
}
function restoreElement(element){
 const state=displayed.get(element);if(!state)return;
 for(const [node,original] of state.snapshots){
  if(node.isConnected && node.nodeValue!==original)node.nodeValue=original;
 }
 element.classList.remove('ttk-prompt-localized');displayed.delete(element);
}
export function restoreAllPromptNames(){for(const element of [...displayed.keys()])restoreElement(element);}
function extractText(response){
 if(typeof response==='string')return response;
 if(typeof response?.content==='string')return response.content;
 if(Array.isArray(response?.content))return response.content.map(p=>p?.text||'').join('');
 return response?.choices?.[0]?.message?.content||response?.text||'';
}
export function parseBatch(raw,sources,same=null){
 const note=(value,source)=>{if(same&&typeof value==='string'&&value.trim()===source)same.add(source);};
 const text=String(raw||'').trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
 let parsed;
 try{parsed=JSON.parse(text);}catch{return new Map();}
 const map=new Map();
 if(Array.isArray(parsed)){
  parsed.forEach((v,i)=>{if(i<sources.length){note(v,sources[i]);const cleaned=cleanTranslation(v,sources[i]);if(cleaned)map.set(sources[i],cleaned);}});
 }else if(parsed&&typeof parsed==='object'){
  for(const [i,source] of sources.entries()){
   const value=parsed[source]??parsed[String(i+1)]??parsed[String(i)];
   note(value,source);
   const cleaned=cleanTranslation(value,source);
   if(cleaned)map.set(source,cleaned);
  }
 }
 return map;
}
export class PromptNameTranslator{
 constructor({getSettings,save,onStatus,onCacheChanged}={}){
  this.getSettings=getSettings;this.save=save||(()=>{});this.onStatus=onStatus||(()=>{});this.onCacheChanged=onCacheChanged||(()=>{});
  this.enabled=false;this.observer=null;this.timer=null;this.controller=null;this.activeRun=null;this.runId=0;this.service=null;this.failures=new Map();
 }
 getProfiles(){
  const ctx=window.SillyTavern?.getContext?.();
  if(!ctx || ctx.extensionSettings?.disabledExtensions?.includes('connection-manager'))return [];
  const profiles=ctx.extensionSettings?.connectionManager?.profiles;
  const allowed=ctx.CONNECT_API_MAP;
  return Array.isArray(profiles)?profiles.filter(p=>p?.id&&p.name&&p.api&&['openai','textgenerationwebui'].includes(allowed?.[p.api]?.selected)).map(p=>({id:p.id,name:p.name,api:p.api})):[];
 }
 async loadService(){
  if(this.service)return this.service;
  // Official ST API: same-origin module; no third-party extension code used.
  const module=await import('/scripts/extensions/shared.js');
  if(!module?.ConnectionManagerRequestService?.sendRequest)throw Error('현재 실리태번에서 프로필 요청 서비스를 사용할 수 없습니다.');
  this.service=module.ConnectionManagerRequestService;
  return this.service;
 }
 start(){
  if(this.enabled){this.scan();return;}
  this.enabled=true;this.runId++;
  const root=document.querySelector('#openai_settings')||document.body;
  this.observer=new MutationObserver(records=>{
   // Observe actual prompt manager repaint only; do not observe text mutations to avoid feedback.
   if(records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&(n.matches?.(PROMPT_NAME_SELECTOR)||n.querySelector?.(PROMPT_NAME_SELECTOR)||n.matches?.('[data-pm-identifier]')||n.querySelector?.('[data-pm-identifier]')))))this.schedule();
  });
  this.observer.observe(root,{subtree:true,childList:true});
  this.scan();
 }
 stop(){this.enabled=false;this.runId++;this.controller?.abort();this.controller=null;clearTimeout(this.timer);this.timer=null;this.observer?.disconnect();this.observer=null;restoreAllPromptNames();this.onStatus('한글화 OFF · 원래 이름 표시');}
 schedule(){if(!this.enabled)return;clearTimeout(this.timer);this.timer=setTimeout(()=>this.scan(),250);}
 applyCached(){
  const cache=this.getSettings().cache;
  // The prompt manager is rebuilt on every toggle; drop records of rows that no longer exist.
  for(const element of [...displayed.keys()])if(!element.isConnected)displayed.delete(element);
  for(const item of getPromptLabels()){
   const text=cache[item.source];showName(item,text||'');
  }
 }
 scan(){if(!this.enabled)return;this.applyCached();if(this.getSettings().autoTranslate)this.translateMissing();}
 /** @param {boolean} force manual run: also retries names kept as-is or that failed earlier in this session */
 async translateMissing(force=false){
  if(!this.enabled||this.activeRun)return;
  const profile=this.getSettings().profileId;
  if(!profile)return;
  if(!this.getProfiles().some(p=>p.id===profile)){this.onStatus('저장된 번역 프로필을 선택해 주세요.');return;}
  const run={};this.activeRun=run;
  if(force)this.failures.clear();
  const keptSet=new Set(force?[]:this.getSettings().kept||[]);
  const skip=x=>keptSet.has(x)||(!force&&(this.failures.get(x)||0)>=2);
  let emptyResponses=0;
  const generation=this.runId,controller=new AbortController();this.controller=controller;
  const failed=new Set();let translated=0,attempted=0;
  const active=()=>this.enabled&&this.runId===generation&&!controller.signal.aborted&&this.getSettings().profileId===profile;
  const saveResults=map=>{
   if(!active())return;
   for(const [source,value] of map){if(!this.getSettings().cache[source]){this.getSettings().cache[source]=value;translated++;}}
   if(map.size){this.save();this.applyCached();this.onCacheChanged();}
  };
  try{
   const service=await this.loadService();
   // Recollect after every batch: handles lists rerendered while translations run.
   let processed=new Set();
   while(active()){
    const all=[...new Set(getPromptLabels().map(x=>x.source).filter(isTranslationCandidate))];
    const pending=all.filter(x=>!this.getSettings().cache[x]&&!processed.has(x)&&!skip(x));
    if(!pending.length||processed.size>=600)break;
    const batch=pending.slice(0,8);
    batch.forEach(x=>processed.add(x));attempted+=batch.length;
    this.onStatus(`번역 진행 · 성공 ${translated} / 요청 ${attempted} / 표시 ${all.length}`);
    try{
     const messages=[
      {role:'system',content:'Translate the supplied JSON array of UI label strings into Korean as a Korean app would label them: short noun phrases (명사형, e.g. "문체 지침", "캐릭터 설정"), no sentence endings, no literal word-for-word renderings, common loanwords in their usual Hangul form. Output ONLY one JSON array with exactly the same number of strings and the same order. Preserve emojis, placeholders, symbols, IDs, and special tokens. Do not add explanations.'},
      {role:'user',content:JSON.stringify(batch)}
     ];
     // Reasoning models spend output tokens on thinking first; keep generous headroom so the answer is not empty.
     const response=await service.sendRequest(profile,messages,Math.min(2400,Math.max(600,batch.length*160)),{stream:false,signal:controller.signal,includePreset:false,includeInstruct:false});
     if(!active())break;
     const text=extractText(response);if(!String(text||'').trim())emptyResponses++;
     const same=new Set();
     const parsed=parseBatch(text,batch,same);
     saveResults(parsed);
     if(same.size){const s=this.getSettings();s.kept=[...new Set([...(s.kept||[]),...same])].filter(x=>!s.cache[x]).slice(-MAX_ITEMS);same.forEach(x=>keptSet.add(x));this.save();}
     for(const source of batch)if(!parsed.has(source)&&!same.has(source)){failed.add(source);this.failures.set(source,(this.failures.get(source)||0)+1);}
    }catch(error){
     if(!active())break;
     console.warn('[Tavern Toolkit] prompt translation batch',error);
     batch.forEach(x=>{failed.add(x);this.failures.set(x,(this.failures.get(x)||0)+1);});
    }
    // Yield to UI and rate-limited providers between requests.
    await new Promise(resolve=>setTimeout(resolve,250));
   }
   if(active()){
    const all=[...new Set(getPromptLabels().map(x=>x.source).filter(isTranslationCandidate))];
    const kept=all.filter(x=>!this.getSettings().cache[x]&&keptSet.has(x)).length;
    const remaining=all.filter(x=>!this.getSettings().cache[x]&&!keptSet.has(x));
    const keptNote=kept?` · 원문 유지 ${kept}개`:'';
    if(emptyResponses&&remaining.length)this.onStatus(`빈 응답 ${emptyResponses}회 · 미번역 ${remaining.length}개${keptNote} · 추론 모델이면 출력 토큰이 부족할 수 있습니다. '현재 토글 번역'으로 다시 시도하세요.`);
    else this.onStatus(remaining.length?`번역 성공 ${translated}개 · 미번역 ${remaining.length}개${keptNote} ('현재 토글 번역'으로 다시 시도)`:`현재 표시된 토글 ${all.length}개 처리 완료${keptNote}`);
   }
  }catch(error){console.warn('[Tavern Toolkit]',error);if(active())this.onStatus(`번역 연결 오류 · ${error.cause?.message||error.message}`);}
  finally{if(this.activeRun===run)this.activeRun=null;if(this.controller===controller)this.controller=null;}
 }
 refresh(){this.runId++;this.controller?.abort();this.activeRun=null;this.failures.clear();this.scan();}
 setOverride(original,translated){
  const cache=this.getSettings().cache;const clean=String(translated??'').trim().slice(0,100);
  if(clean){cache[original]=clean;const s=this.getSettings();if(s.kept?.includes(original))s.kept=s.kept.filter(x=>x!==original);}else delete cache[original];
  this.save();this.applyCached();this.onCacheChanged();
 }
 clearCache(){this.runId++;this.controller?.abort();this.activeRun=null;this.failures.clear();this.getSettings().kept=[];this.getSettings().cache=Object.create(null);this.save();this.applyCached();this.onCacheChanged();this.onStatus('번역 캐시를 초기화했습니다.');}
}
