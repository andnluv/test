/** Independent, display-only localization for native SillyTavern Prompt Manager names.
 * No preset or connection profile is ever switched or modified.
 */
export const PROMPT_NAME_SELECTOR='[data-pm-name],[data-pm-display-name],[class*="prompt_manager_prompt_name"],.prompt_manager_prompt_name,.prompt-manager-prompt-name';
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
// SillyTavern may render the same prompt name in more than one label node.
// Never replace the entire row/anchor: those elements also own click handlers and icons.
const LABEL_SELECTOR='a.prompt-manager-inspect-action, span[title]';
const displayed=new Map();
function textNodesOf(element){
 const found=[];
 const walk=node=>{
  if(node.nodeType===3){found.push(node);return;}
  if(node.nodeType!==1 || node.matches?.('button,input,textarea,select,svg,.fa,.fas,.far,.fa-solid,.fa-regular,[data-ttk-prompt-text]'))return;
  for(const child of node.childNodes)walk(child);
 };
 walk(element);return found;
}
function candidates(element){
 const nodes=[...element.querySelectorAll(LABEL_SELECTOR)];
 return nodes.filter(n=>!n.closest('button') && n.closest(PROMPT_NAME_SELECTOR)===element);
}
function sourceFromElement(element){
 const attrs=['data-pm-name','data-pm-display-name','title','aria-label'];
 for(const attr of attrs){
  const value=(element.getAttribute?.(attr)||'').trim();
  if(value)return value;
 }
 for(const label of candidates(element)){
  const text=textNodesOf(label).map(n=>n.nodeValue||'').join(' ').replace(/\s+/g,' ').trim();
  if(text)return text;
  const fallback=(label.textContent||'').replace(/\s+/g,' ').trim();
  if(fallback)return fallback;
 }
 const loose=textNodesOf(element).map(n=>n.nodeValue||'').join(' ').replace(/\s+/g,' ').trim();
 return loose;
}
export function getPromptLabels(root=document){
 const elements=[];
 if(root.matches?.(PROMPT_NAME_SELECTOR))elements.push(root);
 elements.push(...root.querySelectorAll(PROMPT_NAME_SELECTOR));
 const seen=new Set();
 return elements.map(element=>({element,source:sourceFromElement(element)})).filter(x=>{
  if(!x.source||seen.has(x.element))return false;
  seen.add(x.element);
  return true;
 });
}
// Hide every native copy of the name, retain its exact text nodes for restoration.
// Show exactly one dedicated label, leaving non-name icons and all event listeners intact.
function showName(item,value){
 const {element,source}=item;
 let state=displayed.get(element);
 if(state && state.source!==source){restoreElement(element);state=null;}
 if(!value){restoreElement(element);return;}
 if(!state){
  const labels=candidates(element);
  if(!labels.length)return; // unknown ST markup: fail safe, do not corrupt the row
  const snapshots=[];
  for(const node of labels){
   for(const text of textNodesOf(node)){snapshots.push([text,text.nodeValue]);text.nodeValue='';}
  }
  // In some builds the wrapper also has an unwrapped text name.
  for(const child of element.childNodes){if(child.nodeType===3 && child.nodeValue.trim()){
   snapshots.push([child,child.nodeValue]);child.nodeValue='';
  }}
  const label=document.createElement('span');
  label.className='ttk-prompt-name-display';label.setAttribute('data-ttk-prompt-text','');
  label.textContent=value;
  labels[0].prepend(label);
  state={source,snapshots,label};displayed.set(element,state);
  element.classList.add('ttk-prompt-localized');
 }else if(state.label.textContent!==value)state.label.textContent=value;
}
function restoreElement(element){
 const state=displayed.get(element);if(!state)return;
 state.label.remove();
 for(const [node,original] of state.snapshots){if(node.isConnected)node.nodeValue=original;}
 element.classList.remove('ttk-prompt-localized');displayed.delete(element);
}
export function restoreAllPromptNames(){for(const element of [...displayed.keys()])restoreElement(element);}
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
 stop(){this.enabled=false;this.runId++;this.controller?.abort();this.controller=null;clearTimeout(this.timer);this.timer=null;this.observer?.disconnect();this.observer=null;restoreAllPromptNames();this.onStatus('한글화 OFF · 원래 이름 표시');}
 schedule(){if(!this.enabled)return;clearTimeout(this.timer);this.timer=setTimeout(()=>this.scan(),250);}
 applyCached(){
  const cache=this.getSettings().cache;
  for(const item of getPromptLabels()){
   const text=cache[item.source];showName(item,text||'');
  }
 }
 scan(){if(!this.enabled)return;this.applyCached();if(this.getSettings().autoTranslate)this.translateMissing();}
 async translateMissing(){
  if(!this.enabled||this.running)return;
  const config=this.getSettings();const profile=config.profileId;
  if(!profile)return;
  if(!this.getProfiles().some(p=>p.id===profile)){this.onStatus('저장된 번역 프로필을 선택해 주세요.');return;}
  this.running=true;const generation=this.runId;const controller=new AbortController();this.controller=controller;
  try{
   const service=await this.loadService();let completed=0;const processed=new Set();let pass=0;
   while(this.enabled&&generation===this.runId&&!controller.signal.aborted&&pass<8){
    const missing=[...new Set(getPromptLabels().map(p=>p.source).filter(x=>x&&!config.cache[x]&&!processed.has(x)&&!/^[\d\W]+$/u.test(x)))].slice(0,MAX_ITEMS-completed);
    if(!missing.length)break;
    for(const source of missing){
      if(!this.enabled||generation!==this.runId||controller.signal.aborted||this.getSettings().profileId!==profile)break;
      this.onStatus(`토글명 번역 중 · ${completed+1}개째`);
      processed.add(source);
      try{
        const request=[{role:'system',content:'Translate only the following user-interface prompt toggle label into natural Korean. Return one short Korean label only. Do not explain, add punctuation, or translate placeholders such as {{user}}, {{char}}, IDs, or numbers.'},{role:'user',content:source}];
        const result=await service.sendRequest(profile,request,120,{stream:false,signal:controller.signal,includePreset:false,includeInstruct:false});
        if(!this.enabled||generation!==this.runId||controller.signal.aborted)break;
        const value=cleanTranslation(result?.content,source);
        if(value){this.getSettings().cache[source]=value;this.save();this.applyCached();this.onCacheChanged();}
      }catch(error){if(controller.signal.aborted)break;console.warn('[Tavern Toolkit] prompt translation:',source,error);this.onStatus(`번역 오류 · ${source} (나머지 진행)`);}
      completed++;
    }
    pass++;
    if(this.enabled&&generation===this.runId&&!controller.signal.aborted)await new Promise(r=>setTimeout(r,80));
   }
   if(this.enabled&&generation===this.runId){const stillMissing=[...new Set(getPromptLabels().map(p=>p.source).filter(x=>x&&!this.getSettings().cache[x]&&!/^[\d\W]+$/u.test(x)))];this.onStatus(stillMissing.length?`요청 ${completed}개 완료 · 아직 미번역 ${stillMissing.length}개 (원문 표시)`:'표시된 토글 이름 번역 완료');}
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
