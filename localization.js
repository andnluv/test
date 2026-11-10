/** UI-only localization of SillyTavern native reasoning summary. */
export const DEFAULT_LOCALIZATION = Object.freeze({reasoningLabel:'사유',showReasoningTime:true});
const SELECTOR = '#chat .mes_reasoning_details .mes_reasoning_header_title';

export function normalizeLocalization(value = {}) {
    const label = typeof value?.reasoningLabel === 'string' ? value.reasoningLabel.trim().slice(0, 30) : '';
    return {reasoningLabel: label || DEFAULT_LOCALIZATION.reasoningLabel,
        showReasoningTime: typeof value?.showReasoningTime === 'boolean' ? value.showReasoningTime : true};
}
export function formatReasoningDuration(seconds) {
    const n = Number(seconds);
    if (!Number.isFinite(n) || n <= 0) return '';
    if (n < 60) return `${Math.max(1, Math.round(n))}초`;
    if (n < 3600) return `${Math.max(1, Math.round(n / 60))}분`;
    const hours = Math.floor(n / 3600);
    const minutes = Math.round((n % 3600) / 60);
    return minutes ? `${hours}시간 ${minutes}분` : `${hours}시간`;
}
export function getReasoningTitle(raw, seconds, config) {
    const original = String(raw || '').trim();
    const label = config.reasoningLabel;
    if (/^(Thinking|생각 중|사유 중|추론 중)/i.test(original)) return `${label} 중...`;
    if (!config.showReasoningTime) return label;
    // The canonical data-duration (seconds) is set by native SillyTavern.
    const duration = formatReasoningDuration(seconds);
    if (duration) return `${label} · ${duration}`;
    // Preserve localized humanized durations for unknown/older markup when available.
    const timeMatch = original.match(/(?:Thought for|사유\s*[·:]?|생각한 시간\s*:?)\s*(\d+\s*(?:초|분|시간|seconds?|minutes?|hours?))/i);
    return timeMatch ? `${label} · ${timeMatch[1]}` : label;
}
let observer = null;
let active = false;
const originals = new WeakMap();
const tracked = new Set();
let config = normalizeLocalization();
function updateNode(node) {
    if (!node.isConnected) return;
    const isOwn = node.textContent === node.dataset.ttkLocalizedTitle;
    if (!originals.has(node)) { originals.set(node, node.textContent); tracked.add(node); }
    else if (!isOwn && node.textContent !== originals.get(node)) originals.set(node, node.textContent);
    const title = getReasoningTitle(originals.get(node), node.dataset.duration ?? node.closest('.mes_reasoning_details')?.dataset.duration, config);
    if (node.textContent !== title) node.textContent = title;
    node.dataset.ttkLocalizedTitle = title;
}
function scan(root=document) {
    // Messages are discarded on every chat switch; forget their title nodes instead of holding them forever.
    if (tracked.size > 400) for (const node of tracked) if (!node.isConnected) tracked.delete(node);
    if (root.nodeType === 1 && root.matches?.(SELECTOR)) updateNode(root);
    root.querySelectorAll?.(SELECTOR).forEach(updateNode);
}
export function startReasoningLocalization(options = {}) {
    config = normalizeLocalization(options);
    if (active) {scan();return;}
    active = true;
    scan();
    const chat = document.querySelector('#chat');
    if (!chat) { active=false; return; }
    observer = new MutationObserver(records => {
        for (const record of records) {
            if (record.type === 'attributes') {scan(record.target);continue;}
            const parent = record.target.nodeType === 3 ? record.target.parentElement : record.target;
            if (parent?.closest?.(SELECTOR)) updateNode(parent.closest(SELECTOR));
            for (const child of record.addedNodes) if(child.nodeType === 1) scan(child);
        }
    });
    observer.observe(chat,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['data-duration']});
}
export function stopReasoningLocalization() {
    observer?.disconnect();observer=null;active=false;
    for (const node of tracked) {
        if (node.isConnected && node.textContent === node.dataset.ttkLocalizedTitle) node.textContent = originals.get(node);
        delete node.dataset.ttkLocalizedTitle;
    }
    tracked.clear();
}
