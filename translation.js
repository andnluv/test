/** Tavern Toolkit — translation module.
 *
 * AI responses → Korean (display only), user input → chosen language (what the model receives).
 * Requests go through a saved Connection Manager profile; the active RP connection is never switched.
 *
 * Storage (inside the chat file, never sent to the model):
 *   message.extra.ttk_translation = { [hash(mes)]: koreanText }   AI messages, one entry per text version
 *   message.extra.ttk_input       = { original, sent: hash(mes) }  user messages translated before sending
 * A translation is shown only while its hash matches the current message text, so edits and swipes
 * never display a stale translation.
 */

export const INPUT_LANGUAGES = Object.freeze({
    en: { label: 'English', prompt: 'English' },
    ja: { label: '日本語', prompt: 'Japanese (日本語)' },
    zhs: { label: '简体中文', prompt: 'Simplified Chinese (简体中文)' },
    zht: { label: '繁體中文', prompt: 'Traditional Chinese (繁體中文)' },
});
export const DEFAULT_TRANSLATION = Object.freeze({
    profileId: '', display: 'replace', autoOutput: true, inputMode: 'auto', inputLang: 'en', minTokens: 0,
});
export function normalizeTranslation(raw = {}) {
    const r = raw && typeof raw === 'object' ? raw : {};
    const minTokens = Number(r.minTokens);
    return {
        profileId: typeof r.profileId === 'string' ? r.profileId.slice(0, 180) : '',
        display: r.display === 'below' ? 'below' : 'replace',
        autoOutput: r.autoOutput !== false,
        inputMode: ['off', 'button', 'auto'].includes(r.inputMode) ? r.inputMode : DEFAULT_TRANSLATION.inputMode,
        inputLang: Object.hasOwn(INPUT_LANGUAGES, r.inputLang) ? r.inputLang : DEFAULT_TRANSLATION.inputLang,
        minTokens: Number.isFinite(minTokens) ? Math.min(16000, Math.max(0, Math.round(minTokens))) : 0,
    };
}

