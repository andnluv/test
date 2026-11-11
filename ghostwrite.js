/** Tavern Toolkit — ghostwriter (유저 인풋 대필).
 *
 * Writes the user's next message with the CURRENT RP connection and preset, using the whole
 * chat as context. Whatever is already typed in the input box is treated as a direction to
 * expand. The result is placed in the input box for review — it is never sent automatically.
 */
import { KOREAN_STYLE } from './translation.js';
import { addComposerButton, removeComposerButton } from './composer.js';

export const DEFAULT_GHOSTWRITE = Object.freeze({ length: 'medium', language: 'ko', instruction: '' });
export const LENGTHS = Object.freeze({
    short: { label: '짧게', desc: '한두 문장', prompt: 'Very short: one or two sentences in a single paragraph.' },
    medium: { label: '보통', desc: '한두 문단', prompt: 'One or two short paragraphs (roughly 3–6 sentences in total).' },
    long: { label: '길게', desc: '서너 문단', prompt: 'Three or four paragraphs with action, speech and inner thoughts.' },
});
export function normalizeGhostwrite(raw = {}) {
    const r = raw && typeof raw === 'object' ? raw : {};
    return {
        length: Object.hasOwn(LENGTHS, r.length) ? r.length : DEFAULT_GHOSTWRITE.length,
        language: r.language === 'chat' ? 'chat' : 'ko',
        instruction: typeof r.instruction === 'string' ? r.instruction.slice(0, 1000) : '',
    };
}
export function buildPrompt(settings, draft) {
    const lines = [
        '[Pause the role-play for this one reply. Do NOT write as {{char}}, as any other character, or as the narrator. Act as the ghostwriter of {{user}} and write {{user}}\'s next message in the scene.]',
        '- Write only what {{user}} says, does, thinks and perceives. Never decide or describe the words, actions, thoughts or feelings of {{char}} or anyone else beyond what {{user}} can observe.',
        '- Stay true to {{user}}\'s persona, personality, way of speaking and speech level toward each character, and to everything that has happened so far.',
        '- React to the latest message and move the scene forward by one small step, then stop where {{char}} can naturally respond. Do not resolve the scene or skip time.',
        '- Match the narrative person, tense and formatting of {{user}}\'s earlier messages (how speech and narration are marked). If {{user}} has no earlier messages, follow the format of the story so far.',
        `- Length: ${LENGTHS[settings.length].prompt}`,
    ];
    if (settings.language === 'ko') lines.push('- Language: write in Korean (한국어), whatever language the rest of the chat is in.', '', KOREAN_STYLE, '');
    else lines.push('- Language: the language {{user}}\'s earlier messages are written in (or the story\'s language if there are none).');
    if (settings.instruction.trim()) lines.push(`- Standing style request from the user: ${settings.instruction.trim()}`);
    if (draft.trim()) lines.push('- The user gave this direction for the message. Follow it faithfully: keep its intent, every stated action and any quoted lines, and expand it into a finished message. It may be notes rather than prose:', `"""\n${draft.trim()}\n"""`);
    else lines.push('- The user gave no direction: choose the response that fits {{user}} best.');
    lines.push('- Output ONLY the message text: no name prefix, no commentary, no quotation marks around the whole message.');
    return lines.join('\n');
}
export function cleanResult(raw, userName = '') {
    let v = String(raw ?? '');
    v = v.replace(/<(think|thinking|reasoning)>[\s\S]*?<\/\1>/gi, '').trim();
    if (userName) { const esc = userName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); v = v.replace(new RegExp(`^\\s*${esc}\\s*[:：]\\s*`), ''); }
    v = v.replace(/^```[a-z]*\n([\s\S]*?)\n```$/i, '$1').trim();
    return v;
}

