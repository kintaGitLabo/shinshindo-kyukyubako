(async function () {
  const COUNT_KEY = 'tcb_click_count';

  function bumpCount(key) {
    try {
      const raw = localStorage.getItem(COUNT_KEY);
      const obj = raw ? JSON.parse(raw) : {};
      obj[key] = (obj[key] || 0) + 1;
      localStorage.setItem(COUNT_KEY, JSON.stringify(obj));
    } catch (_) { /* storage disabled — ignore */ }
  }

  function attachTracking(el, key) {
    if (!el) return;
    el.addEventListener('click', () => bumpCount(key));
  }

  async function loadJson(path) {
    const res = await fetch(path, { cache: 'no-cache' });
    if (!res.ok) throw new Error('failed to load ' + path);
    return res.json();
  }

  try {
    const [tcb, videos] = await Promise.all([
      loadJson('../data/tcb-links.json'),
      loadJson('../data/videos.json'),
    ]);

    // --- 3 CTAs ---
    const ctas = [
      { key: 'taping',   sel: '#cta-taping',   fallback: null },
      { key: 'symptom',  sel: '#cta-symptom',  fallback: null },
      { key: 'selfcare', sel: '#cta-selfcare', fallback: null },
    ];
    ctas.forEach(({ key, sel }) => {
      const el = document.querySelector(sel);
      const conf = tcb.cta[key];
      if (!el || !conf) return;
      if (conf.href) el.href = conf.href;
      const labelNode = el.querySelector('.tcb-label');
      const subNode   = el.querySelector('.tcb-sub');
      if (labelNode && conf.label) labelNode.textContent = conf.label;
      if (subNode   && conf.sub)   subNode.textContent   = conf.sub;
      el.target = '_blank';
      el.rel = 'noopener';
      attachTracking(el, key);
    });

    // Duplicate "reopen" buttons in appeal blocks share the same hrefs
    document.querySelectorAll('[data-reopen]').forEach(btn => {
      const key = btn.dataset.reopen;
      const conf = tcb.cta[key];
      if (!conf) return;
      btn.href = conf.href;
      btn.target = '_blank';
      btn.rel = 'noopener';
      attachTracking(btn, key + '_reopen');
    });

    // --- Contact links (reuse videos.json.links) ---
    const links = videos.links || {};
    const line = document.getElementById('btn-line');
    if (line && links.line) line.href = links.line;
    attachTracking(line, 'line');

    const reserve = document.getElementById('btn-reserve');
    if (reserve && links.reserve) reserve.href = links.reserve;
    attachTracking(reserve, 'reserve');

    const refill = document.getElementById('btn-refill');
    if (refill && links.refill) refill.href = links.refill;
    attachTracking(refill, 'refill');

    // --- Emergency list (reuse videos.json.emergencyNotices) ---
    const emUl = document.getElementById('emergency-list');
    if (emUl && Array.isArray(videos.emergencyNotices)) {
      videos.emergencyNotices.forEach(t => {
        const li = document.createElement('li');
        li.textContent = t;
        emUl.appendChild(li);
      });
    }
  } catch (err) {
    console.error('[lp-tcb] load error:', err);
  }
})();
