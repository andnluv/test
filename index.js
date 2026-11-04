import {PromptNameTranslator,normalizePromptTranslation} from './prompt-localization.js';
import {normalizeLocalization,startReasoningLocalization,stopReasoningLocalization} from './localization.js';
import {applyDesign,teardownDesign,normalizeDesign,selectTheme,resetPalette,THEMES,FONTS,FONT_GROUPS} from './design.js';
const KEY='tavern_toolkit_independent';
const DEFAULT_MODULES={design:true,localization:true,translation:false,qr:false,inventory:false,ghostwrite:false,optimization:false};
let settings,save,promptTranslator;
const el=(tag,cls='',text='')=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n;};
const btn=(label,action,cls='')=>{const n=el('button',`ttk-button ${cls}`,label);n.type='button';n.addEventListener('click',action);return n;};
function merge(raw){const modules={...DEFAULT_MODULES,...(raw?.modules||{})};for(const key of ['translation','qr','inventory','ghostwrite','optimization'])modules[key]=false;const old=raw?.design||{};const migrated=old.theme==='midnight'?'nocturne':old.theme==='sage'?'studio':old.theme;return {modules,design:normalizeDesign({...old,theme:migrated}),localization:normalizeLocalization(raw?.localization),promptTranslation:normalizePromptTranslation(raw?.promptTranslation)};}
function changed(){applyDesign(settings.modules.design,settings.design);syncDialogueHighlights(settings.modules.design);syncLocalization();save();}
function syncLocalization(){if(settings.modules.localization){startReasoningLocalization(settings.localization);promptTranslator?.start();}else{stopReasoningLocalization();promptTranslator?.stop();}}
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
function switchRow(parent,label,desc,key,disabled=false){const row=el('label','ttk-module-row');row.append(info(label,desc));const check=el('input');check.type='checkbox';check.checked=!!settings.modules[key];check.disabled=disabled;check.addEventListener('change',()=>{settings.modules[key]=check.checked;changed();if(key==='design')document.getElementById('ttk-theme-section').hidden=!check.checked;if(key==='localization')document.getElementById('ttk-localization-section').hidden=!check.checked;});row.append(check);parent.append(row);}
function slider(parent,label,key,min,max,step,fmt,onUpdate){const row=el('label','ttk-slider');const line=el('span','ttk-slider-label');const out=el('output','',fmt(settings.design[key]));line.append(el('strong','',label),out);const input=el('input');input.type='range';Object.assign(input,{min,max,step,value:settings.design[key]});input.addEventListener('input',()=>{settings.design[key]=Number(input.value);out.textContent=fmt(settings.design[key]);onUpdate?.();changed();});row.append(line,input);parent.append(row);}
function build(){
 const root=el('details','ttk-settings');root.id='ttk-panel';const sum=el('summary','ttk-panel-summary');sum.append(el('span','','태번 도구함'),el('small','','v0.3.6 · 디자인/한글화'));root.append(sum);
 const body=el('div','ttk-settings-body');root.append(body);
 body.append(el('p','ttk-note','모듈별 ON/OFF를 지원합니다. 디자인을 끄면 확장 스타일이 제거되고 원래 실리태번 테마가 표시됩니다.'));
 const modules=el('section','ttk-module-list');switchRow(modules,'디자인','Paper · Nocturne · Studio · Porcelain 완성형 테마','design');switchRow(modules,'한글화','추론 제목 및 프롬프트 토글 표시명','localization');switchRow(modules,'번역','다음 버전에서 구현 · Interpres와 중복 실행 방지','translation',true);switchRow(modules,'QR 보관함','다음 버전에서 구현','qr',true);switchRow(modules,'통합 조회','다음 버전에서 구현','inventory',true);switchRow(modules,'유저 인풋 대필','현재 RP 모델 활용 · 다음 버전','ghostwrite',true);switchRow(modules,'모바일 최적화','독립 성능 모듈 · 다음 버전','optimization',true);body.append(modules);
 const locPanel=el('details','ttk-section');locPanel.id='ttk-localization-section';locPanel.append(el('summary','ttk-section-summary','한글화 · 추론 제목 / 토글 이름'));
 const locBody=el('div','ttk-controls');locPanel.append(locBody);
 locBody.append(el('p','ttk-note','추론(Thought) 제목만 화면에서 변경합니다. 접기·펼치기 상태, 추론 원문, 채팅 저장 데이터는 변경하지 않습니다.'));
 const nameRow=el('label','ttk-field');nameRow.append(el('strong','','추론 제목'));const nameInput=el('input');nameInput.type='text';nameInput.maxLength=30;nameInput.value=settings.localization.reasoningLabel;
 nameInput.addEventListener('change',()=>{settings.localization=normalizeLocalization({...settings.localization,reasoningLabel:nameInput.value});nameInput.value=settings.localization.reasoningLabel;changed();});nameRow.append(nameInput);locBody.append(nameRow);
 const timeRow=el('label','ttk-module-row');timeRow.append(info('소요 시간 표시','ON일 때 사유 · 1분 형태로 표시'));const timeCheck=el('input');timeCheck.type='checkbox';timeCheck.checked=settings.localization.showReasoningTime;
 timeCheck.addEventListener('change',()=>{settings.localization.showReasoningTime=timeCheck.checked;changed();});timeRow.append(timeCheck);locBody.append(timeRow);
 const transSection=el('details','ttk-subsection');transSection.append(el('summary','','프롬프트 토글 이름 자동 번역'));
 transSection.append(el('p','ttk-note','기본 번역 사전 없이 선택한 저장 연결 프로필로 이름만 번역합니다. RP 연결·프롬프트 데이터·활성화 상태는 변경하지 않습니다. 요청에 모델 비용이 발생할 수 있습니다.'));
 const profRow=el('label','ttk-field');profRow.append(el('strong','','번역용 연결 프로필'));const profileSelect=el('select');profRow.append(profileSelect);transSection.append(profRow);
 const profStatus=el('small','ttk-font-status');transSection.append(profStatus);
 const refreshProfiles=()=>{const profiles=promptTranslator.getProfiles();profileSelect.replaceChildren();const blank=el('option','','프로필 선택');blank.value='';profileSelect.append(blank);for(const profile of profiles){const o=el('option','',profile.name);o.value=profile.id;profileSelect.append(o);}profileSelect.value=profiles.some(p=>p.id===settings.promptTranslation.profileId)?settings.promptTranslation.profileId:'';profStatus.textContent=profiles.length?`${profiles.length}개 연결 프로필 사용 가능`:'지원되는 저장 연결 프로필이 없습니다. 연결 관리자를 확인하세요.';};
 profileSelect.addEventListener('change',()=>{settings.promptTranslation.profileId=profileSelect.value;save();promptTranslator.refresh();});
 const autoRow=el('label','ttk-module-row');autoRow.append(info('새 토글 이름 자동 번역','프롬프트를 전환하면 새 이름만 번역합니다.'));const autoCheck=el('input');autoCheck.type='checkbox';autoCheck.checked=settings.promptTranslation.autoTranslate;autoCheck.addEventListener('change',()=>{settings.promptTranslation.autoTranslate=autoCheck.checked;save();promptTranslator.refresh();});autoRow.append(autoCheck);transSection.append(autoRow);
 const status=el('p','ttk-note','번역용 프로필을 선택하세요.');status.setAttribute('aria-live','polite');transSection.append(status);
 const actionsRow=el('div','ttk-actions');actionsRow.append(btn('프로필 목록 새로고침',refreshProfiles));actionsRow.append(btn('현재 토글 번역',()=>promptTranslator.translateMissing()));transSection.append(actionsRow);
 const edits=el('details','ttk-subsection');edits.append(el('summary','','번역 결과 수정 및 캐시'));const editsBody=el('div','ttk-controls');edits.append(editsBody);transSection.append(edits);
 function renderEdits(){editsBody.replaceChildren();const items=Object.entries(settings.promptTranslation.cache).sort((a,b)=>a[0].localeCompare(b[0]));editsBody.append(el('p','ttk-note',`저장된 번역 ${items.length}개 · 수정은 프롬프트 원본에 영향 없음`));for(const [original,value] of items){const row=el('label','ttk-field ttk-translation-edit');row.append(el('small','',original));const input=el('input');input.type='text';input.maxLength=100;input.value=value;const controls=el('div','ttk-actions');controls.append(btn('저장',()=>promptTranslator.setOverride(original,input.value)),btn('삭제',()=>promptTranslator.setOverride(original,'')));row.append(input,controls);editsBody.append(row);}editsBody.append(btn('번역 캐시 전체 삭제',()=>{if(confirm('저장된 토글 번역을 모두 삭제할까요?'))promptTranslator.clearCache();}));}
 locBody.append(transSection);locPanel.hidden=!settings.modules.localization;body.append(locPanel);
 // Readonly rendering/translation controller; never writes the native preset.
 promptTranslator.onStatus=message=>{status.textContent=message;};promptTranslator.onCacheChanged=()=>{if(edits.open)renderEdits();};
 edits.addEventListener('toggle',()=>{if(edits.open)renderEdits();});refreshProfiles();

 const section=el('details','ttk-section');section.id='ttk-theme-section';section.hidden=!settings.modules.design;section.append(el('summary','ttk-section-summary','완성형 테마 및 가독성 설정'));
 const controls=el('div','ttk-controls');section.append(controls);body.append(section);
 controls.append(el('p','ttk-note','테마 선택 시 디자인 팔레트와 레이아웃만 변경합니다. 지문·대사 폰트 및 가독성 설정은 유지됩니다.'));
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
 const dialogueColorRow=el('label','ttk-color-field ttk-dialogue-color-row');dialogueColorRow.append(el('strong','','대사 글자색'));
 const dialogueColorInput=el('input');dialogueColorInput.type='color';dialogueColorInput.title='현재 테마의 대사 색상';
 dialogueColorInput.addEventListener('input',()=>{settings.design.dialogueColors[settings.design.theme]=dialogueColorInput.value;syncPreview();changed();});
 dialogueColorRow.append(dialogueColorInput);controls.append(dialogueColorRow);

 controls.append(el('p','ttk-note','“큰따옴표” 또는 「낫표」로 묶인 대사를 화면에서만 구분합니다. HTML 서식으로 끊긴 대사, 따옴표 없는 대사는 지문 폰트가 유지될 수 있습니다.'));
 const sliders=el('div','ttk-slider-grid');slider(sliders,'글자 크기','size',13,23,1,v=>`${v}px`,syncPreview);slider(sliders,'줄간격','lineHeight',1.4,2.4,.05,v=>Number(v).toFixed(2),syncPreview);slider(sliders,'자간','letterSpacing',-.6,1.8,.1,v=>`${Number(v).toFixed(1)}px`,syncPreview);slider(sliders,'문단 간격','paragraphSpacing',0,32,1,v=>`${v}px`,syncPreview);controls.append(sliders);
 const colors=el('details','ttk-subsection');colors.open=true;colors.append(el('summary','','테마 컬러 변경 · 컬러칩')); const grid=el('div','ttk-color-grid');const colorInputs={};const paletteLabels={bg:'전체 배경',surface:'패널',raised:'보조 패널',text:'본문 글자',muted:'보조 글자',accent:'강조색',border:'테두리',user:'사용자 메시지',ai:'AI 메시지'};
 for(const [key,label] of Object.entries(paletteLabels)){const cell=el('label','ttk-color-field');cell.append(el('span','',label));const input=el('input');input.type='color';input.addEventListener('input',()=>{settings.design.palettes[settings.design.theme][key]=input.value;settings.design.custom=settings.design.palettes[settings.design.theme];syncPreview();changed();});cell.append(input);grid.append(cell);colorInputs[key]=input;}
 colors.append(grid);
 // Per-theme palette chips: clicking changes the entire palette rather than only accent.
 const chips=el('div','ttk-accent-chip-wrap');chips.append(el('strong','','테마 컬러 조합'));
 const chipRow=el('div','ttk-palette-chips');
 const variantDefs={
   paper:[['원본',{}],['크림', {bg:'#FFFCF5',surface:'#FFFFFF',raised:'#FBF6E9',text:'#403329',muted:'#776757',accent:'#9C7656',border:'#E5D9C4',user:'#FAF2E3',ai:'#FFFFFF'}],['로즈', {bg:'#FFFAFB',surface:'#FFFFFF',raised:'#FDF3F6',text:'#402E35',muted:'#836971',accent:'#A2657C',border:'#EBD9DE',user:'#F9EDF0',ai:'#FFFFFF'}]],
   nocturne:[['원본',{}],['보랏빛 밤', {bg:'#1D1928',surface:'#2A2435',raised:'#342D42',text:'#EEE6F4',muted:'#BDAEC8',accent:'#B8A0D8',border:'#51455F',user:'#372E48',ai:'#292235'}],['숯빛', {bg:'#1D2022',surface:'#282D2F',raised:'#32393B',text:'#E9ECE9',muted:'#B4BFBA',accent:'#9BB8AC',border:'#4B5853',user:'#313D38',ai:'#282D2F'}]],
   porcelain:[['클래식',{}],['로얄',{bg:'#FFFFFF',surface:'#FFFFFF',raised:'#F0F5FB',text:'#172C47',muted:'#546D8B',accent:'#153E82',border:'#97B2D4',user:'#E7F0FC',ai:'#FFFFFF'}],['트림',{bg:'#FFFFFF',surface:'#FFFEFA',raised:'#F8F7F2',text:'#29384C',muted:'#777780',accent:'#315C91',border:'#C5B18A',user:'#F6F4ED',ai:'#FFFFFF'}]],
   studio:[['원본',{}],['블루 그레이', {bg:'#E8EDF2',surface:'#F9FCFE',raised:'#EDF3F7',text:'#303D4A',muted:'#677B8C',accent:'#597B9C',border:'#C6D2DF',user:'#DEEAF3',ai:'#F9FCFE'}],['피치', {bg:'#F3EAE5',surface:'#FFFAF6',raised:'#F5EDE8',text:'#483831',muted:'#8C7569',accent:'#A77864',border:'#DDCFC5',user:'#F1E1D5',ai:'#FFFAF6'}]]
 };
 function renderPaletteChips(){chipRow.replaceChildren();const id=settings.design.theme;for(const [name,override] of variantDefs[id]){const base=THEMES[id];const palette=Object.fromEntries(['bg','surface','raised','text','muted','accent','border','user','ai'].map(k=>[k,override[k]||base[k]]));const chip=btn('',()=>{settings.design.palettes[id]={...palette};settings.design.custom=settings.design.palettes[id];syncControls();changed();},'ttk-palette-chip');chip.title=name;chip.setAttribute('aria-label',`${name} 색상 조합`);chip.append(el('span','ttk-palette-chip-swatch'));chip.lastChild.style.backgroundColor=(id==='porcelain'&&name==='트림')?'#C5A66C':palette.accent;chip.append(el('small','',name));chipRow.append(chip);}}
 chips.append(chipRow);colors.append(chips);controls.append(colors);
 const iconSection=el('details','ttk-subsection');iconSection.append(el('summary','','상단·하단 아이콘 디자인'));
 iconSection.append(el('p','ttk-note','상단·하단의 지원 아이콘을 정돈된 선형 심볼로 교체합니다. 버튼 기능과 클릭 동작은 유지하며, 미지원 아이콘은 원래 모양을 사용합니다.'));
 const iconStyleRow=el('label','ttk-field');iconStyleRow.append(el('strong','','아이콘 스타일'));const iconStyle=el('select');for(const [value,label] of [['outline','윤곽형'],['soft','부드러운 버튼형'],['minimal','미니멀형']]){const o=el('option','',label);o.value=value;iconStyle.append(o)}iconStyle.addEventListener('change',()=>{settings.design.iconStyle=iconStyle.value;changed()});iconStyleRow.append(iconStyle);iconSection.append(iconStyleRow);
 const iconToneRow=el('label','ttk-field');iconToneRow.append(el('strong','','아이콘 색상'));const iconTone=el('select');for(const [value,label] of [['neutral','중립색 (기본)'],['accent','테마 강조색']]){const o=el('option','',label);o.value=value;iconTone.append(o)}iconTone.addEventListener('change',()=>{settings.design.iconTone=iconTone.value;changed()});iconToneRow.append(iconTone);iconSection.append(iconToneRow);controls.append(iconSection);
 const preview=el('div','ttk-mini-preview');
 preview.setAttribute('aria-label','테마 미리보기');
 const previewHead=el('div','ttk-preview-header','테마 미리보기 · 실시간');
 const previewBox=el('div','ttk-preview-message');
 const previewName=el('strong','ttk-preview-name','REGULUS');
 const narration=el('p','ttk-preview-narration','그는 창밖을 바라보다 천천히 고개를 돌렸다.');
 const dialogue=el('p','ttk-preview-dialogue','“오늘은 여기까지 이야기해도 괜찮아.”');
 const narration2=el('p','ttk-preview-narration','소리 없이 책장이 넘어갔다. 짧은 침묵이 이어졌다.');
 previewBox.append(previewName,narration,dialogue,narration2);preview.append(previewHead,previewBox);controls.append(preview);
 function syncPreview(){const d=settings.design,c=d.custom;preview.dataset.theme=d.theme;preview.dataset.porcelainVariant=d.theme==='porcelain'?(c.border.toLowerCase()==='#c5b18a'?'trim':c.accent.toLowerCase()==='#153e82'?'royal':'classic'):'';for(const [key,value] of Object.entries(c))preview.style.setProperty(`--pv-${key}`,value);preview.style.setProperty('--pv-font',FONTS[d.font].family);preview.style.setProperty('--pv-dialogue-font',FONTS[d.dialogueFont].family);preview.style.setProperty('--pv-dialogue-color',d.dialogueColors[d.theme]);preview.style.setProperty('--pv-size',`${d.size}px`);preview.style.setProperty('--pv-line',d.lineHeight);preview.style.setProperty('--pv-tracking',`${d.letterSpacing}px`);preview.style.setProperty('--pv-para',`${d.paragraphSpacing}px`);}
 
 const actions=el('div','ttk-actions');actions.append(btn('현재 테마 초기화',()=>{settings.design=resetPalette(settings.design,settings.design.theme);syncControls();changed();}));
 actions.append(btn('설정 내보내기',()=>{const payload={format:'tavern-toolkit-design',version:4,design:settings.design};const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));const a=el('a');a.href=url;a.download='tavern-toolkit-design-v4.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);}));
 const upload=el('input');upload.type='file';upload.accept='.json,application/json';upload.hidden=true;actions.append(btn('설정 가져오기',()=>upload.click()),upload);upload.addEventListener('change',async()=>{const file=upload.files?.[0];if(!file)return;try{if(file.size>100000)throw Error('100KB 이하 JSON만 지원합니다.');const value=JSON.parse(await file.text());if(value.format!=='tavern-toolkit-design'||![1,2,3,4].includes(value.version)||typeof value.design!=='object')throw Error('호환되지 않는 형식입니다.');settings.design=normalizeDesign(value.design);changed();const replacement=build();replacement.open=true;replacement.querySelector('#ttk-theme-section').open=true;root.replaceWith(replacement);}catch(error){alert(`설정 가져오기 실패: ${error.message}`);}finally{upload.value='';}});controls.append(actions);
 function syncControls(){for(const [id,b] of themeButtons)b.setAttribute('aria-pressed',String(id===settings.design.theme));font.value=settings.design.font;dialogueFont.value=settings.design.dialogueFont;dialogueColorInput.value=settings.design.dialogueColors[settings.design.theme];font.updateStatus();dialogueFont.updateStatus();for(const [key,input] of Object.entries(colorInputs))input.value=settings.design.custom[key];iconStyle.value=settings.design.iconStyle;iconTone.value=settings.design.iconTone;renderPaletteChips();sliders.replaceChildren();slider(sliders,'글자 크기','size',13,23,1,v=>`${v}px`,syncPreview);slider(sliders,'줄간격','lineHeight',1.4,2.4,.05,v=>Number(v).toFixed(2),syncPreview);slider(sliders,'자간','letterSpacing',-.6,1.8,.1,v=>`${Number(v).toFixed(1)}px`,syncPreview);slider(sliders,'문단 간격','paragraphSpacing',0,32,1,v=>`${v}px`,syncPreview);syncPreview();}
 syncControls();return root;
}
async function main(){try{const ctx=window.SillyTavern?.getContext?.();if(!ctx?.extensionSettings||!ctx?.saveSettingsDebounced)throw Error('SillyTavern context unavailable');settings=merge(ctx.extensionSettings[KEY]);ctx.extensionSettings[KEY]=settings;save=()=>ctx.saveSettingsDebounced();promptTranslator=new PromptNameTranslator({getSettings:()=>settings.promptTranslation,save});const target=document.querySelector('#extensions_settings2')||document.querySelector('#extensions_settings');if(!target)throw Error('확장 설정 패널을 찾을 수 없습니다.');document.getElementById('ttk-panel')?.remove();target.append(build());applyDesign(settings.modules.design,settings.design);syncDialogueHighlights(settings.modules.design);syncLocalization();console.info('[Tavern Toolkit] v0.3.6 design + profile-based prompt title localization ready');}catch(e){teardownDesign();console.error('[Tavern Toolkit] Initialization failed',e);}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',main,{once:true});else main();
