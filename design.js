/** Tavern Toolkit: original full theme layer. Does not mutate SillyTavern native theme settings. */
export const THEMES = Object.freeze({
  paper: {name:'Paper · 페이퍼', description:'장편 소설을 위한 종이와 잉크', bg:'#F3EFE6', surface:'#FFFCF6', raised:'#F8F3E9', text:'#332D28', muted:'#746B62', accent:'#86664E', border:'#D9CDBE', user:'#EAE0D3', ai:'#FFFCF6', shadow:'rgba(59,40,26,.12)', font:'nanummyeongjo'},
  nocturne: {name:'Nocturne · 녹턴', description:'야간 몰입을 위한 청흑색과 은빛', bg:'#161C25', surface:'#222A36', raised:'#2A3442', text:'#E5E8ED', muted:'#AFBACB', accent:'#A9BEDB', border:'#465366', user:'#29384B', ai:'#202936', shadow:'rgba(0,0,0,.4)', font:'nanumbarun'},
  porcelain: {name:'Porcelain · 포슬린', description:'청화백자와 음각 문양을 담은 순백 테마', bg:'#FFFFFF', surface:'#FFFFFF', raised:'#F5F8FC', text:'#263548', muted:'#697C91', accent:'#2F5F9C', border:'#BCD0E4', user:'#F4F8FD', ai:'#FFFFFF', shadow:'rgba(40,73,107,.09)', font:'ridibatang'},
  studio: {name:'Studio · 스튜디오', description:'정돈된 UI와 부드러운 세이지', bg:'#E6EAE4', surface:'#F9FBF7', raised:'#EFF3EC', text:'#303C35', muted:'#66786D', accent:'#547662', border:'#C4D0C4', user:'#DEE8DE', ai:'#F9FBF7', shadow:'rgba(45,66,48,.12)', font:'nanumgothic'},
});
export const FONTS = Object.freeze({
 nanummyeongjo:{name:'나눔명조',category:'serif',source:'bundled',family:'"TTK Nanum Myeongjo", Georgia, serif'},
 nanumbarun:{name:'나눔바른고딕',category:'gothic',source:'bundled',family:'"TTK Nanum Barun", sans-serif'},
 nanumgothic:{name:'나눔고딕',category:'gothic',source:'bundled',family:'"TTK Nanum Gothic", sans-serif'},
 pretendard:{name:'프리텐다드',category:'gothic',source:'web',family:'"TTK Pretendard", "TTK Nanum Gothic", sans-serif'},
 kopubdotum:{name:'KoPub 돋움',category:'gothic',source:'local',family:'"KoPubWorldDotum", "KoPub Dotum", "KoPub돋움체", "TTK Nanum Gothic", sans-serif'},
 nanumsquareround:{name:'나눔스퀘어라운드',category:'gothic',source:'local',family:'"NanumSquareRound", "나눔스퀘어라운드", "TTK Nanum Gothic", sans-serif'},
 ibmplex:{name:'IBM Plex Sans KR',category:'gothic',source:'web',family:'"IBM Plex Sans KR", "TTK Nanum Gothic", sans-serif'},
 ridibatang:{name:'리디바탕',category:'serif',source:'web',family:'"TTK Ridi Batang", "TTK Nanum Myeongjo", serif'},
 kopubbatang:{name:'KoPub 바탕',category:'serif',source:'local',family:'"KoPubWorldBatang", "KoPub Batang", "KoPub바탕체", "TTK Nanum Myeongjo", serif'},
 hahmlet:{name:'함렡',category:'serif',source:'web',family:'"Hahmlet", "TTK Nanum Myeongjo", serif'},
 busandandi:{name:'부산단디명조',category:'serif',source:'local',family:'"BusanDandi", "부산단디명조", "TTK Nanum Myeongjo", serif'},
 zenserif:{name:'Zen Old Mincho',category:'serif',source:'web',family:'"Zen Old Mincho", "TTK Nanum Myeongjo", serif'},
 mona12:{name:'모나12',category:'decor',source:'web',family:'"Mona12", "TTK Nanum Gothic", sans-serif'},
 sanhayeop:{name:'산하엽',category:'decor',source:'local',family:'"산하엽", "Sanhayeop", "TTK Nanum Myeongjo", serif'},
 gangwon:{name:'강원교육새음체',category:'decor',source:'local',family:'"강원교육새음체", "GangwonEduSaeum", "TTK Nanum Gothic", sans-serif'},
 geulbang:{name:'그리운X국한박 글방구리체',category:'decor',source:'local',family:'"그리운X국한박 글방구리체", "글방구리체", "TTK Nanum Gothic", sans-serif'},
 system:{name:'기본 시스템 글꼴',category:'gothic',source:'system',family:'system-ui, sans-serif'},
});
export const FONT_GROUPS = Object.freeze({gothic:'고딕',serif:'명조·바탕',decor:'꾸밈'});

