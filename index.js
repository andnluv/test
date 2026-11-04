import {applyDesign,teardownDesign,normalizeDesign,selectTheme,THEMES,FONTS,FONT_GROUPS} from './design.js';
const KEY='tavern_toolkit_independent';
const DEFAULT_MODULES={design:true,localization:false,translation:false,qr:false,inventory:false};
let settings,save;
const el=(tag,cls='',text='')=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n;};
const btn=(label,action,cls='')=>{const n=el('button',`ttk-button ${cls}`,label);n.type='button';n.addEventListener('click',action);return n;};
function merge(raw){const modules={...DEFAULT_MODULES,...(raw?.modules||{})};for(const key of ['localization','translation','qr','inventory'])modules[key]=false;const old=raw?.design||{};const migrated=old.theme==='midnight'?'nocturne':old.theme==='sage'?'studio':old.theme;return {modules,design:normalizeDesign({...old,theme:migrated})};}
function changed(){applyDesign(settings.modules.design,settings.design);syncDialogueHighlights(settings.modules.design);save();}
let dialogueObserver=null, dialogueTimer=null, activeChat=null;
const QUOTES=/(“[^”\n]+”|「[^」\n]+」|\"[^\"\n]+\")/g;
function highlightDialogue(container){
 // Only wraps complete quotation pairs within a single text node. Never edits message data.
 const walker=document.createTreeWalker(container,NodeFilter.SHOW_TEXT);
 const targets=[];let node;
 while((node=walker.nextNode())){
   if(!node.nodeValue || !/[“「\"]/.test(node.nodeValue))continue;
   if(node.parentElement?.closest('span.ttk-dialogue,pre,code,kbd,script,style,textarea,button,a,[contenteditable="true"],.mes_edit'))continue;
   if(!QUOTES.test(node.nodeValue)){QUOTES.lastIndex=0;continue;}QUOTES.lastIndex=0;
   targets.push(node);
 }
 for(const textNode of targets){
   if(!textNode.isConnected)continue;
   const text=textNode.nodeValue,fragment=document.createDocumentFragment();let cursor=0,m;
   QUOTES.lastIndex=0;
   while((m=QUOTES.exec(text))){
     if(m.index>cursor)fragment.append(document.createTextNode(text.slice(cursor,m.index)));
     const span=document.createElement('span');span.className='ttk-dialogue';span.textContent=m[0];fragment.append(span);
     cursor=m.index+m[0].length;
   }
   if(!cursor)continue;
   if(cursor<text.length)fragment.append(document.createTextNode(text.slice(cursor)));
   textNode.replaceWith(fragment);
 }
 QUOTES.lastIndex=0;
}
function syncDialogueHighlights(enabled){
 if(enabled && dialogueObserver && activeChat===document.querySelector('#chat'))return;
 if(dialogueObserver){dialogueObserver.disconnect();dialogueObserver=null;}
 if(dialogueTimer){clearTimeout(dialogueTimer);dialogueTimer=null;}
 if(!enabled){activeChat=null;document.querySelectorAll('#chat .ttk-dialogue').forEach(node=>node.replaceWith(document.createTextNode(node.textContent)));return;}
 const chat=document.querySelector('#chat');if(!chat)return;activeChat=chat;
 const run=()=>{chat.querySelectorAll('.mes_text').forEach(highlightDialogue);};run();
 dialogueObserver=new MutationObserver(()=>{if(dialogueTimer)return;dialogueTimer=setTimeout(()=>{dialogueTimer=null;dialogueObserver?.disconnect();run();dialogueObserver?.observe(chat,{childList:true,characterData:true,subtree:true});},100);});
 dialogueObserver.observe(chat,{childList:true,characterData:true,subtree:true});
}

function info(label,detail){const n=el('span','ttk-option-label');n.append(el('strong','',label));if(detail)n.append(el('small','',detail));return n;}
function switchRow(parent,label,desc,key,disabled=false){const row=el('label','ttk-module-row');row.append(info(label,desc));const check=el('input');check.type='checkbox';check.checked=!!settings.modules[key];check.disabled=disabled;check.addEventListener('change',()=>{settings.modules[key]=check.checked;changed();document.getElementById('ttk-theme-section').hidden=!check.checked;});row.append(check);parent.append(row);}
function slider(parent,label,key,min,max,step,fmt,onUpdate){const row=el('label','ttk-slider');const line=el('span','ttk-slider-label');const out=el('output','',fmt(settings.design[key]));line.append(el('strong','',label),out);const input=el('input');input.type='range';Object.assign(input,{min,max,step,value:settings.design[key]});input.addEventListener('input',()=>{settings.design[key]=Number(input.value);out.textContent=fmt(settings.design[key]);onUpdate?.();changed();});row.append(line,input);parent.append(row);}
function build(){
 const root=el('details','ttk-settings');root.id='ttk-panel';const sum=el('summary','ttk-panel-summary');sum.append(el('span','','태번 도구함'),el('small','','v0.2.3 · 디자인'));root.append(sum);
 const body=el('div','ttk-settings-body');root.append(body);
 body.append(el('p','ttk-note','모듈별 ON/OFF를 지원합니다. 디자인을 끄면 확장 스타일이 제거되고 원래 실리태번 테마가 표시됩니다.'));
 const modules=el('section','ttk-module-list');switchRow(modules,'디자인','Paper · Nocturne · Studio 완성형 테마','design');switchRow(modules,'한글화','다음 버전에서 구현','localization',true);switchRow(modules,'번역','다음 버전에서 구현 · Interpres와 중복 실행 방지','translation',true);switchRow(modules,'QR 보관함','다음 버전에서 구현','qr',true);switchRow(modules,'통합 조회','다음 버전에서 구현','inventory',true);body.append(modules);
 const section=el('details','ttk-section');section.id='ttk-theme-section';section.hidden=!settings.modules.design;section.append(el('summary','ttk-section-summary','완성형 테마 및 가독성 설정'));
 const controls=el('div','ttk-controls');section.append(controls);body.append(section);
 controls.append(el('p','ttk-note','테마 선택 시 배경·패널·메시지·입력창·버튼·타이포그래피를 함께 전환합니다.'));
 const themes=el('div','ttk-theme-grid');const themeButtons=[];
 for(const [id,t] of Object.entries(THEMES)){
   const b=btn('',()=>{settings.design=selectTheme(settings.design,id);syncControls();changed();},'ttk-theme-card');b.style.setProperty('--ttk-sample-bg',t.bg);b.style.setProperty('--ttk-sample-surface',t.surface);b.style.setProperty('--ttk-sample-text',t.text);b.style.setProperty('--ttk-sample-accent',t.accent);
   const sw=el('span','ttk-theme-swatch');sw.append(el('span','ttk-theme-swatch-line'),el('span','ttk-theme-swatch-line short'),el('span','ttk-theme-swatch-chip'));
   b.append(sw,el('strong','',t.name),el('small','',t.description));themes.append(b);themeButtons.push([id,b]);
 }
 controls.append(themes);
 function makeFontRow(title,key){
  const row=el('label','ttk-field');row.append(el('strong','',title));
  const select=el('select');
  for(const [category,label] of Object.entries(FONT_GROUPS)){
    const group=el('optgroup');group.label=label;
    for(const [id,f] of Object.entries(FONTS))if(f.category===category){const option=el('option','',f.name);option.value=id;group.append(option);}
    select.append(group);
  }
  const note=el('small','ttk-font-status');
  const updateStatus=async()=>{
    const id=select.value,f=FONTS[id];if(!f)return;
    if(f.source==='local'){
      note.textContent='로컬 설치 글꼴 · 이 기기에 없으면 대체 글꼴로 표시됩니다';
    }else if(f.source==='web'){
      note.textContent='웹폰트 로딩 확인 중';
      try{await document.fonts?.load?.(`16px ${f.family.split(',')[0]}`);if(select.value===id)note.textContent='웹폰트 요청 완료 · 실제 표시 상태는 브라우저에 따라 달라질 수 있습니다';}
      catch{if(select.value===id)note.textContent='웹폰트 요청 실패 · 대체 글꼴을 표시합니다';}
    }else{note.textContent=f.source==='bundled'?'확장에 포함된 글꼴':'시스템 기본 글꼴';}
  };
  select.addEventListener('change',()=>{settings.design[key]=select.value;updateStatus();syncPreview();changed();});
  row.append(select,note);controls.append(row);select.updateStatus=updateStatus;return select;
 }
 const font=makeFontRow('지문 폰트','font');
 const dialogueFont=makeFontRow('대사 폰트','dialogueFont');
 controls.append(el('p','ttk-note','“큰따옴표” 또는 「낫표」로 묶인 대사를 화면에서만 구분합니다. HTML 서식으로 끊긴 대사, 따옴표 없는 대사는 지문 폰트가 유지될 수 있습니다.'));
 const sliders=el('div','ttk-slider-grid');slider(sliders,'글자 크기','size',13,23,1,v=>`${v}px`,syncPreview);slider(sliders,'줄간격','lineHeight',1.4,2.4,.05,v=>Number(v).toFixed(2),syncPreview);slider(sliders,'자간','letterSpacing',-.6,1.8,.1,v=>`${Number(v).toFixed(1)}px`,syncPreview);slider(sliders,'문단 간격','paragraphSpacing',0,32,1,v=>`${v}px`,syncPreview);controls.append(sliders);
 const colors=el('details','ttk-subsection');colors.open=true;colors.append(el('summary','','테마 컬러 변경 · 컬러칩')); const grid=el('div','ttk-color-grid');const colorInputs={};const paletteLabels={bg:'전체 배경',surface:'패널',raised:'보조 패널',text:'본문 글자',muted:'보조 글자',accent:'강조색',border:'테두리',user:'사용자 메시지',ai:'AI 메시지'};
 for(const [key,label] of Object.entries(paletteLabels)){const cell=el('label','ttk-color-field');cell.append(el('span','',label));const input=el('input');input.type='color';input.addEventListener('input',()=>{settings.design.custom[key]=input.value;syncPreview();changed();});cell.append(input);grid.append(cell);colorInputs[key]=input;}
 colors.append(grid);
 const chips=el('div','ttk-accent-chip-wrap');chips.append(el('strong','','강조색 빠른 선택'));
 const chipRow=el('div','ttk-accent-chips');
 for(const color of ['#86664E','#A18B72','#A9BEDB','#738BA5','#547662','#77927C','#A26C77','#916DA4','#B17E4D']){
   const chip=btn('',()=>{settings.design.custom.accent=color;colorInputs.accent.value=color;syncPreview();changed();},'ttk-accent-chip');chip.style.setProperty('--ttk-chip-color',color);chip.setAttribute('aria-label',`강조색 ${color}`);chip.title=color;chipRow.append(chip);
 }
 chips.append(chipRow);colors.append(chips);controls.append(colors);
 const preview=el('div','ttk-mini-preview');
 preview.setAttribute('aria-label','테마 미리보기');
 const previewHead=el('div','ttk-preview-header','테마 미리보기 · 실시간');
 const previewBox=el('div','ttk-preview-message');
 const previewName=el('strong','ttk-preview-name','REGULUS');
 const narration=el('p','ttk-preview-narration','그는 창밖을 바라보다 천천히 고개를 돌렸다.');
 const dialogue=el('p','ttk-preview-dialogue','“오늘은 여기까지 이야기해도 괜찮아.”');
 const narration2=el('p','ttk-preview-narration','소리 없이 책장이 넘어갔다. 짧은 침묵이 이어졌다.');
 previewBox.append(previewName,narration,dialogue,narration2);preview.append(previewHead,previewBox);controls.append(preview);
 function syncPreview(){const d=settings.design,c=d.custom;preview.dataset.theme=d.theme;for(const [key,value] of Object.entries(c))preview.style.setProperty(`--pv-${key}`,value);preview.style.setProperty('--pv-font',FONTS[d.font].family);preview.style.setProperty('--pv-dialogue-font',FONTS[d.dialogueFont].family);preview.style.setProperty('--pv-size',`${d.size}px`);preview.style.setProperty('--pv-line',d.lineHeight);preview.style.setProperty('--pv-tracking',`${d.letterSpacing}px`);preview.style.setProperty('--pv-para',`${d.paragraphSpacing}px`);}
 
 const actions=el('div','ttk-actions');actions.append(btn('현재 테마 초기화',()=>{settings.design=selectTheme(settings.design,settings.design.theme);syncControls();changed();}));
 actions.append(btn('설정 내보내기',()=>{const payload={format:'tavern-toolkit-design',version:3,design:settings.design};const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));const a=el('a');a.href=url;a.download='tavern-toolkit-design-v3.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);}));
 const upload=el('input');upload.type='file';upload.accept='.json,application/json';upload.hidden=true;actions.append(btn('설정 가져오기',()=>upload.click()),upload);upload.addEventListener('change',async()=>{const file=upload.files?.[0];if(!file)return;try{if(file.size>100000)throw Error('100KB 이하 JSON만 지원합니다.');const value=JSON.parse(await file.text());if(value.format!=='tavern-toolkit-design'||![1,2,3].includes(value.version)||typeof value.design!=='object')throw Error('호환되지 않는 형식입니다.');settings.design=normalizeDesign(value.design);changed();const replacement=build();replacement.open=true;replacement.querySelector('#ttk-theme-section').open=true;root.replaceWith(replacement);}catch(error){alert(`설정 가져오기 실패: ${error.message}`);}finally{upload.value='';}});controls.append(actions);
 function syncControls(){for(const [id,b] of themeButtons)b.setAttribute('aria-pressed',String(id===settings.design.theme));font.value=settings.design.font;dialogueFont.value=settings.design.dialogueFont;font.updateStatus();dialogueFont.updateStatus();for(const [key,input] of Object.entries(colorInputs))input.value=settings.design.custom[key];sliders.replaceChildren();slider(sliders,'글자 크기','size',13,23,1,v=>`${v}px`,syncPreview);slider(sliders,'줄간격','lineHeight',1.4,2.4,.05,v=>Number(v).toFixed(2),syncPreview);slider(sliders,'자간','letterSpacing',-.6,1.8,.1,v=>`${Number(v).toFixed(1)}px`,syncPreview);slider(sliders,'문단 간격','paragraphSpacing',0,32,1,v=>`${v}px`,syncPreview);syncPreview();}
 syncControls();return root;
}
async function main(){try{const ctx=window.SillyTavern?.getContext?.();if(!ctx?.extensionSettings||!ctx?.saveSettingsDebounced)throw Error('SillyTavern context unavailable');settings=merge(ctx.extensionSettings[KEY]);ctx.extensionSettings[KEY]=settings;save=()=>ctx.saveSettingsDebounced();const target=document.querySelector('#extensions_settings2')||document.querySelector('#extensions_settings');if(!target)throw Error('확장 설정 패널을 찾을 수 없습니다.');document.getElementById('ttk-panel')?.remove();target.append(build());applyDesign(settings.modules.design,settings.design);syncDialogueHighlights(settings.modules.design);console.info('[Tavern Toolkit] Complete theme layer v0.2.3 ready');}catch(e){teardownDesign();console.error('[Tavern Toolkit] Initialization failed',e);}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',main,{once:true});else main();
