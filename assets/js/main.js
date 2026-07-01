async function loadTop() {
  const res = await fetch('data/videos.json');
  const data = await res.json();

  document.getElementById('site-title').textContent = data.site.title;
  document.getElementById('site-subtitle').textContent = data.site.subtitle;
  document.getElementById('site-description').textContent = data.site.description;

  const noticeUl = document.getElementById('emergency-list');
  data.emergencyNotices.forEach(t => {
    const li = document.createElement('li'); li.textContent = t; noticeUl.appendChild(li);
  });

  const catBox = document.getElementById('categories');
  data.categories.sort((a,b)=>a.order-b.order).forEach(c => {
    const a = document.createElement('a');
    a.href = `#cat-${c.slug}`;
    a.className = 'category-chip';
    a.textContent = c.name;
    catBox.appendChild(a);
  });

  const list = document.getElementById('video-list');
  const catMap = Object.fromEntries(data.categories.map(c=>[c.slug,c.name]));
  data.videos.filter(v=>v.published).sort((a,b)=>a.order-b.order).forEach(v => {
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

  const line = document.getElementById('btn-line');
  if (line && data.links.line) line.href = data.links.line;
}

document.addEventListener('DOMContentLoaded', loadTop);
