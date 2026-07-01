function youtubeEmbed(url) {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

function ul(items) {
  return items.map(t => `<li>${t}</li>`).join('');
}

async function loadVideo() {
  const slug = window.__VIDEO_SLUG__;
  const res = await fetch('../../data/videos.json');
  const data = await res.json();
  const v = data.videos.find(x => x.slug === slug);
  if (!v) {
    document.getElementById('app').innerHTML = '<p>動画が見つかりません。</p>';
    return;
  }
  document.title = `${v.title} | 心身堂 救急箱サポート`;

  const catName = (data.categories.find(c => c.slug === v.category) || {}).name || '';
  const embed = youtubeEmbed(v.videoUrl);
  const videoHtml = embed
    ? `<div class="video-wrap"><iframe src="${embed}" allowfullscreen loading="lazy"></iframe></div>`
    : `<div class="video-wrap"><div class="placeholder">動画は準備中です</div></div>`;

  const lineLink = data.links.line || '#';
  const reserveLink = data.links.reserve || '#';
  const refillLink = data.links.refill || '#';

  document.getElementById('app').innerHTML = `
    <a class="back-link" href="../../">&larr; トップに戻る</a>
    <h1 style="font-size:20px;margin:4px 0 8px;">${v.title}</h1>
    <div class="tag-list">
      <span class="tag">${catName}</span>
      ${v.tags.map(t => `<span class="tag">${t}</span>`).join('')}
    </div>

    ${videoHtml}

    <p style="color:var(--color-text-sub);font-size:14px;">${v.description}</p>

    <div class="info-block">
      <h3>こんな時に</h3>
      <ul>${ul(v.targetSymptoms)}</ul>
    </div>

    <div class="notice">
      <h2>次の症状がある時は医療機関へ</h2>
      <ul>${ul(v.cautions)}</ul>
    </div>

    <div class="info-block">
      <h3>使用するテープ</h3>
      <ul>${ul(v.tapes)}</ul>
    </div>

    <div class="info-block">
      <h3>巻く時のポイント</h3>
      <ul>${ul(v.tips)}</ul>
    </div>

    <section>
      <a class="btn btn-line" href="${lineLink}">LINEで相談する</a>
      <a class="btn btn-primary" href="${reserveLink}">来院予約をする</a>
      <a class="btn btn-outline" href="${refillLink}">テーピング補充を注文する</a>
    </section>
  `;
}

document.addEventListener('DOMContentLoaded', loadVideo);
