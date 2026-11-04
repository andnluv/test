/** Tavern Toolkit: original full theme layer. Does not mutate SillyTavern native theme settings. */
export const THEMES = Object.freeze({
  paper: {name:'Paper · 페이퍼', description:'장편 소설을 위한 종이와 잉크', bg:'#F3EFE6', surface:'#FFFCF6', raised:'#F8F3E9', text:'#332D28', muted:'#746B62', accent:'#86664E', border:'#D9CDBE', user:'#EAE0D3', ai:'#FFFCF6', shadow:'rgba(59,40,26,.12)', font:'nanummyeongjo'},
  nocturne: {name:'Nocturne · 녹턴', description:'야간 몰입을 위한 청흑색과 은빛', bg:'#161C25', surface:'#222A36', raised:'#2A3442', text:'#E5E8ED', muted:'#AFBACB', accent:'#A9BEDB', border:'#465366', user:'#29384B', ai:'#202936', shadow:'rgba(0,0,0,.4)', font:'nanumbarun'},
  studio: {name:'Studio · 스튜디오', description:'정돈된 UI와 부드러운 세이지', bg:'#E6EAE4', surface:'#F9FBF7', raised:'#EFF3EC', text:'#303C35', muted:'#66786D', accent:'#547662', border:'#C4D0C4', user:'#DEE8DE', ai:'#F9FBF7', shadow:'rgba(45,66,48,.12)', font:'nanumgothic'},
});
export const FONTS = Object.freeze({
 nanummyeongjo:{name:'나눔명조 (내장)',family:'"TTK Nanum Myeongjo", Georgia, serif'},
 nanumbarun:{name:'나눔바른고딕 (내장)',family:'"TTK Nanum Barun", sans-serif'},
 nanumgothic:{name:'나눔고딕 (내장)',family:'"TTK Nanum Gothic", sans-serif'},
 system:{name:'기본 시스템 글꼴',family:'system-ui, sans-serif'},
});
const clamp = (v,min,max,fallback) => v!==undefined && v!==null && v!=='' && Number.isFinite(Number(v))? Math.min(max,Math.max(min,Number(v))): fallback;
const safeHex=(v, fallback)=>typeof v==='string' && /^#[0-9a-fA-F]{6}$/.test(v)?v:fallback;
const DEFAULT={theme:'paper',font:'nanummyeongjo',size:17,lineHeight:1.85,letterSpacing:0,paragraphSpacing:14,readWidth:780,messageGap:18,custom:{}};
export function normalizeDesign(raw={}){
 const theme=Object.hasOwn(THEMES,raw.theme)?raw.theme:(raw.theme==='midnight'?'nocturne':raw.theme==='sage'?'studio':'paper');
 const legacyFont={pretendard:'nanumgothic',noto:'nanumgothic',nanum:'nanummyeongjo',gowun:'nanummyeongjo'};
 const candidate=legacyFont[raw.font]||raw.font;
 // Migrating old settings defaults to the typography specified by the new complete theme.
 const font=Object.hasOwn(FONTS,candidate)?candidate:THEMES[theme].font;
 const palette=THEMES[theme];const custom={};
 for(const key of ['bg','surface','raised','text','muted','accent','border','user','ai'])custom[key]=safeHex(raw.custom?.[key],palette[key]);
 return {theme,font,size:clamp(raw.size,13,23,DEFAULT.size),lineHeight:clamp(raw.lineHeight,1.4,2.4,DEFAULT.lineHeight),letterSpacing:clamp(raw.letterSpacing,-.6,1.8,DEFAULT.letterSpacing),paragraphSpacing:clamp(raw.paragraphSpacing,0,32,DEFAULT.paragraphSpacing),readWidth:clamp(raw.readWidth,520,1100,DEFAULT.readWidth),messageGap:clamp(raw.messageGap,6,42,DEFAULT.messageGap),custom};
}
export function selectTheme(raw,id){const theme=THEMES[id];if(!theme)return normalizeDesign(raw);return normalizeDesign({...raw,theme:id,font:theme.font,custom:{}});}
const STYLE_ID='ttk-full-theme-runtime';
export function teardownDesign(){document.getElementById(STYLE_ID)?.remove();document.documentElement.removeAttribute('data-ttk-theme');}
export function applyDesign(enabled,raw){
 teardownDesign();if(!enabled)return;
 const d=normalizeDesign(raw),p=d.custom;
 const root=document.documentElement;
 root.dataset.ttkTheme=d.theme;
 const vars={...p,shadow:THEMES[d.theme].shadow,font:FONTS[d.font].family,size:`${d.size}px`,line:d.lineHeight,tracking:`${d.letterSpacing}px`,para:`${d.paragraphSpacing}px`,read:`${d.readWidth}px`,gap:`${d.messageGap}px`};
 const node=document.createElement('style');node.id=STYLE_ID;
 const safe=Object.entries(vars).map(([k,v])=>`--ttk-${k}:${v};`).join('\n');
 node.textContent=`html[data-ttk-theme] {${safe}}`;
 document.head.append(node);
}
