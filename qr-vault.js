/** Tavern Toolkit — QR 보관함 (Quick Reply vault).
 *
 * One composer button opens a drawer that (1) runs any Quick Reply from any set — including sets
 * that are not on the bar — and (2) manages sets: global / per-chat activation, import, export
 * and a full backup. Everything goes through SillyTavern's own Quick Reply extension
 * (globalThis.quickReplyApi); this module stores no Quick Reply data of its own.
 */
import { addComposerButton, removeComposerButton } from './composer.js';

export const DEFAULT_QR_VAULT = Object.freeze({ hideBar: true, closeOnRun: true, scope: 'active', collapsed: [] });
export function normalizeQrVault(raw = {}) {
    const r = raw && typeof raw === 'object' ? raw : {};
    return {
        hideBar: r.hideBar !== false,
        closeOnRun: r.closeOnRun !== false,
        scope: r.scope === 'all' ? 'all' : 'active',
        collapsed: Array.isArray(r.collapsed) ? [...new Set(r.collapsed.filter(x => typeof x === 'string'))].slice(0, 300) : [],
    };
}
/** Accepts one exported set, or a backup bundle made by this module. Returns the valid sets and the rejected count. */
export function parseImport(text) {
    let data; try { data = JSON.parse(text); } catch { return { sets: [], rejected: 1 }; }
    const candidates = data?.type === 'ttk-qr-backup' && Array.isArray(data.sets) ? data.sets : [data];
    const sets = candidates.filter(s => s && typeof s === 'object' && Number.isInteger(s.version) && typeof s.name === 'string' && s.name.trim() && Array.isArray(s.qrList));
    return { sets, rejected: candidates.length - sets.length };
}
const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; };
const preview = qr => String(qr.message || '').replace(/\s+/g, ' ').trim();
function download(name, data) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
    const a = el('a'); a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export class QrVault {
    constructor({ getSettings, save } = {}) {
        this.getSettings = getSettings; this.save = save; this.enabled = false; this.drawer = null; this.tab = 'run'; this.query = ''; this.handlers = [];
        this.onDocDown = e => { if (this.drawer && !this.drawer.hidden && !this.drawer.contains(e.target) && !e.target.closest?.('#ttk_qr_vault')) this.close(); };
        this.onKey = e => { if (e.key === 'Escape' && this.drawer && !this.drawer.hidden) { this.close(); document.getElementById('ttk_qr_vault')?.focus(); } };
        this.onResize = () => this.position();
    }
    api() { return globalThis.quickReplyApi; }
    ctx() { return window.SillyTavern?.getContext?.(); }
    start() {
        if (this.enabled) { this.applyBar(); return; }
        this.enabled = true;
        addComposerButton({ id: 'ttk_qr_vault', icon: 'fa-box-archive', label: 'QR', title: 'QR 보관함 · 빠른 답장을 찾아 실행하고 세트를 관리합니다', order: 0, onClick: () => this.toggle() });
        document.addEventListener('pointerdown', this.onDocDown, true);
        document.addEventListener('keydown', this.onKey);
        window.addEventListener('resize', this.onResize);
        const c = this.ctx(), es = c?.eventSource, type = (c?.eventTypes || c?.event_types)?.CHAT_CHANGED;
        if (es && type) { const fn = () => { if (this.drawer && !this.drawer.hidden) this.render(); }; es.on(type, fn); this.handlers.push([type, fn]); }
        this.applyBar();
    }
    stop() {
        if (!this.enabled) return;
        this.enabled = false;
        removeComposerButton('ttk_qr_vault');
        document.removeEventListener('pointerdown', this.onDocDown, true);
        document.removeEventListener('keydown', this.onKey);
        window.removeEventListener('resize', this.onResize);
        const es = this.ctx()?.eventSource;
        for (const [type, fn] of this.handlers) (es?.removeListener || es?.off)?.call(es, type, fn);
        this.handlers = [];
        this.drawer?.remove(); this.drawer = null;
        document.querySelector('.ttk-qr-host')?.classList.remove('ttk-qr-host');
        document.body.classList.remove('ttk-qr-hide-bar');
    }
    applyBar() { document.body.classList.toggle('ttk-qr-hide-bar', this.enabled && this.getSettings().hideBar); }

    // ---- data ------------------------------------------------------------------------------
    sets() {
        const api = this.api();
        return (api?.listSets?.() || []).map(name => api.getSetByName(name)).filter(Boolean);
    }
    activeNames() {
        const api = this.api(), names = new Set();
        try { api.listGlobalSets().forEach(n => names.add(n)); } catch { /* not ready */ }
        try { api.listChatSets().forEach(n => names.add(n)); } catch { /* no chat */ }
        try { api.settings?.charConfig?.setList?.forEach(l => l?.set?.name && names.add(l.set.name)); } catch { /* older builds */ }
        return names;
    }

    // ---- drawer ----------------------------------------------------------------------------
    toggle() { if (this.drawer && !this.drawer.hidden) this.close(); else this.open(); }
    close() { if (this.drawer) this.drawer.hidden = true; document.getElementById('ttk_qr_vault')?.setAttribute('aria-expanded', 'false'); }
    open() {
        if (!this.drawer) {
            this.drawer = el('div'); this.drawer.id = 'ttk-qr-drawer'; this.drawer.setAttribute('role', 'dialog'); this.drawer.setAttribute('aria-label', 'QR 보관함');
            const host = document.getElementById('form_sheld') || document.body;
            if (getComputedStyle(host).position === 'static') host.classList.add('ttk-qr-host');
            host.append(this.drawer);
        }
        this.drawer.hidden = false;
        document.getElementById('ttk_qr_vault')?.setAttribute('aria-expanded', 'true');
        this.render(); this.position();
        if (!window.matchMedia('(max-width: 1000px)').matches) this.drawer.querySelector('.ttk-qr-search')?.focus();
    }
    /** The drawer hangs above the composer inside #form_sheld. (position:fixed is unusable here:
     *  SillyTavern's mobile layout puts a transform on <html>, which re-anchors fixed elements.) */
    position() {
        if (!this.drawer || this.drawer.hidden) return;
        const host = this.drawer.parentElement?.getBoundingClientRect();
        if (host) this.drawer.style.maxHeight = `${Math.max(180, Math.min(window.innerHeight * 0.62, host.top - 12))}px`;
    }
    render() {
        const d = this.drawer; if (!d) return;
        const scroll = d.querySelector('.ttk-qr-body')?.scrollTop || 0;
        const head = el('div', 'ttk-qr-head');
        const tabs = el('div', 'ttk-qr-tabs'); tabs.setAttribute('role', 'tablist');
        for (const [id, label] of [['run', 'QR 실행'], ['manage', '세트 관리']]) {
            const b = el('button', 'ttk-qr-tab', label); b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(this.tab === id));
            b.addEventListener('click', () => { this.tab = id; this.render(); });
            tabs.append(b);
        }
        const x = el('button', 'ttk-qr-close'); x.append(el('i', 'fa-solid fa-xmark')); x.type = 'button'; x.title = '닫기'; x.setAttribute('aria-label', '닫기'); x.addEventListener('click', () => this.close());
        head.append(tabs, x);
        const body = el('div', 'ttk-qr-body');
        if (!this.api()) body.append(el('p', 'ttk-qr-empty', 'SillyTavern의 빠른 답장(Quick Reply) 확장을 찾지 못했습니다. 확장 관리에서 Quick Reply가 켜져 있는지 확인하세요.'));
        else if (this.tab === 'run') this.renderRun(body); else this.renderManage(body);
        d.replaceChildren(head, body);
        body.scrollTop = scroll;
    }
    renderRun(body) {
        const settings = this.getSettings();
        const bar = el('div', 'ttk-qr-tools');
        const search = el('input', 'ttk-qr-search'); search.type = 'search'; search.placeholder = '이름·내용으로 찾기'; search.value = this.query; search.setAttribute('aria-label', 'QR 검색');
        const list = el('div', 'ttk-qr-list');
        search.addEventListener('input', () => { this.query = search.value; this.fillRun(list); });
        const scope = el('div', 'ttk-qr-scope');
        for (const [id, label] of [['active', '켜진 세트'], ['all', '전체']]) {
            const b = el('button', 'ttk-qr-chip', label); b.type = 'button'; b.setAttribute('aria-pressed', String(settings.scope === id));
            b.addEventListener('click', () => { settings.scope = id; this.save(); this.render(); });
            scope.append(b);
        }
        bar.append(search, scope); body.append(bar, list);
        this.fillRun(list);
    }
    fillRun(list) {
        const settings = this.getSettings(), q = this.query.trim().toLowerCase(), active = this.activeNames();
        list.replaceChildren();
        let shown = 0;
        for (const set of this.sets()) {
            if (settings.scope === 'active' && !active.has(set.name)) continue;
            const qrs = set.qrList.filter(qr => !qr.isHidden && (!q || `${qr.label}\n${qr.title}\n${qr.message}\n${set.name}`.toLowerCase().includes(q)));
            if (!qrs.length) continue;
            shown += qrs.length;
            const folded = !q && settings.collapsed.includes(set.name);
            const section = el('section', 'ttk-qr-set');
            const title = el('button', 'ttk-qr-set-head'); title.type = 'button'; title.setAttribute('aria-expanded', String(!folded));
            title.append(el('span', 'ttk-qr-set-name', set.name), el('span', 'ttk-qr-count', `${qrs.length}`));
            if (!active.has(set.name)) title.append(el('span', 'ttk-qr-badge', '꺼짐'));
            title.addEventListener('click', () => { const i = settings.collapsed.indexOf(set.name); if (i > -1) settings.collapsed.splice(i, 1); else settings.collapsed.push(set.name); this.save(); this.fillRun(list); });
            section.append(title);
            if (!folded) {
                const grid = el('div', 'ttk-qr-grid');
                for (const qr of qrs) {
                    const b = el('button', 'ttk-qr-item'); b.type = 'button';
                    if (qr.icon) b.append(el('i', `fa-solid ${String(qr.icon).replace(/[^\w -]/g, '')}`));
                    b.append(el('span', '', qr.label || qr.title || preview(qr).slice(0, 24) || '(이름 없음)'));
                    b.title = qr.title || preview(qr).slice(0, 200);
                    b.addEventListener('click', () => this.run(set, qr, b));
                    grid.append(b);
                }
                section.append(grid);
            }
            list.append(section);
        }
        if (!shown) list.append(el('p', 'ttk-qr-empty', q ? '찾는 QR이 없습니다.' : settings.scope === 'active' ? '켜진 QR 세트가 없습니다. "전체"를 누르거나 세트 관리에서 세트를 켜세요.' : 'QR 세트가 없습니다. 세트 관리에서 가져올 수 있습니다.'));
    }
    async run(set, qr, button) {
        if (this.getSettings().closeOnRun) this.close(); else button.classList.add('ttk-qr-running');
        try { await this.api().executeQuickReply(set.name, Number.isInteger(qr.id) ? qr.id : qr.label); }
        catch (error) { console.warn('[Tavern Toolkit] QR', error); globalThis.toastr?.error?.(String(error?.message || error), 'QR 실행 실패'); }
        finally { button.classList.remove('ttk-qr-running'); }
    }
    renderManage(body) {
        const api = this.api();
        const actions = el('div', 'ttk-qr-actions');
        const file = el('input'); file.type = 'file'; file.accept = '.json,application/json'; file.multiple = true; file.hidden = true;
        file.addEventListener('change', async () => { await this.importFiles([...file.files]); file.value = ''; });
        const mk = (label, fn) => { const b = el('button', 'ttk-qr-action', label); b.type = 'button'; b.addEventListener('click', fn); return b; };
        actions.append(file, mk('세트 가져오기', () => file.click()), mk('전체 백업', () => this.backupAll()));
        body.append(actions, el('p', 'ttk-qr-hint', '전역은 모든 채팅에서, 이 채팅은 지금 채팅에서만 세트를 켭니다. 꺼진 세트의 QR도 "QR 실행 › 전체"에서 실행할 수 있습니다.'));
        const globals = new Set(), chats = new Set();
        try { api.listGlobalSets().forEach(n => globals.add(n)); } catch { /* not ready */ }
        try { api.listChatSets().forEach(n => chats.add(n)); } catch { /* no chat */ }
        const hasChat = !!api.settings?.chatConfig;
        const table = el('div', 'ttk-qr-manage');
        const sets = this.sets();
        for (const set of sets) {
            const row = el('div', 'ttk-qr-row');
            const name = el('div', 'ttk-qr-row-name'); name.append(el('strong', '', set.name), el('small', '', `QR ${set.qrList.length}개`));
            const toggle = (label, checked, disabled, on, off) => {
                const l = el('label', 'ttk-qr-toggle'); const c = el('input'); c.type = 'checkbox'; c.checked = checked; c.disabled = disabled;
                c.addEventListener('change', () => { try { (c.checked ? on : off)(); } catch (error) { c.checked = !c.checked; globalThis.toastr?.error?.(String(error?.message || error), 'QR 세트'); } });
                l.append(c, el('span', '', label)); return l;
            };
            const exp = el('button', 'ttk-qr-icon'); exp.append(el('i', 'fa-solid fa-file-export')); exp.type = 'button'; exp.title = `${set.name} 내보내기`; exp.setAttribute('aria-label', exp.title);
            exp.addEventListener('click', () => download(`${set.name}.json`, set));
            row.append(name,
                toggle('전역', globals.has(set.name), false, () => api.addGlobalSet(set.name, true), () => api.removeGlobalSet(set.name)),
                toggle('이 채팅', chats.has(set.name), !hasChat, () => api.addChatSet(set.name, true), () => api.removeChatSet(set.name)),
                exp);
            table.append(row);
        }
        if (!sets.length) table.append(el('p', 'ttk-qr-empty', 'QR 세트가 없습니다.'));
        body.append(table);
    }
    backupAll() {
        const sets = this.sets();
        if (!sets.length) { globalThis.toastr?.info?.('백업할 QR 세트가 없습니다.', 'QR 보관함'); return; }
        const stamp = new Date().toISOString().slice(0, 10);
        download(`QR-backup-${stamp}.json`, { type: 'ttk-qr-backup', version: 1, exportedAt: new Date().toISOString(), sets: JSON.parse(JSON.stringify(sets)) });
        globalThis.toastr?.success?.(`QR 세트 ${sets.length}개를 파일 하나로 저장했습니다.`, 'QR 보관함');
    }
    async importFiles(files) {
        let classes;
        try {
            const [a, b] = await Promise.all([import('/scripts/extensions/quick-reply/src/QuickReplySet.js'), import('/scripts/extensions/quick-reply/src/QuickReply.js')]);
            classes = { QuickReplySet: a.QuickReplySet, QuickReply: b.QuickReply };
            if (!classes.QuickReplySet?.list || !classes.QuickReply?.from) throw Error('구조가 다릅니다');
        } catch (error) {
            console.warn('[Tavern Toolkit] QR import', error);
            globalThis.toastr?.error?.('이 SillyTavern 버전에서는 여기서 가져올 수 없습니다. 확장 › Quick Reply의 가져오기를 사용하세요.', 'QR 가져오기');
            return;
        }
        const { QuickReplySet, QuickReply } = classes;
        let added = 0, replaced = 0, skipped = 0, rejected = 0;
        for (const f of files) {
            const parsed = parseImport(await f.text());
            rejected += parsed.rejected;
            for (const props of parsed.sets) {
                try {
                    const list = props.qrList.map(it => QuickReply.from(JSON.parse(JSON.stringify(it))));
                    const old = QuickReplySet.get(props.name);
                    if (old) {
                        if (!confirm(`"${props.name}" 세트가 이미 있습니다. 덮어쓸까요?\n기존 세트의 QR ${old.qrList.length}개가 파일의 ${list.length}개로 바뀝니다. 되돌릴 수 없습니다.`)) { skipped++; continue; }
                        // Updated in place so the global/chat lists that point at this set stay valid.
                        for (const k of ['disableSend', 'placeBeforeInput', 'injectInput', 'color', 'onlyBorderColor', 'idIndex']) if (props[k] !== undefined) old[k] = props[k];
                        old.qrList = list; old.init(); await old.save(); replaced++;
                    } else {
                        const set = QuickReplySet.from(JSON.parse(JSON.stringify({ ...props, qrList: [] })));
                        set.qrList = list; set.init();
                        const idx = QuickReplySet.list.findIndex(it => it.name.toLowerCase().localeCompare(set.name.toLowerCase()) === 1);
                        if (idx > -1) QuickReplySet.list.splice(idx, 0, set); else QuickReplySet.list.push(set);
                        await set.save(); added++;
                    }
                } catch (error) { console.warn('[Tavern Toolkit] QR import', props?.name, error); rejected++; }
            }
        }
        try { await this.api().settingsUi?.rerender?.(); } catch { /* the native editor refreshes on reload */ }
        const parts = [added && `추가 ${added}개`, replaced && `덮어씀 ${replaced}개`, skipped && `건너뜀 ${skipped}개`, rejected && `형식이 맞지 않음 ${rejected}개`].filter(Boolean);
        globalThis.toastr?.[rejected && !added && !replaced ? 'error' : 'success']?.(parts.join(' · ') || '가져올 세트가 없습니다.', 'QR 가져오기');
        this.render();
    }
}
