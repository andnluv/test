/** Tavern Toolkit — 통합 조회 (inventory).
 *
 * One window that lists what is installed — UI themes, chat-completion presets (prompts) and
 * extensions — and runs read-only checks for errors and conflicts. Nothing is modified here.
 */
import { detectConflicts } from './translation.js';

const EXT_PATH = /\/scripts\/extensions\/(third-party\/[^/]+|[^/]+)\//;
/** "/pattern/flags" → RegExp, the form SillyTavern's regex scripts use. Returns an error message or ''. */
export function regexError(find) {
    const s = String(find ?? '');
    if (!s || s.includes('{{')) return '';
    const m = s.match(/^\/([\w\W]+?)\/([a-z]*)$/);
    if (!m) return '';
    try { new RegExp(m[1], m[2]); return ''; } catch (e) { return String(e.message || e); }
}
export function analyzeRegexScripts(scripts, where) {
    const issues = [], seen = new Map();
    for (const sc of Array.isArray(scripts) ? scripts : []) {
        if (!sc || sc.disabled) continue;
        const name = sc.scriptName || '(이름 없음)';
        const err = regexError(sc.findRegex);
        if (err) issues.push({ level: 'error', area: '정규식', title: `${where} · "${name}" 패턴 오류`, detail: `정규식을 해석할 수 없어 이 스크립트는 동작하지 않습니다. ${err}` });
        seen.set(name, (seen.get(name) || 0) + 1);
    }
    for (const [name, n] of seen) if (n > 1) issues.push({ level: 'warn', area: '정규식', title: `${where} · "${name}" 이름이 ${n}번 중복`, detail: '같은 이름의 켜진 정규식이 여러 개입니다. 같은 스크립트를 두 번 가져왔다면 치환이 두 번 적용될 수 있습니다.' });
    return issues;
}
export function analyzePreset(name, raw) {
    let obj = raw;
    if (typeof raw === 'string') { try { obj = JSON.parse(raw); } catch (e) { return { name, broken: true, prompts: 0, enabled: 0, extras: [], issues: [{ level: 'error', area: '프롬프트', title: `프리셋 "${name}" 파일을 읽을 수 없음`, detail: `JSON 형식이 깨져 있습니다. ${e.message}` }] }; } }
    const prompts = Array.isArray(obj?.prompts) ? obj.prompts : [];
    const orders = Array.isArray(obj?.prompt_order) ? obj.prompt_order : [];
    const order = (orders.find(o => o?.character_id === 100001) || orders.at(-1))?.order || [];
    const issues = [], ids = new Map(), names = new Map();
    for (const p of prompts) { if (p?.identifier) ids.set(p.identifier, (ids.get(p.identifier) || 0) + 1); if (p?.name) names.set(p.name, (names.get(p.name) || 0) + 1); }
    const dupIds = [...ids].filter(([, n]) => n > 1).map(([id]) => id);
    if (dupIds.length) issues.push({ level: 'error', area: '프롬프트', title: `프리셋 "${name}" · 식별자 중복 ${dupIds.length}개`, detail: `같은 식별자를 가진 프롬프트가 여러 개라 하나만 사용됩니다: ${dupIds.slice(0, 5).join(', ')}${dupIds.length > 5 ? ' 외' : ''}` });
    const orphan = order.filter(o => o?.identifier && !ids.has(o.identifier));
    if (prompts.length && orphan.filter(o => o.enabled).length) issues.push({ level: 'warn', area: '프롬프트', title: `프리셋 "${name}" · 내용 없는 켜진 항목 ${orphan.filter(o => o.enabled).length}개`, detail: `순서 목록에는 켜져 있지만 프롬프트 정의가 없습니다: ${orphan.filter(o => o.enabled).slice(0, 5).map(o => o.identifier).join(', ')}` });
    const byId = new Map(prompts.map(p => [p?.identifier, p]));
    const enabled = order.filter(o => o?.enabled && byId.has(o.identifier));
    const empty = enabled.filter(o => { const p = byId.get(o.identifier); return !p.marker && !String(p.content ?? '').trim(); });
    if (empty.length) issues.push({ level: 'info', area: '프롬프트', title: `프리셋 "${name}" · 켜져 있지만 내용이 빈 프롬프트 ${empty.length}개`, detail: `${empty.slice(0, 5).map(o => byId.get(o.identifier).name || o.identifier).join(', ')}${empty.length > 5 ? ' 외' : ''}. 스크립트가 내용을 채우는 프리셋이라면 정상입니다.` });
    const dupNames = [...names].filter(([, n]) => n > 1).map(([n]) => n);
    if (dupNames.length) issues.push({ level: 'info', area: '프롬프트', title: `프리셋 "${name}" · 같은 이름의 프롬프트 ${dupNames.length}종`, detail: `${dupNames.slice(0, 5).join(', ')}${dupNames.length > 5 ? ' 외' : ''}` });
    const ext = obj?.extensions && typeof obj.extensions === 'object' ? obj.extensions : {};
    const extras = Object.keys(ext).filter(k => { const v = ext[k]; return Array.isArray(v) ? v.length : v && typeof v === 'object' ? Object.keys(v).length : !!v; });
    issues.push(...analyzeRegexScripts(ext.regex_scripts, `프리셋 "${name}"의 내장 정규식`));
    return { name, broken: false, prompts: prompts.length, enabled: enabled.length, extras, regex: Array.isArray(ext.regex_scripts) ? ext.regex_scripts.length : 0, issues };
}
const cmp = (a, b) => { const pa = String(a).split('.').map(n => parseInt(n) || 0), pb = String(b).split('.').map(n => parseInt(n) || 0); for (let i = 0; i < 3; i++) { if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0); } return 0; };
const baseName = id => id.replace(/^third-party\//, '').toLowerCase().replace(/^sillytavern[-_]?|^st[-_]/, '').replace(/[-_](main|master|dev)$/, '');
const GROUPS = [['번역', /interpres|translat|번역|翻[译訳譯]|deepl/i], ['테마·화면', /theme|테마|skin|css|style|ui[-_]|[-_]ui$|moonlit|layout/i]];
/** @param {{id:string,type:string,enabled:boolean,manifest:object|null}[]} exts */
export function analyzeExtensions(exts, { stVersion = '', sessionErrors = [], self = '', toolkit = {} } = {}) {
    const issues = [], ids = new Set(exts.map(e => e.id)), on = exts.filter(e => e.enabled);
    const label = e => e.manifest?.display_name || e.id.replace(/^third-party\//, '');
    for (const e of exts) {
        if (!e.manifest) { issues.push({ level: 'error', area: '확장', title: `"${label(e)}" · manifest.json을 읽을 수 없음`, detail: '설치가 끝나지 않았거나 파일이 깨졌습니다. SillyTavern은 이 확장을 불러오지 않습니다. 다시 설치해 보세요.' }); continue; }
        if (!e.enabled) continue;
        const m = e.manifest;
        if (m.minimum_client_version && stVersion && cmp(stVersion, m.minimum_client_version) < 0) issues.push({ level: 'error', area: '확장', title: `"${label(e)}" · SillyTavern ${m.minimum_client_version} 이상 필요`, detail: `현재 ${stVersion}이라 이 확장은 불러와지지 않습니다. SillyTavern을 업데이트하세요.` });
        if (Array.isArray(m.dependencies)) {
            const missing = m.dependencies.filter(d => !ids.has(d)), off = m.dependencies.filter(d => ids.has(d) && !exts.find(x => x.id === d).enabled);
            if (missing.length) issues.push({ level: 'error', area: '확장', title: `"${label(e)}" · 필요한 확장이 없음`, detail: `함께 설치해야 하는 확장: ${missing.join(', ')}` });
            if (off.length) issues.push({ level: 'error', area: '확장', title: `"${label(e)}" · 필요한 확장이 꺼져 있음`, detail: `켜야 하는 확장: ${off.join(', ')}` });
        }
    }
    const byBase = new Map();
    for (const e of on.filter(e => e.type !== 'system')) { const k = baseName(e.id) + '|' + (e.manifest?.display_name || ''); const k2 = baseName(e.id); for (const key of [k2]) byBase.set(key, [...(byBase.get(key) || []), e]); }
    for (const [, list] of byBase) if (list.length > 1) issues.push({ level: 'warn', area: '확장', title: `같은 확장이 ${list.length}번 설치된 것으로 보임`, detail: `${list.map(e => e.id.replace(/^third-party\//, '')).join(', ')} — 둘 다 켜져 있으면 기능이 두 번 실행될 수 있습니다. 하나를 지우거나 끄세요.` });
    const byName = new Map();
    for (const e of on.filter(e => e.type !== 'system' && e.manifest?.display_name)) byName.set(e.manifest.display_name, [...(byName.get(e.manifest.display_name) || []), e]);
    for (const [name, list] of byName) if (list.length > 1 && new Set(list.map(e => baseName(e.id))).size > 1) issues.push({ level: 'warn', area: '확장', title: `표시 이름 "${name}"이 같은 확장 ${list.length}개`, detail: `${list.map(e => e.id.replace(/^third-party\//, '')).join(', ')} — 같은 확장의 사본일 수 있습니다.` });
    for (const [group, re] of GROUPS) {
        const hits = on.filter(e => e.type !== 'system' && e.id !== self && (re.test(e.id) || re.test(e.manifest?.display_name || '')));
        if (group === '번역') {
            const total = hits.length + (toolkit.translation ? 1 : 0);
            if (total > 1) issues.push({ level: 'warn', area: '충돌', title: `번역 확장이 ${total}개 켜져 있음`, detail: `${[toolkit.translation && '태번 도구함 번역 모듈', ...hits.map(label)].filter(Boolean).join(', ')} — 같은 메시지를 여러 번 번역할 수 있습니다. 하나만 켜 두세요.` });
        } else {
            const total = hits.length + (toolkit.design ? 1 : 0);
            if (total > 1) issues.push({ level: 'info', area: '충돌', title: `화면을 바꾸는 확장이 ${total}개 켜져 있음 (이름 기준 추정)`, detail: `${[toolkit.design && '태번 도구함 디자인 모듈', ...hits.map(label)].filter(Boolean).join(', ')} — 서로의 스타일을 덮어써 화면이 깨질 수 있습니다. 문제가 보이면 하나씩 꺼서 확인하세요.` });
        }
    }
    const errs = new Map();
    for (const er of sessionErrors) errs.set(er.ext, [...(errs.get(er.ext) || []), er]);
    for (const [ext, list] of errs) { const e = exts.find(x => x.id === ext); issues.push({ level: 'error', area: '오류', title: `"${e ? label(e) : ext}" · 이번 접속 중 스크립트 오류 ${list.length}건`, detail: [...new Set(list.map(x => x.message))].slice(0, 3).join(' / ') }); }
    return issues;
}
export function analyzeThemes(themes, current, toolkitDesignOn) {
    const issues = [], list = (Array.isArray(themes) ? themes : []).map(t => ({ name: t?.name || '(이름 없음)', css: String(t?.custom_css || '').length, current: t?.name === current }));
    const cur = list.find(t => t.current);
    if (current && !cur) issues.push({ level: 'warn', area: '테마', title: `선택된 테마 "${current}"가 목록에 없음`, detail: '테마 파일이 지워졌거나 이름이 바뀌었습니다. 사용자 설정에서 테마를 다시 고르세요.' });
    if (cur?.css && toolkitDesignOn) issues.push({ level: 'info', area: '충돌', title: `테마 "${cur.name}"의 사용자 CSS와 도구함 디자인이 함께 적용 중`, detail: `이 테마에는 사용자 CSS ${cur.css.toLocaleString()}자가 들어 있습니다. 도구함 디자인 모듈과 겹쳐 일부 화면이 의도와 다르게 보일 수 있습니다. 한쪽만 쓰려면 디자인 모듈을 끄거나 기본 테마로 바꾸세요.` });
    const names = new Map(); for (const t of list) names.set(t.name, (names.get(t.name) || 0) + 1);
    for (const [n, c] of names) if (c > 1) issues.push({ level: 'info', area: '테마', title: `테마 이름 "${n}"이 ${c}번 중복`, detail: '같은 이름의 테마 파일이 여러 개 있습니다.' });
    return { list, issues };
}

const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; };
const LEVEL = { error: ['오류', 0], warn: ['주의', 1], info: ['참고', 2] };

export class Inventory {
    constructor({ getToolkit, selfFolder } = {}) {
        this.getToolkit = getToolkit; this.self = selfFolder ? `third-party/${selfFolder}` : ''; this.enabled = false; this.errors = []; this.tab = 'check'; this.query = ''; this.data = null; this.updates = new Map();
        this.onError = e => this.record(e?.filename, e?.error?.stack, e?.message || e?.error?.message);
        this.onReject = e => this.record('', e?.reason?.stack, e?.reason?.message || String(e?.reason ?? ''));
    }
    ctx() { return window.SillyTavern?.getContext?.(); }
    record(file, stack, message) {
        const m = String(file || '').match(EXT_PATH) || String(stack || '').match(EXT_PATH);
        if (!m || this.errors.length >= 80) return;
        this.errors.push({ ext: decodeURIComponent(m[1]), message: String(message || '알 수 없는 오류').slice(0, 200) });
    }
    start() {
        if (this.enabled) return;
        this.enabled = true;
        window.addEventListener('error', this.onError, true);
        window.addEventListener('unhandledrejection', this.onReject);
        const menu = document.getElementById('extensionsMenu');
        if (menu && !document.getElementById('ttk_inventory_menu')) {
            const item = el('div', 'list-group-item flex-container flexGap5 interactable'); item.id = 'ttk_inventory_menu'; item.tabIndex = 0;
            item.append(el('div', 'fa-solid fa-clipboard-list extensionsMenuExtensionButton'), el('span', '', '통합 조회'));
            item.addEventListener('click', () => this.open());
            menu.append(item);
        }
    }
    stop() {
        if (!this.enabled) return;
        this.enabled = false;
        window.removeEventListener('error', this.onError, true);
        window.removeEventListener('unhandledrejection', this.onReject);
        document.getElementById('ttk_inventory_menu')?.remove();
        this.dialog?.remove(); this.dialog = null; this.data = null;
    }

    async load() {
        const ctx = this.ctx(), headers = ctx?.getRequestHeaders?.() || { 'Content-Type': 'application/json' };
        const json = async (url, opt) => { const r = await fetch(url, opt); if (!r.ok) throw Error(`${url} → ${r.status}`); return r.json(); };
        const notes = [];
        const [settings, discovered, version] = await Promise.all([
            json('/api/settings/get', { method: 'POST', headers, body: '{}' }).catch(e => { notes.push(`테마·프리셋 목록을 불러오지 못했습니다 (${e.message})`); return {}; }),
            json('/api/extensions/discover', { headers }).catch(e => { notes.push(`확장 목록을 불러오지 못했습니다 (${e.message})`); return []; }),
            json('/version').catch(() => ({})),
        ]);
        const disabled = new Set(ctx?.extensionSettings?.disabledExtensions || []);
        const exts = await Promise.all((Array.isArray(discovered) ? discovered : []).map(async d => {
            let manifest = null; try { manifest = await json(`/scripts/extensions/${d.name}/manifest.json`); } catch { manifest = null; }
            return { id: d.name, type: d.type, enabled: !disabled.has(d.name), manifest };
        }));
        const tk = this.getToolkit();
        const themes = analyzeThemes(settings.themes, ctx?.powerUserSettings?.theme, tk.design);
        const currentPreset = ctx?.chatCompletionSettings?.preset_settings_openai;
        const presets = (settings.openai_setting_names || []).map((name, i) => ({ ...analyzePreset(name, settings.openai_settings?.[i]), current: name === currentPreset }));
        const issues = [
            ...analyzeExtensions(exts, { stVersion: version.pkgVersion || '', sessionErrors: this.errors, self: this.self, toolkit: tk }),
            ...themes.issues,
            ...presets.flatMap(p => p.current || p.broken ? p.issues : p.issues.filter(i => i.level === 'error')),
            ...analyzeRegexScripts(ctx?.extensionSettings?.regex, '전역 정규식'),
        ];
        if (tk.translation) for (const c of detectConflicts(this.self.replace(/^third-party\//, ''))) if (!issues.some(i => i.title.startsWith('번역 확장이'))) issues.push({ level: 'warn', area: '충돌', title: '다른 번역 기능이 켜져 있음', detail: `${c} — 태번 도구함 번역 모듈과 함께 켜면 같은 메시지를 두 번 번역합니다.` });
        issues.sort((a, b) => LEVEL[a.level][1] - LEVEL[b.level][1]);
        this.data = { themes: themes.list, presets, exts, issues, notes, version: version.pkgVersion || '', currentPreset, loadedAt: new Date() };
    }

    async open() {
        if (!this.dialog) {
            this.dialog = el('dialog'); this.dialog.id = 'ttk-inventory'; this.dialog.setAttribute('aria-label', '통합 조회');
            this.dialog.addEventListener('click', e => { if (e.target === this.dialog) this.dialog.close(); });
            document.body.append(this.dialog);
        }
        if (!this.dialog.open) this.dialog.showModal();
        this.dialog.replaceChildren(el('p', 'ttk-inv-loading', '불러오는 중…'));
        try { await this.load(); } catch (e) { console.warn('[Tavern Toolkit] inventory', e); this.data = { themes: [], presets: [], exts: [], issues: [], notes: [`불러오지 못했습니다 (${e.message})`], version: '', loadedAt: new Date() }; }
        this.render();
    }
    render() {
        const d = this.data, dlg = this.dialog; if (!d || !dlg) return;
        const count = lv => d.issues.filter(i => i.level === lv).length;
        const head = el('header', 'ttk-inv-head');
        const title = el('div', 'ttk-inv-title'); title.append(el('strong', '', '통합 조회'), el('small', '', `${d.version ? `SillyTavern ${d.version} · ` : ''}${d.loadedAt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 기준`));
        const actions = el('div', 'ttk-inv-head-actions');
        const again = el('button', 'ttk-inv-btn', '다시 점검'); again.type = 'button'; again.addEventListener('click', () => this.open());
        const x = el('button', 'ttk-inv-x'); x.type = 'button'; x.setAttribute('aria-label', '닫기'); x.title = '닫기'; x.append(el('i', 'fa-solid fa-xmark')); x.addEventListener('click', () => dlg.close());
        actions.append(again, x); head.append(title, actions);
        const tabs = el('div', 'ttk-inv-tabs'); tabs.setAttribute('role', 'tablist');
        const defs = [['check', '점검', count('error') + count('warn')], ['themes', '테마', d.themes.length], ['presets', '프롬프트', d.presets.length], ['exts', '확장', d.exts.length]];
        for (const [id, label, n] of defs) {
            const b = el('button', 'ttk-inv-tab'); b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(this.tab === id));
            b.append(el('span', '', label), el('span', `ttk-inv-num${id === 'check' && n ? ' ttk-inv-num-alert' : ''}`, String(n)));
            b.addEventListener('click', () => { this.tab = id; this.query = ''; this.render(); });
            tabs.append(b);
        }
        const body = el('div', 'ttk-inv-body');
        for (const n of d.notes) body.append(el('p', 'ttk-inv-note', n));
        if (this.tab === 'check') this.renderCheck(body, count); else this.renderList(body);
        dlg.replaceChildren(head, tabs, body);
    }
    renderCheck(body, count) {
        const d = this.data;
        const sum = el('div', 'ttk-inv-summary');
        for (const lv of ['error', 'warn', 'info']) { const c = el('div', `ttk-inv-stat ttk-inv-${lv}`); c.append(el('strong', '', String(count(lv))), el('span', '', LEVEL[lv][0])); sum.append(c); }
        body.append(sum);
        if (!d.issues.length) body.append(el('p', 'ttk-inv-ok', '확인한 항목에서 오류나 충돌을 찾지 못했습니다.'));
        for (const i of d.issues) {
            const row = el('div', `ttk-inv-issue ttk-inv-${i.level}`);
            const top = el('div', 'ttk-inv-issue-top'); top.append(el('span', 'ttk-inv-level', LEVEL[i.level][0]), el('span', 'ttk-inv-area', i.area), el('strong', '', i.title));
            row.append(top, el('p', '', i.detail)); body.append(row);
        }
        body.append(el('p', 'ttk-inv-foot', '점검 범위: 확장의 설치 상태·필요 조건·중복·이번 접속 중 스크립트 오류(도구함이 켜진 뒤 발생한 것), 번역·화면 확장의 중복, 현재 테마의 사용자 CSS, 현재 프리셋의 프롬프트 구성(다른 프리셋은 오류만), 정규식 패턴. 확장끼리의 세부 동작 충돌이나 모델 응답 품질은 확인하지 않으며, 여기서 아무것도 바꾸지 않습니다.'));
    }
    renderList(body) {
        const d = this.data, q = this.query.trim().toLowerCase();
        const tools = el('div', 'ttk-inv-tools');
        const search = el('input', 'ttk-inv-search'); search.type = 'search'; search.placeholder = '이름으로 찾기'; search.value = this.query; search.setAttribute('aria-label', '검색');
        const list = el('div', 'ttk-inv-list');
        const fill = () => { list.replaceChildren(...this.rows(this.query.trim().toLowerCase())); if (!list.children.length) list.append(el('p', 'ttk-inv-ok', '해당하는 항목이 없습니다.')); };
        search.addEventListener('input', () => { this.query = search.value; fill(); });
        tools.append(search);
        if (this.tab === 'exts') { const up = el('button', 'ttk-inv-btn', '업데이트 확인'); up.type = 'button'; up.addEventListener('click', async () => { up.disabled = true; up.textContent = '확인 중…'; await this.checkUpdates(); fill(); up.disabled = false; up.textContent = '업데이트 확인'; }); tools.append(up); }
        body.append(tools, list); fill();
    }
    rows(q) {
        const d = this.data, out = [];
        const row = (name, meta, badges = [], dim = false) => { const r = el('div', `ttk-inv-row${dim ? ' ttk-inv-dim' : ''}`); const main = el('div', 'ttk-inv-row-main'); main.append(el('strong', '', name)); if (meta) main.append(el('small', '', meta)); const b = el('div', 'ttk-inv-badges'); for (const [text, kind] of badges) b.append(el('span', `ttk-inv-badge${kind ? ` ttk-inv-badge-${kind}` : ''}`, text)); r.append(main, b); return r; };
        if (this.tab === 'themes') for (const t of d.themes) { if (q && !t.name.toLowerCase().includes(q)) continue; out.push(row(t.name, t.css ? `사용자 CSS ${t.css.toLocaleString()}자` : '사용자 CSS 없음', t.current ? [['사용 중', 'on']] : [])); }
        if (this.tab === 'presets') for (const p of [...d.presets].sort((a, b) => b.current - a.current)) {
            if (q && !p.name.toLowerCase().includes(q)) continue;
            const errs = p.issues.filter(i => i.level === 'error').length, warns = p.issues.filter(i => i.level === 'warn').length;
            const meta = p.broken ? '파일을 읽을 수 없음' : `프롬프트 ${p.prompts}개 · 켜짐 ${p.enabled}개${p.regex ? ` · 내장 정규식 ${p.regex}개` : ''}${p.extras.filter(k => k !== 'regex_scripts').length ? ` · 내장 데이터: ${p.extras.filter(k => k !== 'regex_scripts').join(', ')}` : ''}`;
            const r = row(p.name, meta, [p.current && ['사용 중', 'on'], errs && [`오류 ${errs}`, 'error'], warns && [`주의 ${warns}`, 'warn']].filter(Boolean));
            if (p.issues.length) { const ul = el('ul', 'ttk-inv-sub'); for (const i of p.issues) ul.append(el('li', `ttk-inv-${i.level}`, `${LEVEL[i.level][0]} · ${i.title.replace(`프리셋 "${p.name}" · `, '')}`)); r.append(ul); }
            out.push(r);
        }
        if (this.tab === 'exts') {
            const typeName = { system: '기본 제공', local: '내가 설치', global: '전체 사용자용' };
            const sorted = [...d.exts].sort((a, b) => (a.type === 'system') - (b.type === 'system') || b.enabled - a.enabled || a.id.localeCompare(b.id));
            for (const e of sorted) {
                const name = e.manifest?.display_name || e.id.replace(/^third-party\//, '');
                if (q && !`${name} ${e.id}`.toLowerCase().includes(q)) continue;
                const errN = this.errors.filter(x => x.ext === e.id).length, up = this.updates.get(e.id);
                const meta = [typeName[e.type] || e.type, e.manifest?.version && `v${e.manifest.version}`, e.manifest?.author, e.id.replace(/^third-party\//, '')].filter(Boolean).join(' · ');
                out.push(row(name, meta, [e.enabled ? ['켜짐', 'on'] : ['꺼짐', ''], !e.manifest && ['manifest 없음', 'error'], errN && [`오류 ${errN}`, 'error'], up === 'new' && ['업데이트 있음', 'warn'], up === 'ok' && ['최신', ''], up === 'fail' && ['확인 실패', '']].filter(Boolean), !e.enabled));
            }
        }
        return out;
    }
    async checkUpdates() {
        const headers = this.ctx()?.getRequestHeaders?.() || { 'Content-Type': 'application/json' };
        for (const e of this.data.exts.filter(e => e.type !== 'system')) {
            try {
                const r = await fetch('/api/extensions/version', { method: 'POST', headers, body: JSON.stringify({ extensionName: e.id.replace(/^third-party\//, ''), global: e.type === 'global' }) });
                if (!r.ok) throw Error(String(r.status));
                const v = await r.json();
                this.updates.set(e.id, v.isUpToDate === false ? 'new' : 'ok');
            } catch { this.updates.set(e.id, 'fail'); }
        }
    }
}
