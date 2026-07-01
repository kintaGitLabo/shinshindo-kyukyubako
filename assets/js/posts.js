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
  }

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
