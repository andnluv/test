/** Shared home for the toolkit's composer buttons (input translation, ghostwriter).
 * Desktop: the buttons sit inline beside SillyTavern's own left buttons.
 * Mobile: SillyTavern stacks its left buttons vertically, so ours form one labelled strip above the
 * input box instead (the same place the Quick Reply bar uses) and the box keeps its height. */
const ID = 'ttk_composer_tools';
const narrow = window.matchMedia('(max-width: 1000px)');
let watching = false;
function place(bar) {
    const form = document.getElementById('send_form'), left = document.getElementById('leftSendForm');
    if (narrow.matches || !left) form?.prepend(bar); else left.append(bar);
}
export function addComposerButton({ id, icon, label, title, order = 0, onClick }) {
    const form = document.getElementById('send_form');
    if (!form) return null;
    let bar = document.getElementById(ID);
    if (!bar) { bar = document.createElement('div'); bar.id = ID; place(bar); if (!watching) { watching = true; narrow.addEventListener('change', () => { const b = document.getElementById(ID); if (b) place(b); }); } }
    let b = document.getElementById(id);
    if (!b) {
        b = document.createElement('div');
        b.id = id; b.className = `fa-solid ${icon} interactable`; b.tabIndex = 0; b.setAttribute('role', 'button');
        b.addEventListener('click', () => onClick());
        b.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } });
        b.style.order = String(10 + order); // after SillyTavern's own left buttons
        bar.append(b);
    }
    b.dataset.label = label; b.title = title; b.setAttribute('aria-label', title);
    return b;
}
export function removeComposerButton(id) {
    document.getElementById(id)?.remove();
    const bar = document.getElementById(ID);
    if (bar && !bar.children.length) bar.remove();
}
