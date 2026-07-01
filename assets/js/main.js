let allData = null;
const state = { query: '', category: null, tag: null };

async function loadTop() {
  const res = await fetch('data/videos.json');
  allData = await res.json();

  document.getElementById('site-title').textContent = allData.site.title;
  document.getElementById('site-subtitle').textContent = allData.site.subtitle;
  document.getElementById('site-description').textContent = allData.site.description;

  const noticeUl = document.getElementById('emergency-list');
  allData.emergencyNotices.forEach(t => {
    const li = document.createElement('li'); li.textContent = t; noticeUl.appendChild(li);
  });

  renderCategories();
  renderTags();
  renderVideos();

  document.getElementById('search-input').addEventListener('input', e => {
    state.query = e.target.value.trim().toLowerCase();
    renderVideos();
    updateClearBtn();
  });

  document.getElementById('clear-filters').addEventListener('click', () => {
    state.query = ''; state.category = null; state.tag = null;
    document.getElementById('search-input').value = '';
    renderCategories(); renderTags(); renderVideos(); updateClearBtn();
  });

  const line = document.getElementById('btn-line');
  if (line && allData.links.line) line.href = allData.links.line;
  const refill = document.querySelector('a.btn-outline');
  if (refill && allData.links.refill) refill.href = allData.links.refill;
  const reserve = document.querySelector('a.btn-primary');
  if (reserve && allData.links.reserve) reserve.href = allData.links.reserve;
}

function renderCategories() {
  const box = document.getElementById('categories');
  box.innerHTML = '';
  allData.categories.sort((a,b)=>a.order-b.order).forEach(c => {
    const chip = document.createElement('span');
    chip.className = 'category-chip' + (state.category === c.slug ? ' active' : '');
    chip.textContent = c.name;
    chip.onclick = () => {
      state.category = state.category === c.slug ? null : c.slug;
      renderCategories(); renderVideos(); updateClearBtn();
    };
    box.appendChild(chip);
  });
}

function renderTags() {
  const box = document.getElementById('tags-filter');
  box.innerHTML = '';
  const tagCount = new Map();
  allData.videos.filter(v => v.published).forEach(v => {
    (v.tags || []).forEach(t => tagCount.set(t, (tagCount.get(t) || 0) + 1));
  });
  const tags = [...tagCount.entries()].sort((a,b) => b[1]-a[1]);
  tags.forEach(([tag]) => {
    const chip = document.createElement('span');
    chip.className = 'tag-chip' + (state.tag === tag ? ' active' : '');
    chip.textContent = '#' + tag;
    chip.onclick = () => {
      state.tag = state.tag === tag ? null : tag;
      renderTags(); renderVideos(); updateClearBtn();
    };
    box.appendChild(chip);
  });
}

function matchVideo(v) {
  if (state.category && v.category !== state.category) return false;
  if (state.tag && !(v.tags || []).includes(state.tag)) return false;
  if (state.query) {
    const hay = [
      v.title, v.description, v.promoTitle, v.promoShort,
      ...(v.tags || []), ...(v.targetSymptoms || [])
    ].join(' ').toLowerCase();
    if (!hay.includes(state.query)) return false;
  }
  return true;
}

function renderVideos() {
  const list = document.getElementById('video-list');
  list.innerHTML = '';
  const catMap = Object.fromEntries(allData.categories.map(c=>[c.slug,c.name]));
  const filtered = allData.videos
    .filter(v => v.published)
    .filter(matchVideo)
    .sort((a,b)=>a.order-b.order);

  document.getElementById('empty-msg').hidden = filtered.length > 0;
  const heading = document.getElementById('list-heading');
  const hasFilter = state.query || state.category || state.tag;
  heading.textContent = hasFilter ? `検索結果（${filtered.length}件）` : 'おすすめ動画';

  filtered.forEach(v => {
    const a = document.createElement('a');
    a.className = 'video-card';
    a.href = `support/${v.slug}/`;
    a.innerHTML = `
      <span class="cat">${catMap[v.category] || ''}</span>
      <h3>${v.title}</h3>
      <p>${v.description}</p>
    `;
    list.appendChild(a);
  });
}

function updateClearBtn() {
  const btn = document.getElementById('clear-filters');
  btn.hidden = !(state.query || state.category || state.tag);
}

document.addEventListener('DOMContentLoaded', loadTop);
