import { applyDesign, normalizeDesign, THEMES, FONTS } from './modules/design.js';

const KEY = 'tavern_toolkit_independent';
const DEFAULTS = {
  modules: {design:true, localization:false, translation:false, qr:false, inventory:false},
  design: {theme:'paper',font:'pretendard',size:16,lineHeight:1.7,letterSpacing:0,paragraphSpacing:10,custom:{}},
};
const FUTURE = ['localization','translation','qr','inventory'];
let settings;
let save;
const $ = (sel) => document.querySelector(sel);
const el = (tag, props={}, children=[]) => {
  const node=document.createElement(tag);
  for (const [key,value] of Object.entries(props)) {
    if (key==='className') node.className=value;
    else if (key==='textContent') node.textContent=value;
    else if (key==='type'||key==='id'||key==='title'||key==='min'||key==='max'||key==='step'||key==='value') node.setAttribute(key,String(value));
  }
  for (const child of children) node.append(child);
  return node;
};
function mergeSettings(old) {
  const modules = Object.fromEntries(Object.entries(DEFAULTS.modules).map(([key,v])=>[key, typeof old?.modules?.[key]==='boolean' ? old.modules[key] : v]));
  // Future modules are intentionally unavailable in this build.
  for (const key of FUTURE) modules[key]=false;
  return {modules,design:normalizeDesign(old?.design)};
}
function changed(){ applyDesign(settings.modules.design, settings.design); save(); }
function field(label, input, parent, valueNode) {
  const wrap=el('label',{className:'ttk-field'});
  const head=el('span',{className:'ttk-field-head'});
  head.append(el('span',{textContent:label})); if(valueNode)head.append(valueNode);
  wrap.append(head,input);parent.append(wrap);
}
function rangeField(parent, label, key, min,max,step,format) {
  const value=el('output',{className:'ttk-value',textContent:format(settings.design[key])});
  const input=el('input',{type:'range',min,max,step,value:settings.design[key]});
  input.addEventListener('input',()=>{settings.design[key]=Number(input.value);value.textContent=format(settings.design[key]);changed();});
  field(label,input,parent,value);
}
function render() {
  const root=el('section',{id:'ttk-panel',className:'ttk-panel'});
  const header=el('div',{className:'ttk-panel-head'});
  header.append(el('strong',{textContent:'태번 도구함'}),el('small',{textContent:'v0.1.0 · 디자인 모듈'}));root.append(header);
  const modules=el('div',{className:'ttk-module-list'});
  const names={design:'디자인',localization:'한글화',translation:'번역',qr:'QR 보관함',inventory:'통합 조회'};
  for(const [key,name] of Object.entries(names)){
    const row=el('label',{className:'ttk-module-row'});
    const left=el('span');left.append(el('b',{textContent:name}));
    if(key!=='design')left.append(el('small',{textContent:'다음 개발 단계 · 현재 비활성'}));
    const cb=el('input',{type:'checkbox'});cb.checked=settings.modules[key];cb.disabled=key!=='design';
    cb.addEventListener('change',()=>{settings.modules[key]=cb.checked;changed();designControls.hidden=!cb.checked;});
    row.append(left,cb);modules.append(row);
  }
  root.append(modules);
  const designControls=el('div',{className:'ttk-design-controls'});
  designControls.hidden=!settings.modules.design;
  designControls.append(el('h4',{textContent:'기본 테마'}));
  const themes=el('div',{className:'ttk-themes'});
  const themeButtons=[];
  for(const [id,theme] of Object.entries(THEMES)) {
    const btn=el('button',{type:'button',className:'ttk-theme'});
    btn.style.setProperty('--sample-bg',theme.bg);btn.style.setProperty('--sample-accent',theme.accent);btn.style.setProperty('--sample-text',theme.text);
    btn.append(el('span',{className:'ttk-swatch'}),el('span',{textContent:theme.name}));
    btn.addEventListener('click',()=>{settings.design.theme=id;settings.design.custom={...theme};syncPalette();updateActive();changed();});
    themeButtons.push([id,btn]);themes.append(btn);
  }
  function updateActive(){for(const [id,btn] of themeButtons){btn.setAttribute('aria-pressed',String(settings.design.theme===id));}}
  designControls.append(themes);updateActive();
  const font=el('select');
  for(const [id,info] of Object.entries(FONTS)){const option=el('option',{value:id,textContent:info.name});font.append(option);}
  font.value=settings.design.font;font.addEventListener('change',()=>{settings.design.font=font.value;changed();});
  field('본문 폰트',font,designControls);
  rangeField(designControls,'글자 크기','size',12,26,1,x=>`${x}px`);
  rangeField(designControls,'줄간격','lineHeight',1.1,2.6,.1,x=>Number(x).toFixed(1));
  rangeField(designControls,'자간','letterSpacing',-1.5,4,.1,x=>`${Number(x).toFixed(1)}px`);
  rangeField(designControls,'문단 간격','paragraphSpacing',0,28,1,x=>`${x}px`);
  designControls.append(el('h4',{textContent:'사용자 색상 조정'}));
  const palette=el('div',{className:'ttk-colors'});
  const inputs={};
  const labels={bg:'채팅 배경',panel:'입력창',text:'글자',accent:'강조',border:'경계',user:'사용자 메시지',ai:'AI 메시지'};
  for(const [key,label] of Object.entries(labels)){
    const input=el('input',{type:'color'});inputs[key]=input;
    input.addEventListener('input',()=>{settings.design.custom[key]=input.value;changed();});
    const wrap=el('label',{className:'ttk-color'});wrap.append(el('span',{textContent:label}),input);palette.append(wrap);
  }
  function syncPalette(){for(const [key,input] of Object.entries(inputs))input.value=settings.design.custom[key];}
  syncPalette();designControls.append(palette);
  const actions=el('div',{className:'ttk-actions'});
  const exportBtn=el('button',{type:'button',textContent:'디자인 설정 내보내기'});
  exportBtn.addEventListener('click',()=>{
    const blob=new Blob([JSON.stringify({format:'tavern-toolkit-design',version:1,design:settings.design},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);const anchor=el('a');anchor.href=url;anchor.download='tavern-toolkit-design.json';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  const importBtn=el('button',{type:'button',textContent:'설정 가져오기'});
  const upload=el('input',{type:'file'});upload.accept='.json,application/json';upload.hidden=true;
  importBtn.addEventListener('click',()=>upload.click());
  upload.addEventListener('change',async()=>{
    const file=upload.files?.[0];if(!file)return;
    try{
      if(file.size>100000)throw Error('파일이 너무 큽니다.');
      const payload=JSON.parse(await file.text());
      if(payload.format!=='tavern-toolkit-design'||payload.version!==1||!payload.design||typeof payload.design!=='object')throw Error('지원하지 않는 디자인 설정 파일입니다.');
      settings.design=normalizeDesign(payload.design);changed();renderReplacement();
    }catch(error){alert(`가져오기 실패: ${error.message}`);}
    finally{upload.value='';}
  });
  actions.append(exportBtn,importBtn,upload);designControls.append(actions);
  designControls.append(el('p',{className:'ttk-help',textContent:'실리태번의 원래 테마는 수정하지 않습니다. 웹폰트는 인터넷 연결 시 다운로드되며, 연결되지 않으면 대체 글꼴을 사용합니다.'}));
  root.append(designControls);
  return root;
}
function renderReplacement(){const old=$('#ttk-panel');old?.replaceWith(render());}
async function main(){
  try{
    const context=window.SillyTavern?.getContext?.();
    if(!context?.extensionSettings||!context?.saveSettingsDebounced)throw Error('SillyTavern extension context를 찾지 못했습니다.');
    save=()=>context.saveSettingsDebounced();
    settings=mergeSettings(context.extensionSettings[KEY]);
    context.extensionSettings[KEY]=settings;
    const target=$('#extensions_settings2') || $('#extensions_settings');
    if(!target)throw Error('확장 설정 패널을 찾지 못했습니다.');
    target.append(render());
    applyDesign(settings.modules.design,settings.design);
    console.info('[Tavern Toolkit] v0.1.0 ready');
  } catch(error){console.error('[Tavern Toolkit] initialization failed:',error);}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',main,{once:true});else main();
