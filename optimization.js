/** Tavern Toolkit — 모바일 최적화.
 *
 * Independent of every other module: it imports nothing from them and works with all of them off.
 * It only sets a marker on <html> (data-ttk-opt) that style.css keys its rules on, plus image
 * hints on chat messages. No SillyTavern setting is changed.
 */
export const DEFAULT_OPTIMIZATION = Object.freeze({ scope: 'mobile', effects: true, offscreen: true, motion: false, zoom: true });
export function normalizeOptimization(raw = {}) {
    const r = raw && typeof raw === 'object' ? raw : {};
    return {
        scope: r.scope === 'always' ? 'always' : 'mobile',
        effects: r.effects !== false,
        offscreen: r.offscreen !== false,
        motion: r.motion === true,
        zoom: r.zoom !== false,
    };
}
const FLAGS = ['effects', 'offscreen', 'motion', 'zoom'];

export class MobileOptimizer {
    constructor({ getSettings, onState } = {}) {
        this.getSettings = getSettings; this.onState = onState || (() => {}); this.enabled = false; this.observer = null;
        // SillyTavern's own mobile layout starts at 1000px; touch-first devices count as mobile at any width.
        this.media = window.matchMedia('(max-width: 1000px), (pointer: coarse)');
        this.onMedia = () => this.apply();
    }
    isMobile() { return this.media.matches; }
    active() { return this.enabled && (this.getSettings().scope === 'always' || this.isMobile()); }
    start() { if (!this.enabled) { this.enabled = true; this.media.addEventListener('change', this.onMedia); } this.apply(); }
    stop() {
        if (!this.enabled) return;
        this.enabled = false;
        this.media.removeEventListener('change', this.onMedia);
        this.apply();
    }
    apply() {
        const s = this.getSettings(), on = this.active();
        const flags = on ? FLAGS.filter(f => s[f]) : [];
        if (flags.length) document.documentElement.dataset.ttkOpt = flags.join(' '); else delete document.documentElement.dataset.ttkOpt;
        this.observer?.disconnect(); this.observer = null;
        const chat = document.getElementById('chat');
        if (flags.includes('offscreen') && chat) {
            this.mark(chat);
            // Direct children only: new messages. Streaming edits inside a message are not observed.
            this.observer = new MutationObserver(() => this.mark(chat));
            this.observer.observe(chat, { childList: true });
        } else if (chat) {
            for (const m of chat.querySelectorAll('.mes.ttk-cv')) { m.classList.remove('ttk-cv'); m.style.removeProperty('contain-intrinsic-size'); }
        }
        this.onState(this.state());
    }
    /** Skipping a message is only safe once its real height is known: an estimate makes the scroll
     *  position jump when the message is finally laid out. So every message is measured once, while it
     *  is still rendered normally, and only then marked as skippable with that height as its placeholder.
     *  The newest message is left alone until another one follows it (it may still be streaming). */
    mark(chat) {
        const fresh = [...chat.querySelectorAll(':scope > .mes:not(.ttk-cv):not(.last_mes)')];
        if (!fresh.length) return;
        // contain-intrinsic-size describes the content box, so padding is taken off the measured height.
        const heights = fresh.map(m => { const cs = getComputedStyle(m); return Math.max(0, m.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)); });
        fresh.forEach((m, i) => {
            if (!heights[i]) return;
            m.style.setProperty('contain-intrinsic-size', `auto ${heights[i]}px`);
            m.classList.add('ttk-cv');
            m.querySelectorAll('img:not([decoding])').forEach(img => { img.decoding = 'async'; });
        });
    }
    state() {
        const s = this.getSettings();
        return { enabled: this.enabled, active: this.active(), mobile: this.isMobile(), scope: s.scope, messages: document.querySelectorAll('#chat .mes').length, flags: this.active() ? FLAGS.filter(f => s[f]) : [] };
    }
}
