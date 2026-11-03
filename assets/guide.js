/* HOBIzone guide — scaling, comments, presenter */
(function () {
  var C = window.GUIDE_CONFIG || {};
  var page = document.body.dataset;

  // ---------- light copy protection (turn off in config.js when released) ----------
  if (C.protect) {
    document.documentElement.classList.add('protect');
    document.addEventListener('contextmenu', function (e) { if (e.target.closest('.s')) e.preventDefault(); });
    document.addEventListener('dragstart', function (e) { if (e.target.closest('.s')) e.preventDefault(); });
  }

  // ---------- scale every 1600×900 slide inside a .frame ----------
  function fitFrames() {
    document.querySelectorAll('.frame').forEach(function (f) {
      var s = f.querySelector('.s'); if (!s) return;
      s.style.transform = 'scale(' + (f.clientWidth / 1600) + ')';
    });
  }
  window.addEventListener('resize', fitFrames);
  document.fonts && document.fonts.ready.then(fitFrames);
  fitFrames();

  // ---------- version badge -> version history (changelog.html at the site root) ----------
  var gs = document.querySelector('script[src$="assets/guide.js"]');
  if (gs) { var root = gs.getAttribute('src').replace(/assets\/guide\.js$/, '');
    document.querySelectorAll('a[data-ver]').forEach(function (a) { a.href = root + 'changelog.html'; }); }

  // ---------- comments ----------
  // Sends straight from the page (Web3Forms, key in config.js). Offline: queued in this browser and sent later.
  // No key set: falls back to the visitor's email app (mailto).
  var modal = document.getElementById('comment');
  var ctxEl = modal && modal.querySelector('.ctx');
  var jalka = document.body.classList.contains('jalka');
  var current = { slide: null, quote: '' };
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function where() {
    var t = page.talk ? page.talk : (document.title || 'Guide');
    return t + (current.slide ? (page.lang === 'et' ? ' · slaid ' : ' · slide ') + current.slide : '');
  }
  function openComment(slideNo, quote) {
    if (!modal) return;
    current.slide = slideNo || null; current.quote = quote || '';
    ctxEl.textContent = where();
    var qb = modal.querySelector('.quote');
    qb.hidden = !current.quote; qb.querySelector('q').textContent = current.quote;
    modal.querySelector('#ce').value = store('hz_email') || '';
    modal.querySelector('#cn').value = store('hz_name') || '';
    modal.classList.remove('sent'); modal.classList.add('open'); document.body.classList.add('commenting');
    setTimeout(function () { modal.querySelector('textarea').focus(); }, 60);
  }
  function closeComment() { if (modal) { modal.classList.remove('open'); document.body.classList.remove('commenting'); } }
  window.openComment = openComment;

  var KEY = (jalka && C.commentKeyJalka) || C.commentKey || '';
  function post(msg) {
    return fetch('https://api.web3forms.com/submit', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(msg) })
      .then(function (r) { return r.json(); }).then(function (d) { if (!d.success) throw new Error(d.message || 'failed'); return d; });
  }
  function queue() { try { return JSON.parse(store('hz_queue') || '[]'); } catch (e) { return []; } }
  function flush() {
    var q = queue(); if (!q.length || !KEY || !navigator.onLine) return;
    store('hz_queue', '[]');
    q.forEach(function (m) { post(m).catch(function () { var r = queue(); r.push(m); store('hz_queue', JSON.stringify(r)); }); });
  }
  if (modal) {
    flush(); window.addEventListener('online', flush);
    modal.addEventListener('click', function (e) { if (e.target === modal || e.target.closest('[data-close]')) closeComment(); });
    modal.querySelector('textarea').addEventListener('keydown', function (e) { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) modal.querySelector('form').requestSubmit(); });
    modal.querySelector('form').addEventListener('submit', function (e) {
      e.preventDefault();
      if (modal.querySelector('.hp').checked) return;
      var txt = modal.querySelector('textarea').value.trim(); if (!txt) return;
      var email = modal.querySelector('#ce').value.trim(), name = modal.querySelector('#cn').value.trim();
      store('hz_email', email); store('hz_name', name);
      var w = where(), brand = jalka ? 'Droonijalka' : 'HOBIzone';
      var msg = { access_key: KEY, subject: '[' + brand + ' juhend] ' + w, from_name: name || (email || 'anonymous'),
        replyto: email || undefined, email: email || undefined, where: w, language: page.lang || 'en',
        quote: current.quote || undefined, comment: txt, file: location.pathname.split('/').slice(-3).join('/') };
      var dm = modal.querySelector('.dm'), thx = dm.dataset.base || (dm.dataset.base = dm.textContent);
      function done(t) { dm.textContent = t; modal.classList.add('sent'); modal.querySelector('textarea').value = ''; }
      var okTxt = email ? modal.dataset.thxe.replace('{email}', email) : thx;
      if (!KEY) {
        var b = txt + (current.quote ? '\n\n> ' + current.quote : '') + '\n\n' + (name || '') + (email ? ' <' + email + '>' : '') + '\n' + w;
        location.href = 'mailto:' + (C.commentEmail || '') + '?subject=' + encodeURIComponent(msg.subject) + '&body=' + encodeURIComponent(b);
        return done(modal.dataset.mail);
      }
      var btn = modal.querySelector('.btn.pri'); btn.disabled = true;
      post(msg).then(function () { done(okTxt); })
        .catch(function () { var q = queue(); q.push(msg); store('hz_queue', JSON.stringify(q)); done(modal.dataset.off); })
        .then(function () { btn.disabled = false; });
    });
  }
  document.querySelectorAll('[data-comment]').forEach(function (b) {
    b.addEventListener('click', function () { openComment(b.dataset.comment ? +b.dataset.comment : (window.curSlide ? window.curSlide() : null)); });
  });

  // mark text in an article -> a small "Comment" button appears next to it
  if (modal && !document.body.classList.contains('present')) {
    var pill = document.createElement('button'); pill.className = 'selpill'; pill.type = 'button';
    pill.innerHTML = '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"><path d="M5 7h22v14H14l-6 5v-5H5z"/></svg>' + modal.dataset.sel;
    document.body.appendChild(pill);
    var selTxt = '', selSlide = null;
    function hidePill() { pill.classList.remove('on'); }
    document.addEventListener('selectionchange', function () {
      var sel = window.getSelection(), t = sel ? sel.toString().trim() : '';
      if (!t || t.length < 3 || modal.classList.contains('open')) return hidePill();
      var node = sel.anchorNode && (sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement);
      if (!node || !node.closest('.article, .talk-head, main')) return hidePill();
      var fig = node.closest('.fig'); var cb = fig && fig.querySelector('[data-comment]');
      selSlide = cb ? +cb.dataset.comment : null; selTxt = t.length > 400 ? t.slice(0, 400) + '…' : t;
      var r = sel.getRangeAt(0).getBoundingClientRect();
      pill.style.top = (window.scrollY + r.top - 46) + 'px';
      pill.style.left = Math.max(8, Math.min(window.innerWidth - 150, r.left + r.width / 2 - 60)) + 'px';
      pill.classList.add('on');
    });
    pill.addEventListener('mousedown', function (e) { e.preventDefault(); });
    pill.addEventListener('click', function () { hidePill(); openComment(selSlide, selTxt); window.getSelection().removeAllRanges(); });
  }

  // ---------- presenter ----------
  if (!document.body.classList.contains('present')) return;
  var slots = [].slice.call(document.querySelectorAll('.stage .slot'));
  var n = slots.length, i = 0;
  var count = document.querySelector('.count'), prog = document.querySelector('.prog');
  var grid = document.querySelector('.grid');
  window.curSlide = function () { return i + 1; };

  function fit() {
    var W = window.innerWidth, H = window.innerHeight, k = Math.min(W / 1600, H / 900);
    slots.forEach(function (s) {
      s.style.transform = 'scale(' + k + ')';
      s.style.left = ((W - 1600 * k) / 2) + 'px';
      s.style.top = ((H - 900 * k) / 2) + 'px';
    });
    fitFrames();
  }
  function go(to) {
    i = Math.max(0, Math.min(n - 1, to));
    slots.forEach(function (s, k) { s.classList.toggle('on', k === i); });
    count.textContent = (i + 1) + ' / ' + n;
    prog.style.width = ((i + 1) / n * 100) + '%';
    if (history.replaceState) history.replaceState(null, '', '#' + (i + 1));
    grid.querySelectorAll('.frame').forEach(function (f, k) { f.classList.toggle('cur', k === i); });
  }
  function next() { go(i + 1); } function prev() { go(i - 1); }
  function fs() {
    var d = document, el = d.documentElement;
    if (d.fullscreenElement || d.webkitFullscreenElement) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
    else (el.requestFullscreen || el.webkitRequestFullscreen || function () {}).call(el);
  }
  function toggleGrid(force) { var o = force !== undefined ? force : !grid.classList.contains('open'); grid.classList.toggle('open', o); if (o) fitFrames(); }

  // grid thumbnails (clones of the live slides)
  slots.forEach(function (s, k) {
    var w = document.createElement('div');
    var f = document.createElement('div'); f.className = 'frame'; f.appendChild(s.querySelector('.s').cloneNode(true));
    f.addEventListener('click', function () { go(k); toggleGrid(false); });
    var lab = document.createElement('div'); lab.className = 'n'; lab.textContent = k + 1;
    w.appendChild(f); w.appendChild(lab); grid.appendChild(w);
  });

  document.addEventListener('keydown', function (e) {
    if (modal && modal.classList.contains('open')) { if (e.key === 'Escape') closeComment(); return; }
    var k = e.key;
    if (k === 'ArrowRight' || k === 'ArrowDown' || k === 'PageDown' || k === ' ' || k === 'Enter') { e.preventDefault(); next(); }
    else if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'PageUp' || k === 'Backspace') { e.preventDefault(); prev(); }
    else if (k === 'Home') go(0); else if (k === 'End') go(n - 1);
    else if (k === 'f' || k === 'F') fs();
    else if (k === 'g' || k === 'G') toggleGrid();
    else if (k === 'c' || k === 'C') { e.preventDefault(); openComment(i + 1); }
    else if (k === 'Escape' && grid.classList.contains('open')) toggleGrid(false);
    ui();
  });
  document.querySelector('[data-act=prev]').onclick = prev;
  document.querySelector('[data-act=next]').onclick = next;
  document.querySelector('[data-act=fs]').onclick = fs;
  document.querySelector('[data-act=grid]').onclick = function () { toggleGrid(); };

  // touch: swipe, or tap left/right third
  var sx = null, sy = null;
  var stage = document.querySelector('.stage');
  stage.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  stage.addEventListener('touchend', function (e) {
    if (sx === null) return;
    var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { dx < 0 ? next() : prev(); }
    else if (Math.abs(dx) < 10 && Math.abs(dy) < 10) { var x = e.changedTouches[0].clientX / window.innerWidth; if (x > 0.66) next(); else if (x < 0.33) prev(); else ui(true); }
    sx = null;
  });
  stage.addEventListener('click', function (e) { if (e.pointerType === 'touch') return; var x = e.clientX / window.innerWidth; if (x > 0.5) next(); else prev(); });

  // controls fade in on mouse move
  var t;
  function ui(force) { document.body.classList.add('show-ui'); clearTimeout(t); t = setTimeout(function () { document.body.classList.remove('show-ui'); }, force ? 3500 : 2200); }
  document.addEventListener('mousemove', function () { ui(); });

  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', function () { setTimeout(fit, 200); });
  fit();
  go((parseInt(location.hash.slice(1), 10) || 1) - 1);
  ui(true);
})();