const IDLE_TITLE = '대필 · 입력창에 적은 내용을 방향 삼아 내 다음 메시지를 씁니다 (비워 두면 알아서 씁니다)';
export class Ghostwriter {
    constructor({ getSettings } = {}) { this.getSettings = getSettings; this.enabled = false; this.busy = false; this.last = null; this.onInput = this.onInput.bind(this); }
    ctx() { return window.SillyTavern?.getContext?.(); }
    area() { return document.getElementById('send_textarea'); }
    start() {
        if (this.enabled) return;
        this.enabled = true;
        this.button = addComposerButton({ id: 'ttk_ghostwrite', icon: 'fa-feather-pointed', label: '대필', title: IDLE_TITLE, order: 1, onClick: () => this.run() });
        this.undoButton = addComposerButton({ id: 'ttk_ghostwrite_undo', icon: 'fa-rotate-left', label: '되돌리기', title: '대필 되돌리기 · 대필 전 입력으로 돌아갑니다', order: 2, onClick: () => this.undo() });
        if (!this.button || !this.undoButton) { this.enabled = false; return; }
        this.undoButton.hidden = true;
        this.area()?.addEventListener('input', this.onInput);
    }
    stop() {
        if (!this.enabled) return;
        this.enabled = false;
        this.area()?.removeEventListener('input', this.onInput);
        removeComposerButton('ttk_ghostwrite'); removeComposerButton('ttk_ghostwrite_undo'); this.button = this.undoButton = null; this.last = null;
    }
    /** The undo offer lasts until the box is emptied (sent). Editing the result keeps it available. */
    onInput() { if (this.last && !this.area()?.value) this.forget(); }
    forget() { this.last = null; if (this.undoButton) this.undoButton.hidden = true; }
    setText(text) {
        const area = this.area(); if (!area) return;
        area.focus(); area.select();
        // insertText keeps the browser's own undo history (Ctrl+Z) where it is supported.
        let done = false; try { done = document.execCommand('insertText', false, text) && area.value === text; } catch { done = false; }
        if (!done) { area.value = text; area.dispatchEvent(new Event('input', { bubbles: true })); }
    }
    undo() { if (!this.last) return; const { draft } = this.last; this.last = null; this.setText(draft); if (!draft) this.area().value = ''; this.forget(); this.area()?.dispatchEvent(new Event('input', { bubbles: true })); }
    async run() {
        const ctx = this.ctx(), area = this.area();
        if (!this.enabled || !ctx || !area) return;
        if (this.busy) { ctx.stopGeneration?.(); return; }
        if (ctx.characterId === undefined && !ctx.groupId) { globalThis.toastr?.info?.('채팅을 연 뒤에 사용할 수 있습니다.', '대필'); return; }
        const stop = document.getElementById('mes_stop');
        if (stop && stop.checkVisibility?.()) { globalThis.toastr?.info?.('응답 생성이 끝난 뒤에 사용하세요.', '대필'); return; }
        if (typeof ctx.generateQuietPrompt !== 'function') { globalThis.toastr?.error?.('이 SillyTavern 버전에서는 대필을 사용할 수 없습니다.', '대필'); return; }
        // Pressing again right after a result rewrites from the same direction, not from the result.
        const draft = this.last && area.value === this.last.result ? this.last.draft : area.value;
        const prompt = buildPrompt(this.getSettings(), draft);
        this.busy = true; this.button.classList.add('ttk-tr-spin'); this.button.title = '대필 중 · 누르면 중단'; this.button.dataset.label = '중단';
        try {
            const raw = await ctx.generateQuietPrompt({ quietPrompt: ctx.substituteParams ? ctx.substituteParams(prompt) : prompt, quietToLoud: false, skipWIAN: false, removeReasoning: true });
            const result = cleanResult(raw, ctx.name1);
            if (!result) throw Error('빈 응답을 받았습니다. 다시 시도하거나 RP 연결의 응답 길이를 늘려 보세요.');
            if (!this.enabled) return;
            if (area.value !== draft && !(this.last && area.value === this.last.result)) { globalThis.toastr?.info?.('대필하는 동안 입력이 바뀌어 결과를 넣지 않았습니다.', '대필'); return; }
            this.setText(result);
            this.last = { draft, result };
            this.undoButton.hidden = false;
        } catch (error) {
            if (error?.name !== 'AbortError' && !/abort|cancel|stopp/i.test(String(error?.message || error))) { console.warn('[Tavern Toolkit] ghostwrite', error); globalThis.toastr?.error?.(String(error?.message || error), '대필 실패'); }
        } finally {
            this.busy = false;
            if (this.button) { this.button.classList.remove('ttk-tr-spin'); this.button.title = IDLE_TITLE; this.button.dataset.label = '대필'; }
        }
    }
}
