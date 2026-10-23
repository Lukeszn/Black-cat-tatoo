/* Black Cat Tattoo Studio — site script (home + policy pages).
   No trackers, no cookies, no third-party scripts. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Year ---------- */
  $$('[data-year]').forEach(el => { el.textContent = String(new Date().getFullYear()); });

  /* ---------- Nav ---------- */
  const nav = $('#nav');
  if (nav && !nav.classList.contains('solid')) {
    const onScroll = () => nav.classList.toggle('scrolled', scrollY > 30);
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }
  const burger = $('#burger'), links = $('#navLinks'), backdrop = $('#navBackdrop');
  if (burger && links) {
    const setMenu = open => {
      links.classList.toggle('open', open);
      backdrop && backdrop.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', String(open));
      document.documentElement.classList.toggle('lock', open);
      if (open) links.querySelector('a')?.focus({ preventScroll: true });
    };
    burger.addEventListener('click', () => setMenu(!links.classList.contains('open')));
    links.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
    backdrop && backdrop.addEventListener('click', () => setMenu(false));
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && links.classList.contains('open')) { setMenu(false); burger.focus(); }
    });
    matchMedia('(min-width: 901px)').addEventListener('change', e => { if (e.matches) setMenu(false); });
  }

  /* ---------- Gallery filters ---------- */
  const gallery = $('#gallery');
  const filters = $$('.filter');
  filters.forEach(btn => btn.addEventListener('click', () => {
    const f = btn.dataset.filter;
    filters.forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
    $$('li', gallery).forEach(li => {
      li.hidden = !(f === 'all' || li.dataset.tags.split(' ').includes(f));
    });
  }));

  /* ---------- Lightbox ---------- */
  const lb = $('#lightbox');
  if (lb && gallery && typeof lb.showModal === 'function') {
    const img = $('#lbImg'), title = $('#lbTitle'), meta = $('#lbMeta'), count = $('#lbCount');
    let items = [], idx = 0, opener = null;
    const visibleTiles = () => $$('li:not([hidden]) .tile', gallery);
    const render = () => {
      const t = items[idx];
      const thumb = t.querySelector('img');
      img.src = t.dataset.full;
      img.alt = thumb.alt;
      title.textContent = t.dataset.title;
      meta.textContent = t.dataset.style;
      count.textContent = `${idx + 1} of ${items.length}`;
    };
    const open = tile => {
      items = visibleTiles(); idx = Math.max(0, items.indexOf(tile)); opener = tile;
      render(); lb.showModal();
    };
    const step = d => { idx = (idx + d + items.length) % items.length; render(); };
    gallery.addEventListener('click', e => { const t = e.target.closest('.tile'); if (t) open(t); });
    $('#lbPrev').addEventListener('click', () => step(-1));
    $('#lbNext').addEventListener('click', () => step(1));
    $('#lbClose').addEventListener('click', () => lb.close());
    $('#lbBook').addEventListener('click', () => {
      const idea = $('#fIdea');
      if (idea && !idea.value) idea.value = `I'd like something in a similar style to "${items[idx].dataset.title}" from your gallery. `;
      lb.close();
    });
    lb.addEventListener('click', e => { if (e.target === lb) lb.close(); });
    lb.addEventListener('close', () => { img.removeAttribute('src'); opener?.focus({ preventScroll: true }); });
    lb.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
    });
    let x0 = null;
    const fig = $('#lbFigure');
    fig.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
    fig.addEventListener('touchend', e => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 45) step(dx < 0 ? 1 : -1);
    }, { passive: true });
  }

  /* ---------- Map: load Google only on request (no third-party cookies before consent) ---------- */
  const mapBtn = $('#mapLoad');
  if (mapBtn) mapBtn.addEventListener('click', () => {
    const f = document.createElement('iframe');
    f.src = 'https://www.google.com/maps?q=191+Union+Street,+Lurgan,+Craigavon+BT66+8EQ&output=embed';
    f.title = 'Google map showing Black Cat Tattoo Studio, 191 Union Street, Lurgan';
    f.loading = 'lazy';
    f.referrerPolicy = 'strict-origin-when-cross-origin';
    f.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox');
    $('#map').appendChild(f);
    $('#mapGate').remove();
  });

  /* ---------- Booking form ---------- */
  const form = $('#bookForm');
  if (!form) return;
  const MAX_BYTES = 5 * 1024 * 1024;
  const OK_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
  const OK_EXT = /\.(jpe?g|png|webp|heic|heif)$/i;
  const file = $('#fFiles'), zone = $('#uploadZone'), preview = $('#preview');
  const pImg = $('#previewImg'), pName = $('#previewName'), fileErr = $('#fFilesErr');
  const submitBtn = $('#submitBtn'), alertBox = $('#formError'), success = $('#formSuccess');
  const startedAt = Date.now();
  let objectUrl = null, lastSent = 0;

  const setErr = (input, bad) => { input.closest('.field').classList.toggle('invalid', bad); input.setAttribute('aria-invalid', String(bad)); return bad; };
  const clearFile = () => {
    file.value = '';
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = null; preview.classList.remove('show'); pImg.removeAttribute('src');
  };
  const acceptFile = f => {
    fileErr.textContent = ''; setErr(file, false);
    if (!f) return clearFile();
    const typeOk = OK_TYPES.includes(f.type) || (!f.type && OK_EXT.test(f.name));
    if (!typeOk) { clearFile(); fileErr.textContent = 'That file type isn\'t supported. Use a JPG, PNG, WebP or HEIC photo.'; setErr(file, true); return; }
    if (f.size > MAX_BYTES) { clearFile(); fileErr.textContent = 'That photo is over 5 MB. Try a smaller one or a screenshot of it.'; setErr(file, true); return; }
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = URL.createObjectURL(f);
    pImg.src = objectUrl; pName.textContent = f.name; preview.classList.add('show');
  };
  file.addEventListener('change', () => acceptFile(file.files[0]));
  $('#previewRemove').addEventListener('click', () => { clearFile(); file.focus(); });
  ['dragenter', 'dragover'].forEach(ev => zone.addEventListener(ev, e => { e.preventDefault(); zone.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach(ev => zone.addEventListener(ev, e => { e.preventDefault(); zone.classList.remove('drag'); }));
  zone.addEventListener('drop', e => {
    const f = e.dataTransfer.files[0]; if (!f) return;
    try { const dt = new DataTransfer(); dt.items.add(f); file.files = dt.files; } catch (_) { /* older browsers */ }
    acceptFile(f);
  });

  // Live-clear errors once the user fixes a field
  $$('input, textarea', form).forEach(el => el.addEventListener('input', () => {
    if (el.closest('.field')?.classList.contains('invalid') && el !== file) setErr(el, false);
  }));
  $('#fAge').addEventListener('change', e => setErr(e.target, false));

  const showAlert = html => { alertBox.innerHTML = html; alertBox.classList.add('show'); };
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const PHONE_RE = /^[+()\d\s-]{7,20}$/;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    alertBox.classList.remove('show');
    const v = id => $(id).value.trim();
    const checks = [
      [$('#fName'), !v('#fName')],
      [$('#fPhone'), !PHONE_RE.test(v('#fPhone'))],
      [$('#fEmail'), !EMAIL_RE.test(v('#fEmail'))],
      [$('#fIdea'), !v('#fIdea')],
      [$('#fAge'), !$('#fAge').checked],
    ];
    let first = null;
    checks.forEach(([el, bad]) => { setErr(el, bad); if (bad && !first) first = el; });
    if (first) { first.focus(); first.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' }); return; }

    // Basic bot checks: honeypot filled, or submitted impossibly fast
    if ($('#fHoney').value || Date.now() - startedAt < 3000) { form.hidden = true; success.hidden = false; return; }
    // Simple client-side throttle against double submits
    if (Date.now() - lastSent < 30000) { showAlert('You\'ve just sent an enquiry. Please wait a moment before sending another.'); return; }

    submitBtn.disabled = true; submitBtn.textContent = 'Sending…';
    form.querySelector('[name="_subject"]').value = 'Tattoo enquiry — ' + v('#fName').slice(0, 60);
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 30000);
      const res = await fetch(form.action.replace('formsubmit.co/', 'formsubmit.co/ajax/'), {
        method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(form),
        signal: ctrl.signal, credentials: 'omit', referrerPolicy: 'strict-origin-when-cross-origin',
      });
      clearTimeout(timer);
      const data = await res.json().catch(() => null);
      if (!res.ok || !data || String(data.success) !== 'true') throw new Error('not confirmed');
      lastSent = Date.now();
      form.hidden = true; success.hidden = false; success.focus();
    } catch (_) {
      showAlert('Your enquiry didn\'t send. Check your connection and try again, or email <a href="mailto:lukeszns@gmail.com">lukeszns@gmail.com</a>.');
    } finally {
      submitBtn.disabled = false; submitBtn.textContent = 'Send enquiry';
    }
  });

  $('#formReset').addEventListener('click', () => {
    form.reset(); clearFile(); $$('.field.invalid', form).forEach(f => f.classList.remove('invalid'));
    success.hidden = true; form.hidden = false; $('#fName').focus();
  });
})();
