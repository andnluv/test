/** Tavern Toolkit: original full theme layer. Does not mutate SillyTavern native theme settings. */
export const THEMES = Object.freeze({
  paper: {name:'Paper · 페이퍼', description:'장편 소설을 위한 종이와 잉크', bg:'#FAF9F6', surface:'#FFFFFF', raised:'#F8F6F2', text:'#332D28', muted:'#746B62', accent:'#86664E', border:'#E5DED3', user:'#F5F1EA', ai:'#FFFFFF', shadow:'rgba(59,40,26,.12)', font:'nanummyeongjo'},
  nocturne: {name:'Nocturne · 녹턴', description:'야간 몰입을 위한 청흑색과 은빛', bg:'#161C25', surface:'#222A36', raised:'#2A3442', text:'#E5E8ED', muted:'#AFBACB', accent:'#A9BEDB', border:'#465366', user:'#29384B', ai:'#202936', shadow:'rgba(0,0,0,.4)', font:'nanumbarun'},
  porcelain: {name:'Porcelain · 포슬린', description:'청화백자와 음각 문양을 담은 순백 테마', bg:'#FFFFFF', surface:'#FFFFFF', raised:'#F5F8FC', text:'#263548', muted:'#697C91', accent:'#2F5F9C', border:'#BCD0E4', user:'#F4F8FD', ai:'#FFFFFF', shadow:'rgba(40,73,107,.09)', font:'ridibatang'},
  studio: {name:'Studio · 스튜디오', description:'정돈된 UI와 부드러운 세이지', bg:'#E6EAE4', surface:'#F9FBF7', raised:'#EFF3EC', text:'#303C35', muted:'#66786D', accent:'#547662', border:'#C4D0C4', user:'#DEE8DE', ai:'#F9FBF7', shadow:'rgba(45,66,48,.12)', font:'nanumgothic'},
});
// v0.3.14: every typeface is a remotely hosted web font. Nothing is bundled, and a
// stylesheet is requested only while its font is selected and the design module is ON.
const GF=q=>`https://fonts.googleapis.com/css2?family=${q}&display=swap`;
const JSD='https://cdn.jsdelivr.net/gh/';
const GOTHIC='"Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif';
const SERIF='"AppleMyungjo", "Noto Serif KR", "Batang", serif';
export const FONTS = Object.freeze({
 nanummyeongjo:{name:'나눔명조',category:'serif',source:'web',css:GF('Nanum+Myeongjo:wght@400;700;800'),family:`"Nanum Myeongjo", ${SERIF}`},
 nanumbarun:{name:'나눔바른고딕',category:'gothic',source:'web',css:JSD+'moonspam/NanumBarunGothic@1.2/nanumbarungothicsubset.css',family:`"NanumBarunGothic", ${GOTHIC}`},
 nanumgothic:{name:'나눔고딕',category:'gothic',source:'web',css:GF('Nanum+Gothic:wght@400;700;800'),family:`"Nanum Gothic", ${GOTHIC}`},
 pretendard:{name:'프리텐다드',category:'gothic',source:'web',css:JSD+'orioncactus/pretendard@v1.3.9/dist/web/static/pretendard-dynamic-subset.css',family:`"Pretendard", ${GOTHIC}`},
 kopubdotum:{name:'KoPub 돋움',category:'gothic',source:'web',css:JSD+'adrinerDP/font-kopubworld@28997aceeb0fa6322357b03b63aaf292e74868f4/css/dotum.css',family:`"KoPubWorld Dotum", ${GOTHIC}`},
 nanumsquareround:{name:'나눔스퀘어라운드',category:'gothic',source:'web',css:JSD+'innks/NanumSquareRound@1c6bf0ee5e0e17e2552311aac31ba157dcb805e8/nanumsquareround.min.css',family:`"NanumSquareRound", ${GOTHIC}`},
 ibmplex:{name:'IBM Plex Sans KR',category:'gothic',source:'web',css:GF('IBM+Plex+Sans+KR:wght@400;500;600;700'),family:`"IBM Plex Sans KR", ${GOTHIC}`},
 ridibatang:{name:'리디바탕',category:'serif',source:'web',face:{family:'RIDIBatang',url:JSD+'projectnoonnu/noonfonts_twelve@1.0/RIDIBatang.woff',format:'woff'},family:`"RIDIBatang", ${SERIF}`},
 kopubbatang:{name:'KoPub 바탕',category:'serif',source:'web',css:JSD+'adrinerDP/font-kopubworld@28997aceeb0fa6322357b03b63aaf292e74868f4/css/batang.css',family:`"KoPubWorld Batang", ${SERIF}`},
 hahmlet:{name:'함렡',category:'serif',source:'web',css:GF('Hahmlet:wght@400;500;600;700'),family:`"Hahmlet", ${SERIF}`},
 busandandi:{name:'부산단디명조',category:'serif',source:'web',face:[300,500,700].map((weight,i)=>({family:'BusanDandiMyeongjo',url:JSD+`Project-Noonnu/2610132210@l-2/l/부산단디명조${'LMB'[i]}.woff2`,format:'woff2',weight})),family:`"BusanDandiMyeongjo", ${SERIF}`},
 zenserif:{name:'Zen Old Mincho',category:'serif',source:'web',css:GF('Zen+Old+Mincho:wght@400;500;700'),family:`"Zen Old Mincho", ${SERIF}`},
 mona12:{name:'모나12',category:'decor',source:'web',css:JSD+'MonadABXY/mona-font@2026.10.09/web/mona.css',family:`"Mona12", ${GOTHIC}`},
 sanhayeop:{name:'산하엽',category:'decor',source:'web',face:{family:'Sanhayeop',url:JSD+'projectnoonnu/noonfonts_JAMO@1.0/Diphylleia-Regular.woff2',format:'woff2'},family:`"Sanhayeop", ${SERIF}`},
 gangwon:{name:'강원교육새음체',category:'decor',source:'web',face:{family:'GangwonEduSaeeum',url:JSD+'projectnoonnu/noonfonts_2201-2@1.0/GangwonEduSaeeum_OTFMediumA.woff',format:'woff'},family:`"GangwonEduSaeeum", ${GOTHIC}`},
 geulbang:{name:'그리운X국한박 글방구리체',category:'decor',source:'web',face:{family:'GeuriunXGukhanbakGeulbangGuri',url:JSD+'Project-Noonnu/2607161334@x-4/x/GriunXHangeul_Banguri-Rg.woff2',format:'woff2'},family:`"GeuriunXGukhanbakGeulbangGuri", ${GOTHIC}`},
 system:{name:'기본 시스템 글꼴',category:'gothic',source:'system',family:'system-ui, sans-serif'},
});
export const FONT_GROUPS = Object.freeze({gothic:'고딕',serif:'명조·바탕',decor:'꾸밈'});