const clamp = (v,min,max,fallback) => v!==undefined && v!==null && v!=='' && Number.isFinite(Number(v))? Math.min(max,Math.max(min,Number(v))): fallback;
const safeHex=(v, fallback)=>typeof v==='string' && /^#[0-9a-fA-F]{6}$/.test(v)?v:fallback;
const PALETTE_KEYS=['bg','surface','raised','text','muted','accent','border','user','ai'];
const DEFAULT={theme:'paper',font:'nanummyeongjo',dialogueFont:'nanummyeongjo',size:17,lineHeight:1.85,letterSpacing:0,paragraphSpacing:14,palettes:{},iconStyle:'outline',iconTone:'neutral'};
function normalizePalette(raw,theme){const palette={};for(const key of PALETTE_KEYS)palette[key]=safeHex(raw?.[key],THEMES[theme][key]);return palette;}
export function normalizeDesign(raw={}){
 const theme=Object.hasOwn(THEMES,raw.theme)?raw.theme:(raw.theme==='midnight'?'nocturne':raw.theme==='sage'?'studio':'paper');
 const legacyFont={noto:'nanumgothic',nanum:'nanummyeongjo',gowun:'nanummyeongjo',basicgothic:'nanumgothic',maruburi:'nanummyeongjo',seoulhangang:'nanummyeongjo',yeonseong:'nanumgothic'};
 const candidate=legacyFont[raw.font]||raw.font;
 const font=Object.hasOwn(FONTS,candidate)?candidate:THEMES[theme].font;
 const dialogueCandidate=legacyFont[raw.dialogueFont]||raw.dialogueFont;
 const dialogueFont=Object.hasOwn(FONTS,dialogueCandidate)?dialogueCandidate:font;
 const palettes={};for(const id of Object.keys(THEMES))palettes[id]=normalizePalette(raw.palettes?.[id]||(id===theme?raw.custom:undefined),id);
 return {theme,font,dialogueFont,size:clamp(raw.size,13,23,DEFAULT.size),lineHeight:clamp(raw.lineHeight,1.4,2.4,DEFAULT.lineHeight),letterSpacing:clamp(raw.letterSpacing,-.6,1.8,DEFAULT.letterSpacing),paragraphSpacing:clamp(raw.paragraphSpacing,0,32,DEFAULT.paragraphSpacing),palettes,custom:palettes[theme],iconStyle:['outline','soft','minimal'].includes(raw.iconStyle)?raw.iconStyle:DEFAULT.iconStyle,iconTone:['neutral','accent'].includes(raw.iconTone)?raw.iconTone:DEFAULT.iconTone};
}
// A theme switch changes only the palette + layout. Typography and all theme palettes survive.
export function selectTheme(raw,id){if(!THEMES[id])return normalizeDesign(raw);return normalizeDesign({...normalizeDesign(raw),theme:id});}
export function resetPalette(raw,id){const current=normalizeDesign(raw);if(!THEMES[id])return current;return normalizeDesign({...current,palettes:{...current.palettes,[id]:normalizePalette(null,id)}});}
const STYLE_ID='ttk-full-theme-runtime';
export function teardownDesign(){document.getElementById(STYLE_ID)?.remove();document.documentElement.removeAttribute('data-ttk-theme');document.documentElement.removeAttribute('data-ttk-icon-style');document.documentElement.removeAttribute('data-ttk-icon-tone');}
export function applyDesign(enabled,raw){
 teardownDesign();if(!enabled)return;
 const d=normalizeDesign(raw),p=d.custom;
 const root=document.documentElement;
 root.dataset.ttkTheme=d.theme;root.dataset.ttkIconStyle=d.iconStyle;root.dataset.ttkIconTone=d.iconTone;
 const vars={...p,shadow:THEMES[d.theme].shadow,font:FONTS[d.font].family,dialogueFont:FONTS[d.dialogueFont].family,size:`${d.size}px`,line:d.lineHeight,tracking:`${d.letterSpacing}px`,para:`${d.paragraphSpacing}px`};
 const node=document.createElement('style');node.id=STYLE_ID;
 const safe=Object.entries(vars).map(([k,v])=>`--ttk-${k}:${v};`).join('\n');
 node.textContent=`html[data-ttk-theme] {${safe}}`;
 document.head.append(node);
}
