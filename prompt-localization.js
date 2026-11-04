/** Independent, display-only localization for native SillyTavern Prompt Manager names.
 * No preset or connection profile is ever switched or modified.
 */
export const PROMPT_NAME_SELECTOR='[class*="prompt_manager_prompt_name"][data-pm-name]';
export const DEFAULT_PROMPT_TRANSLATION=Object.freeze({profileId:'',autoTranslate:true,cache:{}});
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
 return {profileId:typeof r.profileId==='string'?r.profileId.slice(0,180):'',autoTranslate:r.autoTranslate!==false,cache};
}
export function cleanTranslation(raw,original){
 let value=String(raw??'').trim();
 value=value.replace(/^```(?:text|json)?\s*/i,'').replace(/\s*```$/,'').trim();
 value=value.replace(/^(?:한국어\s*번역|번역|Translation)\s*[:：]\s*/i,'').trim();
 value=value.replace(/^['"“‘](.*)['"”’]$/s,'$1').trim();
 if(!value||value.length>100||value.includes('\n')||value.includes('```')||value===original)return '';
 return value;
}
const labelNode=element=>element.querySelector(':scope > a.prompt-manager-inspect-action, :scope > span[title]') || element.querySelector('a.prompt-manager-inspect-action, span[title]');
export function getPromptLabels(root=document){
 return [...root.querySelectorAll(PROMPT_NAME_SELECTOR)].map(element=>({element,node:labelNode(element),source:(element.getAttribute('data-pm-name')||'').trim()})).filter(item=>item.node&&item.source);
}
function restoreName(item){if(item.node.dataset.ttkTranslatedName!==undefined){item.node.textContent=item.source;delete item.node.dataset.ttkTranslatedName;}}
export class PromptNameTranslator{
 constructor({getSettings,save,onStatus,onCacheChanged}={}){
  this.getSettings=getSettings;this.save=save||(()=>{});this.onStatus=onStatus||(()=>{});this.onCacheChanged=onCacheChanged||(()=>{});
  this.enabled=false;this.observer=null;this.timer=null;this.controller=null;this.running=false;this.runId=0;this.service=null;
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
   if(records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&(n.matches?.(PROMPT_NAME_SELECTOR)||n.querySelector?.(PROMPT_NAME_SELECTOR)))))this.schedule();
  });
  this.observer.observe(root,{subtree:true,childList:true});
  this.scan();
 }
 stop(){this.enabled=false;this.runId++;this.controller?.abort();this.controller=null;clearTimeout(this.timer);this.timer=null;this.observer?.disconnect();this.observer=null;for(const item of getPromptLabels())restoreName(item);this.onStatus('한글화 OFF · 원래 이름 표시');}
 schedule(){if(!this.enabled)return;clearTimeout(this.timer);this.timer=setTimeout(()=>this.scan(),250);}
 applyCached(){
  const cache=this.getSettings().cache;
  for(const item of getPromptLabels()){
   const text=cache[item.source];if(text){if(item.node.textContent!==text)item.node.textContent=text;item.node.dataset.ttkTranslatedName=text;}
   else restoreName(item);
  }
 }
 scan(){if(!this.enabled)return;this.applyCached();if(this.getSettings().autoTranslate)this.translateMissing();}
 async translateMissing(){
  if(!this.enabled||this.running)return;
  const config=this.getSettings();const profile=config.profileId;
  if(!profile)return;
  if(!this.getProfiles().some(p=>p.id===profile)){this.onStatus('저장된 번역 프로필을 선택해 주세요.');return;}
  const missing=[...new Set(getPromptLabels().map(p=>p.source).filter(x=>!config.cache[x]&&!/^[\d\W]+$/u.test(x)))].slice(0,MAX_ITEMS);
  if(!missing.length){this.onStatus('표시된 토글 이름 번역 완료');return;}
  this.running=true;const generation=this.runId;const controller=new AbortController();this.controller=controller;
  try{
   const service=await this.loadService();let completed=0;
   for(const source of missing){
    if(!this.enabled||generation!==this.runId||controller.signal.aborted||this.getSettings().profileId!==profile)break;
    this.onStatus(`토글명 번역 중 · ${completed+1}/${missing.length}`);
    try{
     const request=[{role:'system',content:'Translate only the following user-interface prompt toggle label into natural Korean. Return one short Korean label only. Do not explain, add punctuation, or translate placeholders such as {{user}}, {{char}}, IDs, or numbers.'},{role:'user',content:source}];
     const result=await service.sendRequest(profile,request,120,{stream:false,signal:controller.signal,includePreset:false,includeInstruct:false});
     if(!this.enabled||generation!==this.runId||controller.signal.aborted)break;
     const value=cleanTranslation(result?.content,source);
     if(value){this.getSettings().cache[source]=value;this.save();this.applyCached();this.onCacheChanged();}
    }catch(error){if(controller.signal.aborted)break;console.warn('[Tavern Toolkit] prompt translation:',source,error);this.onStatus(`번역 오류 · ${source} (나머지 진행)`);}
    completed++;
   }
   if(this.enabled&&generation===this.runId)this.onStatus(`번역 검사 완료 · ${completed}/${missing.length}개 요청`);
  }catch(error){this.onStatus(`번역 연결 오류 · ${error.message}`);console.warn('[Tavern Toolkit]',error);}
  finally{this.running=false;if(this.controller===controller)this.controller=null;}
 }
 refresh(){this.runId++;this.controller?.abort();this.running=false;this.scan();}
 setOverride(original,translated){
  const cache=this.getSettings().cache;const clean=String(translated??'').trim().slice(0,100);
  if(clean)cache[original]=clean;else delete cache[original];
  this.save();this.applyCached();this.onCacheChanged();
 }
 clearCache(){this.runId++;this.controller?.abort();this.running=false;this.getSettings().cache=Object.create(null);this.save();this.applyCached();this.onCacheChanged();this.onStatus('번역 캐시를 초기화했습니다.');}
}
