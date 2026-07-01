(async function() {
  const state = { audience: null };

  const res = await fetch('data/posts.json');
  const data = await res.json();

  function renderTabs() {
    const tabs = document.getElementById('audience-tabs');
    tabs.innerHTML = '';
    const all = document.createElement('span');
    all.className = 'audience-tab' + (state.audience === null ? ' active' : '');
    all.textContent = 'すべて';
    all.onclick = () => { state.audience = null; renderTabs(); renderPosts(); };
    tabs.appendChild(all);
    data.audiences.forEach(a => {
      const t = document.createElement('span');
      t.className = 'audience-tab' + (state.audience === a.slug ? ' active' : '');
      t.textContent = a.name;
      t.onclick = () => { state.audience = a.slug; renderTabs(); renderPosts(); };
      tabs.appendChild(t);
    });
  }

  function renderPosts() {
    const box = document.getElementById('posts-list');
    box.innerHTML = '';
    const filtered = (data.posts || [])
      .filter(p => p.published !== false)
      .filter(p => !state.audience || (p.audience || []).includes(state.audience))
      .sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''));

    document.getElementById('posts-empty').hidden = filtered.length > 0;

    filtered.forEach(p => {
      const card = document.createElement('div');
      card.className = 'ig-card';
      const url = p.url.replace(/\/?$/, '/');
      const audNames = (p.audience || []).map(s => (data.audiences.find(a => a.slug === s) || {}).name).filter(Boolean);
      card.innerHTML = `
        ${audNames.length ? `<div class="ig-audience">${audNames.map(n => `<span class="ig-audience-tag">${n}</span>`).join('')}</div>` : ''}
        ${p.comment ? `<p class="ig-comment">${p.comment}</p>` : ''}
        <blockquote class="instagram-media" data-instgrm-permalink="${url}" data-instgrm-version="14" style="margin:0"></blockquote>
      `;
      box.appendChild(card);
    });

    if (window.instgrm && window.instgrm.Embeds) {
      window.instgrm.Embeds.process();
    }
    updateCompactToggle(filtered.length);
  }

  function updateCompactToggle(total) {
    const box = document.getElementById('posts-list');
    const btn = document.getElementById('posts-toggle');
    const isMobile = window.matchMedia('(max-width: 899px)').matches;
    if (!isMobile || total <= 1) {
      box.classList.remove('compact');
      btn.hidden = true;
      return;
    }
    btn.hidden = false;
    const isCompact = !box.dataset.expanded;
    if (isCompact) {
      box.classList.add('compact');
      btn.textContent = `他の投稿を見る（残り${total - 1}件）`;
    } else {
      box.classList.remove('compact');
      btn.textContent = '閉じる';
    }
    btn.onclick = () => {
      if (box.dataset.expanded) { delete box.dataset.expanded; }
      else { box.dataset.expanded = '1'; }
      updateCompactToggle(total);
    };
  }

  window.addEventListener('resize', () => {
    const filtered = (data.posts || []).filter(p => p.published !== false)
      .filter(p => !state.audience || (p.audience || []).includes(state.audience));
    updateCompactToggle(filtered.length);
  });

  renderTabs();
  renderPosts();

  // reprocess when Instagram script loads late
  const check = setInterval(() => {
    if (window.instgrm && window.instgrm.Embeds) {
      window.instgrm.Embeds.process();
      clearInterval(check);
    }
  }, 500);
  setTimeout(() => clearInterval(check), 10000);
})();
