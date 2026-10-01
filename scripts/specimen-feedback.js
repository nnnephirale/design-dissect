// design-dissect specimen: feedback.json entries as Google Slides-style comment cards, anchored to a
// section with a faint ] bracket (card at 50% until the bracket, card or highlight is hovered).
// Interactive: tick to resolve/reopen · select text + ⌘⇧M (or ⌥⌘M, or the floating + button) to
// comment on it · ⋮ → Edit / Delete (with undo). Every change syncs to feedback.json through the
// design-feedback service (feedback/server.mjs, on :4777), whether the page is served or opened
// from Finder. If the service is down, changes wait in this browser and sync on the next visit.
(() => {
  const DATA = document.getElementById('feedback');
  const ME = DATA.dataset.me || 'You';
  const KEY = 'dd-feedback:' + location.pathname;
  // Local wall time to the second (when() parses stamps as local time).
  const now = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 19); };
  const stamp = (f) => f.updated || f.date || '';

  // Entries baked in at build time, overlaid with anything changed in this browser and not yet
  // synced (per id, newest wins). sync() then replaces both with what is on disk.
  let FB = JSON.parse(DATA.textContent);
  const overlay = () => {
    try {
      const local = JSON.parse(localStorage.getItem(KEY) || '[]');
      const byId = new Map(FB.map((f) => [f.id, f]));
      for (const l of local) { const f = byId.get(l.id); if (!f || stamp(l) > stamp(f)) byId.set(l.id, l); }
      FB = [...byId.values()];
    } catch {}
  };
  overlay();

  const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const hue = (n) => { let h = 0; for (const c of n) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
  const av = (n) => n === 'Claude' ? '<div class="av" style="background:#d97757">C</div>' : `<div class="av" style="background:hsl(${hue(n)} 45% 42%)">${esc((n[0] || '?').toUpperCase())}</div>`;
  const when = (d) => { if (!d) return ''; const t = new Date(d); if (isNaN(t)) return esc(d); const day = t.toDateString() === new Date().toDateString() ? 'Today' : t.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); return (d.length > 10 ? t.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) + ' ' : '') + day; };
  const mention = (t) => esc(t).replace(/(@[\w.@-]+)/g, '<span class="m">$1</span>');
  const LAYER = { reference: 'Reference · DESIGN.md', project: 'Project · DESIGN-NOTES.md', lasting: 'Lasting · taste file', candidate: 'Candidate · taste file' };
  const I = {
    tick: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4.5 12.5l5 5L19.5 7"/></svg>',
    more: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5.5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="18.5" r="1.7"/></svg>',
  };

  // ---------- anchors ----------
  const hostOf = (a) => {
    if (a && a.startsWith('label:')) return [...document.querySelectorAll('.comp > [data-label]')].find((e) => e.dataset.label.toLowerCase().includes(a.slice(6).toLowerCase()));
    return document.getElementById('s-' + a) || document.getElementById('s-source') || document.querySelector('section.sp');
  };
  const anchorOf = (node) => {
    const el = node.nodeType === 1 ? node : node.parentElement;
    const block = el.closest('.comp > [data-label]');
    if (block) return 'label:' + block.dataset.label.slice(0, 40);
    const sec = el.closest('section.sp[id^="s-"]');
    return sec ? sec.id.slice(2) : 'source';
  };

  // ---------- highlight quoted text (first match inside the host, single text node) ----------
  const unmark = () => document.querySelectorAll('mark.fb-q').forEach((m) => m.replaceWith(...m.childNodes));
  const mark = (host, f) => {
    if (!f.quote || f.deleted) return;
    const w = document.createTreeWalker(host, NodeFilter.SHOW_TEXT, { acceptNode: (n) => n.parentElement.closest('.fb-stack, script, style') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
    while (w.nextNode()) {
      // Case-insensitive: selections of CSS-uppercased text come back uppercased.
      const n = w.currentNode, i = n.textContent.toLowerCase().indexOf(f.quote.toLowerCase());
      if (i < 0) continue;
      const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + f.quote.length);
      const m = document.createElement('mark'); m.className = 'fb-q' + (f.status === 'resolved' ? ' done' : ''); m.dataset.id = f.id;
      r.surroundContents(m);
      return;
    }
  };

  // ---------- render ----------
  let editing = null;
  const render = () => {
    unmark();
    document.querySelectorAll('.fb-br, .fb-stack').forEach((e) => e.remove());
    document.querySelectorAll('.fb-host').forEach((e) => e.classList.remove('fb-host', 'fb-on'));
    // Resolved and deleted comments leave the page; they stay in feedback.json as the record.
    const live = FB.filter((f) => !f.deleted && f.status !== 'resolved');
    document.querySelector('.wrap').classList.toggle('notes', live.length > 0);
    for (const f of live) {
      const host = hostOf(f.anchor);
      if (!host) continue;
      mark(host, f);
      host.classList.add('fb-host');
      let stack = host.querySelector(':scope > .fb-stack');
      if (!stack) {
        const br = document.createElement('div'); br.className = 'fb-br'; host.append(br);
        stack = document.createElement('div'); stack.className = 'fb-stack'; stack.innerHTML = '<div class="fb-in"></div>'; host.append(stack);
        const on = () => host.classList.add('fb-on'), off = () => host.classList.remove('fb-on');
        for (const el of [br, stack]) { el.addEventListener('mouseenter', on); el.addEventListener('mouseleave', off); }
      }
      stack.firstElementChild.append(card(f));
    }
    document.querySelectorAll('mark.fb-q').forEach((m) => {
      const host = m.closest('.fb-host'); if (!host) return;
      m.addEventListener('mouseenter', () => host.classList.add('fb-on')); m.addEventListener('mouseleave', () => host.classList.remove('fb-on'));
    });
    if (editing) {
      const ta = document.querySelector(`.gc[data-id="${editing.id}"] textarea`);
      if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); grow(ta); ta.closest('.gc').scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
    }
  };
  const editor = (val, label) => `<textarea rows="2" placeholder="Comment or add others with @">${esc(val)}</textarea><div class="ed"><button class="gb t" data-a="cancel">Cancel</button><button class="gb p" data-a="save">${label}</button></div>`;
  const card = (f) => {
    const done = f.status === 'resolved';
    const el = document.createElement('div');
    el.className = 'gc' + (done ? ' is-done' : ''); el.dataset.id = f.id;
    const edMain = editing && editing.id === f.id && editing.part === 'main';
    const edReply = editing && editing.id === f.id && editing.part === 'reply';
    el.innerHTML = `<div class="hd">${av(f.author || ME)}<div class="who"><b>${esc(f.author || ME)}</b><span>${when(f.date)}${f.updated && f.updated !== f.date ? ' · edited' : ''}</span></div>
        ${f.draft ? '' : `<button class="ic" data-a="resolve" title="Mark as resolved and hide">${I.tick}</button><button class="ic k" data-a="menu" data-part="main" title="More options">${I.more}</button>`}</div>
      ${f.quote ? `<div class="qt">${esc(f.quote)}</div>` : ''}
      ${edMain || f.draft ? editor(f.text, f.draft ? 'Comment' : 'Save') : `<p class="tx">${mention(f.text)}</p>`}
      ${f.reply ? `<div class="rp"><div class="hd">${av(f.reply.author || 'Claude')}<div class="who"><b>${esc(f.reply.author || 'Claude')}</b><span>${when(f.reply.date)}</span></div><button class="ic k" data-a="menu" data-part="reply" title="More options">${I.more}</button></div>${edReply ? editor(f.reply.text, 'Save') : `<p class="tx">${mention(f.reply.text)}</p>`}</div>` : ''}
      ${f.draft ? '' : `<div class="ft">${f.layer ? `Routed to ${esc(LAYER[f.layer] || f.layer)}` : 'Open · not yet routed'}${f.target ? ` › ${esc(f.target)}` : ''}${done ? ' · resolved' : ''}</div>`}`;
    return el;
  };
  const grow = (ta) => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; };

  // ---------- actions ----------
  const byId = (id) => FB.find((f) => f.id === id);
  const upsert = (e) => { const i = FB.findIndex((f) => f.id === e.id); if (i < 0) FB.push(e); else FB[i] = e; };
  const touch = (f) => { f.updated = now(); };
  let undoFn = null;
  document.addEventListener('input', (e) => { if (e.target.matches('.gc textarea')) grow(e.target); });
  document.addEventListener('click', (e) => {
    const menu = document.querySelector('.gm');
    if (menu && !e.target.closest('.gm')) menu.remove();
    const b = e.target.closest('.gc [data-a], .gm [data-a]');
    if (!b) return;
    const id = b.closest('[data-id]').dataset.id, f = byId(id), a = b.dataset.a;
    // Undo looks the entry up again: a sync in between replaces the objects.
    if (a === 'resolve') { f.status = 'resolved'; touch(f); undoFn = () => { const g = byId(id); if (g) { g.status = 'open'; touch(g); } }; save('Resolved', true); render(); }
    if (a === 'menu') {
      const m = document.createElement('div'); m.className = 'gm'; m.dataset.id = id;
      m.innerHTML = `<button data-a="edit" data-part="${b.dataset.part}">Edit</button>${b.dataset.part === 'main' ? '<button data-a="delete">Delete</button>' : ''}`;
      b.closest('.gc').append(m);
      const r = b.getBoundingClientRect(), cr = b.closest('.gc').getBoundingClientRect();
      m.style.top = r.bottom - cr.top + 4 + 'px'; m.style.right = cr.right - r.right + 'px';
      e.stopPropagation();
    }
    if (a === 'edit') { editing = { id, part: b.dataset.part }; render(); }
    if (a === 'delete') { const { deleted, ...snap } = f; f.deleted = true; touch(f); undoFn = () => upsert({ ...snap, updated: now() }); save('Comment deleted', true); render(); }
    if (a === 'cancel') { if (f.draft) FB = FB.filter((x) => x !== f); editing = null; render(); }
    if (a === 'save') commit(b.closest('.gc').querySelector('textarea'), f);
  });
  document.addEventListener('keydown', (e) => {
    if (e.target.matches('.gc textarea')) {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); commit(e.target, byId(e.target.closest('.gc').dataset.id)); }
      if (e.key === 'Escape') e.target.closest('.gc').querySelector('[data-a="cancel"]').click();
      return;
    }
    // ⌘⇧M (as asked) or ⌥⌘M (Google Docs); Ctrl on Windows/Linux.
    if ((e.metaKey || e.ctrlKey) && e.code === 'KeyM' && (e.shiftKey || e.altKey)) { if (startFromSelection()) e.preventDefault(); }
  }, true);
  const commit = (ta, f) => {
    const text = ta.value.trim();
    if (!text) { ta.focus(); return; }
    if (editing?.part === 'reply') f.reply.text = text;
    else { f.text = text; if (f.draft) { delete f.draft; f.status = 'open'; } }
    touch(f); editing = null; save('Saved'); render();
  };

  // ---------- new comment from a selection ----------
  const plus = document.createElement('button'); plus.className = 'fb-plus'; plus.title = 'Add comment (⌘⇧M)';
  plus.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v10a1.5 1.5 0 0 1-1.5 1.5H9l-5 4z"/><path d="M12 7.5v6M9 10.5h6"/></svg>';
  document.body.append(plus);
  const selInfo = () => {
    const s = getSelection();
    if (!s || s.isCollapsed || !s.rangeCount) return null;
    const r = s.getRangeAt(0), node = r.commonAncestorContainer;
    const el = node.nodeType === 1 ? node : node.parentElement;
    if (!el.closest('.wrap') || el.closest('.fb-stack')) return null;
    const quote = s.toString().replace(/\s+/g, ' ').trim().slice(0, 160);
    return quote ? { quote, node, rect: r.getBoundingClientRect() } : null;
  };
  document.addEventListener('selectionchange', () => {
    const s = selInfo();
    if (!s) { plus.classList.remove('on'); return; }
    plus.style.top = s.rect.top + scrollY - 6 + 'px'; plus.style.left = Math.min(s.rect.right + scrollX + 8, innerWidth - 44) + 'px';
    plus.classList.add('on');
  });
  plus.addEventListener('mousedown', (e) => { e.preventDefault(); startFromSelection(); });
  const startFromSelection = () => {
    const s = selInfo(); if (!s) return false;
    FB = FB.filter((f) => !f.draft);
    const f = { id: 'c-' + Date.now().toString(36), anchor: anchorOf(s.node), quote: s.quote, author: ME, date: now(), text: '', status: 'open', draft: true };
    FB.push(f); editing = { id: f.id, part: 'main' };
    getSelection().removeAllRanges(); plus.classList.remove('on');
    render(); return true;
  };

  // ---------- persistence ----------
  const pill = document.createElement('div'); pill.className = 'fb-pill'; document.body.append(pill);
  let pillT;
  const toast = (html) => { pill.innerHTML = html; pill.classList.add('on'); clearTimeout(pillT); pillT = setTimeout(() => pill.classList.remove('on'), 3600); };
  pill.addEventListener('click', (e) => {
    if (e.target.dataset.a === 'undo' && undoFn) { const fn = undoFn; undoFn = null; fn(); save('Restored'); render(); }
    if (e.target.dataset.a === 'dl') { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(clean(), null, 2)], { type: 'application/json' })); a.download = 'feedback.json'; a.click(); }
  });
  const clean = () => FB.filter((f) => !f.draft && !f.deleted).map(({ draft, deleted, ...f }) => f);
  const SERVICE = 'http://localhost:4777/__feedback';
  // Sends this page's entries (deletes as tombstones); the service merges them into feedback.json
  // and answers with the merged list, which becomes the page's state (drafts are kept).
  const sync = async () => {
    const fromDisk = location.protocol === 'file:';
    const r = await fetch(fromDisk ? SERVICE : '__feedback', { method: 'POST', headers: { 'content-type': 'text/plain' },
      body: JSON.stringify({ file: fromDisk ? decodeURIComponent(location.pathname) : undefined, entries: FB.filter((f) => !f.draft) }) });
    const live = r.ok ? await r.json() : null;
    if (!Array.isArray(live)) throw new Error('not saved');
    FB = [...live, ...FB.filter((f) => f.draft)];
    try { localStorage.removeItem(KEY); } catch {}
  };
  const save = async (msg, undo) => {
    try { localStorage.setItem(KEY, JSON.stringify(FB.filter((f) => !f.draft))); } catch {}
    const extra = undo ? ' · <u data-a="undo">Undo</u>' : '';
    try { await sync(); render(); return toast(`${msg} to feedback.json${extra}`); } catch {}
    toast(`${msg} in this browser · feedback service offline, syncs on next visit · <u data-a="dl">Download</u>${extra}`);
  };

  render();
  // Pull in anything changed elsewhere (an agent resolving comments) on load and on return to the tab.
  const refresh = () => { if (!editing) sync().then(render).catch(() => {}); };
  refresh();
  addEventListener('focus', refresh);
})();
