// Independent visual override; never mutates SillyTavern's native theme presets.
export const THEMES = Object.freeze({
  paper: { name: 'Paper · 페이퍼', bg: '#f3efe8', panel: '#fffaf3', text: '#342f2b', accent: '#92745d', border: '#c9b9a7', user: '#ede4d8', ai: '#faf5ed' },
  midnight: { name: 'Midnight · 미드나잇', bg: '#171c25', panel: '#242b37', text: '#e9e8e5', accent: '#9caec8', border: '#536176', user: '#283549', ai: '#222b37' },
  sage: { name: 'Sage · 세이지', bg: '#e7ebe4', panel: '#f5f7f1', text: '#33423b', accent: '#738d7c', border: '#b4c2b6', user: '#d9e3d8', ai: '#eef2ea' },
});
export const FONTS = Object.freeze({
  pretendard: {name:'Pretendard (시스템에 설치된 경우)', family:'Pretendard, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif'},
  noto: {name:'Noto Sans KR (웹폰트)', family:'"Noto Sans KR", "Malgun Gothic", sans-serif', remote:true},
  nanum: {name:'Nanum Myeongjo (웹폰트)',family:'"Nanum Myeongjo", "Batang", serif',remote:true},
  gowun: {name:'Gowun Batang (웹폰트)',family:'"Gowun Batang", "Batang", serif',remote:true},
});
const FONT_URL = 'https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&family=Nanum+Myeongjo:wght@400;700&family=Noto+Sans+KR:wght@400;500;600;700&display=swap';
const clamp = (n, lo, hi, fallback) => Number.isFinite(Number(n)) ? Math.min(hi, Math.max(lo, Number(n))) : fallback;
const validHex = (value, fallback) => /^#[0-9a-fA-F]{6}$/.test(value || '') ? value : fallback;
export function normalizeDesign(raw={}) {
  const theme = Object.hasOwn(THEMES, raw.theme) ? raw.theme : 'paper';
  const font = Object.hasOwn(FONTS, raw.font) ? raw.font : 'pretendard';
  const custom = raw.custom && typeof raw.custom === 'object' ? raw.custom : {};
  const palette = THEMES[theme];
  return {
    theme, font,
    size: clamp(raw.size, 12, 26, 16),
    lineHeight: clamp(raw.lineHeight, 1.1, 2.6, 1.7),
    letterSpacing: clamp(raw.letterSpacing, -1.5, 4, 0),
    paragraphSpacing: clamp(raw.paragraphSpacing, 0, 28, 10),
    custom: Object.fromEntries(Object.entries(palette).map(([k,v]) => [k, validHex(custom[k], v)])),
  };
}
let fontLink;
export function applyDesign(enabled, raw) {
  const styleId = 'ttk-design-runtime';
  document.getElementById(styleId)?.remove();
  if (!enabled) return;
  const d = normalizeDesign(raw);
  const color = d.custom;
  if (FONTS[d.font].remote && !fontLink) {
    fontLink = document.createElement('link');
    fontLink.rel = 'stylesheet';
    fontLink.href = FONT_URL;
    fontLink.id = 'ttk-google-fonts';
    document.head.append(fontLink);
  }
  const rules = `
  /* Scoped to SillyTavern chat and selected main UI. Does not write to native theme settings. */
  body { --ttk-bg:${color.bg}; --ttk-panel:${color.panel}; --ttk-text:${color.text}; --ttk-accent:${color.accent}; --ttk-border:${color.border}; }
  body #chat, body #sheld, body #chat_container { background-color:var(--ttk-bg) !important; color:var(--ttk-text) !important; }
  body #chat .mes, body #chat .mes .mes_text, body #send_textarea {
    font-family:${FONTS[d.font].family} !important;
    color:var(--ttk-text) !important;
  }
  body #chat .mes .mes_text, body #chat .mes .mes_text p, body #send_textarea {
    font-size:${d.size}px !important; line-height:${d.lineHeight} !important; letter-spacing:${d.letterSpacing}px !important;
  }
  body #chat .mes .mes_text p { margin-bottom:${d.paragraphSpacing}px !important; }
  body #chat .mes { border-color:var(--ttk-border) !important; }
  body #chat .mes[is_user="true"] { background-color:${color.user} !important; }
  body #chat .mes[is_user="false"] { background-color:${color.ai} !important; }
  body #send_form, body #send_textarea { background-color:var(--ttk-panel) !important; border-color:var(--ttk-border) !important; }
  body #send_form button, body #send_form .fa-solid { color:var(--ttk-accent) !important; }
  `;
  const style = document.createElement('style'); style.id=styleId; style.textContent=rules;
  document.head.append(style);
}
export function teardownDesign(){ document.getElementById('ttk-design-runtime')?.remove(); }