const clamp = (v,min,max,fallback) => v!==undefined && v!==null && v!=='' && Number.isFinite(Number(v))? Math.min(max,Math.max(min,Number(v))): fallback;
const safeHex=(v, fallback)=>typeof v==='string' && /^#[0-9a-fA-F]{6}$/.test(v)?v:fallback;
const PALETTE_KEYS=['bg','surface','raised','text','muted','accent','border','user','ai'];
const DEFAULT={theme:'paper',dialogueColors:{},font:'nanummyeongjo',dialogueFont:'nanummyeongjo',size:17,lineHeight:1.85,letterSpacing:0,paragraphSpacing:14,palettes:{},iconStyle:'outline',iconTone:'neutral'};
function normalizePalette(raw,theme){const palette={};for(const key of PALETTE_KEYS)palette[key]=safeHex(raw?.[key],THEMES[theme][key]);return palette;}
export function normalizeDesign(raw={}){
 const theme=Object.hasOwn(THEMES,raw.theme)?raw.theme:(raw.theme==='midnight'?'nocturne':raw.theme==='sage'?'studio':'paper');
 const legacyFont={noto:'nanumgothic',nanum:'nanummyeongjo',gowun:'nanummyeongjo',basicgothic:'nanumgothic',maruburi:'nanummyeongjo',seoulhangang:'nanummyeongjo',yeonseong:'nanumgothic'};
 const candidate=legacyFont[raw.font]||raw.font;
 const font=Object.hasOwn(FONTS,candidate)?candidate:THEMES[theme].font;
 const dialogueCandidate=legacyFont[raw.dialogueFont]||raw.dialogueFont;
 const dialogueFont=Object.hasOwn(FONTS,dialogueCandidate)?dialogueCandidate:font;
 const palettes={};for(const id of Object.keys(THEMES))palettes[id]=normalizePalette(raw.palettes?.[id]||(id===theme?raw.custom:undefined),id);
 // Upgrade only the exact v0.2.8 Paper default; preserve every personalized palette.
 const oldPaper={bg:'#F3EFE6',surface:'#FFFCF6',raised:'#F8F3E9',text:'#332D28',muted:'#746B62',accent:'#86664E',border:'#D9CDBE',user:'#EAE0D3',ai:'#FFFCF6'};
 if(Object.keys(oldPaper).every(k=>palettes.paper[k]?.toLowerCase()===oldPaper[k].toLowerCase()))palettes.paper=normalizePalette(null,'paper');
 const dialogueDefaults={paper:'#79543B',nocturne:'#9EC5FF',porcelain:'#315F95',studio:'#396750'};
 const dialogueColors={};for(const id of Object.keys(THEMES))dialogueColors[id]=safeHex(raw.dialogueColors?.[id],dialogueDefaults[id]);
 // v0.3.14: the old Nocturne dialogue default was indistinguishable from body text (1.19:1). Move only that exact default.
 if(dialogueColors.nocturne.toUpperCase()==='#CAD6F1')dialogueColors.nocturne=dialogueDefaults.nocturne;
 return {theme,font,dialogueFont,dialogueColors,size:clamp(raw.size,13,23,DEFAULT.size),lineHeight:clamp(raw.lineHeight,1.4,2.4,DEFAULT.lineHeight),letterSpacing:clamp(raw.letterSpacing,-.6,1.8,DEFAULT.letterSpacing),paragraphSpacing:clamp(raw.paragraphSpacing,0,32,DEFAULT.paragraphSpacing),palettes,custom:palettes[theme],iconStyle:['outline','soft','minimal'].includes(raw.iconStyle)?raw.iconStyle:DEFAULT.iconStyle,iconTone:['neutral','accent'].includes(raw.iconTone)?raw.iconTone:DEFAULT.iconTone};
}
// A theme switch changes only the palette + layout. Typography and all theme palettes survive.
export function selectTheme(raw,id){if(!THEMES[id])return normalizeDesign(raw);return normalizeDesign({...normalizeDesign(raw),theme:id});}
export function resetPalette(raw,id){const current=normalizeDesign(raw);if(!THEMES[id])return current;return normalizeDesign({...current,palettes:{...current.palettes,[id]:normalizePalette(null,id)}});}
const STYLE_ID='ttk-full-theme-runtime';
const FONT_ATTR='data-ttk-font';
// Keeps exactly the stylesheets of the fonts in use. Idempotent, so live slider/colour edits never re-request a font.
export function syncFontSources(ids=[]){
 const wanted=new Set(ids.filter(id=>FONTS[id]&&(FONTS[id].css||FONTS[id].face)));
 for(const node of document.head.querySelectorAll(`[${FONT_ATTR}]`)){if(wanted.has(node.getAttribute(FONT_ATTR)))wanted.delete(node.getAttribute(FONT_ATTR));else node.remove();}
 for(const id of wanted){
  const f=FONTS[id];let node;
  if(f.css){node=document.createElement('link');node.rel='stylesheet';node.href=f.css;node.crossOrigin='anonymous';}
  else{node=document.createElement('style');node.textContent=[].concat(f.face).map(face=>`@font-face{font-family:'${face.family}';src:url('${encodeURI(face.url)}') format('${face.format}');font-weight:${face.weight||400};font-display:swap}`).join('\n');}
  node.setAttribute(FONT_ATTR,id);document.head.append(node);
 }
}
function luminance(hex){const v=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(c=>c<=.03928?c/12.92:((c+.055)/1.055)**2.4);return .2126*v[0]+.7152*v[1]+.0722*v[2];}
export function schemeOf(palette){return luminance(palette.bg)<.3?'dark':'light';}
const ROOT_ATTRS=['data-ttk-theme','data-ttk-icon-style','data-ttk-icon-tone','data-ttk-scheme'];
export function teardownDesign(){document.getElementById(STYLE_ID)?.remove();syncFontSources([]);for(const a of ROOT_ATTRS)document.documentElement.removeAttribute(a);}
export function applyDesign(enabled,raw){
 if(!enabled){teardownDesign();return;}
 const d=normalizeDesign(raw),p=d.custom;
 const root=document.documentElement;
 root.dataset.ttkTheme=d.theme;root.dataset.ttkIconStyle=d.iconStyle;root.dataset.ttkIconTone=d.iconTone;root.dataset.ttkScheme=schemeOf(p);
 syncFontSources([d.font,d.dialogueFont]);
 const vars={...p,shadow:THEMES[d.theme].shadow,dialogue:d.dialogueColors[d.theme],font:FONTS[d.font].family,dialogueFont:FONTS[d.dialogueFont].family,size:`${d.size}px`,line:d.lineHeight,tracking:`${d.letterSpacing}px`,para:`${d.paragraphSpacing}px`};
 let node=document.getElementById(STYLE_ID);
 if(!node){node=document.createElement('style');node.id=STYLE_ID;document.head.append(node);}
 const css=`html[data-ttk-theme] {${Object.entries(vars).map(([k,v])=>`--ttk-${k}:${v};`).join('\n')}}`;
 if(node.textContent!==css)node.textContent=css;
}