/** FNV-1a; identifies a message text version. */
export function textHash(text) {
    let h = 0x811c9dc5;
    const s = String(text ?? '');
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return (h >>> 0).toString(36) + ':' + s.length;
}
/** Share of Hangul among letters. Messages that are already Korean are not sent for translation. */
export function hangulRatio(text) {
    const s = String(text ?? '').replace(/```[\s\S]*?```|<[^>]+>|\{\{[^}]*\}\}|https?:\/\/\S+/g, '');
    const letters = s.match(/[\p{L}]/gu) || [];
    if (!letters.length) return 0;
    return letters.filter(c => /\p{Script=Hangul}/u.test(c)).length / letters.length;
}
export function cleanOutput(raw, source) {
    let v = String(raw ?? '');
    v = v.replace(/<(think|thinking|reasoning)>[\s\S]*?<\/\1>/gi, '');
    v = v.replace(/^\s*(?:번역|한국어 번역|Translation|翻訳|翻译)\s*[:：]\s*\n?/i, '');
    v = v.trim();
    if (!/^\s*```/.test(String(source)) && /^```[a-z]*\n[\s\S]*\n```$/i.test(v)) v = v.replace(/^```[a-z]*\n/i, '').replace(/\n```$/, '');
    return v.trim();
}
function extractText(response) {
    if (typeof response === 'string') return response;
    if (typeof response?.content === 'string') return response.content;
    if (Array.isArray(response?.content)) return response.content.map(p => p?.text || '').join('');
    return response?.choices?.[0]?.message?.content ?? response?.choices?.[0]?.text
        ?? response?.candidates?.[0]?.content?.parts?.map(p => p?.text || '').join('') ?? response?.text ?? '';
}

const RULES = 'Keep the meaning, tone, speech level and each character\'s voice. Preserve exactly: line and paragraph breaks, Markdown markers (*, **, _, `, >, lists), the quotation marks and brackets used, HTML tags and attributes, code blocks, URLs and {{macros}}. Do not translate inside code blocks or HTML attribute values. Output ONLY the translated text: no notes, no preamble, no quotes around the whole text.';
const OUTPUT_PROMPT = `You are the translation engine of a role-play chat. Translate the text supplied by the user into natural, fluent Korean (한국어) as it would read in a published Korean novel. ${RULES}`;
const inputPrompt = lang => `You are the translation engine of a role-play chat. The user wrote their role-play message in Korean. Translate it into natural ${lang} that fits the story. Do not continue the story or reply to it. ${RULES}`;

/** Other translators that rewrite chat messages. Running two at once double-translates every message. */
const CONFLICT_PATTERN = /interpres|translat|번역|翻[译訳譯]|deepl|babel/i;
export function detectConflicts(selfFolder = '') {
    const found = new Set();
    const ctx = window.SillyTavern?.getContext?.();
    const disabled = ctx?.extensionSettings?.disabledExtensions || [];
    const auto = ctx?.extensionSettings?.translate?.auto_mode;
    if (auto && auto !== 'none' && !disabled.includes('translate')) found.add('SillyTavern 기본 번역 (자동 모드)');
    for (const s of document.querySelectorAll('script[src*="/scripts/extensions/third-party/"]')) {
        const folder = decodeURIComponent(s.getAttribute('src').split('/third-party/')[1]?.split('/')[0] || '');
        if (folder && folder !== selfFolder && CONFLICT_PATTERN.test(folder)) found.add(/interpres/i.test(folder) ? `Interpres (${folder})` : folder);
    }
    if (document.querySelector('[id*="interpres" i]:not(#ttk-panel *)')) found.add('Interpres');
    // A single entry for Interpres even when it is found by both its folder and its panel.
    const list = [...found];
    return list.filter(x => x !== 'Interpres' || !list.some(y => y.startsWith('Interpres (')));
}

const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export class MessageTranslator {
    constructor({ getSettings, save, getProfiles, onStatus, onConflict, selfFolder } = {}) {
        Object.assign(this, { getSettings, save, getProfiles, onStatus: onStatus || (() => {}), onConflict: onConflict || (() => {}), selfFolder: selfFolder || '' });
        this.enabled = false; this.queue = []; this.busy = false; this.controller = null; this.handlers = [];
        this.observer = null; this.pending = null; this.conflicts = []; this.service = null; this.inputBusy = false;
        this.onChatClick = this.onChatClick.bind(this);
    }
    ctx() { return window.SillyTavern?.getContext?.(); }
    async loadService() {
        if (this.service) return this.service;
        const module = await import('/scripts/extensions/shared.js');
        if (!module?.ConnectionManagerRequestService?.sendRequest) throw Error('현재 실리태번에서 연결 프로필 요청을 사용할 수 없습니다.');
        return (this.service = module.ConnectionManagerRequestService);
    }
    profileReady() {
        const id = this.getSettings().profileId;
        return !!id && this.getProfiles().some(p => p.id === id);
    }
    /** Automatic translation pauses while another translator is active. Manual buttons keep working. */
    autoAllowed() { return this.enabled && !this.conflicts.length && this.profileReady(); }
    checkConflicts() {
        this.conflicts = this.enabled ? detectConflicts(this.selfFolder) : [];
        this.onConflict(this.conflicts);
        return this.conflicts;
    }

    start() {
        if (this.enabled) { this.renderAll(); return; }
        this.enabled = true;
        const ctx = this.ctx(), es = ctx?.eventSource, et = ctx?.eventTypes || ctx?.event_types;
        const on = (type, fn) => { if (es && type) { es.on(type, fn); this.handlers.push([type, fn]); } };
        if (et) {
            on(et.CHARACTER_MESSAGE_RENDERED, id => this.onRendered(Number(id), true));
            on(et.USER_MESSAGE_RENDERED, id => this.onRendered(Number(id), false));
            on(et.MESSAGE_SENT, id => this.onSent(Number(id)));
            on(et.MESSAGE_SWIPED, id => this.render(Number(id)));
            on(et.MESSAGE_EDITED, id => this.onEdited(Number(id)));
            on(et.MESSAGE_UPDATED, id => this.render(Number(id)));
            on(et.CHAT_CHANGED, () => { this.reset(); setTimeout(() => this.renderAll(), 0); });
            on(et.MORE_MESSAGES_LOADED, () => this.renderAll());
            on(et.MESSAGE_DELETED, () => this.renderAll());
        }
        const chat = document.querySelector('#chat');
        if (chat) {
            chat.addEventListener('click', this.onChatClick);
            // Messages added without an event (bulk loads, other extensions): decorate them too.
            this.observer = new MutationObserver(records => {
                for (const r of records) for (const n of r.addedNodes) if (n.nodeType === 1 && n.classList.contains('mes')) this.render(Number(n.getAttribute('mesid')));
            });
            this.observer.observe(chat, { childList: true });
        }
        this.mountInputButton();
        this.checkConflicts();
        // Scripts of extensions load in parallel; look again once the page has settled.
        setTimeout(() => this.enabled && this.checkConflicts(), 2500);
        this.renderAll();
    }
    stop() {
        if (!this.enabled) return;
        this.enabled = false;
        const es = this.ctx()?.eventSource;
        for (const [type, fn] of this.handlers) (es?.removeListener || es?.off)?.call(es, type, fn);
        this.handlers = [];
        this.reset();
        this.observer?.disconnect(); this.observer = null;
        document.querySelector('#chat')?.removeEventListener('click', this.onChatClick);
        document.querySelectorAll('#chat .ttk-tr, #chat .ttk-tr-button').forEach(n => n.remove());
        document.querySelectorAll('#chat .mes').forEach(m => m.classList.remove('ttk-tr-on', 'ttk-tr-replace', 'ttk-tr-below', 'ttk-tr-original', 'ttk-tr-folded', 'ttk-tr-busy'));
        document.getElementById('ttk_input_translate')?.remove();
        this.conflicts = []; this.onConflict([]);
    }
    reset() { this.queue = []; this.controller?.abort(); this.controller = null; this.busy = false; this.pending = null; }
    refresh() { if (!this.enabled) return; this.mountInputButton(); this.renderAll(); }

    // ---- rendering -------------------------------------------------------------------------
    koreanFor(message) {
        if (!message?.extra) return '';
        if (message.is_user) {
            const input = message.extra.ttk_input;
            return input && input.sent === textHash(message.mes) ? input.original : '';
        }
        return message.extra.ttk_translation?.[textHash(message.mes)] || '';
    }
    renderAll() { if (!this.enabled) return; document.querySelectorAll('#chat .mes[mesid]').forEach(n => this.render(Number(n.getAttribute('mesid')))); }
    render(id) {
        if (!this.enabled || !Number.isInteger(id)) return;
        const ctx = this.ctx(), node = document.querySelector(`#chat .mes[mesid="${id}"]`), message = ctx?.chat?.[id];
        if (!node || !message || message.is_system) return;
        const korean = this.koreanFor(message), settings = this.getSettings();
        this.mountMessageButton(node, message, !!korean);
        let block = node.querySelector(':scope .ttk-tr');
        node.classList.toggle('ttk-tr-busy', this.isQueued(id));
        if (!korean) {
            block?.remove();
            node.classList.remove('ttk-tr-on', 'ttk-tr-replace', 'ttk-tr-below', 'ttk-tr-original', 'ttk-tr-folded');
            return;
        }
        const text = node.querySelector('.mes_text');
        if (!text) return;
        if (!block) {
            block = document.createElement('div');
            block.className = 'ttk-tr';
            block.innerHTML = '<div class="ttk-tr-text"></div><div class="ttk-tr-bar"><span class="ttk-tr-label"></span><span class="ttk-tr-actions"><button type="button" class="ttk-tr-toggle"></button><button type="button" class="ttk-tr-redo">다시 번역</button></span></div>';
        }
        if (block.previousElementSibling !== text) text.after(block);
        const key = `${settings.display}|${textHash(korean)}`;
        if (block.dataset.key !== key) {
            const body = block.querySelector('.ttk-tr-text');
            let html;
            try { html = ctx.messageFormatting?.(korean, message.name, false, !!message.is_user, id); } catch { html = null; }
            body.innerHTML = html || escapeHtml(korean).split(/\n{2,}/).map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
            block.dataset.key = key;
            body.dispatchEvent(new CustomEvent('ttk-translation-rendered', { bubbles: true }));
        }
        const mode = settings.display;
        node.classList.add('ttk-tr-on');
        node.classList.toggle('ttk-tr-replace', mode === 'replace');
        node.classList.toggle('ttk-tr-below', mode === 'below');
        if (mode === 'replace') node.classList.remove('ttk-tr-folded'); else node.classList.remove('ttk-tr-original');
        const showingOriginal = node.classList.contains('ttk-tr-original');
        block.querySelector('.ttk-tr-label').textContent = message.is_user
            ? (mode === 'replace' ? (showingOriginal ? `보낸 문장 · ${INPUT_LANGUAGES[settings.inputLang].label}` : '내가 쓴 문장') : '내가 쓴 문장')
            : (mode === 'replace' ? (showingOriginal ? '원문' : '번역') : '번역');
        block.querySelector('.ttk-tr-toggle').textContent = mode === 'replace'
            ? (showingOriginal ? (message.is_user ? '내가 쓴 문장 보기' : '번역 보기') : (message.is_user ? '보낸 문장 보기' : '원문 보기'))
            : (node.classList.contains('ttk-tr-folded') ? '번역 펼치기' : '번역 접기');
        block.querySelector('.ttk-tr-redo').hidden = !!message.is_user;
        node.querySelector('.mes_text').dataset.ttkOriginalLabel = message.is_user ? '보낸 문장' : '원문';
    }
    mountMessageButton(node, message, has) {
        const host = node.querySelector('.mes_buttons');
        if (!host) return;
        let b = host.querySelector(':scope > .ttk-tr-button');
        if (message.is_user && !has) { b?.remove(); return; }
        if (!b) {
            b = document.createElement('div');
            b.className = 'mes_button ttk-tr-button fa-solid fa-language';
            b.tabIndex = 0;
            const hint = host.querySelector(':scope > .extraMesButtonsHint');
            host.insertBefore(b, hint || host.firstChild);
        }
        b.title = has ? '번역/원문 전환' : '이 메시지 번역';
        b.classList.toggle('ttk-tr-button-active', has);
    }
    mountInputButton() {
        const existing = document.getElementById('ttk_input_translate');
        if (!this.enabled || this.getSettings().inputMode === 'off') { existing?.remove(); return; }
        if (existing) { existing.title = this.inputTitle(); return; }
        const host = document.getElementById('leftSendForm');
        if (!host) return;
        const b = document.createElement('div');
        b.id = 'ttk_input_translate';
        b.className = 'fa-solid fa-language interactable';
        b.tabIndex = 0;
        b.title = this.inputTitle();
        b.addEventListener('click', () => this.translateTextarea());
        b.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.translateTextarea(); } });
        host.append(b);
    }
    inputTitle() {
        const s = this.getSettings(), lang = INPUT_LANGUAGES[s.inputLang].label;
        return s.inputMode === 'auto' ? `입력 번역 (${lang}) · 보낼 때 자동으로 번역합니다. 눌러서 미리 번역할 수 있습니다.` : `입력창 내용을 ${lang}(으)로 번역`;
    }

    onChatClick(event) {
        const t = event.target;
        const node = t.closest?.('#chat .mes[mesid]');
        if (!node) return;
        const id = Number(node.getAttribute('mesid'));
        if (t.closest('.ttk-tr-button')) {
            event.stopPropagation();
            if (node.classList.contains('ttk-tr-on')) this.toggleView(node, id); else this.enqueue(id, true);
        } else if (t.closest('.ttk-tr-toggle')) this.toggleView(node, id);
        else if (t.closest('.ttk-tr-redo')) this.enqueue(id, true, true);
    }
    toggleView(node, id) {
        node.classList.toggle(this.getSettings().display === 'replace' ? 'ttk-tr-original' : 'ttk-tr-folded');
        this.render(id);
    }

    // ---- AI responses ----------------------------------------------------------------------
    onRendered(id, isCharacter) {
        this.render(id);
        if (!isCharacter) return;
        const message = this.ctx()?.chat?.[id];
        if (!message || message.is_user || message.is_system || this.koreanFor(message)) return;
        if (this.getSettings().autoOutput && this.autoAllowed()) this.enqueue(id, false);
        else if (this.getSettings().autoOutput && this.enabled && this.conflicts.length) this.onStatus(`다른 번역 확장이 켜져 있어 자동 번역을 건너뛰었습니다 (${this.conflicts.join(', ')})`);
    }
    onEdited(id) {
        const message = this.ctx()?.chat?.[id];
        this.render(id);
        if (message && !message.is_user && this.getSettings().autoOutput && this.autoAllowed() && !this.koreanFor(message)) this.enqueue(id, false);
    }
    isQueued(id) { return this.queue.some(j => j.id === id) || this.current === id; }
    enqueue(id, manual, redo = false) {
        if (!this.enabled) return;
        if (!this.profileReady()) { this.onStatus('번역용 연결 프로필을 선택하세요.'); globalThis.toastr?.warning?.('태번 도구함 설정에서 번역용 연결 프로필을 선택하세요.', '번역'); return; }
        if (this.isQueued(id)) return;
        this.queue.push({ id, manual, redo });
        this.render(id);
        this.pump();
    }
    async pump() {
        if (this.busy) return;
        this.busy = true;
        try {
            while (this.enabled && this.queue.length) {
                const job = this.queue.shift();
                this.current = job.id;
                try { await this.translateMessage(job); }
                catch (error) {
                    if (error?.name === 'AbortError') break;
                    console.warn('[Tavern Toolkit] translation', error);
                    this.onStatus(`번역 실패 · #${job.id} · ${error.message || error}`);
                    if (job.manual) globalThis.toastr?.error?.(String(error.message || error), '번역 실패');
                }
                this.current = null;
                this.render(job.id);
            }
        } finally { this.busy = false; this.current = null; }
    }
    async request(system, text, signal) {
        const service = await this.loadService();
        const settings = this.getSettings();
        const tokens = Math.min(16000, Math.max(1200, Math.ceil(text.length * 2.4), settings.minTokens || 0));
        const response = await service.sendRequest(settings.profileId, [{ role: 'system', content: system }, { role: 'user', content: text }], tokens,
            { stream: false, signal, includePreset: false, includeInstruct: false });
        const out = cleanOutput(extractText(response), text);
        if (!out) throw Error('빈 응답을 받았습니다. 추론 모델이면 설정에서 최소 출력 토큰을 늘려 보세요.');
        return out;
    }
    async translateMessage({ id, manual, redo }) {
        const ctx = this.ctx(), message = ctx?.chat?.[id], chatId = ctx?.getCurrentChatId?.();
        if (!message || message.is_system || message.is_user) return;
        const source = String(message.mes ?? '');
        if (!source.trim()) return;
        if (!redo && this.koreanFor(message)) return;
        if (!manual && hangulRatio(source) > 0.5) return;
        this.onStatus(`#${id} 번역 중…`);
        const controller = new AbortController(); this.controller = controller;
        const korean = await this.request(OUTPUT_PROMPT, source, controller.signal);
        const now = this.ctx();
        // The chat may have changed, or the message may have been edited or swiped while waiting.
        if (!this.enabled || now?.getCurrentChatId?.() !== chatId || now.chat[id] !== message || message.mes !== source) return;
        message.extra = message.extra || {};
        const map = { ...(message.extra.ttk_translation || {}) };
        map[textHash(source)] = korean;
        const keys = Object.keys(map);
        for (const k of keys.slice(0, Math.max(0, keys.length - 6))) delete map[k];
        message.extra.ttk_translation = map;
        await now.saveChat?.();
        this.onStatus(`#${id} 번역 완료`);
    }
    translateVisible() {
        const ctx = this.ctx();
        const ids = [...document.querySelectorAll('#chat .mes[mesid]')].map(n => Number(n.getAttribute('mesid')))
            .filter(id => { const m = ctx?.chat?.[id]; return m && !m.is_user && !m.is_system && !this.koreanFor(m); });
        if (!ids.length) { this.onStatus('번역할 응답이 없습니다.'); return 0; }
        ids.forEach(id => this.enqueue(id, true));
        return ids.length;
    }
    clearChat() {
        const ctx = this.ctx();
        for (const m of ctx?.chat || []) if (m?.extra) { delete m.extra.ttk_translation; delete m.extra.ttk_input; }
        ctx?.saveChat?.();
        this.renderAll();
        this.onStatus('이 채팅의 번역 기록을 지웠습니다.');
    }

    // ---- user input ------------------------------------------------------------------------
    async translateTextarea() {
        const area = document.getElementById('send_textarea');
        if (!area || this.inputBusy) return;
        const original = area.value;
        if (!original.trim()) return;
        if (this.pending && original === this.pending.translated) { area.value = this.pending.original; area.dispatchEvent(new Event('input', { bubbles: true })); this.pending = null; return; }
        if (!this.profileReady()) { globalThis.toastr?.warning?.('태번 도구함 설정에서 번역용 연결 프로필을 선택하세요.', '번역'); return; }
        const button = document.getElementById('ttk_input_translate');
        this.inputBusy = true; button?.classList.add('ttk-tr-spin');
        try {
            const translated = await this.request(inputPrompt(INPUT_LANGUAGES[this.getSettings().inputLang].prompt), original);
            if (area.value !== original) return;
            area.value = translated;
            area.dispatchEvent(new Event('input', { bubbles: true }));
            this.pending = { original, translated };
            globalThis.toastr?.info?.('번역한 문장으로 바꿨습니다. 버튼을 한 번 더 누르면 원래 문장으로 돌아갑니다.', '입력 번역', { timeOut: 2500 });
        } catch (error) { globalThis.toastr?.error?.(String(error.message || error), '입력 번역 실패'); }
        finally { this.inputBusy = false; button?.classList.remove('ttk-tr-spin'); }
    }
    /** Awaited by SillyTavern before the prompt is built, so a translation made here is what the model receives. */
    async onSent(id) {
        const ctx = this.ctx(), message = ctx?.chat?.[id];
        if (!this.enabled || !message?.is_user) return;
        const settings = this.getSettings(), sent = String(message.mes ?? '');
        if (this.pending && sent.trim() === this.pending.translated.trim()) {
            message.extra = message.extra || {};
            message.extra.ttk_input = { original: this.pending.original, sent: textHash(message.mes), lang: settings.inputLang };
            this.pending = null;
            await ctx.saveChat?.();
            return;
        }
        this.pending = null;
        if (settings.inputMode !== 'auto' || !sent.trim() || hangulRatio(sent) < 0.3) return;
        if (!this.autoAllowed()) {
            if (this.conflicts.length) this.onStatus('다른 번역 확장이 켜져 있어 입력 자동 번역을 건너뛰었습니다.');
            return;
        }
        const button = document.getElementById('ttk_input_translate');
        button?.classList.add('ttk-tr-spin');
        this.onStatus('입력 번역 중…');
        try {
            const translated = await this.request(inputPrompt(INPUT_LANGUAGES[settings.inputLang].prompt), sent);
            if (ctx.chat[id] !== message || message.mes !== sent) return;
            message.mes = translated;
            message.extra = message.extra || {};
            message.extra.ttk_input = { original: sent, sent: textHash(translated), lang: settings.inputLang };
            if (Array.isArray(message.swipes)) message.swipes[message.swipe_id ?? 0] = translated;
            await ctx.saveChat?.();
            this.onStatus('입력 번역 완료');
        } catch (error) {
            console.warn('[Tavern Toolkit] input translation', error);
            globalThis.toastr?.warning?.(`번역하지 못해 원래 문장을 그대로 보냈습니다. ${error.message || error}`, '입력 번역 실패');
        } finally { button?.classList.remove('ttk-tr-spin'); }
    }
}
